import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = parseInt(process.env.PORT || '3000', 10);
const isProd = process.env.NODE_ENV === 'production';

app.use(express.json({ limit: '10mb' }));

// Configurações e Estado do Daemon Intermediário em Memória / Arquivo
const BASE_CBM_API = 'https://apicadbm.bombeiros.mg.gov.br';
let ultimoAcessoRemoto = 0;
let cacheAtivos: any = null;
let cacheCatalogos: Record<string, any> = {};
let ultimaAtualizacao = new Date().toISOString();

// Rota de status do backend intermediário
app.get('/api/cbm/status', (req, res) => {
  res.json({
    sucesso: true,
    servico: 'CBMMG CAD Intermediary Proxy & Cache',
    modo: 'Polite Daemon Active',
    intervaloMinimoSegundos: 6,
    ultimaAtualizacao,
    cacheAtivosPresente: !!cacheAtivos,
    totalAtivosEmCache: cacheAtivos?.total || 0,
    timestamp: new Date().toISOString(),
  });
});

// Testar conexão com a API do CBMMG (/codigos conforme Seção 6 do manual)
app.post('/api/cbm/test-connection', async (req, res) => {
  const token = req.body?.token || process.env.CBM_API_TOKEN;
  if (!token) {
    return res.json({
      sucesso: false,
      mensagem: 'Nenhum token fornecido. O sistema está operando no modo de simulação com cache local.',
    });
  }

  // Garantir intervalo de segurança de 6s
  const agora = Date.now();
  const tempoDesdeUltimo = (agora - ultimoAcessoRemoto) / 1000;
  if (tempoDesdeUltimo < 6) {
    await new Promise((resolve) => setTimeout(resolve, (6 - tempoDesdeUltimo) * 1000));
  }
  ultimoAcessoRemoto = Date.now();

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const resp = await fetch(`${BASE_CBM_API}/codigos`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'User-Agent': 'CBMMG-Proxy-App/1.0',
      },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (resp.status === 200) {
      const data = await resp.json();
      return res.json({
        sucesso: true,
        mensagem: 'Conexão validada com sucesso! Resposta 200 recebida da API CAD CBMMG.',
        dados: data,
      });
    } else if (resp.status === 401) {
      return res.status(401).json({
        sucesso: false,
        mensagem: 'Erro 401: Credencial inválida. O token não é válido ou foi revogado.',
      });
    } else if (resp.status === 429) {
      const retryAfter = resp.headers.get('Retry-After') || '30';
      return res.status(429).json({
        sucesso: false,
        mensagem: `Erro 429: Rate limit atingido. Aguarde ${retryAfter}s conforme orientação do manual.`,
      });
    } else {
      return res.json({
        sucesso: false,
        mensagem: `Servidor retornou status HTTP ${resp.status}`,
      });
    }
  } catch (err: any) {
    const isTimeout = err.name === 'AbortError' || err.message?.includes('aborted') || err.message?.includes('timeout');
    const msg = isTimeout
      ? `Bloqueio de IP do Firewall PRODEMGE: A rede do Governo de MG bloqueou a conexão originada da nuvem pública (Timeout de conexão). Para integrar em tempo real, execute o agente local (python cbmmg_bridge.py) e ative a opção "Agente Local (127.0.0.1:8080)" no painel.`
      : `Erro ao conectar com ${BASE_CBM_API}: ${err.message}. Operando em modo de contingência com cache local.`;

    return res.json({
      sucesso: false,
      bloqueioProdemge: isTimeout,
      mensagem: msg,
    });
  }
});

// Sincronização /ativos com respeito estrito às 3 regras do manual
app.post('/api/cbm/sync', async (req, res) => {
  const token = req.body?.token || process.env.CBM_API_TOKEN;
  const agora = Date.now();
  const tempoDesdeUltimo = (agora - ultimoAcessoRemoto) / 1000;

  if (tempoDesdeUltimo < 6) {
    const espera = Math.ceil(6 - tempoDesdeUltimo);
    return res.json({
      sucesso: false,
      aviso: `Regra de Ouro #3: Espaçamento de segurança ativo. Próxima requisição permitida em ${espera} segundos.`,
      dados: cacheAtivos,
      atualizado_em: ultimaAtualizacao,
    });
  }

  if (!token) {
    return res.json({
      sucesso: true,
      aviso: 'Token remoto não configurado. Mantendo ocorrências do cache enriquecido.',
      dados: cacheAtivos,
      atualizado_em: ultimaAtualizacao,
    });
  }

  ultimoAcessoRemoto = Date.now();

  try {
    const resp = await fetch(`${BASE_CBM_API}/ativos`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'User-Agent': 'CBMMG-Proxy-App/1.0',
      },
    });

    if (resp.status === 200) {
      const json = await resp.json();
      cacheAtivos = json;
      ultimaAtualizacao = json.atualizado_em || new Date().toISOString();
      return res.json({
        sucesso: true,
        dados: json,
        atualizado_em: ultimaAtualizacao,
      });
    } else {
      return res.json({
        sucesso: false,
        aviso: `API retornou código ${resp.status}. Mantendo cache local.`,
        dados: cacheAtivos,
      });
    }
  } catch (e: any) {
    return res.json({
      sucesso: false,
      aviso: `Falha ao alcançar servidor da API CAD (${e.message}). Mantendo cache local ativo.`,
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
