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

export async function sincronizarAgenteLocal(url = 'http://127.0.0.1:8080/dados'): Promise<{ sucesso: boolean; mensagem: string; dados?: ChamadaAtiva[] }> {
  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 4000);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(t);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    const itens = Array.isArray(json) ? json : json.dados || json.chamadas || [];
    if (!Array.isArray(itens)) throw new Error('Formato de dados inválido recebido do agente local.');
    const enriquecidos = itens.map(enriquecerChamada);
    salvarChamadasArmazenadas(enriquecidos);
    return { sucesso: true, mensagem: `Conectado ao Agente Local! ${enriquecidos.length} ocorrências sincronizadas em tempo real.`, dados: enriquecidos };
  } catch (err: any) {
    return { sucesso: false, mensagem: `Agente local não detectado em ${url} (${err.message}). Execute 'python cbmmg_bridge.py' no seu terminal.` };
  }
}

export async function sincronizarSnapshotEstatico(url = '/dados_cad.json'): Promise<{ sucesso: boolean; mensagem: string; dados?: ChamadaAtiva[] }> {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    const itens = Array.isArray(json) ? json : json.dados || json.chamadas || [];
    const enriquecidos = itens.map(enriquecerChamada);
    salvarChamadasArmazenadas(enriquecidos);
    return { sucesso: true, mensagem: `${enriquecidos.length} ocorrências carregadas da base estática.`, dados: enriquecidos };
  } catch (err: any) {
    return { sucesso: false, mensagem: `Falha ao carregar snapshot estático: ${err.message}` };
  }
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
export function enriquecerChamada(chamadaRaw: Partial<ChamadaAtiva>): ChamadaAtiva {
  // 1. Resolver Natureza
  let descNatureza = chamadaRaw.descricaoNatureza || 'Atendimento Geral de Bombeiros';
  let grupoNatureza = chamadaRaw.grupoNatureza || 'Outros Atendimentos';
  let codigoNatureza = chamadaRaw.codigoNatureza;

  if (chamadaRaw.idNatureza || codigoNatureza || chamadaRaw.descricaoNatureza) {
    const natEncontrada = CATALOGO_NATUREZAS_CBMMG.find(
      (n) =>
        (chamadaRaw.idNatureza && n.id == chamadaRaw.idNatureza) ||
        (codigoNatureza && n.codigo.toLowerCase() === String(codigoNatureza).toLowerCase()) ||
        (chamadaRaw.descricaoNatureza &&
          n.descricao.toLowerCase().includes(chamadaRaw.descricaoNatureza.toLowerCase()))
    );

    if (natEncontrada) {
      descNatureza = natEncontrada.descricao;
      grupoNatureza = natEncontrada.grupo;
      codigoNatureza = natEncontrada.codigo;
    }
  }

  // 2. Resolver Unidade (COB / BBM / Cia Ind)
  let cob = chamadaRaw.cob || '1º COB';
  let bbm = chamadaRaw.bbm || '1º BBM';
  let ciaInd = chamadaRaw.ciaInd;
  let nomeUnidade = chamadaRaw.nomeUnidade;
  let lat = chamadaRaw.latitude ?? null;
  let lng = chamadaRaw.longitude ?? null;

  if (chamadaRaw.idUnidadeServico || chamadaRaw.nomeUnidade || chamadaRaw.endereco?.municipio) {
    const unEncontrada = UNIDADES_SERVICO_CBMMG.find(
      (u) =>
        (chamadaRaw.idUnidadeServico && u.id === chamadaRaw.idUnidadeServico) ||
        (chamadaRaw.nomeUnidade && u.nome.toLowerCase().includes(chamadaRaw.nomeUnidade.toLowerCase())) ||
        (chamadaRaw.endereco?.municipio &&
          u.municipioSede.toLowerCase() === chamadaRaw.endereco.municipio.toLowerCase())
    );

    if (unEncontrada) {
      cob = unEncontrada.cob;
      bbm = unEncontrada.bbm;
      ciaInd = unEncontrada.ciaInd || ciaInd;
      nomeUnidade = unEncontrada.nome;
      // Se não havia coordenadas geográficas na chamada, usa o ponto de referência do município sede da unidade
      if (lat === null && unEncontrada.latitudeSede) {
        lat = unEncontrada.latitudeSede + (Math.random() - 0.5) * 0.05;
        lng = unEncontrada.longitudeSede! + (Math.random() - 0.5) * 0.05;
      }
    }
  }

  // Se ainda sem coordenadas e tem município conhecido
  if (lat === null && chamadaRaw.endereco?.municipio) {
    const munMatch = UNIDADES_SERVICO_CBMMG.find(
      (u) => u.municipioSede.toLowerCase() === chamadaRaw.endereco!.municipio.toLowerCase()
    );
    if (munMatch && munMatch.latitudeSede) {
      lat = munMatch.latitudeSede + (Math.random() - 0.5) * 0.03;
      lng = munMatch.longitudeSede! + (Math.random() - 0.5) * 0.03;
    }
  }

  // 3. Recursos & Efetivo
  const recursos = Array.isArray(chamadaRaw.recursos) ? chamadaRaw.recursos : [];
  const totalBombeiros =
    chamadaRaw.totalBombeiros ||
    recursos.reduce((sum, r) => sum + (r.componentes || 3), 0);

  // 4. Tempo decorrido
  const dataAbertura = chamadaRaw.dataHoraAbertura || new Date().toISOString();
  const tempoDecorridoMinutos =
    chamadaRaw.tempoDecorridoMinutos ??
    Math.max(1, Math.round((Date.now() - new Date(dataAbertura).getTime()) / 60000));

  return {
    idChamada: chamadaRaw.idChamada || `2026-${Math.floor(100000 + Math.random() * 900000)}`,
    numeroOcorrencia:
      chamadaRaw.numeroOcorrencia || `O-2026-${Math.floor(10000 + Math.random() * 90000)}`,
    dataHoraAbertura: dataAbertura,
    codigoSituacaoChamada: (chamadaRaw.codigoSituacaoChamada ||
      (recursos.length > 0 ? 'E' : 'A')) as CodigoSituacaoChamada,
    codigoSituacaoAtendimentoChamada: (chamadaRaw.codigoSituacaoAtendimentoChamada ||
      (recursos.length > 0 ? 'NL' : 'CL')) as CodigoSituacaoAtendimento,
    codigoOrigemChamada: (chamadaRaw.codigoOrigemChamada || 'L') as CodigoOrigemChamada,
    prioridade: chamadaRaw.prioridade || 'Alta',
    idNatureza: chamadaRaw.idNatureza,
    codigoNatureza,
    descricaoNatureza: descNatureza,
    grupoNatureza,
    endereco: {
      logradouro: chamadaRaw.endereco?.logradouro || 'Via Pública Principal',
      numero: chamadaRaw.endereco?.numero || '',
      bairro: chamadaRaw.endereco?.bairro || 'Centro',
      municipio: chamadaRaw.endereco?.municipio || 'Belo Horizonte',
      uf: 'MG',
      referencia: chamadaRaw.endereco?.referencia || '',
    },
    latitude: lat,
    longitude: lng,
    cob,
    bbm,
    ciaInd,
    idUnidadeServico: chamadaRaw.idUnidadeServico,
    nomeUnidade: nomeUnidade || `${bbm} - CBMMG`,
    recursos,
    totalBombeiros,
    tempoDecorridoMinutos,
    historicoObservacoes: chamadaRaw.historicoObservacoes || [
      'Registro CAD CBMMG integrado via painel operacional.',
    ],
    orgaoApoio: chamadaRaw.orgaoApoio,
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
