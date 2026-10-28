import {
  CATALOGO_NATUREZAS_CBMMG,
  DICIONARIO_SIGLAS,
  UNIDADES_SERVICO_CBMMG,
} from '../data/catalogoAuxiliares';
import { MOCK_CHAMADAS_INICIAIS } from '../data/mockChamadas';
import {
  ChamadaAtiva,
  CodigoOrigemChamada,
  CodigoSituacaoAtendimento,
  CodigoSituacaoChamada,
  FiltrosOperacionais,
  KpiOperacional,
} from '../types/cbm';

const STORAGE_KEY_CHAMADAS = 'cbmmg_cad_chamadas_v1';
const STORAGE_KEY_ULTIMA_SYNC = 'cbmmg_cad_ultima_sync';
const STORAGE_KEY_TOKEN = 'cbmmg_cad_api_token';

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
      localStorage.setItem(STORAGE_KEY_TOKEN, token);
    } else {
      localStorage.removeItem(STORAGE_KEY_TOKEN);
    }
  } catch (e) {
    console.error('Falha ao salvar token:', e);
  }
}

export function carregarChamadasArmazenadas(): ChamadaAtiva[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CHAMADAS);
    if (!raw) {
      salvarChamadasArmazenadas(MOCK_CHAMADAS_INICIAIS);
      return MOCK_CHAMADAS_INICIAIS;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
  } catch (e) {
    console.error('Erro ao ler do localStorage, restaurando padrão:', e);
  }
  salvarChamadasArmazenadas(MOCK_CHAMADAS_INICIAIS);
  return MOCK_CHAMADAS_INICIAIS;
}

export function salvarChamadasArmazenadas(chamadas: ChamadaAtiva[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_CHAMADAS, JSON.stringify(chamadas));
    localStorage.setItem(STORAGE_KEY_ULTIMA_SYNC, new Date().toISOString());
  } catch (e) {
    console.error('Erro ao salvar no localStorage:', e);
  }
}

// Extrai a lista de chamadas de qualquer variante do envelope CAD da API ou arquivo exportado
export function extrairChamadasDeJson(raw: any): any[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;

  // 1. Caso GeoJSON FeatureCollection
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

  // 2. Caso raw.chamadas (conforme manual oficial CBMMG da rota GET /ativos)
  if (raw.chamadas) {
    if (Array.isArray(raw.chamadas)) return raw.chamadas;
    if (typeof raw.chamadas === 'object' && Array.isArray(raw.chamadas.dados)) {
      return raw.chamadas.dados;
    }
  }

  // 3. Caso raw.dados seja array direto
  if (Array.isArray(raw.dados)) return raw.dados;

  // 4. Caso raw.dados seja objeto (envelope com chamadas / ativas)
  if (raw.dados && typeof raw.dados === 'object') {
    if (Array.isArray(raw.dados.chamadas)) return raw.dados.chamadas;
    if (raw.dados.chamadas && typeof raw.dados.chamadas === 'object' && Array.isArray(raw.dados.chamadas.dados)) {
      return raw.dados.chamadas.dados;
    }
    if (Array.isArray(raw.dados.ativas)) return raw.dados.ativas;
    if (Array.isArray(raw.dados.ocorrencias)) return raw.dados.ocorrencias;
    if (Array.isArray(raw.dados.items)) return raw.dados.items;
    if (Array.isArray(raw.dados.features)) {
      return extrairChamadasDeJson(raw.dados);
    }

    // Se dados for um dicionário de chamadas indexadas por chave/ID
    const valoresDados = Object.values(raw.dados);
    if (valoresDados.length > 0 && typeof valoresDados[0] === 'object') {
      const p = valoresDados[0] as any;
      if (p && (p.idChamada || p.numeroOcorrencia || p.natureza || p.descricaoNatureza || p.municipio)) {
        return valoresDados;
      }
    }
  }

  // 5. Chaves comuns alternativas na raiz
  if (Array.isArray(raw.ativas)) return raw.ativas;
  if (raw.ativas && typeof raw.ativas === 'object' && Array.isArray(raw.ativas.dados)) return raw.ativas.dados;
  if (Array.isArray(raw.ocorrencias)) return raw.ocorrencias;
  if (Array.isArray(raw.items)) return raw.items;
  if (Array.isArray(raw.records)) return raw.records;
  if (Array.isArray(raw.data)) return raw.data;
  if (raw.data && typeof raw.data === 'object' && Array.isArray(raw.data.chamadas)) return raw.data.chamadas;

  // 6. Varredura profunda: procurar por qualquer propriedade cujo valor seja uma lista de ocorrências
  for (const chave of Object.keys(raw)) {
    const val = raw[chave];
    if (Array.isArray(val) && val.length > 0 && typeof val[0] === 'object') {
      const item = val[0];
      if (
        item.idChamada ||
        item.numeroOcorrencia ||
        item.natureza ||
        item.descricaoNatureza ||
        item.municipio ||
        item.codigoNatureza ||
        item.situacaoChamada ||
        item.codigoSituacaoChamada
      ) {
        return val;
      }
    }
  }

  // 7. Se o próprio objeto raiz for um dicionário de ocorrências indexadas por ID
  const valoresRaiz = Object.values(raw);
  if (valoresRaiz.length > 0 && typeof valoresRaiz[0] === 'object') {
    const p = valoresRaiz[0] as any;
    if (p && (p.idChamada || p.numeroOcorrencia || p.natureza || p.descricaoNatureza || p.municipio)) {
      return valoresRaiz;
    }
  }

  return [];
}

export async function sincronizarAgenteLocal(url = 'http://127.0.0.1:8080/dados'): Promise<{ sucesso: boolean; mensagem: string; dados?: ChamadaAtiva[] }> {
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
        mensagem: `Agente local conectado, porém 0 chamadas ativas retornadas pela API no momento.`,
      };
    }
    const enriquecidos = itens.map(enriquecerChamada);
    salvarChamadasArmazenadas(enriquecidos);
    return {
      sucesso: true,
      mensagem: `Conectado ao Agente Local! ${enriquecidos.length} ocorrências sincronizadas em tempo real.`,
      dados: enriquecidos,
    };
  } catch (err: any) {
    return {
      sucesso: false,
      mensagem: `Agente local não detectado em ${url} (${err.message}). Execute 'python cbmmg_bridge.py' no seu terminal.`,
    };
  }
}

export async function sincronizarSnapshotEstatico(url = '/cbmmg_cad_dados.json'): Promise<{ sucesso: boolean; mensagem: string; dados?: ChamadaAtiva[] }> {
  // Tenta primeiro carregar cbmmg_cad_dados.json, se falhar ou 404, recorre a dados_cad.json
  const urls = [url, '/dados_cad.json'];
  let ultimoErro = '';

  for (const tentativaUrl of urls) {
    try {
      const res = await fetch(tentativaUrl);
      if (!res.ok) continue;
      const json = await res.json();
      const itens = extrairChamadasDeJson(json);
      if (itens.length > 0) {
        const enriquecidos = itens.map(enriquecerChamada);
        salvarChamadasArmazenadas(enriquecidos);
        return {
          sucesso: true,
          mensagem: `${enriquecidos.length} ocorrências carregadas de '${tentativaUrl}' com sucesso.`,
          dados: enriquecidos,
        };
      }
    } catch (err: any) {
      ultimoErro = err.message;
    }
  }

  return {
    sucesso: false,
    mensagem: `Falha ao carregar snapshot estático (${ultimoErro || '0 ocorrências encontradas'}).`,
  };
}

export function restaurarDadosPadrao(): ChamadaAtiva[] {
  salvarChamadasArmazenadas(MOCK_CHAMADAS_INICIAIS);
  return MOCK_CHAMADAS_INICIAIS;
}

export function obterUltimaSync(): string {
  try {
    return localStorage.getItem(STORAGE_KEY_ULTIMA_SYNC) || new Date().toISOString();
  } catch {
    return new Date().toISOString();
  }
}

// Enriquecimento de chamadas com base nos catálogos auxiliares
export function enriquecerChamada(chamadaRaw: Partial<ChamadaAtiva> | any): ChamadaAtiva {
  const r = chamadaRaw || {};

  // 1. Resolver Natureza (aceita descrições, códigos e objetos aninhados)
  let rawDescNat =
    r.descricaoNatureza ||
    r.naturezaDescricao ||
    (typeof r.natureza === 'string' ? r.natureza : r.natureza?.descricao) ||
    r.descNatureza ||
    r.descricao_natureza ||
    'Atendimento Geral de Bombeiros';

  let rawCodNat =
    r.codigoNatureza ||
    r.codigo_natureza ||
    (typeof r.natureza === 'object' ? r.natureza?.codigo : '') ||
    r.codNatureza;

  let descNatureza = rawDescNat;
  let grupoNatureza = r.grupoNatureza || r.grupo || 'Outros Atendimentos';
  let codigoNatureza = rawCodNat;

  if (r.idNatureza || rawCodNat || rawDescNat) {
    const natEncontrada = CATALOGO_NATUREZAS_CBMMG.find(
      (n) =>
        (r.idNatureza && n.id == r.idNatureza) ||
        (rawCodNat && n.codigo.toLowerCase() === String(rawCodNat).toLowerCase()) ||
        (rawDescNat && n.descricao.toLowerCase().includes(rawDescNat.toLowerCase())) ||
        (rawDescNat && rawDescNat.toLowerCase().includes(n.descricao.toLowerCase()))
    );

    if (natEncontrada) {
      descNatureza = natEncontrada.descricao;
      grupoNatureza = natEncontrada.grupo;
      codigoNatureza = natEncontrada.codigo;
    }
  }

  // 2. Resolver Endereço e Município
  const mun =
    r.endereco?.municipio ||
    r.municipio ||
    r.cidade ||
    r.municipioOcorrencia ||
    'Belo Horizonte';
  const bairro = r.endereco?.bairro || r.bairro || '';
  const logr = r.endereco?.logradouro || r.logradouro || r.rua || r.endereco || 'Via Pública';
  const num = r.endereco?.numero || r.numero || '';
  const ref = r.endereco?.referencia || r.referencia || r.pontoReferencia || '';

  // 3. Resolver Unidade (COB / BBM / Cia Ind)
  let cob = r.cob || r.comandoOperacional || '';
  let bbm = r.bbm || r.batalhao || '';
  let ciaInd = r.ciaInd || r.companhia;
  let nomeUnidade = r.nomeUnidade || r.unidade;
  let lat = typeof r.latitude === 'number' ? r.latitude : (typeof r.lat === 'number' ? r.lat : null);
  let lng = typeof r.longitude === 'number' ? r.longitude : (typeof r.lon === 'number' ? r.lon : (typeof r.lng === 'number' ? r.lng : null));

  if (!cob || !bbm || lat === null) {
    const unEncontrada = UNIDADES_SERVICO_CBMMG.find(
      (u) =>
        (r.idUnidadeServico && u.id === r.idUnidadeServico) ||
        (nomeUnidade && u.nome.toLowerCase().includes(nomeUnidade.toLowerCase())) ||
        (mun && u.municipioSede.toLowerCase() === mun.toLowerCase())
    );

    if (unEncontrada) {
      cob = cob || unEncontrada.cob;
      bbm = bbm || unEncontrada.bbm;
      ciaInd = ciaInd || unEncontrada.ciaInd;
      nomeUnidade = nomeUnidade || unEncontrada.nome;
      if (lat === null && unEncontrada.latitudeSede) {
        lat = unEncontrada.latitudeSede + (Math.random() - 0.5) * 0.04;
        lng = unEncontrada.longitudeSede! + (Math.random() - 0.5) * 0.04;
      }
    }
  }

  cob = cob || '1º COB';
  bbm = bbm || '1º BBM';

  // 4. Recursos & Efetivo
  const recursosRaw = r.recursos || r.empenhos || r.viaturas || [];
  const recursos = Array.isArray(recursosRaw) ? recursosRaw : [];
  const totalBombeiros =
    r.totalBombeiros ||
    r.efetivo ||
    recursos.reduce((sum: number, rec: any) => sum + (rec.componentes || 3), 0);

  // 5. Data de Abertura & Tempos
  const rawData =
    r.dataHoraAbertura ||
    r.data_hora_abertura ||
    r.dataAbertura ||
    r.dataHora ||
    r.horaAbertura ||
    new Date().toISOString();
  const dataAbertura = !isNaN(new Date(rawData).getTime()) ? new Date(rawData).toISOString() : new Date().toISOString();
  
  const tempoDecorridoMinutos =
    r.tempoDecorridoMinutos ??
    Math.max(1, Math.round((Date.now() - new Date(dataAbertura).getTime()) / 60000));

  const numOcorr =
    r.numeroOcorrencia ||
    r.numero_ocorrencia ||
    r.numOcorrencia ||
    r.numero ||
    `O-2026-${Math.floor(10000 + Math.random() * 90000)}`;

  return {
    idChamada: r.idChamada || r.id_chamada || r.id || numOcorr,
    numeroOcorrencia: numOcorr,
    dataHoraAbertura: dataAbertura,
    codigoSituacaoChamada: (r.codigoSituacaoChamada || r.situacaoChamada || (recursos.length > 0 ? 'E' : 'A')) as CodigoSituacaoChamada,
    codigoSituacaoAtendimentoChamada: (r.codigoSituacaoAtendimentoChamada || r.situacaoAtendimento || (recursos.length > 0 ? 'NL' : 'CL')) as CodigoSituacaoAtendimento,
    codigoOrigemChamada: (r.codigoOrigemChamada || r.origem || 'L') as CodigoOrigemChamada,
    prioridade: r.prioridade || r.criticidade || 'Alta',
    idNatureza: r.idNatureza,
    codigoNatureza,
    descricaoNatureza: descNatureza,
    grupoNatureza,
    endereco: {
      logradouro: logr,
      numero: num,
      bairro: bairro,
      municipio: mun,
      uf: r.endereco?.uf || r.uf || 'MG',
      referencia: ref,
    },
    latitude: lat,
    longitude: lng,
    cob,
    bbm,
    ciaInd,
    idUnidadeServico: r.idUnidadeServico,
    nomeUnidade: nomeUnidade || `${bbm} - CBMMG`,
    recursos,
    totalBombeiros,
    tempoDecorridoMinutos,
    historicoObservacoes: r.historicoObservacoes || r.observacoes || [
      'Registro CAD CBMMG integrado via painel operacional.',
    ],
    orgaoApoio: r.orgaoApoio || r.orgao_apoio,
  };
}

// Filtro e cálculo de KPIs
export function filtrarChamadas(
  chamadas: ChamadaAtiva[],
  filtros: FiltrosOperacionais
): ChamadaAtiva[] {
  const agora = Date.now();

  return chamadas.filter((c) => {
    // 1. Filtro COB
    if (filtros.cob !== 'TODOS' && c.cob !== filtros.cob) {
      return false;
    }

    // 2. Filtro BBM
    if (filtros.bbm !== 'TODOS' && c.bbm !== filtros.bbm) {
      return false;
    }

    // 3. Filtro CIA IND
    if (filtros.ciaInd !== 'TODOS') {
      if (!c.ciaInd || c.ciaInd !== filtros.ciaInd) {
        return false;
      }
    }

    // 4. Filtro Grupo de Natureza
    if (filtros.naturezaGrupo !== 'TODOS' && c.grupoNatureza !== filtros.naturezaGrupo) {
      return false;
    }

    // 5. Filtro Situação Chamada (E / A)
    if (filtros.situacaoChamada !== 'TODOS' && c.codigoSituacaoChamada !== filtros.situacaoChamada) {
      return false;
    }

    // 6. Filtro Situação Atendimento (NL, ED, etc)
    if (
      filtros.situacaoAtendimento !== 'TODOS' &&
      c.codigoSituacaoAtendimentoChamada !== filtros.situacaoAtendimento
    ) {
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

    // 11. Busca por termo
    if (filtros.termoBusca && filtros.termoBusca.trim() !== '') {
      const q = filtros.termoBusca.toLowerCase().trim();
      const match =
        c.numeroOcorrencia.toLowerCase().includes(q) ||
        c.descricaoNatureza.toLowerCase().includes(q) ||
        c.endereco.municipio.toLowerCase().includes(q) ||
        (c.endereco.logradouro && c.endereco.logradouro.toLowerCase().includes(q)) ||
        (c.endereco.bairro && c.endereco.bairro.toLowerCase().includes(q)) ||
        c.bbm.toLowerCase().includes(q) ||
        c.recursos.some((r) => r.prefixo.toLowerCase().includes(q));
      if (!match) return false;
    }

    return true;
  });
}

export function calcularKPIs(chamadas: ChamadaAtiva[]): KpiOperacional {
  const totalAtivas = chamadas.length;
  let emAndamento = 0;
  let aguardando = 0;
  let recursosEmpenhados = 0;
  let totalBombeiros = 0;
  let comCoordenadas = 0;
  let semCoordenadas = 0;
  let prioridadeAltaQtd = 0;
  let somaTempoEsperaMin = 0;
  let chamadasAguardandoComTempo = 0;

  for (const c of chamadas) {
    if (c.codigoSituacaoChamada === 'E') {
      emAndamento++;
    } else {
      aguardando++;
      somaTempoEsperaMin += c.tempoDecorridoMinutos || 10;
      chamadasAguardandoComTempo++;
    }

    recursosEmpenhados += c.recursos.length;
    totalBombeiros += c.totalBombeiros;

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
    recursosEmpenhados,
    totalBombeiros,
    comCoordenadas,
    semCoordenadas,
    tempoMedioEsperaMin,
    taxaAtendimentoPct,
    prioridadeAltaQtd,
  };
}

// Estatísticas para Gráficos
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
  const counts: Record<string, number> = {};
  for (const c of chamadas) {
    const sigla = c.codigoSituacaoAtendimentoChamada;
    const desc = DICIONARIO_SIGLAS.chamada_atendimento_situacao[sigla] || sigla;
    counts[desc] = (counts[desc] || 0) + 1;
  }
  return Object.entries(counts).map(([situacao, total]) => ({ situacao, total }));
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

export function calcularEvolucaoHoras(chamadas: ChamadaAtiva[]) {
  const horas: Record<string, number> = {};
  // Inicializar últimas 12 horas
  const agora = new Date();
  for (let i = 11; i >= 0; i--) {
    const h = new Date(agora.getTime() - i * 3600 * 1000);
    const label = `${String(h.getHours()).padStart(2, '0')}:00`;
    horas[label] = 0;
  }

  for (const c of chamadas) {
    const d = new Date(c.dataHoraAbertura);
    const label = `${String(d.getHours()).padStart(2, '0')}:00`;
    if (label in horas) {
      horas[label]++;
    } else {
      horas[label] = 1;
    }
  }

  return Object.entries(horas).map(([hora, total]) => ({ hora, total }));
}
