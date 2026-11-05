import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = parseInt(process.env.PORT || '3000', 10);
const isProd = process.env.NODE_ENV === 'production';

app.use(express.json({ limit: '15mb' }));

// Configurações do Proxy Reverso Nginx CBMMG (CORS aberto, token injetado pelo Nginx)
const PROXY_REVERSO_URL = process.env.CBMMG_PROXY_URL || 'https://cobom-cad.duckdns.org';
let ultimoAcessoRemoto = 0;
let cacheAtivos: any = null;
let cacheCatalogos: any = null;
let cacheNaturezas: any = null;
let ultimaAtualizacao = new Date().toISOString();

// Carregar snapshot inicial em cache caso disponível
try {
  const snapPath = path.resolve(__dirname, 'public/cbmmg_cad_dados.json');
  if (fs.existsSync(snapPath)) {
    cacheAtivos = JSON.parse(fs.readFileSync(snapPath, 'utf-8'));
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

// Rota de status do backend intermediário
app.get('/api/cbm/status', (req, res) => {
  res.json({
    sucesso: true,
    servico: 'CBMMG CAD Intermediary Proxy & Cache',
    proxyReverso: PROXY_REVERSO_URL,
    regrasManual: {
      regra1_tokenSeguroServidor: 'Injetado pelo Nginx no proxy reverso (nunca exposto ao frontend)',
      regra2_catalogo6h: 'Catálogos auxiliares renovados a cada 6h com cache local',
      regra3_intervalo10min: 'Leitura de /ativos a cada 10 minutos (espaçamento mínimo de 30s)',
    },
    ultimaAtualizacao,
    cacheAtivosPresente: !!cacheAtivos,
    totalAtivosEmCache: cacheAtivos?.total || 0,
    timestamp: new Date().toISOString(),
  });
});

// Testar conexão com o proxy (/codigos conforme Seção 6 do manual)
app.all('/api/cbm/test-connection', async (req, res) => {
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
      headers: {
        Accept: 'application/json',
        'User-Agent': 'CBMMG-Proxy-App/1.0',
      },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (resp.ok) {
      const data = await resp.json();
      cacheCatalogos = data;
      return res.json({
        sucesso: true,
        mensagem: `Conexão validada com sucesso! HTTP 200 recebido do Proxy Reverso Nginx (${PROXY_REVERSO_URL}).`,
        dados: data,
      });
    } else {
      return res.json({
        sucesso: false,
        mensagem: `Proxy retornou status HTTP ${resp.status}`,
      });
    }
  } catch (err: any) {
    return res.json({
      sucesso: false,
      mensagem: `Erro ao conectar com ${PROXY_REVERSO_URL}: ${err.message}`,
    });
  }
});

// Catálogo Oficial de Naturezas (GET /dados-auxiliares/naturezas conforme Seção 10 / Regra 2)
app.all('/api/cbm/naturezas', async (req, res) => {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const resp = await fetch(`${PROXY_REVERSO_URL}/dados-auxiliares/naturezas`, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'CBMMG-Proxy-App/1.0',
      },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (resp.ok) {
      const data = await resp.json();
      cacheNaturezas = data;
      return res.json({
        sucesso: true,
        fonte: `${PROXY_REVERSO_URL}/dados-auxiliares/naturezas`,
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
      fonte: 'Cache Local / Snapshot Contingência',
      total: cacheNaturezas.total || (cacheNaturezas.dados?.value ? cacheNaturezas.dados.value.length : 0),
      dados: cacheNaturezas,
    });
  }

  return res.status(500).json({
    sucesso: false,
    mensagem: 'Não foi possível carregar o catálogo de naturezas.',
  });
});

// Sincronização /ativos com respeito estrito às 3 regras do manual
app.all('/api/cbm/sync', async (req, res) => {
  const agora = Date.now();
  const tempoDesdeUltimo = (agora - ultimoAcessoRemoto) / 1000;

  // Regra 3: Espaçamento de segurança de no mínimo 30s entre chamadas diretas
  if (tempoDesdeUltimo < 30 && cacheAtivos) {
    return res.json({
      sucesso: true,
      aviso: `Regra de Ouro #3: Espaçamento de segurança ativo (≥30s). Dados servidos do cache intermediário.`,
      dados: cacheAtivos,
      atualizado_em: ultimaAtualizacao,
    });
  }

  ultimoAcessoRemoto = Date.now();

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);

    const resp = await fetch(`${PROXY_REVERSO_URL}/ativos`, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'CBMMG-Proxy-App/1.0',
      },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (resp.ok) {
      const json = await resp.json();
      cacheAtivos = json;
      ultimaAtualizacao = new Date().toISOString();
      return res.json({
        sucesso: true,
        fonte: PROXY_REVERSO_URL,
        dados: json,
        atualizado_em: ultimaAtualizacao,
      });
    } else if (resp.status === 429) {
      return res.json({
        sucesso: true,
        aviso: 'Rate limit (HTTP 429) detectado. Servindo ocorrências do cache intermediário.',
        dados: cacheAtivos,
        atualizado_em: ultimaAtualizacao,
      });
    } else {
      return res.json({
        sucesso: false,
        aviso: `Proxy retornou código ${resp.status}. Mantendo cache local.`,
        dados: cacheAtivos,
      });
    }
  } catch (e: any) {
    return res.json({
      sucesso: false,
      aviso: `Falha ao alcançar proxy reverso (${e.message}). Mantendo cache local ativo.`,
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
    console.log(`[CBMMG CAD Dashboard] Conectado ao Proxy Reverso: ${PROXY_REVERSO_URL}`);
  });
}

startServer();
