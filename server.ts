import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { sanitizarPayloadCadLgpd } from './src/services/lgpdSanitizer.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = parseInt(process.env.PORT || '3000', 10);
const isProd = process.env.NODE_ENV === 'production';

app.disable('x-powered-by');
app.use(express.json({ limit: '2mb' }));

// Cabeçalhos básicos de privacidade/segurança compatíveis com iFrame de preview
app.use((req, res, next) => {
  res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive, nosnippet');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  next();
});

const PROXY_REVERSO_URL = (process.env.CBMMG_PROXY_URL || 'https://cobom-cad.duckdns.org').replace(/\/+$/, '');
const ORIGIN_SECRET = process.env.CBMMG_ORIGIN_SECRET;

function buildUpstreamHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: 'application/json',
    'User-Agent': 'CBMMG-Proxy-App/1.0',
  };
  if (ORIGIN_SECRET) {
    headers['X-Origin-Secret'] = ORIGIN_SECRET;
  }
  return headers;
}

let ultimoAcessoRemoto = 0;
let cacheAtivos: any = null;
let cacheCatalogos: any = null;
let cacheNaturezas: any = null;
let cacheUnidadesServico: any = null;
let ultimaAtualizacao = new Date().toISOString();

// Carregar snapshot sintético de contingência caso disponível (sem dados pessoais reais)
try {
  const snapPath = path.resolve(__dirname, 'public/dados_cad.json');
  if (fs.existsSync(snapPath)) {
    cacheAtivos = sanitizarPayloadCadLgpd(JSON.parse(fs.readFileSync(snapPath, 'utf-8')));
  }
} catch (e) {
  console.warn('Snapshot inicial não carregado:', e);
}

try {
  const natPath = path.resolve(__dirname, 'public/cad_naturezas.json');
  if (fs.existsSync(natPath)) {
    cacheNaturezas = JSON.parse(fs.readFileSync(natPath, 'utf-8'));
  }
} catch (e) {
  console.warn('Snapshot de naturezas não carregado:', e);
}

try {
  const unPath = path.resolve(__dirname, 'public/cad_unidades_servico.json');
  if (fs.existsSync(unPath)) {
    cacheUnidadesServico = JSON.parse(fs.readFileSync(unPath, 'utf-8'));
  }
} catch (e) {
  console.warn('Snapshot de unidades de serviço não carregado:', e);
}

// Rota de status do backend intermediário (sem expor endereço da origem)
app.get('/api/cbm/status', (req, res) => {
  res.json({
    sucesso: true,
    servico: 'CBMMG CAD Gateway Seguro',
    ultimaAtualizacao,
    cacheAtivosPresente: !!cacheAtivos,
    totalAtivosEmCache: cacheAtivos?.total || 0,
    timestamp: new Date().toISOString(),
  });
});

// Testar conexão com a origem (/codigos)
app.get('/api/cbm/test-connection', async (req, res) => {
  const agora = Date.now();
  const tempoDesdeUltimo = (agora - ultimoAcessoRemoto) / 1000;
  if (tempoDesdeUltimo < 5) {
    await new Promise((resolve) => setTimeout(resolve, (5 - tempoDesdeUltimo) * 1000));
  }
  ultimoAcessoRemoto = Date.now();

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const resp = await fetch(`${PROXY_REVERSO_URL}/codigos`, {
      headers: buildUpstreamHeaders(),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (resp.ok) {
      const data = await resp.json();
      cacheCatalogos = data;
      return res.json({
        sucesso: true,
        mensagem: 'Conexão validada com sucesso via gateway seguro (HTTP 200).',
        dados: data,
      });
    } else {
      return res.json({
        sucesso: false,
        mensagem: `Origem retornou status HTTP ${resp.status}.`,
      });
    }
  } catch {
    return res.json({
      sucesso: false,
      mensagem: 'Falha ao validar conectividade com o serviço de origem.',
    });
  }
});

// Catálogo Oficial de Códigos (/codigos)
app.get('/api/cbm/codigos', async (req, res) => {
  if (cacheCatalogos) {
    return res.json(cacheCatalogos);
  }
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const resp = await fetch(`${PROXY_REVERSO_URL}/codigos`, {
      headers: buildUpstreamHeaders(),
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (resp.ok) {
      const data = await resp.json();
      cacheCatalogos = data;
      return res.json(data);
    }
  } catch {
    // retorna fallback abaixo
  }
  return res.status(502).json({ sucesso: false, mensagem: 'Catálogo indisponível no momento.' });
});

// Catálogo Oficial de Naturezas (GET /dados-auxiliares/naturezas conforme Regra 2)
app.get('/api/cbm/naturezas', async (req, res) => {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const resp = await fetch(`${PROXY_REVERSO_URL}/dados-auxiliares/naturezas`, {
      headers: buildUpstreamHeaders(),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (resp.ok) {
      const data = await resp.json();
      cacheNaturezas = data;
      return res.json({
        sucesso: true,
        fonte: 'Gateway Seguro (/api/cbm/naturezas)',
        total: data.total || (data.dados?.value ? data.dados.value.length : 0),
        dados: data,
      });
    }
  } catch (err: any) {
    console.warn(`Falha ao buscar naturezas remotas (${err.message}). Servindo do cache local...`);
  }

  if (cacheNaturezas) {
    return res.json({
      sucesso: true,
      fonte: 'Cache Local / Catálogo de Contingência',
      total: cacheNaturezas.total || (cacheNaturezas.dados?.value ? cacheNaturezas.dados.value.length : 0),
      dados: cacheNaturezas,
    });
  }

  return res.status(500).json({
    sucesso: false,
    mensagem: 'Não foi possível carregar o catálogo de naturezas.',
  });
});

// Catálogo Oficial de Unidades de Serviço (GET /dados-auxiliares/unidades-servico)
app.get('/api/cbm/unidades-servico', async (req, res) => {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const resp = await fetch(`${PROXY_REVERSO_URL}/dados-auxiliares/unidades-servico`, {
      headers: buildUpstreamHeaders(),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (resp.ok) {
      const data = await resp.json();
      cacheUnidadesServico = data;
      return res.json({
        sucesso: true,
        fonte: 'Gateway Seguro (/api/cbm/unidades-servico)',
        total: data.total || (data.dados?.value ? data.dados.value.length : 0),
        dados: data,
      });
    }
  } catch (err: any) {
    console.warn(`Falha ao buscar unidades de serviço remotas (${err.message}). Servindo do cache local...`);
  }

  if (cacheUnidadesServico) {
    return res.json({
      sucesso: true,
      fonte: 'Cache Local / Catálogo de Contingência',
      total: cacheUnidadesServico.total || (cacheUnidadesServico.dados?.value ? cacheUnidadesServico.dados.value.length : 0),
      dados: cacheUnidadesServico,
    });
  }

  return res.status(500).json({
    sucesso: false,
    mensagem: 'Não foi possível carregar o catálogo de unidades de serviço.',
  });
});

// Sincronização /ativos com sanitização LGPD e espaçamento >= 30s
app.get('/api/cbm/sync', async (req, res) => {
  const agora = Date.now();
  const tempoDesdeUltimo = (agora - ultimoAcessoRemoto) / 1000;

  if (tempoDesdeUltimo < 30 && cacheAtivos) {
    return res.json({
      sucesso: true,
      fonte: 'Gateway Seguro (Cache Intermediário)',
      aviso: 'Espaçamento de segurança ativo (≥30s). Dados servidos do cache intermediário.',
      dados: cacheAtivos,
      atualizado_em: ultimaAtualizacao,
    });
  }

  ultimoAcessoRemoto = Date.now();

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);

    const resp = await fetch(`${PROXY_REVERSO_URL}/ativos`, {
      headers: buildUpstreamHeaders(),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (resp.ok) {
      const rawJson = await resp.json();
      const sanitizado = sanitizarPayloadCadLgpd(rawJson);
      cacheAtivos = sanitizado;
      ultimaAtualizacao = new Date().toISOString();
      return res.json({
        sucesso: true,
        fonte: 'Gateway Seguro (/api/cbm/sync)',
        dados: sanitizado,
        atualizado_em: ultimaAtualizacao,
      });
    } else if (resp.status === 429) {
      return res.json({
        sucesso: true,
        fonte: 'Gateway Seguro (Contingência Rate Limit)',
        aviso: 'Rate limit (HTTP 429) detectado. Servindo ocorrências do cache intermediário.',
        dados: cacheAtivos,
        atualizado_em: ultimaAtualizacao,
      });
    } else {
      return res.json({
        sucesso: false,
        aviso: `Origem retornou código ${resp.status}. Mantendo cache local.`,
        dados: cacheAtivos,
      });
    }
  } catch {
    return res.json({
      sucesso: false,
      aviso: 'Falha ao alcançar origem. Mantendo cache local ativo.',
      dados: cacheAtivos,
    });
  }
});

// Configuração do Servidor Frontend (Vite middlewares em Dev ou estáticos em Prod)
async function startServer() {
  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      configFile: path.resolve(__dirname, 'vite.config.ts'),
      server: { middlewareMode: true, port, hmr: false, watch: null },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`[CBMMG CAD Dashboard] Servidor iniciado na porta ${port}`);
  });
}

startServer();
