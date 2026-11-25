interface WorkerEnv {
  ASSETS: {
    fetch(request: Request): Promise<Response>;
  };
  CBMMG_PROXY_URL?: string;
}

interface WorkerExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
}

interface CfProperties {
  country?: string;
  colo?: string;
}

type CfRequest = Request & { cf?: CfProperties };

interface CloudflareCacheStorage extends CacheStorage {
  default: Cache;
}

const DEFAULT_PROXY_URL = 'https://cobom-cad.duckdns.org';
const ATIVOS_EDGE_TTL_SEC = 300; // 5 minutos de cache compartilhado na borda da Cloudflare
const AUXILIARES_EDGE_TTL_SEC = 21600; // 6 horas para catálogos auxiliares (Regra #2)
const STALE_BACKUP_TTL_SEC = 86400; // 24 horas de contingência caso o CAD retorne 429/erro

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

function aplicarHeadersPrivacidade(resp: Response): Response {
  const headers = new Headers(resp.headers);
  headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive, nosnippet');
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('Referrer-Policy', 'no-referrer');
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
    'X-Robots-Tag': 'noindex, nofollow, noarchive, nosnippet',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer',
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
        paisDetectado: country,
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
  edgeTtlSec: number;
  browserMaxAgeSec: number;
  timeoutMs: number;
  enveloparPayload: (upstreamJson: any, atualizadoEm: string) => unknown;
  ctx: WorkerExecutionContext;
}): Promise<CachedJsonResult> {
  const edgeCache = getEdgeCache();
  const cacheKey = new Request(params.cacheKeyUrl, { method: 'GET' });
  const staleKey = new Request(params.staleKeyUrl, { method: 'GET' });

  const baseHeaders: Record<string, string> = {
    'Content-Type': 'application/json; charset=utf-8',
    'X-Robots-Tag': 'noindex, nofollow, noarchive, nosnippet',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer',
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

    const upstreamResp = await fetch(params.upstreamUrl, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'User-Agent': 'CBMMG-Cloudflare-Edge-Cache/1.0',
      },
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (upstreamResp.ok) {
      const upstreamJson = await upstreamResp.json();
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
        aviso: `Proxy CAD retornou HTTP ${upstreamResp.status}.`,
      }),
      status: 502,
      headers: {
        ...baseHeaders,
        'Cache-Control': 'no-store',
      },
    };
  } catch (err: any) {
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
        aviso: `Falha ao alcançar proxy CAD (${err?.message || 'erro de rede'}).`,
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
  edgeTtlSec: number;
  browserMaxAgeSec: number;
  timeoutMs: number;
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
    // 1. Bloqueio geográfico estrito: permite apenas tráfego originado no Brasil (BR)
    const bloqueioGeo = verificarPaisBrasil(request);
    if (bloqueioGeo) {
      return bloqueioGeo;
    }

    const url = new URL(request.url);
    const proxyBase = (env.CBMMG_PROXY_URL || DEFAULT_PROXY_URL).replace(/\/+$/, '');

    // 2. Rotas de API com Cache Compartilhado na Borda da Cloudflare
    if (url.pathname === '/api/cbm/status') {
      return jsonResponse(
        {
          sucesso: true,
          servico: 'CBMMG CAD Cloudflare Edge Cache',
          paisPermitido: 'BR',
          paisDetectado: request.cf?.country || 'LOCAL',
          datacenter: request.cf?.colo || 'LOCAL',
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
          cacheKeyUrl: 'https://cache.cbmmg.internal/cad/ativos/v1',
          staleKeyUrl: 'https://cache.cbmmg.internal/cad/ativos/v1-stale',
          upstreamUrl: `${proxyBase}/ativos`,
          edgeTtlSec: ATIVOS_EDGE_TTL_SEC,
          browserMaxAgeSec: 30,
          timeoutMs: 12000,
          ctx,
          enveloparPayload: (dados, atualizado_em) => ({
            sucesso: true,
            fonte: 'Cache Compartilhado Cloudflare (Proxy Oracle)',
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
        cacheKeyUrl: 'https://cache.cbmmg.internal/cad/naturezas/v1',
        staleKeyUrl: 'https://cache.cbmmg.internal/cad/naturezas/v1-stale',
        upstreamUrl: `${proxyBase}/dados-auxiliares/naturezas`,
        edgeTtlSec: AUXILIARES_EDGE_TTL_SEC,
        browserMaxAgeSec: 3600,
        timeoutMs: 10000,
        ctx,
        enveloparPayload: (data) => ({
          sucesso: true,
          fonte: 'Cache Compartilhado Cloudflare (/dados-auxiliares/naturezas)',
          total: data?.total || (Array.isArray(data?.dados?.value) ? data.dados.value.length : 0),
          dados: data,
        }),
      });
    }

    if (url.pathname === '/api/cbm/unidades-servico') {
      return buscarComCacheCompartilhado({
        cacheKeyUrl: 'https://cache.cbmmg.internal/cad/unidades-servico/v1',
        staleKeyUrl: 'https://cache.cbmmg.internal/cad/unidades-servico/v1-stale',
        upstreamUrl: `${proxyBase}/dados-auxiliares/unidades-servico`,
        edgeTtlSec: AUXILIARES_EDGE_TTL_SEC,
        browserMaxAgeSec: 3600,
        timeoutMs: 10000,
        ctx,
        enveloparPayload: (data) => ({
          sucesso: true,
          fonte: 'Cache Compartilhado Cloudflare (/dados-auxiliares/unidades-servico)',
          total: data?.total || (Array.isArray(data?.dados?.value) ? data.dados.value.length : 0),
          dados: data,
        }),
      });
    }

    if (url.pathname === '/api/cbm/codigos') {
      return buscarComCacheCompartilhado({
        cacheKeyUrl: 'https://cache.cbmmg.internal/cad/codigos/v1',
        staleKeyUrl: 'https://cache.cbmmg.internal/cad/codigos/v1-stale',
        upstreamUrl: `${proxyBase}/codigos`,
        edgeTtlSec: AUXILIARES_EDGE_TTL_SEC,
        browserMaxAgeSec: 3600,
        timeoutMs: 8000,
        ctx,
        enveloparPayload: (data) => data,
      });
    }

    // 3. Demais requisições: serve o PWA estático (dist/) com headers de privacidade/noindex
    const assetResp = await env.ASSETS.fetch(request);
    return aplicarHeadersPrivacidade(assetResp);
  },
};
