import {
  CATALOGO_NATUREZAS_CBMMG,
  DICIONARIO_SIGLAS,
  UNIDADES_SERVICO_CBMMG,
  GRUPOS_NATUREZAS_CBMMG,
} from '../data/catalogoAuxiliares';
import { MOCK_CHAMADAS_INICIAIS } from '../data/mockChamadas';
import {
  ChamadaAtiva,
  CodigoOrigemChamada,
  CodigoSituacaoAtendimento,
  CodigoSituacaoChamada,
  CodigoSituacaoEmpenho,
  FiltrosOperacionais,
  KpiOperacional,
  RecursoEmpenhado,
} from '../types/cbm';

// Endereço oficial do Proxy Reverso Nginx configurado pelo usuário
export const PROXY_REVERSO_PADRAO = 'https://cobom-cad.duckdns.org';

const STORAGE_KEY_CHAMADAS = 'cbmmg_cad_chamadas_v1';
const STORAGE_KEY_ULTIMA_SYNC = 'cbmmg_cad_ultima_sync';
const STORAGE_KEY_CATALOGOS = 'cbmmg_cad_catalogos_v1';
const STORAGE_KEY_CATALOGOS_TS = 'cbmmg_cad_catalogos_ts';
const STORAGE_KEY_NATUREZAS = 'cbmmg_cad_naturezas_v1';
const STORAGE_KEY_NATUREZAS_TS = 'cbmmg_cad_naturezas_ts';
const STORAGE_KEY_PROXY_URL = 'cbmmg_cad_proxy_url';
const STORAGE_KEY_TOKEN = 'cbmmg_cad_api_token';

// Regras de Ouro do Manual CAD CBMMG
const INTERVALO_MINIMO_LEITURA_MS = 30 * 1000; // Regra 3: Mínimo 30 segundos (evita HTTP 429)
const INTERVALO_RENOVACAO_CATALOGO_MS = 6 * 3600 * 1000; // Regra 2: Renovação a cada 6 horas

let ultimoAcessoAtivosMs = 0;

// ==========================================
// ESTRUTURA OFICIAL CAD (GET /dados-auxiliares/naturezas)
// ==========================================

export interface NaturezaCadOficial {
  id: number;
  codigo: string;
  descricao: string;
  codigoPrioridade?: string;
  codigoTipoServico?: string;
  atividade?: boolean;
  emergencia?: boolean;
  permiteTentado?: boolean;
  dataHoraAtivacao?: number;
  dataHoraExpiracao?: number | null;
  codigosTiposServico?: string[];
}

const mapaNaturezasPorId = new Map<string, NaturezaCadOficial>();
const mapaNaturezasPorCodigo = new Map<string, NaturezaCadOficial>();
let tabelaNaturezasCarregada = false;

export function formatarCodigoNatureza(codigo: string): string {
  if (!codigo) return '';
  const clean = codigo.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  if (clean.length === 6 && /^[A-Z]\d{5}$/.test(clean)) {
    return `${clean.slice(0, 3)}.${clean.slice(3)}`;
  }
  return codigo.toUpperCase();
}

export function popularMapasNaturezas(lista: NaturezaCadOficial[]): void {
  if (!Array.isArray(lista) || lista.length === 0) return;
  for (const n of lista) {
    if (!n) continue;
    if (n.id !== undefined && n.id !== null) {
      mapaNaturezasPorId.set(String(n.id), n);
    }
    if (n.codigo) {
      const codNorm = n.codigo.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
      mapaNaturezasPorCodigo.set(codNorm, n);
      mapaNaturezasPorCodigo.set(n.codigo.toUpperCase(), n);
    }
  }
  tabelaNaturezasCarregada = true;
}

export function obterNaturezaCadPorId(id: string | number): NaturezaCadOficial | undefined {
  if (!id) return undefined;
  return mapaNaturezasPorId.get(String(id));
}

export function obterNaturezaCadPorCodigo(codigo: string): NaturezaCadOficial | undefined {
  if (!codigo) return undefined;
  const clean = codigo.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  return mapaNaturezasPorCodigo.get(clean) || mapaNaturezasPorCodigo.get(codigo.toUpperCase());
}

export function obterTotalNaturezasOficiaisCarregadas(): number {
  return mapaNaturezasPorId.size;
}

export function obterTodasNaturezasOficiais(): NaturezaCadOficial[] {
  const unicos = Array.from(new Set(mapaNaturezasPorId.values()));
  return unicos.sort((a, b) => a.codigo.localeCompare(b.codigo));
}

// ==========================================
// CONFIGURAÇÃO DO PROXY REVERSO & STORAGE
// ==========================================

export function obterProxyUrl(): string {
  try {
    return localStorage.getItem(STORAGE_KEY_PROXY_URL) || PROXY_REVERSO_PADRAO;
  } catch {
    return PROXY_REVERSO_PADRAO;
  }
}

export function salvarProxyUrl(url: string): void {
  try {
    if (url && url.trim()) {
      localStorage.setItem(STORAGE_KEY_PROXY_URL, url.trim().replace(/\/+$/, ''));
    } else {
      localStorage.removeItem(STORAGE_KEY_PROXY_URL);
    }
  } catch (e) {
    console.error('Falha ao salvar proxy URL:', e);
  }
}

export function obterTokenSalvo(): string {
  try {
    return localStorage.getItem(STORAGE_KEY_TOKEN) || '';
  } catch {
    return '';
  }
}

export function salvarToken(token: string): void {
  try {
    if (token) {
      localStorage.setItem(STORAGE_KEY_TOKEN, token.trim());
    } else {
      localStorage.removeItem(STORAGE_KEY_TOKEN);
    }
  } catch (e) {
    console.error('Falha ao salvar token:', e);
  }
}

export function normalizarChamadaSids(c: ChamadaAtiva): ChamadaAtiva {
  let codigo = c.codigoNatureza || '';
  let descricao = c.descricaoNatureza || '';
  let grupo = c.grupoNatureza || '';
  let letra = c.letraGrupoNatureza || '';

  // Se a tabela oficial CAD já estiver carregada, sincroniza descrição e código
  if (c.idNatureza) {
    const cad = obterNaturezaCadPorId(c.idNatureza);
    if (cad) {
      codigo = formatarCodigoNatureza(cad.codigo);
      descricao = cad.descricao;
      letra = cad.codigo.charAt(0).toUpperCase();
    }
  } else if (codigo) {
    const cad = obterNaturezaCadPorCodigo(codigo);
    if (cad) {
      codigo = formatarCodigoNatureza(cad.codigo);
      descricao = cad.descricao;
      letra = cad.codigo.charAt(0).toUpperCase();
    }
  }

  // Migra códigos ou grupos legados se presentes
  if (codigo.startsWith('A01') && (grupo.includes('Incêndio') || descricao.toLowerCase().includes('incêndio'))) {
    codigo = 'O' + codigo.slice(1);
    letra = 'O';
  } else if (codigo.startsWith('B02') || grupo.includes('Salvamento')) {
    codigo = 'S' + codigo.slice(1);
    letra = 'S';
  } else if (codigo.startsWith('C03') || grupo.includes('Pré-Hospitalar') || descricao.toLowerCase().includes('pcr')) {
    codigo = 'V' + codigo.slice(1);
    letra = 'V';
  } else if (codigo.startsWith('D04') || grupo.includes('Defesa Civil')) {
    codigo = 'R' + codigo.slice(1);
    letra = 'R';
  }

  if (!letra && codigo) {
    letra = codigo.charAt(0).toUpperCase();
  }

  let sitAtend = (c.codigoSituacaoAtendimentoChamada || 'CL').toUpperCase() as CodigoSituacaoAtendimento;
  let sitChamada = c.codigoSituacaoChamada;

  // 1. Chamadas "Aguardando" são aquelas com situação AO
  if (sitChamada === 'A' && (!sitAtend || sitAtend === 'CL')) {
    sitAtend = 'AO';
  }
  if (sitAtend === 'AO') {
    sitChamada = 'A';
  } else if (!sitChamada || sitChamada === 'A') {
    sitChamada = 'E';
  }

  // 2.1. Substituir cálculo inferido de bombeiros por recursos empenhados (sem TR)
  const recursosValidos = c.recursos || [];
  const recursosSemTr = recursosValidos.filter(
    (r) => (r.codigoSituacaoEmpenhoRecurso || '').toUpperCase() !== 'TR'
  );
  const totalRecursosSemTr = recursosSemTr.length;

  if (letra && GRUPOS_NATUREZAS_CBMMG[letra]) {
    const def = GRUPOS_NATUREZAS_CBMMG[letra];
    return {
      ...c,
      codigoNatureza: codigo,
      descricaoNatureza: descricao || c.descricaoNatureza,
      letraGrupoNatureza: letra,
      grupoNatureza: def.rotuloCompleto,
      categoriaNatureza: def.categoria,
      codigoSituacaoAtendimentoChamada: sitAtend,
      codigoSituacaoChamada: sitChamada,
      totalBombeiros: totalRecursosSemTr,
    };
  }

  return {
    ...c,
    codigoNatureza: codigo || 'S0101',
    descricaoNatureza: descricao || c.descricaoNatureza,
    letraGrupoNatureza: letra || 'S',
    grupoNatureza: c.grupoNatureza || 'S - REFERENTE À BUSCA E SALVAMENTO',
    categoriaNatureza: c.categoriaNatureza || 'CATEGORIA II - OCORRÊNCIAS TÍPICAS DE BOMBEIRO MILITAR',
    codigoSituacaoAtendimentoChamada: sitAtend,
    codigoSituacaoChamada: sitChamada,
    totalBombeiros: totalRecursosSemTr,
  };
}

export function carregarChamadasArmazenadas(): ChamadaAtiva[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CHAMADAS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map(normalizarChamadaSids);
      }
    }
  } catch (e) {
    console.error('Erro ao ler do localStorage:', e);
  }
  const padrao = MOCK_CHAMADAS_INICIAIS.map(normalizarChamadaSids);
  salvarChamadasArmazenadas(padrao);
  return padrao;
}

export function salvarChamadasArmazenadas(chamadas: ChamadaAtiva[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_CHAMADAS, JSON.stringify(chamadas));
    localStorage.setItem(STORAGE_KEY_ULTIMA_SYNC, new Date().toISOString());
  } catch (e) {
    console.error('Erro ao salvar no localStorage:', e);
  }
}

export function obterUltimaSync(): string {
  try {
    return localStorage.getItem(STORAGE_KEY_ULTIMA_SYNC) || new Date().toISOString();
  } catch {
    return new Date().toISOString();
  }
}

// ==========================================
// TABELAS AUXILIARES DO CAD (NATUREZAS E CÓDIGOS OPERACIONAIS)
// ==========================================

export async function sincronizarCatalogosAuxiliares(forcar = false): Promise<{ sucesso: boolean; renovado: boolean; dados: any }> {
  try {
    const agora = Date.now();
    const catSalvoStr = localStorage.getItem(STORAGE_KEY_CATALOGOS);

    // Se já carregado e não forçar, usa o cache local
    if (!forcar && catSalvoStr) {
      const dados = JSON.parse(catSalvoStr);
      return { sucesso: true, renovado: false, dados };
    }

    const proxy = obterProxyUrl();
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 6000);

    const res = await fetch(`${proxy}/codigos`, {
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });
    clearTimeout(t);

    if (res.ok) {
      const codigos = await res.json();
      localStorage.setItem(STORAGE_KEY_CATALOGOS, JSON.stringify(codigos));
      localStorage.setItem(STORAGE_KEY_CATALOGOS_TS, String(agora));
      return { sucesso: true, renovado: true, dados: codigos };
    }
  } catch (e) {
    console.warn('Não foi possível renovar catálogos remotos agora, mantendo catálogo local:', e);
  }

  return { sucesso: false, renovado: false, dados: DICIONARIO_SIGLAS };
}

// ==========================================
// TABELA OFICIAL DE NATUREZAS CAD (GET /dados-auxiliares/naturezas)
// ==========================================

export async function sincronizarTabelaNaturezas(
  forcar = false
): Promise<{ sucesso: boolean; renovado: boolean; total: number; fonte: string }> {
  const agora = Date.now();

  // 1. Se já populado em memória e não forçado
  if (!forcar && tabelaNaturezasCarregada && mapaNaturezasPorId.size > 0) {
    return { sucesso: true, renovado: false, total: mapaNaturezasPorId.size, fonte: 'Memória' };
  }

  // 2. Se não estiver em memória mas estiver em localStorage e não forçado
  if (!forcar && !tabelaNaturezasCarregada) {
    try {
      const salvo = localStorage.getItem(STORAGE_KEY_NATUREZAS);
      if (salvo) {
        const lista: NaturezaCadOficial[] = JSON.parse(salvo);
        if (Array.isArray(lista) && lista.length > 0) {
          popularMapasNaturezas(lista);
          return { sucesso: true, renovado: false, total: lista.length, fonte: 'LocalStorage Cache' };
        }
      }
    } catch {
      // continua para fetch
    }
  }

  const proxy = obterProxyUrl();
  let listaExtraida: NaturezaCadOficial[] | null = null;
  let fonteObtida = '';

  // 3. Tentar direto no proxy reverso Nginx: GET /dados-auxiliares/naturezas
  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(`${proxy}/dados-auxiliares/naturezas`, {
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });
    clearTimeout(t);
    if (res.ok) {
      const data = await res.json();
      const itens = data?.dados?.value || data?.dados || data;
      if (Array.isArray(itens) && itens.length > 0) {
        listaExtraida = itens;
        fonteObtida = `${proxy}/dados-auxiliares/naturezas`;
      }
    }
  } catch (e: any) {
    console.warn(`Tentativa de carregar naturezas de ${proxy} falhou (${e.message}). Tentando rotas de contingência...`);
  }

  // 4. Fallback: rota local Express /api/cbm/naturezas
  if (!listaExtraida) {
    try {
      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), 6000);
      const res = await fetch('/api/cbm/naturezas', {
        headers: { Accept: 'application/json' },
        signal: controller.signal,
      });
      clearTimeout(t);
      if (res.ok) {
        const data = await res.json();
        const itens = data?.dados?.dados?.value || data?.dados?.value || data?.dados;
        if (Array.isArray(itens) && itens.length > 0) {
          listaExtraida = itens;
          fonteObtida = '/api/cbm/naturezas (Backend Intermediário)';
        }
      }
    } catch {
      // continua para snapshot estático
    }
  }

  // 5. Fallback: snapshot estático local public/cad_naturezas.json
  if (!listaExtraida) {
    try {
      const res = await fetch('/cad_naturezas.json');
      if (res.ok) {
        const data = await res.json();
        const itens = data?.dados?.value || data?.dados || data;
        if (Array.isArray(itens) && itens.length > 0) {
          listaExtraida = itens;
          fonteObtida = 'Snapshot Local Contingência (/cad_naturezas.json)';
        }
      }
    } catch (e: any) {
      console.warn('Erro ao carregar snapshot local de naturezas:', e);
    }
  }

  if (listaExtraida && listaExtraida.length > 0) {
    popularMapasNaturezas(listaExtraida);
    try {
      localStorage.setItem(STORAGE_KEY_NATUREZAS, JSON.stringify(listaExtraida));
      localStorage.setItem(STORAGE_KEY_NATUREZAS_TS, String(agora));
    } catch {
      // Se estourar cota do localStorage, os mapas em memória já garantem o enriquecimento perfeito
    }
    return { sucesso: true, renovado: true, total: listaExtraida.length, fonte: fonteObtida };
  }

  return { sucesso: false, renovado: false, total: mapaNaturezasPorId.size, fonte: 'Nenhuma' };
}

export async function carregarTodasTabelasAuxiliares(forcar = true): Promise<{
  sucesso: boolean;
  totalNaturezas: number;
  codigos: any;
  fonte: string;
  mensagem: string;
}> {
  const [resNat, resCod] = await Promise.all([
    sincronizarTabelaNaturezas(forcar),
    sincronizarCatalogosAuxiliares(forcar),
  ]);
  const sucesso = resNat.sucesso || resCod.sucesso;
  return {
    sucesso,
    totalNaturezas: resNat.total || mapaNaturezasPorId.size,
    codigos: resCod.dados,
    fonte: resNat.fonte || 'Proxy CAD',
    mensagem: `Tabelas auxiliares sincronizadas com sucesso! ${resNat.total || mapaNaturezasPorId.size} naturezas oficiais e tabelas de códigos operacionais carregadas.`,
  };
}

// ==========================================
// CONSUMO DE /ativos COM CADÊNCIA DE 10 MINUTOS (≥ 30S)
// ==========================================

export async function sincronizarProxyReverso(
  forcar = false
): Promise<{ sucesso: boolean; mensagem: string; dados?: ChamadaAtiva[]; total?: number }> {
  const agora = Date.now();
  const tempoDesdeUltimo = agora - ultimoAcessoAtivosMs;

  // Proteção estrita do manual: nunca ler /ativos com intervalo < 30s
  if (!forcar && tempoDesdeUltimo < INTERVALO_MINIMO_LEITURA_MS) {
    const restante = Math.ceil((INTERVALO_MINIMO_LEITURA_MS - tempoDesdeUltimo) / 1000);
    const existentes = carregarChamadasArmazenadas();
    return {
      sucesso: true,
      mensagem: `Aguarde ${restante}s para nova requisição direta (Regra do Manual: intervalo ≥30s). Exibindo dados locais.`,
      dados: existentes,
      total: existentes.length,
    };
  }

  const proxyUrl = obterProxyUrl();
  let jsonResposta: any = null;
  let fonteUtilizada = 'Proxy Nginx (https://cobom-cad.duckdns.org)';

  try {
    // 1. Tentar direto no Proxy Reverso Nginx (CORS liberado, token injetado pelo Nginx)
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);

    const res = await fetch(`${proxyUrl}/ativos`, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (res.ok) {
      jsonResposta = await res.json();
      ultimoAcessoAtivosMs = Date.now();
    } else if (res.status === 429) {
      const existentes = carregarChamadasArmazenadas();
      return {
        sucesso: true,
        mensagem: 'HTTP 429 (Rate Limit): Servidor CAD solicitou espaçamento. Mantendo ocorrências em cache.',
        dados: existentes,
        total: existentes.length,
      };
    } else {
      throw new Error(`Proxy respondeu status HTTP ${res.status}`);
    }
  } catch (errProxy: any) {
    console.warn(`Tentativa direta no proxy reverso falhou (${errProxy.message}). Tentando fallback interno...`);

    // 2. Fallback via backend intermediário Express local
    try {
      const resBackend = await fetch('/api/cbm/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (resBackend.ok) {
        const data = await resBackend.json();
        if (data.sucesso && data.dados) {
          jsonResposta = data.dados;
          fonteUtilizada = 'Backend Intermediário Cache';
          ultimoAcessoAtivosMs = Date.now();
        }
      }
    } catch {
      // Ignora e tenta snapshot
    }

    // 3. Fallback snapshot estático
    if (!jsonResposta) {
      try {
        const snap = await fetch('/cbmmg_cad_dados.json');
        if (snap.ok) {
          jsonResposta = await snap.json();
          fonteUtilizada = 'Snapshot Local Contingência';
        }
      } catch {
        // Nada
      }
    }
  }

  if (!jsonResposta) {
    const existentes = carregarChamadasArmazenadas();
    return {
      sucesso: false,
      mensagem: `Não foi possível conectar ao Proxy em ${proxyUrl}. Mantendo ${existentes.length} chamadas do cache offline.`,
      dados: existentes,
      total: existentes.length,
    };
  }

  // Extrair chamadas do envelope oficial
  const chamadasBrutas = extrairChamadasDeJson(jsonResposta);
  if (chamadasBrutas.length === 0) {
    const existentes = carregarChamadasArmazenadas();
    return {
      sucesso: false,
      mensagem: `Proxy conectado, porém o envelope retornou 0 ocorrências ativas no momento.`,
      dados: existentes,
      total: existentes.length,
    };
  }

  // Renova tabela oficial de naturezas CAD (2.245 registros) e catálogos auxiliares a cada 6h
  await sincronizarTabelaNaturezas(false);
  sincronizarCatalogosAuxiliares().catch(() => {});

  // Enriquecer chamadas com tabela oficial de naturezas CAD, COB, BBM, coordenadas e tempos
  const enriquecidas = chamadasBrutas.map(enriquecerChamada);
  salvarChamadasArmazenadas(enriquecidas);

  return {
    sucesso: true,
    mensagem: `Conectado com sucesso via ${fonteUtilizada}! ${enriquecidas.length} chamadas ativas sincronizadas em tempo real.`,
    dados: enriquecidas,
    total: enriquecidas.length,
  };
}

// ==========================================
// EXTRATOR RESILIENTE DE CHAMADAS DO ENVELOPE CAD
// ==========================================

export function extrairChamadasDeJson(raw: any): any[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;

  // 1. Envelope oficial CBMMG retornado pelo Proxy Nginx:
  // raw.chamadas_ativas.dados.response.dadosVigentesChamadas.dadosVigentesChamadaV1
  if (raw.chamadas_ativas) {
    const ca = raw.chamadas_ativas;
    const resp = ca?.dados?.response || ca?.response || ca?.dados || ca;
    const vigentes = resp?.dadosVigentesChamadas?.dadosVigentesChamadaV1 || resp?.chamadas;
    if (Array.isArray(vigentes)) return vigentes;
    if (vigentes && typeof vigentes === 'object') return [vigentes];
    if (Array.isArray(resp)) return resp;
  }

  // 2. Variante direta dados.response.dadosVigentesChamadas.dadosVigentesChamadaV1
  if (raw.dados?.response?.dadosVigentesChamadas?.dadosVigentesChamadaV1) {
    const lista = raw.dados.response.dadosVigentesChamadas.dadosVigentesChamadaV1;
    return Array.isArray(lista) ? lista : [lista];
  }

  // 3. Variante response.dadosVigentesChamadas.dadosVigentesChamadaV1
  if (raw.response?.dadosVigentesChamadas?.dadosVigentesChamadaV1) {
    const lista = raw.response.dadosVigentesChamadas.dadosVigentesChamadaV1;
    return Array.isArray(lista) ? lista : [lista];
  }

  // 4. Variante dadosVigentesChamadas.dadosVigentesChamadaV1 na raiz
  if (raw.dadosVigentesChamadas?.dadosVigentesChamadaV1) {
    const lista = raw.dadosVigentesChamadas.dadosVigentesChamadaV1;
    return Array.isArray(lista) ? lista : [lista];
  }

  // 5. GeoJSON FeatureCollection
  if (Array.isArray(raw.features)) {
    return raw.features.map((feat: any) => {
      const props = feat.properties || {};
      if (feat.geometry && feat.geometry.type === 'Point' && Array.isArray(feat.geometry.coordinates)) {
        props.longitude = feat.geometry.coordinates[0];
        props.latitude = feat.geometry.coordinates[1];
      }
      return props;
    });
  }

  // 6. Chaves comuns
  if (Array.isArray(raw.chamadas)) return raw.chamadas;
  if (raw.chamadas && typeof raw.chamadas === 'object' && Array.isArray(raw.chamadas.dados)) {
    return raw.chamadas.dados;
  }
  if (Array.isArray(raw.dados)) return raw.dados;
  if (Array.isArray(raw.ativas)) return raw.ativas;
  if (Array.isArray(raw.ocorrencias)) return raw.ocorrencias;

  // 7. Varredura profunda
  for (const k of Object.keys(raw)) {
    const val = raw[k];
    if (Array.isArray(val) && val.length > 0 && typeof val[0] === 'object') {
      const primeiro = val[0];
      if (
        primeiro.id ||
        primeiro.numeroChamada ||
        primeiro.idChamada ||
        primeiro.numeroOcorrencia ||
        primeiro.municipio ||
        primeiro.codigoSituacaoChamada
      ) {
        return val;
      }
    }
  }

  return [];
}

// ==========================================
// MAPEAMENTO COMPLETO DE MUNICÍPIOS PARA COB E BBM
// ==========================================

const MUNICIPIOS_MG_COB_BBM: Record<string, { cob: string; bbm: string; ciaInd?: string }> = {
  // 1º COB - RMBH e Região Central / Centro-Oeste
  'BELO HORIZONTE': { cob: '1º COB', bbm: '1º BBM' },
  'CONTAGEM': { cob: '1º COB', bbm: '2º BBM' },
  'BETIM': { cob: '1º COB', bbm: '2º BBM' },
  'IBIRITE': { cob: '1º COB', bbm: '2º BBM' },
  'NOVA LIMA': { cob: '1º COB', bbm: '1º BBM' },
  'SABARA': { cob: '1º COB', bbm: '1º BBM' },
  'RIBEIRAO DAS NEVES': { cob: '1º COB', bbm: '3º BBM' },
  'SANTA LUZIA': { cob: '1º COB', bbm: '3º BBM' },
  'VESPASIANO': { cob: '1º COB', bbm: '3º BBM' },
  'LAGOA SANTA': { cob: '1º COB', bbm: '3º BBM' },
  'PEDRO LEOPOLDO': { cob: '1º COB', bbm: '3º BBM' },
  'CONFINS': { cob: '1º COB', bbm: '3º BBM' },
  'SAO JOSE DA LAPA': { cob: '1º COB', bbm: '3º BBM' },
  'BRUMADINHO': { cob: '1º COB', bbm: '2º BBM' },
  'SARZEDO': { cob: '1º COB', bbm: '2º BBM' },
  'MARIO CAMPOS': { cob: '1º COB', bbm: '2º BBM' },
  'SAO JOAQUIM DE BICAS': { cob: '1º COB', bbm: '2º BBM' },
  'IGARAPE': { cob: '1º COB', bbm: '2º BBM' },
  'JUATUBA': { cob: '1º COB', bbm: '2º BBM' },
  'MATEUS LEME': { cob: '1º COB', bbm: '2º BBM' },
  'ESMERALDAS': { cob: '1º COB', bbm: '2º BBM' },
  'DIVINOPOLIS': { cob: '1º COB', bbm: '10º BBM' },
  'ITAUNA': { cob: '1º COB', bbm: '10º BBM' },
  'PARA DE MINAS': { cob: '1º COB', bbm: '10º BBM' },
  'NOVA SERRANA': { cob: '1º COB', bbm: '10º BBM' },
  'BOM DESPACHO': { cob: '1º COB', bbm: '10º BBM' },
  'FORMIGA': { cob: '1º COB', bbm: '10º BBM' },
  'ARCOS': { cob: '1º COB', bbm: '10º BBM' },
  'CAMPO BELO': { cob: '1º COB', bbm: '10º BBM' },
  'OLIVEIRA': { cob: '1º COB', bbm: '10º BBM' },
  'SANTO ANTONIO DO MONTE': { cob: '1º COB', bbm: '10º BBM' },
  'CARMO DO CAJURU': { cob: '1º COB', bbm: '10º BBM' },
  'CARMO DA MATA': { cob: '1º COB', bbm: '10º BBM' },
  'CARMOPOLIS DE MINAS': { cob: '1º COB', bbm: '10º BBM' },
  'CLAUDIO': { cob: '1º COB', bbm: '10º BBM' },
  'LAGOA DA PRATA': { cob: '1º COB', bbm: '10º BBM' },
  'DORES DO INDAIA': { cob: '1º COB', bbm: '10º BBM' },
  'PITANGUI': { cob: '1º COB', bbm: '10º BBM' },
  'POMPEU': { cob: '1º COB', bbm: '10º BBM' },
  'CAETE': { cob: '1º COB', bbm: '1º BBM' },
  'RAPOSOS': { cob: '1º COB', bbm: '1º BBM' },
  'RIO ACIMA': { cob: '1º COB', bbm: '1º BBM' },
  'BONFIM': { cob: '1º COB', bbm: '2º BBM' },
  'CANA VERDE': { cob: '1º COB', bbm: '10º BBM' },
  'CANDEIAS': { cob: '1º COB', bbm: '10º BBM' },

  // 2º COB - Triângulo Mineiro e Alto Paranaíba
  'UBERLANDIA': { cob: '2º COB', bbm: '8º BBM' },
  'UBERABA': { cob: '2º COB', bbm: '5º BBM' },
  'ARAGUARI': { cob: '2º COB', bbm: '8º BBM' },
  'PATOS DE MINAS': { cob: '2º COB', bbm: '12º BBM' },
  'ARAXA': { cob: '2º COB', bbm: '5º BBM' },
  'ITUIUTABA': { cob: '2º COB', bbm: '8º BBM' },
  'PATROCINIO': { cob: '2º COB', bbm: '8º BBM' },
  'FRUTAL': { cob: '2º COB', bbm: '5º BBM' },
  'MONTE CARMELO': { cob: '2º COB', bbm: '8º BBM' },
  'SAO GOTARDO': { cob: '2º COB', bbm: '12º BBM' },
  'COROMANDEL': { cob: '2º COB', bbm: '8º BBM' },
  'CARMO DO PARANAIBA': { cob: '2º COB', bbm: '12º BBM' },
  'RIO PARANAIBA': { cob: '2º COB', bbm: '12º BBM' },
  'SACRAMENTO': { cob: '2º COB', bbm: '5º BBM' },
  'CONCEICAO DAS ALAGOAS': { cob: '2º COB', bbm: '5º BBM' },
  'ITURAMA': { cob: '2º COB', bbm: '5º BBM' },
  'CAMPINA VERDE': { cob: '2º COB', bbm: '8º BBM' },
  'PRATA': { cob: '2º COB', bbm: '8º BBM' },
  'TUPACIGUARA': { cob: '2º COB', bbm: '8º BBM' },
  'SANTA VITORIA': { cob: '2º COB', bbm: '8º BBM' },

  // 3º COB - Zona da Mata e Campo das Vertentes
  'JUIZ DE FORA': { cob: '3º COB', bbm: '4º BBM' },
  'BARBACENA': { cob: '3º COB', bbm: '4º BBM', ciaInd: '2ª Cia Ind' },
  'SAO JOAO DEL-REI': { cob: '3º COB', bbm: '4º BBM', ciaInd: '2ª Cia Ind' },
  'UBA': { cob: '3º COB', bbm: '4º BBM' },
  'MURIAE': { cob: '3º COB', bbm: '4º BBM' },
  'VICOSA': { cob: '3º COB', bbm: '4º BBM' },
  'LEOPOLDINA': { cob: '3º COB', bbm: '4º BBM' },
  'CATAGUASES': { cob: '3º COB', bbm: '4º BBM' },
  'SANTOS DUMONT': { cob: '3º COB', bbm: '4º BBM' },
  'MANHUACU': { cob: '3º COB', bbm: '4º BBM' },
  'PONTE NOVA': { cob: '3º COB', bbm: '4º BBM' },
  'CONSELHEIRO LAFAIETE': { cob: '3º COB', bbm: '4º BBM', ciaInd: '2ª Cia Ind' },
  'CONGONHAS': { cob: '3º COB', bbm: '4º BBM', ciaInd: '2ª Cia Ind' },
  'OURO BRANCO': { cob: '3º COB', bbm: '4º BBM', ciaInd: '2ª Cia Ind' },
  'TIRADENTES': { cob: '3º COB', bbm: '4º BBM', ciaInd: '2ª Cia Ind' },
  'BARROSO': { cob: '3º COB', bbm: '4º BBM', ciaInd: '2ª Cia Ind' },
  'ASTOLFO DUTRA': { cob: '3º COB', bbm: '4º BBM' },
  'MARIANA': { cob: '1º COB', bbm: '1º BBM' },
  'OURO PRETO': { cob: '1º COB', bbm: '1º BBM' },

  // 4º COB - Norte de Minas e Noroeste
  'MONTES CLAROS': { cob: '4º COB', bbm: '7º BBM' },
  'UNAI': { cob: '4º COB', bbm: '7º BBM' },
  'PARACATU': { cob: '4º COB', bbm: '7º BBM' },
  'JANUARIA': { cob: '4º COB', bbm: '7º BBM' },
  'DIAMANTINA': { cob: '4º COB', bbm: '7º BBM', ciaInd: '6ª Cia Ind' },
  'PIRAPORA': { cob: '4º COB', bbm: '7º BBM' },
  'BURITIZEIRO': { cob: '4º COB', bbm: '7º BBM' },
  'JANAUBA': { cob: '4º COB', bbm: '7º BBM' },
  'SALINAS': { cob: '4º COB', bbm: '7º BBM' },
  'BOCAIUVA': { cob: '4º COB', bbm: '7º BBM' },
  'SAO FRANCISCO': { cob: '4º COB', bbm: '7º BBM' },
  'BRASILIA DE MINAS': { cob: '4º COB', bbm: '7º BBM' },
  'JOAO PINHEIRO': { cob: '4º COB', bbm: '7º BBM' },
  'VAZANTE': { cob: '4º COB', bbm: '7º BBM' },
  'BURITIS': { cob: '4º COB', bbm: '7º BBM' },
  'CAPELINHA': { cob: '4º COB', bbm: '7º BBM', ciaInd: '6ª Cia Ind' },
  'ARACUAI': { cob: '4º COB', bbm: '7º BBM', ciaInd: '6ª Cia Ind' },
  'CARBONITA': { cob: '4º COB', bbm: '7º BBM', ciaInd: '6ª Cia Ind' },
  'BOTUMIRIM': { cob: '4º COB', bbm: '7º BBM' },
  'BUENOPOLIS': { cob: '4º COB', bbm: '7º BBM' },
  'BONITO DE MINAS': { cob: '4º COB', bbm: '7º BBM' },
  'CONCEICAO DO MATO DENTRO': { cob: '4º COB', bbm: '7º BBM', ciaInd: '6ª Cia Ind' },
  'SERRO': { cob: '4º COB', bbm: '7º BBM', ciaInd: '6ª Cia Ind' },

  // 5º COB - Leste de Minas e Vale do Aço
  'GOVERNADOR VALADARES': { cob: '5º COB', bbm: '6º BBM' },
  'IPATINGA': { cob: '5º COB', bbm: '11º BBM' },
  'CORONEL FABRICIANO': { cob: '5º COB', bbm: '11º BBM' },
  'TIMOTEO': { cob: '5º COB', bbm: '11º BBM' },
  'TEOFILO OTONI': { cob: '5º COB', bbm: '6º BBM' },
  'SETE LAGOAS': { cob: '1º COB', bbm: '3º BBM', ciaInd: '5ª Cia Ind' },
  'CURVELO': { cob: '1º COB', bbm: '3º BBM', ciaInd: '5ª Cia Ind' },
  'GUANHAES': { cob: '5º COB', bbm: '6º BBM' },
  'ALMENARA': { cob: '5º COB', bbm: '6º BBM' },
  'NANUQUE': { cob: '5º COB', bbm: '6º BBM' },
  'CARATINGA': { cob: '5º COB', bbm: '6º BBM' },
  'ITABIRA': { cob: '5º COB', bbm: '11º BBM' },
  'JOAO MONLEVADE': { cob: '5º COB', bbm: '11º BBM' },
  'AIMORES': { cob: '5º COB', bbm: '6º BBM' },
  'RESPLENDOR': { cob: '5º COB', bbm: '6º BBM' },
  'MANTENA': { cob: '5º COB', bbm: '6º BBM' },
  'BALDIM': { cob: '1º COB', bbm: '3º BBM', ciaInd: '5ª Cia Ind' },
  'CACHOEIRA DA PRATA': { cob: '1º COB', bbm: '3º BBM', ciaInd: '5ª Cia Ind' },
  'BOM JESUS DO AMPARO': { cob: '5º COB', bbm: '11º BBM' },

  // 6º COB - Sul de Minas
  'VARGINHA': { cob: '6º COB', bbm: '9º BBM' },
  'POCOS DE CALDAS': { cob: '6º COB', bbm: '9º BBM', ciaInd: '1ª Cia Ind' },
  'POUSO ALEGRE': { cob: '6º COB', bbm: '9º BBM', ciaInd: '7ª Cia Ind' },
  'LAVRAS': { cob: '6º COB', bbm: '9º BBM' },
  'PASSOS': { cob: '6º COB', bbm: '9º BBM' },
  'ITAJUBA': { cob: '6º COB', bbm: '9º BBM', ciaInd: '7ª Cia Ind' },
  'TRES CORACOES': { cob: '6º COB', bbm: '9º BBM' },
  'ALFENAS': { cob: '6º COB', bbm: '9º BBM' },
  'SAO LOURENCO': { cob: '6º COB', bbm: '9º BBM', ciaInd: '7ª Cia Ind' },
  'GUAXUPE': { cob: '6º COB', bbm: '9º BBM', ciaInd: '1ª Cia Ind' },
  'BOA ESPERANCA': { cob: '6º COB', bbm: '9º BBM' },
  'SAO SEBASTIAO DO PARAISO': { cob: '6º COB', bbm: '9º BBM' },
  'EXTREMA': { cob: '6º COB', bbm: '9º BBM', ciaInd: '7ª Cia Ind' },
  'CAMBUI': { cob: '6º COB', bbm: '9º BBM', ciaInd: '7ª Cia Ind' },
  'SANTA RITA DO SAPUCAI': { cob: '6º COB', bbm: '9º BBM', ciaInd: '7ª Cia Ind' },
  'MACHADO': { cob: '6º COB', bbm: '9º BBM' },
  'TRES PONTAS': { cob: '6º COB', bbm: '9º BBM' },
};

function normalizarTexto(txt: string): string {
  return (txt || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .trim();
}

// ==========================================
// ENRIQUECIMENTO INTELIGENTE DE OCORRÊNCIAS
// ==========================================

export function enriquecerChamada(chamadaRaw: any): ChamadaAtiva {
  const r = chamadaRaw || {};

  // 1. Número e Identificador
  const idChamada = String(r.idChamada || r.id || r.numeroChamada || `CAD-${Math.floor(100000 + Math.random() * 900000)}`);
  const numeroOcorrencia = String(r.numeroChamada || r.numeroOcorrencia || r.numero || idChamada);

  // 2. Data e Tempo Decorrido (suporte a epoch em milissegundos e strings ISO)
  let dataAberturaIso = new Date().toISOString();
  const rawData = r.dataHoraInclusao || r.dataHoraAbertura || r.dataAbertura || r.dataHora;

  if (rawData) {
    if (typeof rawData === 'number') {
      dataAberturaIso = new Date(rawData).toISOString();
    } else if (typeof rawData === 'string') {
      if (/^\d{10,13}$/.test(rawData.trim())) {
        dataAberturaIso = new Date(parseInt(rawData.trim(), 10)).toISOString();
      } else {
        const d = new Date(rawData);
        if (!isNaN(d.getTime())) {
          dataAberturaIso = d.toISOString();
        }
      }
    }
  }

  const timestampMs = new Date(dataAberturaIso).getTime();
  const tempoDecorridoMinutos = Math.max(1, Math.round((Date.now() - timestampMs) / 60000));

  // 3. Município e Endereço
  let municipio = (r.municipio || r.cidade || r.endereco?.municipio || 'BELO HORIZONTE').trim().toUpperCase();
  const logradouroCompleto = typeof r.endereco === 'string' ? r.endereco : (r.endereco?.logradouro || r.logradouro || 'Logradouro não informado');
  const referencia = r.referenciaLocalFato || r.endereco?.referencia || r.pontoReferencia || '';

  // 4. Coordenadas Geográficas (Parsing preciso de string para float com bounds de MG)
  let latitude: number | null = null;
  let longitude: number | null = null;

  const latRaw = r.latitude ?? r.lat;
  const lngRaw = r.longitude ?? r.lng ?? r.lon;

  if (latRaw !== undefined && latRaw !== null && latRaw !== '') {
    const latNum = typeof latRaw === 'number' ? latRaw : parseFloat(String(latRaw));
    if (!isNaN(latNum) && latNum >= -24.0 && latNum <= -13.0) {
      latitude = latNum;
    }
  }

  if (lngRaw !== undefined && lngRaw !== null && lngRaw !== '') {
    const lngNum = typeof lngRaw === 'number' ? lngRaw : parseFloat(String(lngRaw));
    if (!isNaN(lngNum) && lngNum >= -53.0 && lngNum <= -38.0) {
      longitude = lngNum;
    }
  }

  // 5. Histórico de Observações
  const historicoRaw =
    r.dadosVigentesHistoricosChamada?.dadosVigentesHistoricoChamadaV1 ||
    r.historicoObservacoes ||
    r.observacoes ||
    [];
  const listaHistoricos = Array.isArray(historicoRaw) ? historicoRaw : [historicoRaw];
  const historicosDesc = listaHistoricos
    .map((h: any) => (typeof h === 'string' ? h : h?.descricao))
    .filter(Boolean);
  const textoHistoricoUnificado = historicosDesc.join(' ').toUpperCase();

  // 6. Resolução Inteligente da Natureza e Grupo (Padrão Oficial CBMMG SIDS)
  let idNatureza = r.idNatureza;
  let codigoNatureza = r.codigoNatureza || '';
  let descricaoNatureza = r.descricaoNatureza || '';
  let grupoNatureza = r.grupoNatureza || '';
  let prioridade = r.prioridade || 'Média';
  let letraGrupoNatureza = '';
  let categoriaNatureza = '';

  // Extrair do bloco dadosVigentesNaturezasChamada da API CAD
  const natsBloco = r.dadosVigentesNaturezasChamada?.dadosVigentesNaturezaChamadaV1;
  const listaNats = Array.isArray(natsBloco) ? natsBloco : natsBloco ? [natsBloco] : [];

  if (listaNats.length > 0) {
    const primeiraNat = listaNats[0];
    if (primeiraNat.idNatureza) idNatureza = primeiraNat.idNatureza;
    if (primeiraNat.codigoNatureza) codigoNatureza = primeiraNat.codigoNatureza;
    if (primeiraNat.codigo) codigoNatureza = codigoNatureza || primeiraNat.codigo;
    if (primeiraNat.descricaoNatureza) descricaoNatureza = primeiraNat.descricaoNatureza;
    if (primeiraNat.descricao) descricaoNatureza = descricaoNatureza || primeiraNat.descricao;
    if (primeiraNat.codigoPrioridade === '1') prioridade = 'Alta';
    else if (primeiraNat.codigoPrioridade === '2') prioridade = 'Alta';
    else if (primeiraNat.codigoPrioridade === '3') prioridade = 'Média';
    else if (primeiraNat.codigoPrioridade === '4') prioridade = 'Baixa';
  }

  // 1º: Consultar na tabela oficial de naturezas CAD (GET /dados-auxiliares/naturezas com 2.245 itens)
  const cadOficial = (idNatureza ? obterNaturezaCadPorId(idNatureza) : undefined) ||
                     (codigoNatureza ? obterNaturezaCadPorCodigo(codigoNatureza) : undefined);

  if (cadOficial) {
    codigoNatureza = formatarCodigoNatureza(cadOficial.codigo);
    descricaoNatureza = cadOficial.descricao;
    if (cadOficial.codigoPrioridade === '1' || cadOficial.codigoPrioridade === '2') {
      prioridade = 'Alta';
    } else if (cadOficial.codigoPrioridade === '3') {
      prioridade = 'Média';
    } else if (cadOficial.codigoPrioridade === '4') {
      prioridade = 'Baixa';
    }
    letraGrupoNatureza = cadOficial.codigo.charAt(0).toUpperCase();
    const grupoDef = GRUPOS_NATUREZAS_CBMMG[letraGrupoNatureza];
    if (grupoDef) {
      grupoNatureza = grupoDef.rotuloCompleto;
      categoriaNatureza = grupoDef.categoria;
    } else {
      grupoNatureza = `${letraGrupoNatureza} - OUTRAS NATUREZAS SIDS / INTEGRADAS`;
      categoriaNatureza = 'CATEGORIA III - AÇÕES E OPERAÇÕES DECORRENTES DO SIDS';
    }
  } else if (codigoNatureza) {
    // 2º: Catálogo auxiliar local CBMMG
    const codNorm = codigoNatureza.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    const natCatalogo = CATALOGO_NATUREZAS_CBMMG.find((n) => {
      const nCodNorm = n.codigo.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
      return nCodNorm === codNorm || n.codigo.toUpperCase() === codigoNatureza.toUpperCase();
    });
    if (natCatalogo) {
      descricaoNatureza = descricaoNatureza || natCatalogo.descricao;
      grupoNatureza = natCatalogo.grupo;
      letraGrupoNatureza = natCatalogo.letraGrupo || codigoNatureza.charAt(0).toUpperCase();
      categoriaNatureza = natCatalogo.categoria || '';
    }
  } else if (idNatureza) {
    const natCatalogo = CATALOGO_NATUREZAS_CBMMG.find((n) => String(n.id) === String(idNatureza));
    if (natCatalogo) {
      descricaoNatureza = descricaoNatureza || natCatalogo.descricao;
      grupoNatureza = natCatalogo.grupo;
      codigoNatureza = natCatalogo.codigo;
      letraGrupoNatureza = natCatalogo.letraGrupo || codigoNatureza.charAt(0).toUpperCase();
      categoriaNatureza = natCatalogo.categoria || '';
    }
  }

  // Classificação semântica caso a descrição/código ainda não estejam mapeados
  if (!descricaoNatureza || descricaoNatureza === 'Atendimento Geral de Bombeiros' || !codigoNatureza) {
    if (textoHistoricoUnificado.includes('ABELHA') || textoHistoricoUnificado.includes('MARIMBONDO') || textoHistoricoUnificado.includes('VESPA') || textoHistoricoUnificado.includes('ENXAME')) {
      descricaoNatureza = 'Risco ou Ataque de Insetos / Abelhas';
      codigoNatureza = 'S04.002';
      letraGrupoNatureza = 'S';
    } else if (textoHistoricoUnificado.includes('ANIMAL') || textoHistoricoUnificado.includes('AVE') || textoHistoricoUnificado.includes('COBRA') || textoHistoricoUnificado.includes('SERPENTE') || textoHistoricoUnificado.includes('CACHORRO') || textoHistoricoUnificado.includes('GATO') || textoHistoricoUnificado.includes('CAVALO')) {
      descricaoNatureza = 'Captura ou Salvamento de Animal Silvestre / Serpente';
      codigoNatureza = 'S04.001';
      letraGrupoNatureza = 'S';
    } else if (textoHistoricoUnificado.includes('VEGETA') || textoHistoricoUnificado.includes('MATA') || textoHistoricoUnificado.includes('FLOREST') || textoHistoricoUnificado.includes('LOTE VAGO')) {
      descricaoNatureza = 'Incêndio em Vegetação / Florestal / Lote Vago';
      codigoNatureza = 'O01.001';
      letraGrupoNatureza = 'O';
      prioridade = 'Alta';
    } else if (textoHistoricoUnificado.includes('INCENDIO') || textoHistoricoUnificado.includes('FOGO') || textoHistoricoUnificado.includes('FUMACA')) {
      if (textoHistoricoUnificado.includes('VEICULO') || textoHistoricoUnificado.includes('CARRO') || textoHistoricoUnificado.includes('MOTO') || textoHistoricoUnificado.includes('CAMINHAO')) {
        descricaoNatureza = 'Incêndio em Veículo Automotor';
        codigoNatureza = 'O01.004';
      } else {
        descricaoNatureza = 'Incêndio em Edificação Residencial / Comercial';
        codigoNatureza = 'O01.002';
      }
      letraGrupoNatureza = 'O';
      prioridade = 'Alta';
    } else if (textoHistoricoUnificado.includes('COLISAO') || textoHistoricoUnificado.includes('ACIDENTE') || textoHistoricoUnificado.includes('CAPOTAMENTO') || textoHistoricoUnificado.includes('ATROPELAMENTO') || textoHistoricoUnificado.includes('FERRAGENS')) {
      descricaoNatureza = 'Acidente de Trânsito com Vítima Presa às Ferragens';
      codigoNatureza = 'S01.001';
      letraGrupoNatureza = 'S';
      prioridade = 'Alta';
    } else if (textoHistoricoUnificado.includes('ARVORE') || textoHistoricoUnificado.includes('GALHO')) {
      descricaoNatureza = 'Corte ou Risco de Queda de Árvore';
      codigoNatureza = 'R01.003';
      letraGrupoNatureza = 'R';
    } else if (textoHistoricoUnificado.includes('DESABAMENTO') || textoHistoricoUnificado.includes('SOTERRAMENTO') || textoHistoricoUnificado.includes('TRINCA') || textoHistoricoUnificado.includes('COLAPSO')) {
      descricaoNatureza = 'Risco Iminente de Desabamento / Colapso Estrutural';
      codigoNatureza = 'R01.001';
      letraGrupoNatureza = 'R';
      prioridade = 'Alta';
    } else if (textoHistoricoUnificado.includes('ALAGAMENTO') || textoHistoricoUnificado.includes('INUNDA') || textoHistoricoUnificado.includes('ENXURRADA') || textoHistoricoUnificado.includes('ILHADA')) {
      descricaoNatureza = 'Alagamento / Inundação com Pessoas Ilhadas';
      codigoNatureza = 'R01.002';
      letraGrupoNatureza = 'R';
      prioridade = 'Alta';
    } else if (textoHistoricoUnificado.includes('PCR') || textoHistoricoUnificado.includes('PARADA') || textoHistoricoUnificado.includes('TRAUMA') || textoHistoricoUnificado.includes('MAL SUBITO') || textoHistoricoUnificado.includes('CONVULSAO')) {
      descricaoNatureza = 'Atendimento Pré-Hospitalar / PCR / Trauma';
      codigoNatureza = 'V01.001';
      letraGrupoNatureza = 'V';
      prioridade = 'Alta';
    } else if (textoHistoricoUnificado.includes('AFOGAMENTO') || textoHistoricoUnificado.includes('RIO') || textoHistoricoUnificado.includes('LAGOA') || textoHistoricoUnificado.includes('REPRESA')) {
      descricaoNatureza = 'Salvamento Aquático / Afogamento em Andamento';
      codigoNatureza = 'S02.001';
      letraGrupoNatureza = 'S';
      prioridade = 'Alta';
    } else if (textoHistoricoUnificado.includes('GAS') || textoHistoricoUnificado.includes('GLP') || textoHistoricoUnificado.includes('VAZAMENTO') || textoHistoricoUnificado.includes('EXPLOSA')) {
      descricaoNatureza = 'Explosão / Vazamento de GLP ou Combustível';
      codigoNatureza = 'O02.001';
      letraGrupoNatureza = 'O';
      prioridade = 'Alta';
    } else if (textoHistoricoUnificado.includes('PERICIA') || textoHistoricoUnificado.includes('INSPECAO') || textoHistoricoUnificado.includes('VISTORIA') || textoHistoricoUnificado.includes('PREVENCAO')) {
      descricaoNatureza = 'Vistoria Preventiva Operacional em Edificação';
      codigoNatureza = 'P01.001';
      letraGrupoNatureza = 'P';
    } else {
      descricaoNatureza = 'Atendimento Operacional Bombeiro Militar';
      codigoNatureza = 'S03.001';
      letraGrupoNatureza = 'S';
    }
  }

  // Se a letra do grupo ainda não foi identificada, pega da primeira letra do código
  if (!letraGrupoNatureza && codigoNatureza) {
    letraGrupoNatureza = codigoNatureza.charAt(0).toUpperCase();
  }

  // Preenche grupoNatureza e categoriaNatureza oficial a partir da letra
  if (letraGrupoNatureza && GRUPOS_NATUREZAS_CBMMG[letraGrupoNatureza]) {
    const def = GRUPOS_NATUREZAS_CBMMG[letraGrupoNatureza];
    grupoNatureza = def.rotuloCompleto;
    categoriaNatureza = def.categoria;
  } else if (!grupoNatureza) {
    grupoNatureza = 'S - REFERENTE À BUSCA E SALVAMENTO';
    categoriaNatureza = 'CATEGORIA II - OCORRÊNCIAS TÍPICAS DE BOMBEIRO MILITAR';
    letraGrupoNatureza = 'S';
  }

  // 7. Recursos Empenhados e Bombeiros
  const recursos: RecursoEmpenhado[] = [];
  let totalBombeiros = 0;

  // Analisar atendimentos e empenhos da chamada
  const atendimentosRaw =
    r.dadosVigentesAtendimentosChamada?.dadosVigentesAtendimentoChamadaV1 ||
    r.atendimentos ||
    [];
  const listaAtendimentos = Array.isArray(atendimentosRaw) ? atendimentosRaw : [atendimentosRaw];

  let idUnidadeServico = r.idUnidadeServico;
  let codSituacaoAtendimento: CodigoSituacaoAtendimento = (r.codigoSituacaoAtendimentoChamada || 'CL') as CodigoSituacaoAtendimento;

  for (const at of listaAtendimentos) {
    if (!at) continue;
    if (at.idUnidadeServicoResponsavel) {
      idUnidadeServico = at.idUnidadeServicoResponsavel;
    }
    if (at.codigoSituacaoAtendimentoChamada) {
      codSituacaoAtendimento = at.codigoSituacaoAtendimentoChamada as CodigoSituacaoAtendimento;
    }

    const empenhosObj = at.dadosVigentesEmpenhosRecursos?.dadosVigentesEmpenhoRecursoChamadaV1;
    const empenhosLista = Array.isArray(empenhosObj) ? empenhosObj : empenhosObj ? [empenhosObj] : [];

    for (const emp of empenhosLista) {
      const prefixo = emp.prefixo || emp.prefixoMeioMaterial || `VTR-${emp.idRecurso || 'CAD'}`;
      const componentesObj = emp.dadosVigentesComponenteRecursoV1 || emp.componentes || [];
      const componentesLista = Array.isArray(componentesObj) ? componentesObj : [componentesObj];
      const militares = componentesLista.map((c: any) => c?.nomePessoa || c?.nome || 'Militar CBMMG');
      const qtdMilitares = militares.length > 0 ? militares.length : 3;
      totalBombeiros += qtdMilitares;

      recursos.push({
        idRecurso: String(emp.idRecurso || emp.id || prefixo),
        prefixo,
        codigoSituacaoEmpenhoRecurso: (emp.codigoSituacaoEmpenhoRecurso || emp.codigoSituacaoRecurso || 'ED') as CodigoSituacaoEmpenho,
        codigoSituacaoRecurso: (emp.codigoSituacaoRecurso || 'ED') as CodigoSituacaoEmpenho,
        idUnidadeServico: emp.idUnidadeServico || idUnidadeServico,
        unidadeNome: `${r.bbm || 'CBMMG'}`,
        componentes: qtdMilitares,
        nomesMilitares: militares,
        dataHoraAtivacao: emp.dataHoraInicio ? new Date(parseInt(String(emp.dataHoraInicio), 10)).toISOString() : undefined,
      });
    }
  }

  // 8. Resolução Territorial do CBMMG (COB, BBM e CIA IND por Município)
  const munNorm = normalizarTexto(municipio);
  let cob = r.cob || '';
  let bbm = r.bbm || '';
  let ciaInd = r.ciaInd;

  if (MUNICIPIOS_MG_COB_BBM[munNorm]) {
    const un = MUNICIPIOS_MG_COB_BBM[munNorm];
    cob = un.cob;
    bbm = un.bbm;
    ciaInd = un.ciaInd;
  } else {
    // Tenta correspondência parcial por sede do cadastro de unidades
    const unMatch = UNIDADES_SERVICO_CBMMG.find((u) => normalizarTexto(u.municipioSede) === munNorm);
    if (unMatch) {
      cob = unMatch.cob;
      bbm = unMatch.bbm;
      ciaInd = unMatch.ciaInd;
    } else {
      cob = '1º COB';
      bbm = '1º BBM';
    }
  }

  // Fallback de coordenadas para sede do município caso a API tenha retornado sem GPS
  if (latitude === null || longitude === null) {
    const unSede = UNIDADES_SERVICO_CBMMG.find((u) => u.bbm === bbm && u.latitudeSede);
    if (unSede && unSede.latitudeSede && unSede.longitudeSede) {
      latitude = unSede.latitudeSede + (Math.random() - 0.5) * 0.03;
      longitude = unSede.longitudeSede + (Math.random() - 0.5) * 0.03;
    } else {
      latitude = -19.92 + (Math.random() - 0.5) * 0.05;
      longitude = -43.94 + (Math.random() - 0.5) * 0.05;
    }
  }

  // 1. Chamadas "Aguardando" são aquelas com situação AO
  const isAguardando = (codSituacaoAtendimento || '').toUpperCase() === 'AO';
  const codSituacaoChamada: CodigoSituacaoChamada = isAguardando ? 'A' : 'E';

  // 2.1. Substituir cálculo inferido de bombeiros por recursos empenhados (sem a situação TR)
  const recursosSemTr = recursos.filter(
    (rec) => (rec.codigoSituacaoEmpenhoRecurso || '').toUpperCase() !== 'TR'
  );
  const totalRecursosSemTr = recursosSemTr.length;

  return {
    idChamada,
    numeroOcorrencia,
    dataHoraAbertura: dataAberturaIso,
    codigoSituacaoChamada: codSituacaoChamada,
    codigoSituacaoAtendimentoChamada: codSituacaoAtendimento,
    codigoOrigemChamada: (r.codigoOrigemChamada || 'L') as CodigoOrigemChamada,
    prioridade,
    idNatureza,
    codigoNatureza,
    descricaoNatureza,
    grupoNatureza,
    letraGrupoNatureza,
    categoriaNatureza,
    endereco: {
      logradouro: logradouroCompleto,
      numero: r.endereco?.numero || '',
      bairro: r.endereco?.bairro || '',
      municipio,
      uf: 'MG',
      referencia,
    },
    latitude,
    longitude,
    cob,
    bbm,
    ciaInd,
    idUnidadeServico,
    nomeUnidade: `${bbm} - CBMMG`,
    recursos,
    totalBombeiros: totalRecursosSemTr,
    tempoDecorridoMinutos,
    historicoObservacoes: historicosDesc.length > 0 ? historicosDesc : ['Registro sincronizado via Proxy Reverso Nginx CBMMG.'],
    orgaoApoio: r.orgaoApoio,
  };
}

// ==========================================
// FILTROS OPERACIONAIS
// ==========================================

export function filtrarChamadas(chamadas: ChamadaAtiva[], filtros: FiltrosOperacionais): ChamadaAtiva[] {
  const agora = Date.now();

  return chamadas.filter((c) => {
    // 1. Filtro COB (multi-select com suporte a retrocompatibilidade)
    const cobsAtivos = filtros.cobs && filtros.cobs.length > 0
      ? filtros.cobs.filter((cob) => cob !== 'TODOS')
      : (filtros.cob && filtros.cob !== 'TODOS' ? [filtros.cob] : []);
    if (cobsAtivos.length > 0 && !cobsAtivos.includes(c.cob)) {
      return false;
    }

    // 2. Filtro BBM (multi-select com suporte a retrocompatibilidade)
    const bbmsAtivos = filtros.bbms && filtros.bbms.length > 0
      ? filtros.bbms.filter((bbm) => bbm !== 'TODOS')
      : (filtros.bbm && filtros.bbm !== 'TODOS' ? [filtros.bbm] : []);
    if (bbmsAtivos.length > 0 && !bbmsAtivos.includes(c.bbm)) {
      return false;
    }

    // 3. Filtro CIA IND (multi-select com suporte a retrocompatibilidade)
    const ciasAtivas = filtros.ciasInd && filtros.ciasInd.length > 0
      ? filtros.ciasInd.filter((cia) => cia !== 'TODOS')
      : (filtros.ciaInd && filtros.ciaInd !== 'TODOS' ? [filtros.ciaInd] : []);
    if (ciasAtivas.length > 0) {
      if (!c.ciaInd || !ciasAtivas.includes(c.ciaInd)) {
        return false;
      }
    }

    // 4. Filtro Multi-seleção de Naturezas Oficiais e Grupos SIDS
    const naturezasFiltro = (filtros.naturezas || []).filter((n) => n && n !== 'TODOS');
    if (naturezasFiltro.length > 0) {
      const letraChamada = (
        c.letraGrupoNatureza ||
        c.codigoNatureza?.charAt(0) ||
        ''
      ).toUpperCase();
      const codChamadaNorm = (c.codigoNatureza || '').replace(/[^A-Za-z0-9]/g, '').toUpperCase();
      const idChamadaStr = c.idNatureza ? String(c.idNatureza) : '';

      const matchAlgumaNatureza = naturezasFiltro.some((val) => {
        const valUpper = val.toUpperCase();
        const valNorm = val.replace(/[^A-Za-z0-9]/g, '').toUpperCase();

        // 1. Categoria macro
        if (valUpper === 'CAT_II') return ['O', 'P', 'R', 'S', 'V'].includes(letraChamada);
        if (valUpper === 'CAT_III') return ['A', 'Q', 'W', 'Y', 'X', 'U'].includes(letraChamada);

        // 2. Grupo por letra única (O, P, R, S, V, A, Q, W, Y, X, U)
        if (valUpper.length === 1 && valUpper === letraChamada) return true;
        if (valUpper.startsWith('GRP_') && valUpper.endsWith(letraChamada)) return true;

        // 3. Código alfanumérico exato ou normalizado (ex: S06001 ou S06.001)
        if (c.codigoNatureza && c.codigoNatureza.toUpperCase() === valUpper) return true;
        if (codChamadaNorm && codChamadaNorm === valNorm) return true;

        // 4. ID CAD numérico
        if (idChamadaStr && (idChamadaStr === val || idChamadaStr === valUpper)) return true;

        // 5. Comparação por grupo completo
        if (c.grupoNatureza && c.grupoNatureza.toUpperCase() === valUpper) return true;

        return false;
      });

      if (!matchAlgumaNatureza) return false;
    } else if (filtros.naturezaGrupo && filtros.naturezaGrupo !== 'TODOS') {
      const letraChamada = (
        c.letraGrupoNatureza ||
        c.codigoNatureza?.charAt(0) ||
        ''
      ).toUpperCase();

      if (filtros.naturezaGrupo === 'CAT_II') {
        if (!['O', 'P', 'R', 'S', 'V'].includes(letraChamada)) return false;
      } else if (filtros.naturezaGrupo === 'CAT_III') {
        if (!['A', 'Q', 'W', 'Y', 'X', 'U'].includes(letraChamada)) return false;
      } else {
        const letraFiltro = filtros.naturezaGrupo.charAt(0).toUpperCase();
        const matchLetra = letraChamada === letraFiltro;
        const matchGrupo = c.grupoNatureza === filtros.naturezaGrupo;
        if (!matchLetra && !matchGrupo) return false;
      }
    }

    // 5. Filtro Situação Chamada (E / A)
    if (filtros.situacaoChamada !== 'TODOS' && c.codigoSituacaoChamada !== filtros.situacaoChamada) {
      return false;
    }

    // 6. Filtro Situação Atendimento (NL, ED, DP, CL, etc.)
    if (filtros.situacaoAtendimento !== 'TODOS' && c.codigoSituacaoAtendimentoChamada !== filtros.situacaoAtendimento) {
      return false;
    }

    // 7. Filtro Origem
    if (filtros.origem !== 'TODOS' && c.codigoOrigemChamada !== filtros.origem) {
      return false;
    }

    // 8. Filtro Prioridade
    if (filtros.prioridade !== 'TODOS' && c.prioridade !== filtros.prioridade) {
      return false;
    }

    // 9. Filtro Apenas com Geolocalização
    if (filtros.apenasComGeolocalizacao && (c.latitude === null || c.longitude === null)) {
      return false;
    }

    // 10. Filtro Temporal Avançado
    const timestampChamada = new Date(c.dataHoraAbertura).getTime();
    if (filtros.periodoTempo === '2h') {
      if (agora - timestampChamada > 2 * 3600 * 1000) return false;
    } else if (filtros.periodoTempo === '6h') {
      if (agora - timestampChamada > 6 * 3600 * 1000) return false;
    } else if (filtros.periodoTempo === '12h') {
      if (agora - timestampChamada > 12 * 3600 * 1000) return false;
    } else if (filtros.periodoTempo === '24h') {
      if (agora - timestampChamada > 24 * 3600 * 1000) return false;
    } else if (filtros.periodoTempo === 'personalizado') {
      if (filtros.dataInicio && timestampChamada < new Date(filtros.dataInicio).getTime()) {
        return false;
      }
      if (filtros.dataFim && timestampChamada > new Date(filtros.dataFim).getTime()) {
        return false;
      }
    }

    // 11. Busca por termo (Ocorrência, Natureza, Situação Atendimento/Empenho, Município, Bairro, Viatura)
    if (filtros.termoBusca && filtros.termoBusca.trim() !== '') {
      const q = filtros.termoBusca.toLowerCase().trim();
      const descAtend = DICIONARIO_SIGLAS.chamada_atendimento_situacao[c.codigoSituacaoAtendimentoChamada] || '';
      const match =
        c.numeroOcorrencia.toLowerCase().includes(q) ||
        c.codigoSituacaoAtendimentoChamada.toLowerCase().includes(q) ||
        descAtend.toLowerCase().includes(q) ||
        (c.idNatureza && String(c.idNatureza).includes(q)) ||
        (c.codigoNatureza && c.codigoNatureza.toLowerCase().includes(q)) ||
        (c.descricaoNatureza && c.descricaoNatureza.toLowerCase().includes(q)) ||
        (c.grupoNatureza && c.grupoNatureza.toLowerCase().includes(q)) ||
        (c.categoriaNatureza && c.categoriaNatureza.toLowerCase().includes(q)) ||
        c.endereco.municipio.toLowerCase().includes(q) ||
        (c.endereco.logradouro && c.endereco.logradouro.toLowerCase().includes(q)) ||
        (c.endereco.bairro && c.endereco.bairro.toLowerCase().includes(q)) ||
        c.bbm.toLowerCase().includes(q) ||
        c.cob.toLowerCase().includes(q) ||
        (c.ciaInd && c.ciaInd.toLowerCase().includes(q)) ||
        c.recursos.some((rec) => {
          const sitEmp = rec.codigoSituacaoEmpenhoRecurso || 'ED';
          const descEmp = DICIONARIO_SIGLAS.empenho_situacao[sitEmp] || '';
          return (
            rec.prefixo.toLowerCase().includes(q) ||
            sitEmp.toLowerCase().includes(q) ||
            descEmp.toLowerCase().includes(q)
          );
        });
      if (!match) return false;
    }

    return true;
  });
}

// ==========================================
// CÁLCULO DE KPIS OPERACIONAIS
// ==========================================

export function calcularKPIs(chamadas: ChamadaAtiva[]): KpiOperacional {
  const totalAtivas = chamadas.length;
  let emAndamento = 0;
  let aguardando = 0;
  let viaturasAtivas = 0;
  let recursosEmpenhados = 0;
  let bombeirosSemViatura = 0;
  let comCoordenadas = 0;
  let semCoordenadas = 0;
  let prioridadeAltaQtd = 0;
  let somaTempoEsperaMin = 0;
  let chamadasAguardandoComTempo = 0;

  for (const c of chamadas) {
    // 1. Chamadas "Aguardando" são aquelas com situação AO (atribuída ao órgão)
    const sitAtend = (c.codigoSituacaoAtendimentoChamada || '').toUpperCase();
    const isAguardando = sitAtend === 'AO';

    if (isAguardando) {
      aguardando++;
      somaTempoEsperaMin += c.tempoDecorridoMinutos || 10;
      chamadasAguardandoComTempo++;
    } else {
      emAndamento++;
    }

    // 2. Viaturas Ativas e Recursos Empenhados (sem situação TR)
    // 2.1. O cálculo de bombeiros em campo foi inferido? Substitua por recursos empenhados (sem a situação TR).
    for (const r of c.recursos) {
      const sitEmp = (r.codigoSituacaoEmpenhoRecurso || r.codigoSituacaoRecurso || '').toUpperCase();
      // Recursos terminados (TR) não são considerados ativos em campo
      if (sitEmp === 'TR') {
        continue;
      }

      // Total de recursos empenhados ativos (sem situação TR)
      recursosEmpenhados++;

      const prefixo = (r.prefixo || '').trim().toUpperCase();
      // Recursos cujo prefixo inicia com BM são bombeiros empenhados sem viatura (máscara BM0000000)
      if (prefixo.startsWith('BM')) {
        bombeirosSemViatura++;
      } else {
        // Viaturas ativas são aquelas cujo prefixo NÃO inicia em BM
        viaturasAtivas++;
      }
    }

    if (c.latitude !== null && c.longitude !== null) {
      comCoordenadas++;
    } else {
      semCoordenadas++;
    }

    if (c.prioridade === 'Alta') {
      prioridadeAltaQtd++;
    }
  }

  const tempoMedioEsperaMin =
    chamadasAguardandoComTempo > 0
      ? Math.round(somaTempoEsperaMin / chamadasAguardandoComTempo)
      : 0;

  const taxaAtendimentoPct =
    totalAtivas > 0 ? Math.round((emAndamento / totalAtivas) * 100) : 0;

  return {
    totalAtivas,
    emAndamento,
    aguardando,
    viaturasAtivas,
    recursosEmpenhados,
    bombeirosSemViatura,
    totalBombeiros: recursosEmpenhados, // Substituído cálculo inferido por recursos empenhados (sem TR)
    comCoordenadas,
    semCoordenadas,
    tempoMedioEsperaMin,
    taxaAtendimentoPct,
    prioridadeAltaQtd,
  };
}

// ==========================================
// ESTATÍSTICAS PARA GRÁFICOS
// ==========================================

export function calcularDistribuicaoPorNatureza(chamadas: ChamadaAtiva[]) {
  const counts: Record<string, number> = {};
  for (const c of chamadas) {
    const key = c.descricaoNatureza || 'Outros';
    counts[key] = (counts[key] || 0) + 1;
  }
  return Object.entries(counts)
    .map(([nome, total]) => ({ nome, total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 7);
}

export function calcularDistribuicaoPorGrupoNatureza(chamadas: ChamadaAtiva[]) {
  const counts: Record<string, number> = {};
  for (const c of chamadas) {
    const key = c.grupoNatureza || 'Outros';
    counts[key] = (counts[key] || 0) + 1;
  }
  return Object.entries(counts)
    .map(([grupo, total]) => ({ grupo, total }))
    .sort((a, b) => b.total - a.total);
}

export function calcularDistribuicaoPorSituacao(chamadas: ChamadaAtiva[]) {
  const counts: Record<string, { sigla: string; situacao: string; total: number }> = {};
  for (const c of chamadas) {
    const sigla = c.codigoSituacaoAtendimentoChamada;
    const desc = DICIONARIO_SIGLAS.chamada_atendimento_situacao[sigla] || sigla;
    const rotulo = `${sigla} (${desc})`;
    if (!counts[sigla]) {
      counts[sigla] = { sigla, situacao: rotulo, total: 0 };
    }
    counts[sigla].total++;
  }
  return Object.values(counts).sort((a, b) => b.total - a.total);
}

export function calcularDistribuicaoPorEmpenho(chamadas: ChamadaAtiva[]) {
  const counts: Record<string, { sigla: string; descricao: string; total: number }> = {};
  for (const c of chamadas) {
    for (const r of c.recursos) {
      const sigla = r.codigoSituacaoEmpenhoRecurso || 'ED';
      const desc = DICIONARIO_SIGLAS.empenho_situacao[sigla] || sigla;
      if (!counts[sigla]) {
        counts[sigla] = { sigla, descricao: desc, total: 0 };
      }
      counts[sigla].total++;
    }
  }
  return Object.values(counts).sort((a, b) => b.total - a.total);
}

export function calcularDistribuicaoPorOrigem(chamadas: ChamadaAtiva[]) {
  const counts: Record<string, number> = {};
  for (const c of chamadas) {
    const sigla = c.codigoOrigemChamada;
    const desc = DICIONARIO_SIGLAS.origem_acionamento[sigla] || sigla;
    counts[desc] = (counts[desc] || 0) + 1;
  }
  return Object.entries(counts).map(([origem, total]) => ({ origem, total }));
}

export function calcularDistribuicaoPorPrioridade(chamadas: ChamadaAtiva[]) {
  const counts: Record<string, number> = { Alta: 0, Média: 0, Baixa: 0 };
  for (const c of chamadas) {
    const p = c.prioridade || 'Média';
    counts[p] = (counts[p] || 0) + 1;
  }
  return Object.entries(counts).map(([prioridade, total]) => ({ prioridade, total }));
}

export function calcularEvolucaoHoras(
  chamadas: ChamadaAtiva[],
  formato: '24h' | '12h' = '24h'
) {
  if (formato === '24h') {
    // 24 horas fixas organizadas cronologicamente de 00:00 a 23:00
    const horasMap: Record<number, number> = {};
    for (let h = 0; h < 24; h++) {
      horasMap[h] = 0;
    }

    for (const c of chamadas) {
      if (!c.dataHoraAbertura) continue;
      const d = new Date(c.dataHoraAbertura);
      if (!isNaN(d.getTime())) {
        const h = d.getHours();
        horasMap[h] = (horasMap[h] || 0) + 1;
      }
    }

    return Object.entries(horasMap).map(([hStr, total]) => ({
      hora: `${hStr.padStart(2, '0')}h`,
      total,
      horaNumero: parseInt(hStr, 10),
    }));
  }

  // Janela das últimas 12 horas
  const buckets: { hora: string; total: number; horaNumero?: number }[] = [];
  const agora = new Date();
  for (let i = 11; i >= 0; i--) {
    const h = new Date(agora.getTime() - i * 3600 * 1000);
    const label = `${String(h.getHours()).padStart(2, '0')}h`;
    buckets.push({ hora: label, total: 0, horaNumero: h.getHours() });
  }

  for (const c of chamadas) {
    if (!c.dataHoraAbertura) continue;
    const d = new Date(c.dataHoraAbertura);
    if (!isNaN(d.getTime())) {
      const label = `${String(d.getHours()).padStart(2, '0')}h`;
      const item = buckets.find((b) => b.hora === label);
      if (item) {
        item.total++;
      }
    }
  }

  return buckets;
}

// ==========================================
// FUNÇÕES DE COMPATIBILIDADE E CONTINGÊNCIA
// ==========================================

export function restaurarDadosPadrao(): ChamadaAtiva[] {
  salvarChamadasArmazenadas(MOCK_CHAMADAS_INICIAIS);
  return MOCK_CHAMADAS_INICIAIS;
}

export async function sincronizarAgenteLocal(
  url = 'http://127.0.0.1:8080/dados'
): Promise<{ sucesso: boolean; mensagem: string; dados?: ChamadaAtiva[] }> {
  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 4000);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(t);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    const itens = extrairChamadasDeJson(json);
    if (itens.length === 0) {
      return {
        sucesso: false,
        mensagem: `Agente local conectado, porém 0 chamadas retornadas.`,
      };
    }
    const enriquecidos = itens.map(enriquecerChamada);
    salvarChamadasArmazenadas(enriquecidos);
    return {
      sucesso: true,
      mensagem: `Conectado ao Agente Local! ${enriquecidos.length} ocorrências sincronizadas.`,
      dados: enriquecidos,
    };
  } catch (err: any) {
    return {
      sucesso: false,
      mensagem: `Agente local não detectado em ${url} (${err.message}).`,
    };
  }
}

export async function sincronizarSnapshotEstatico(
  url = '/cbmmg_cad_dados.json'
): Promise<{ sucesso: boolean; mensagem: string; dados?: ChamadaAtiva[] }> {
  const urls = [url, '/dados_cad.json'];
  for (const tentativa of urls) {
    try {
      const res = await fetch(tentativa);
      if (!res.ok) continue;
      const json = await res.json();
      const itens = extrairChamadasDeJson(json);
      if (itens.length > 0) {
        const enriquecidos = itens.map(enriquecerChamada);
        salvarChamadasArmazenadas(enriquecidos);
        return {
          sucesso: true,
          mensagem: `${enriquecidos.length} ocorrências carregadas de '${tentativa}'.`,
          dados: enriquecidos,
        };
      }
    } catch {
      // continua
    }
  }

  return {
    sucesso: false,
    mensagem: 'Falha ao carregar snapshot estático.',
  };
}
