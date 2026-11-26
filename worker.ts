import { sanitizarPayloadCadLgpd } from './src/services/lgpdSanitizer.ts';

interface WorkerEnv {
  ASSETS: {
    fetch(request: Request): Promise<Response>;
  };
  CBMMG_PROXY_URL?: string;
  CBMMG_ORIGIN_SECRET?: string;
}

interface WorkerExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
}

interface CfProperties {
  country?: string;
}

type CfRequest = Request & { cf?: CfProperties };

interface CloudflareCacheStorage extends CacheStorage {
  default: Cache;
}

const DEFAULT_PROXY_URL = 'https://cobom-cad.duckdns.org';
const ATIVOS_EDGE_TTL_SEC = 300; // 5 minutos de cache compartilhado na borda da Cloudflare
const AUXILIARES_EDGE_TTL_SEC = 21600; // 6 horas para catálogos auxiliares (Regra #2)
const STALE_BACKUP_TTL_SEC = 86400; // 24 horas de contingência caso o CAD retorne 429/erro

const CSP_HEADER = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com data:",
  "img-src 'self' data: blob: https://server.arcgisonline.com https://tile.openstreetmap.org https://*.tile.openstreetmap.org",
  "connect-src 'self'",
  "worker-src 'self'",
  "manifest-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join('; ');

const SECURITY_HEADERS_BASE: Record<string, string> = {
  'X-Robots-Tag': 'noindex, nofollow, noarchive, nosnippet',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
  'X-Frame-Options': 'DENY',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Content-Security-Policy': CSP_HEADER,
};

interface CachedJsonResult {
  bodyStr: string;
  status: number;
  headers: Record<string, string>;
}

let inFlightAtivos: Promise<CachedJsonResult> | null = null;

function getEdgeCache(): Cache | null {
  try {
    const cs = caches as unknown as CloudflareCacheStorage;
    return cs?.default || null;
  } catch {
    return null;
  }
}

function aplicarHeadersSeguranca(resp: Response): Response {
  const headers = new Headers(resp.headers);
  for (const [k, v] of Object.entries(SECURITY_HEADERS_BASE)) {
    headers.set(k, v);
  }
  return new Response(resp.body, {
    status: resp.status,
    statusText: resp.statusText,
    headers,
  });
}

function jsonResponse(
  payload: unknown,
  status = 200,
  extraHeaders: Record<string, string> = {}
): Response {
  const headers = new Headers({
    'Content-Type': 'application/json; charset=utf-8',
    ...SECURITY_HEADERS_BASE,
    ...extraHeaders,
  });
  return new Response(JSON.stringify(payload), { status, headers });
}

function verificarPaisBrasil(request: CfRequest): Response | null {
  const country = request.cf?.country;
  // Em produção na Cloudflare, `cf.country` sempre vem preenchido ('BR', 'US', 'T1' Tor, etc.).
  // Se estiver ausente (ex: ambiente local dev), permite seguir.
  if (country && country.toUpperCase() !== 'BR') {
    return jsonResponse(
      {
        sucesso: false,
        codigo: 'GEO_BLOCKED',
        mensagem: 'Acesso restrito ao território brasileiro (BR).',
      },
      403,
      { 'Cache-Control': 'no-store' }
    );
  }
  return null;
}

async function obterDadosComCacheCompartilhado(params: {
  cacheKeyUrl: string;
  staleKeyUrl: string;
  upstreamUrl: string;
  originSecret?: string;
  edgeTtlSec: number;
  browserMaxAgeSec: number;
  timeoutMs: number;
  sanitizarLgpd?: boolean;
  enveloparPayload: (upstreamJson: any, atualizadoEm: string) => unknown;
  ctx: WorkerExecutionContext;
}): Promise<CachedJsonResult> {
  const edgeCache = getEdgeCache();
  const cacheKey = new Request(params.cacheKeyUrl, { method: 'GET' });
  const staleKey = new Request(params.staleKeyUrl, { method: 'GET' });

  const baseHeaders: Record<string, string> = {
    'Content-Type': 'application/json; charset=utf-8',
    ...SECURITY_HEADERS_BASE,
  };

  // 1. Tenta servir diretamente do Cache Compartilhado da Cloudflare
  if (edgeCache) {
    const cached = await edgeCache.match(cacheKey);
    if (cached) {
      const bodyStr = await cached.text();
      return {
        bodyStr,
        status: 200,
        headers: {
          ...baseHeaders,
          'Cache-Control': `public, max-age=${params.browserMaxAgeSec}`,
          'X-CAD-Cache': 'HIT',
        },
      };
    }
  }

  // 2. Busca na origem (Proxy Nginx na Oracle Cloud)
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), params.timeoutMs);

    const upstreamHeaders: Record<string, string> = {
      Accept: 'application/json',
      'User-Agent': 'CBMMG-Cloudflare-Edge-Cache/1.0',
    };
    if (params.originSecret) {
      upstreamHeaders['X-Origin-Secret'] = params.originSecret;
    }

    const upstreamResp = await fetch(params.upstreamUrl, {
      method: 'GET',
      headers: upstreamHeaders,
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (upstreamResp.ok) {
      const upstreamRaw = await upstreamResp.json();
      const upstreamJson = params.sanitizarLgpd
        ? sanitizarPayloadCadLgpd(upstreamRaw)
        : upstreamRaw;
      const atualizadoEm = new Date().toISOString();
      const envelope = params.enveloparPayload(upstreamJson, atualizadoEm);
      const bodyStr = JSON.stringify(envelope);

      if (edgeCache) {
        const respParaEdge = new Response(bodyStr, {
          status: 200,
          headers: {
            'Content-Type': 'application/json; charset=utf-8',
            'Cache-Control': `public, max-age=${params.edgeTtlSec}, s-maxage=${params.edgeTtlSec}`,
            'X-Robots-Tag': 'noindex, nofollow, noarchive, nosnippet',
          },
        });
        const respParaStale = new Response(bodyStr, {
          status: 200,
          headers: {
            'Content-Type': 'application/json; charset=utf-8',
            'Cache-Control': `public, max-age=${STALE_BACKUP_TTL_SEC}, s-maxage=${STALE_BACKUP_TTL_SEC}`,
            'X-Robots-Tag': 'noindex, nofollow, noarchive, nosnippet',
          },
        });
        params.ctx.waitUntil(
          Promise.all([
            edgeCache.put(cacheKey, respParaEdge),
            edgeCache.put(staleKey, respParaStale),
          ])
        );
      }

      return {
        bodyStr,
        status: 200,
        headers: {
          ...baseHeaders,
          'Cache-Control': `public, max-age=${params.browserMaxAgeSec}`,
          'X-CAD-Cache': 'MISS',
        },
      };
    }

    // 3. Contingência em caso de 429 ou erro HTTP da origem: tenta servir último cache válido (stale)
    if (edgeCache) {
      const stale = await edgeCache.match(staleKey);
      if (stale) {
        const bodyStr = await stale.text();
        return {
          bodyStr,
          status: 200,
          headers: {
            ...baseHeaders,
            'Cache-Control': 'no-store',
            'X-CAD-Cache': `STALE-HTTP-${upstreamResp.status}`,
          },
        };
      }
    }

    return {
      bodyStr: JSON.stringify({
        sucesso: false,
        aviso: `Serviço de origem indisponível (HTTP ${upstreamResp.status}).`,
      }),
      status: 502,
      headers: {
        ...baseHeaders,
        'Cache-Control': 'no-store',
      },
    };
  } catch {
    if (edgeCache) {
      const stale = await edgeCache.match(staleKey);
      if (stale) {
        const bodyStr = await stale.text();
        return {
          bodyStr,
          status: 200,
          headers: {
            ...baseHeaders,
            'Cache-Control': 'no-store',
            'X-CAD-Cache': 'STALE-NETWORK-FALLBACK',
          },
        };
      }
    }

    return {
      bodyStr: JSON.stringify({
        sucesso: false,
        aviso: 'Falha temporária de comunicação com a origem.',
      }),
      status: 502,
      headers: {
        ...baseHeaders,
        'Cache-Control': 'no-store',
      },
    };
  }
}

async function buscarComCacheCompartilhado(params: {
  cacheKeyUrl: string;
  staleKeyUrl: string;
  upstreamUrl: string;
  originSecret?: string;
  edgeTtlSec: number;
  browserMaxAgeSec: number;
  timeoutMs: number;
  sanitizarLgpd?: boolean;
  enveloparPayload: (upstreamJson: any, atualizadoEm: string) => unknown;
  ctx: WorkerExecutionContext;
}): Promise<Response> {
  const res = await obterDadosComCacheCompartilhado(params);
  return new Response(res.bodyStr, { status: res.status, headers: res.headers });
}

export default {
  async fetch(
    request: CfRequest,
    env: WorkerEnv,
    ctx: WorkerExecutionContext
  ): Promise<Response> {
    // 1. Apenas métodos seguros de leitura (GET/HEAD) são aceitos pela aplicação
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return jsonResponse(
        { sucesso: false, mensagem: 'Método HTTP não permitido.' },
        405,
        { Allow: 'GET, HEAD', 'Cache-Control': 'no-store' }
      );
    }

    // 2. Bloqueio geográfico estrito: permite apenas tráfego originado no Brasil (BR)
    const bloqueioGeo = verificarPaisBrasil(request);
    if (bloqueioGeo) {
      return bloqueioGeo;
    }

    const url = new URL(request.url);
    const pathnameLower = url.pathname.toLowerCase();

    // 3. Bloqueio explícito contra acesso a arquivos sensíveis/legados ou ocultos
    if (
      pathnameLower.endsWith('/cbmmg_cad_dados.json') ||
      pathnameLower.endsWith('.py') ||
      pathnameLower.includes('/.git') ||
      pathnameLower.includes('/.env')
    ) {
      return jsonResponse(
        { sucesso: false, mensagem: 'Recurso indisponível.' },
        404,
        { 'Cache-Control': 'no-store' }
      );
    }

    const proxyBase = (env.CBMMG_PROXY_URL || DEFAULT_PROXY_URL).replace(/\/+$/, '');
    const originSecret = env.CBMMG_ORIGIN_SECRET;

    // 4. Rotas de API com Sanitização LGPD e Cache Compartilhado na Borda da Cloudflare
    if (url.pathname === '/api/cbm/status') {
      return jsonResponse(
        {
          sucesso: true,
          servico: 'CBMMG CAD Gateway Seguro',
          paisPermitido: 'BR',
          ttlAtivosSegundos: ATIVOS_EDGE_TTL_SEC,
          ttlAuxiliaresSegundos: AUXILIARES_EDGE_TTL_SEC,
          timestamp: new Date().toISOString(),
        },
        200,
        { 'Cache-Control': 'no-store' }
      );
    }

    if (url.pathname === '/api/cbm/sync') {
      if (!inFlightAtivos) {
        inFlightAtivos = obterDadosComCacheCompartilhado({
          cacheKeyUrl: 'https://cache.cbmmg.internal/cad/ativos/v2-sanitized',
          staleKeyUrl: 'https://cache.cbmmg.internal/cad/ativos/v2-sanitized-stale',
          upstreamUrl: `${proxyBase}/ativos`,
          originSecret,
          edgeTtlSec: ATIVOS_EDGE_TTL_SEC,
          browserMaxAgeSec: 30,
          timeoutMs: 12000,
          sanitizarLgpd: true,
          ctx,
          enveloparPayload: (dados, atualizado_em) => ({
            sucesso: true,
            fonte: 'Gateway Seguro Cloudflare (Cache Compartilhado)',
            dados,
            atualizado_em,
          }),
        }).finally(() => {
          inFlightAtivos = null;
        });
      }
      const res = await inFlightAtivos;
      return new Response(res.bodyStr, { status: res.status, headers: res.headers });
    }

    if (url.pathname === '/api/cbm/naturezas') {
      return buscarComCacheCompartilhado({
        cacheKeyUrl: 'https://cache.cbmmg.internal/cad/naturezas/v2',
        staleKeyUrl: 'https://cache.cbmmg.internal/cad/naturezas/v2-stale',
        upstreamUrl: `${proxyBase}/dados-auxiliares/naturezas`,
        originSecret,
        edgeTtlSec: AUXILIARES_EDGE_TTL_SEC,
        browserMaxAgeSec: 3600,
        timeoutMs: 10000,
        ctx,
        enveloparPayload: (data) => ({
          sucesso: true,
          fonte: 'Gateway Seguro Cloudflare (/api/cbm/naturezas)',
          total: data?.total || (Array.isArray(data?.dados?.value) ? data.dados.value.length : 0),
          dados: data,
        }),
      });
    }

    if (url.pathname === '/api/cbm/unidades-servico') {
      return buscarComCacheCompartilhado({
        cacheKeyUrl: 'https://cache.cbmmg.internal/cad/unidades-servico/v2',
        staleKeyUrl: 'https://cache.cbmmg.internal/cad/unidades-servico/v2-stale',
        upstreamUrl: `${proxyBase}/dados-auxiliares/unidades-servico`,
        originSecret,
        edgeTtlSec: AUXILIARES_EDGE_TTL_SEC,
        browserMaxAgeSec: 3600,
        timeoutMs: 10000,
        ctx,
        enveloparPayload: (data) => ({
          sucesso: true,
          fonte: 'Gateway Seguro Cloudflare (/api/cbm/unidades-servico)',
          total: data?.total || (Array.isArray(data?.dados?.value) ? data.dados.value.length : 0),
          dados: data,
        }),
      });
    }

    if (url.pathname === '/api/cbm/codigos') {
      return buscarComCacheCompartilhado({
        cacheKeyUrl: 'https://cache.cbmmg.internal/cad/codigos/v2',
        staleKeyUrl: 'https://cache.cbmmg.internal/cad/codigos/v2-stale',
        upstreamUrl: `${proxyBase}/codigos`,
        originSecret,
        edgeTtlSec: AUXILIARES_EDGE_TTL_SEC,
        browserMaxAgeSec: 3600,
        timeoutMs: 8000,
        ctx,
        enveloparPayload: (data) => data,
      });
    }

    // 5. Demais requisições: serve o PWA estático (dist/) com headers completos de segurança
    const assetResp = await env.ASSETS.fetch(request);
    return aplicarHeadersSeguranca(assetResp);
  },
};
