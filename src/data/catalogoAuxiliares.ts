import {
  CodigoOrigemChamada,
  CodigoSituacaoAtendimento,
  CodigoSituacaoChamada,
  CodigoSituacaoEmpenho,
  NaturezaAuxiliar,
  OrgaoAuxiliar,
  UnidadeServicoAuxiliar,
} from '../types/cbm';

export const DICIONARIO_SIGLAS = {
  origem_acionamento: {
    L: 'Ligação / Telefone (193)',
    I: 'Integração de Sistemas',
    B: 'Bombeiro / Registro Interno',
    A: 'Acionamento Automático / Sensor',
  } as Record<CodigoOrigemChamada, string>,

  SituacaoChamada: {
    E: 'Em Andamento',
    A: 'Aguardando Atendimento',
  } as Record<CodigoSituacaoChamada, string>,

  // Chave oficial do CAD: empenho_situacao
  // Campo correspondente na API CAD: codigoSituacaoEmpenhoRecurso
  empenho_situacao: {
    TR: 'terminado',
    ED: 'em direção',
    EN: 'encerramento',
    DP: 'despachado',
    AC: 'a caminho',
    ER: 'em retorno',
    NL: 'no local',
    LI: 'no local intermediário',
    EC: 'em controle',
    SU: 'suspenso',
  } as Record<string, string>,

  // Chave oficial do CAD: chamada_atendimento_situacao
  // Campo correspondente na API CAD: codigoSituacaoAtendimentoChamada
  chamada_atendimento_situacao: {
    ER: 'em retorno',
    NL: 'no local',
    CL: 'classificada',
    DP: 'despachada',
    EC: 'em controle',
    EN: 'encerrada',
    LI: 'local intermediário',
    ED: 'em direção',
    TR: 'terminada',
    AO: 'atribuída ao órgão',
  } as Record<string, string>,
};

export const CORES_SITUACAO_ATENDIMENTO: Record<string, { bg: string; text: string; hex: string }> = {
  NL: { bg: 'bg-red-500/20 border-red-500/40 text-red-300', text: 'text-red-400', hex: '#ef4444' }, // no local (crítico)
  ED: { bg: 'bg-amber-500/20 border-amber-500/40 text-amber-300', text: 'text-amber-400', hex: '#f59e0b' }, // em direção
  DP: { bg: 'bg-blue-500/20 border-blue-500/40 text-blue-300', text: 'text-blue-400', hex: '#3b82f6' }, // despachada
  EC: { bg: 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300', text: 'text-emerald-400', hex: '#10b981' }, // em controle
  CL: { bg: 'bg-purple-500/20 border-purple-500/40 text-purple-300', text: 'text-purple-400', hex: '#a855f7' }, // classificada
  AO: { bg: 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300', text: 'text-cyan-400', hex: '#06b6d4' }, // atribuída ao órgão
  LI: { bg: 'bg-orange-500/20 border-orange-500/40 text-orange-300', text: 'text-orange-400', hex: '#ea580c' }, // local intermediário
  ER: { bg: 'bg-slate-500/20 border-slate-500/40 text-slate-300', text: 'text-slate-400', hex: '#64748b' }, // em retorno
  EN: { bg: 'bg-indigo-500/20 border-indigo-500/40 text-indigo-300', text: 'text-indigo-400', hex: '#6366f1' }, // encerrada
  TR: { bg: 'bg-zinc-600/20 border-zinc-600/40 text-zinc-300', text: 'text-zinc-400', hex: '#71717a' }, // terminada
};

export const CORES_SITUACAO_EMPENHO: Record<string, { bg: string; text: string; hex: string; dot?: string }> = {
  NL: { bg: 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300', text: 'text-emerald-400', hex: '#10b981', dot: 'bg-emerald-400' }, // no local
  ED: { bg: 'bg-amber-500/20 border-amber-500/40 text-amber-300', text: 'text-amber-400', hex: '#f59e0b', dot: 'bg-amber-400' }, // em direção
  AC: { bg: 'bg-blue-500/20 border-blue-500/40 text-blue-300', text: 'text-blue-400', hex: '#3b82f6', dot: 'bg-blue-400' }, // a caminho
  DP: { bg: 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300', text: 'text-cyan-400', hex: '#06b6d4', dot: 'bg-cyan-400' }, // despachado
  EC: { bg: 'bg-teal-500/20 border-teal-500/40 text-teal-300', text: 'text-teal-400', hex: '#14b8a6', dot: 'bg-teal-400' }, // em controle
  ER: { bg: 'bg-slate-500/20 border-slate-500/40 text-slate-300', text: 'text-slate-400', hex: '#64748b', dot: 'bg-slate-400' }, // em retorno
  LI: { bg: 'bg-orange-500/20 border-orange-500/40 text-orange-300', text: 'text-orange-400', hex: '#ea580c', dot: 'bg-orange-400' }, // no local intermediário
  EN: { bg: 'bg-indigo-500/20 border-indigo-500/40 text-indigo-300', text: 'text-indigo-400', hex: '#6366f1', dot: 'bg-indigo-400' }, // encerramento
  TR: { bg: 'bg-zinc-600/20 border-zinc-600/40 text-zinc-300', text: 'text-zinc-400', hex: '#71717a', dot: 'bg-zinc-400' }, // terminado
  SU: { bg: 'bg-purple-500/20 border-purple-500/40 text-purple-300', text: 'text-purple-400', hex: '#a855f7', dot: 'bg-purple-400' }, // suspenso
};

export function formatarTextoSigla(texto: string): string {
  if (!texto) return '';
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

export function obterDescricaoSituacaoAtendimento(sigla: string): string {
  const s = sigla?.toUpperCase() as CodigoSituacaoAtendimento;
  const desc = DICIONARIO_SIGLAS.chamada_atendimento_situacao[s];
  return desc ? formatarTextoSigla(desc) : sigla;
}

export function obterDescricaoSituacaoEmpenho(sigla: string): string {
  const s = sigla?.toUpperCase() as CodigoSituacaoEmpenho;
  const desc = DICIONARIO_SIGLAS.empenho_situacao[s];
  return desc ? formatarTextoSigla(desc) : sigla;
}

export const UNIDADES_SERVICO_CBMMG: UnidadeServicoAuxiliar[] = [
  // 1º COB - RMBH e Região Central
  { id: 101, nome: '1º BBM - Belo Horizonte Sul', sigla: '1º BBM', cob: '1º COB', bbm: '1º BBM', municipioSede: 'Belo Horizonte', latitudeSede: -19.9238, longitudeSede: -43.9405 },
  { id: 102, nome: '2º BBM - Contagem e Betim', sigla: '2º BBM', cob: '1º COB', bbm: '2º BBM', municipioSede: 'Contagem', latitudeSede: -19.9320, longitudeSede: -44.0539 },
  { id: 103, nome: '3º BBM - Belo Horizonte Norte / Pampulha', sigla: '3º BBM', cob: '1º COB', bbm: '3º BBM', municipioSede: 'Belo Horizonte', latitudeSede: -19.8519, longitudeSede: -43.9559 },
  { id: 110, nome: '10º BBM - Divinópolis', sigla: '10º BBM', cob: '1º COB', bbm: '10º BBM', municipioSede: 'Divinópolis', latitudeSede: -20.1444, longitudeSede: -44.8912 },
  { id: 199, nome: 'BEMAD - Batalhão de Emergências Ambientais e Desastres', sigla: 'BEMAD', cob: '1º COB', bbm: 'BEMAD', municipioSede: 'Belo Horizonte', latitudeSede: -19.9555, longitudeSede: -43.9621 },
  { id: 198, nome: 'BOA - Batalhão de Operações Aéreas (Arcanjo)', sigla: 'BOA', cob: '1º COB', bbm: 'BOA', municipioSede: 'Belo Horizonte', latitudeSede: -19.8514, longitudeSede: -43.9506 },

  // 2º COB - Triângulo Mineiro e Alto Paranaíba
  { id: 205, nome: '5º BBM - Uberaba', sigla: '5º BBM', cob: '2º COB', bbm: '5º BBM', municipioSede: 'Uberaba', latitudeSede: -19.7472, longitudeSede: -47.9392 },
  { id: 208, nome: '8º BBM - Uberlândia', sigla: '8º BBM', cob: '2º COB', bbm: '8º BBM', municipioSede: 'Uberlândia', latitudeSede: -18.9186, longitudeSede: -48.2772 },
  { id: 222, nome: '2ª Cia Ind - Araguari', sigla: '2ª Cia Ind', cob: '2º COB', bbm: '8º BBM', ciaInd: '2ª Cia Ind', municipioSede: 'Araguari', latitudeSede: -18.6481, longitudeSede: -48.1878 },
  { id: 210, nome: '10ª Cia Ind - Patos de Minas', sigla: '10ª Cia Ind', cob: '2º COB', bbm: '5º BBM', ciaInd: '10ª Cia Ind', municipioSede: 'Patos de Minas', latitudeSede: -18.5789, longitudeSede: -46.5181 },

  // 3º COB - Zona da Mata e Campo das Vertentes
  { id: 304, nome: '4º BBM - Juiz de Fora', sigla: '4º BBM', cob: '3º COB', bbm: '4º BBM', municipioSede: 'Juiz de Fora', latitudeSede: -21.7642, longitudeSede: -43.3496 },
  { id: 303, nome: '3ª Cia Ind - São João del-Rei', sigla: '3ª Cia Ind', cob: '3º COB', bbm: '4º BBM', ciaInd: '3ª Cia Ind', municipioSede: 'São João del-Rei', latitudeSede: -21.1356, longitudeSede: -44.2617 },
  { id: 307, nome: '7ª Cia Ind - Barbacena', sigla: '7ª Cia Ind', cob: '3º COB', bbm: '4º BBM', ciaInd: '7ª Cia Ind', municipioSede: 'Barbacena', latitudeSede: -21.2258, longitudeSede: -43.7744 },
  { id: 3042, nome: '4ª Cia Ind - Ubá', sigla: '4ª Cia Ind', cob: '3º COB', bbm: '4º BBM', ciaInd: '4ª Cia Ind', municipioSede: 'Ubá', latitudeSede: -21.1214, longitudeSede: -42.9428 },

  // 4º COB - Norte de Minas e Noroeste
  { id: 407, nome: '7º BBM - Montes Claros', sigla: '7º BBM', cob: '4º COB', bbm: '7º BBM', municipioSede: 'Montes Claros', latitudeSede: -16.7282, longitudeSede: -43.8616 },
  { id: 412, nome: '12º BBM - Unaí / Noroeste', sigla: '12º BBM', cob: '4º COB', bbm: '12º BBM', municipioSede: 'Unaí', latitudeSede: -16.3575, longitudeSede: -46.9056 },
  { id: 408, nome: '8ª Cia Ind - Januária', sigla: '8ª Cia Ind', cob: '4º COB', bbm: '7º BBM', ciaInd: '8ª Cia Ind', municipioSede: 'Januária', latitudeSede: -15.4833, longitudeSede: -44.3667 },
  { id: 409, nome: '9ª Cia Ind - Diamantina', sigla: '9ª Cia Ind', cob: '4º COB', bbm: '7º BBM', ciaInd: '9ª Cia Ind', municipioSede: 'Diamantina', latitudeSede: -18.2436, longitudeSede: -43.6033 },

  // 5º COB - Leste de Minas e Vale do Aço
  { id: 506, nome: '6º BBM - Governador Valadares', sigla: '6º BBM', cob: '5º COB', bbm: '6º BBM', municipioSede: 'Governador Valadares', latitudeSede: -18.8547, longitudeSede: -41.9547 },
  { id: 511, nome: '11º BBM - Ipatinga / Vale do Aço', sigla: '11º BBM', cob: '5º COB', bbm: '11º BBM', municipioSede: 'Ipatinga', latitudeSede: -19.4683, longitudeSede: -42.5367 },
  { id: 505, nome: '5ª Cia Ind - Sete Lagoas', sigla: '5ª Cia Ind', cob: '5º COB', bbm: '6º BBM', ciaInd: '5ª Cia Ind', municipioSede: 'Sete Lagoas', latitudeSede: -19.4608, longitudeSede: -44.2469 },
  { id: 5062, nome: '6ª Cia Ind - Teófilo Otoni', sigla: '6ª Cia Ind', cob: '5º COB', bbm: '6º BBM', ciaInd: '6ª Cia Ind', municipioSede: 'Teófilo Otoni', latitudeSede: -17.8575, longitudeSede: -41.5053 },

  // 6º COB - Sul de Minas
  { id: 609, nome: '9º BBM - Varginha', sigla: '9º BBM', cob: '6º COB', bbm: '9º BBM', municipioSede: 'Varginha', latitudeSede: -21.5558, longitudeSede: -45.4308 },
  { id: 601, nome: '1ª Cia Ind - Poços de Caldas', sigla: '1ª Cia Ind', cob: '6º COB', bbm: '9º BBM', ciaInd: '1ª Cia Ind', municipioSede: 'Poços de Caldas', latitudeSede: -21.7895, longitudeSede: -46.5642 },
  { id: 6092, nome: '9ª Cia Ind - Lavras', sigla: '9ª Cia Ind', cob: '6º COB', bbm: '9º BBM', ciaInd: '9ª Cia Ind', municipioSede: 'Lavras', latitudeSede: -21.2458, longitudeSede: -44.9997 },
  { id: 611, nome: '11ª Cia Ind - Pouso Alegre', sigla: '11ª Cia Ind', cob: '6º COB', bbm: '9º BBM', ciaInd: '11ª Cia Ind', municipioSede: 'Pouso Alegre', latitudeSede: -22.2300, longitudeSede: -45.9367 },
  { id: 612, nome: '12ª Cia Ind - Passos', sigla: '12ª Cia Ind', cob: '6º COB', bbm: '9º BBM', ciaInd: '12ª Cia Ind', municipioSede: 'Passos', latitudeSede: -20.7189, longitudeSede: -46.6097 },
];

export interface GrupoNaturezaDef {
  letra: string;
  nome: string;
  rotuloCompleto: string;
  categoria: 'CATEGORIA II - OCORRÊNCIAS TÍPICAS DE BOMBEIRO MILITAR' | 'CATEGORIA III - AÇÕES E OPERAÇÕES DECORRENTES DO SIDS';
  categoriaCurta: 'Categoria II - Típicas BM' | 'Categoria III - SIDS';
  cor: string;
}

export const GRUPOS_NATUREZAS_CBMMG: Record<string, GrupoNaturezaDef> = {
  // CATEGORIA II - OCORRÊNCIAS TÍPICAS DE BOMBEIRO MILITAR
  O: {
    letra: 'O',
    nome: 'REFERENTE À EXPLOSÃO E INCÊNDIO',
    rotuloCompleto: 'O - REFERENTE À EXPLOSÃO E INCÊNDIO',
    categoria: 'CATEGORIA II - OCORRÊNCIAS TÍPICAS DE BOMBEIRO MILITAR',
    categoriaCurta: 'Categoria II - Típicas BM',
    cor: '#ef4444',
  },
  P: {
    letra: 'P',
    nome: 'REFERENTE À PREVENÇÃO E VISTORIA',
    rotuloCompleto: 'P - REFERENTE À PREVENÇÃO E VISTORIA',
    categoria: 'CATEGORIA II - OCORRÊNCIAS TÍPICAS DE BOMBEIRO MILITAR',
    categoriaCurta: 'Categoria II - Típicas BM',
    cor: '#f59e0b',
  },
  R: {
    letra: 'R',
    nome: 'REFERENTE ÀS ATIVIDADES DE DEFESA CIVIL',
    rotuloCompleto: 'R - REFERENTE ÀS ATIVIDADES DE DEFESA CIVIL',
    categoria: 'CATEGORIA II - OCORRÊNCIAS TÍPICAS DE BOMBEIRO MILITAR',
    categoriaCurta: 'Categoria II - Típicas BM',
    cor: '#eab308',
  },
  S: {
    letra: 'S',
    nome: 'REFERENTE À BUSCA E SALVAMENTO',
    rotuloCompleto: 'S - REFERENTE À BUSCA E SALVAMENTO',
    categoria: 'CATEGORIA II - OCORRÊNCIAS TÍPICAS DE BOMBEIRO MILITAR',
    categoriaCurta: 'Categoria II - Típicas BM',
    cor: '#f97316',
  },
  V: {
    letra: 'V',
    nome: 'REFERENTE AO ATENDIMENTO PRÉ-HOSPITALAR (APH)',
    rotuloCompleto: 'V - REFERENTE AO ATENDIMENTO PRÉ-HOSPITALAR (APH)',
    categoria: 'CATEGORIA II - OCORRÊNCIAS TÍPICAS DE BOMBEIRO MILITAR',
    categoriaCurta: 'Categoria II - Típicas BM',
    cor: '#ec4899',
  },

  // CATEGORIA III - AÇÕES E OPERAÇÕES DECORRENTES DO SIDS
  A: {
    letra: 'A',
    nome: 'AÇÕES DE DEFESA SOCIAL',
    rotuloCompleto: 'A - AÇÕES DE DEFESA SOCIAL',
    categoria: 'CATEGORIA III - AÇÕES E OPERAÇÕES DECORRENTES DO SIDS',
    categoriaCurta: 'Categoria III - SIDS',
    cor: '#3b82f6',
  },
  Q: {
    letra: 'Q',
    nome: 'DEMONSTRAÇÕES, PALESTRAS E TREINAMENTOS',
    rotuloCompleto: 'Q - DEMONSTRAÇÕES, PALESTRAS E TREINAMENTOS',
    categoria: 'CATEGORIA III - AÇÕES E OPERAÇÕES DECORRENTES DO SIDS',
    categoriaCurta: 'Categoria III - SIDS',
    cor: '#8b5cf6',
  },
  W: {
    letra: 'W',
    nome: 'PROCEDIMENTOS ADMINISTRATIVOS CIAD',
    rotuloCompleto: 'W - PROCEDIMENTOS ADMINISTRATIVOS CIAD',
    categoria: 'CATEGORIA III - AÇÕES E OPERAÇÕES DECORRENTES DO SIDS',
    categoriaCurta: 'Categoria III - SIDS',
    cor: '#6366f1',
  },
  Y: {
    letra: 'Y',
    nome: 'OPERAÇÕES DE DEFESA SOCIAL',
    rotuloCompleto: 'Y - OPERAÇÕES DE DEFESA SOCIAL',
    categoria: 'CATEGORIA III - AÇÕES E OPERAÇÕES DECORRENTES DO SIDS',
    categoriaCurta: 'Categoria III - SIDS',
    cor: '#06b6d4',
  },
  X: {
    letra: 'X',
    nome: 'COORDENAÇÃO E CONTROLE OPERACIONAL E ADMINISTRATIVO',
    rotuloCompleto: 'X - COORDENAÇÃO E CONTROLE OPERACIONAL E ADMINISTRATIVO',
    categoria: 'CATEGORIA III - AÇÕES E OPERAÇÕES DECORRENTES DO SIDS',
    categoriaCurta: 'Categoria III - SIDS',
    cor: '#14b8a6',
  },
  U: {
    letra: 'U',
    nome: 'COMUNICAÇÕES, DENÚNCIAS, RECLAMAÇÕES E SOLICITAÇÕES DIVERSAS',
    rotuloCompleto: 'U - COMUNICAÇÕES, DENÚNCIAS, RECLAMAÇÕES E SOLICITAÇÕES DIVERSAS',
    categoria: 'CATEGORIA III - AÇÕES E OPERAÇÕES DECORRENTES DO SIDS',
    categoriaCurta: 'Categoria III - SIDS',
    cor: '#64748b',
  },
};

export const ESTRUTURA_CATEGORIAS_SIDS = [
  {
    categoria: 'CATEGORIA II - OCORRÊNCIAS TÍPICAS DE BOMBEIRO MILITAR',
    sigla: 'CAT_II',
    grupos: [
      GRUPOS_NATUREZAS_CBMMG.O,
      GRUPOS_NATUREZAS_CBMMG.P,
      GRUPOS_NATUREZAS_CBMMG.R,
      GRUPOS_NATUREZAS_CBMMG.S,
      GRUPOS_NATUREZAS_CBMMG.V,
    ],
  },
  {
    categoria: 'CATEGORIA III - AÇÕES E OPERAÇÕES DECORRENTES DO SIDS',
    sigla: 'CAT_III',
    grupos: [
      GRUPOS_NATUREZAS_CBMMG.A,
      GRUPOS_NATUREZAS_CBMMG.Q,
      GRUPOS_NATUREZAS_CBMMG.W,
      GRUPOS_NATUREZAS_CBMMG.Y,
      GRUPOS_NATUREZAS_CBMMG.X,
      GRUPOS_NATUREZAS_CBMMG.U,
    ],
  },
];

export const CATALOGO_NATUREZAS_CBMMG: NaturezaAuxiliar[] = [
  // O - REFERENTE À EXPLOSÃO E INCÊNDIO
  { id: 101, codigo: 'O0101', descricao: 'Incêndio em Vegetação / Florestal', grupo: 'O - REFERENTE À EXPLOSÃO E INCÊNDIO', letraGrupo: 'O', categoria: 'CATEGORIA II - OCORRÊNCIAS TÍPICAS DE BOMBEIRO MILITAR', prioridadeSugerida: 'Alta', corGrupo: '#ef4444' },
  { id: 102, codigo: 'O0102', descricao: 'Incêndio em Edificação Residencial', grupo: 'O - REFERENTE À EXPLOSÃO E INCÊNDIO', letraGrupo: 'O', categoria: 'CATEGORIA II - OCORRÊNCIAS TÍPICAS DE BOMBEIRO MILITAR', prioridadeSugerida: 'Alta', corGrupo: '#ef4444' },
  { id: 103, codigo: 'O0103', descricao: 'Incêndio em Edificação Comercial / Industrial', grupo: 'O - REFERENTE À EXPLOSÃO E INCÊNDIO', letraGrupo: 'O', categoria: 'CATEGORIA II - OCORRÊNCIAS TÍPICAS DE BOMBEIRO MILITAR', prioridadeSugerida: 'Alta', corGrupo: '#ef4444' },
  { id: 104, codigo: 'O0104', descricao: 'Incêndio em Veículo Automotor', grupo: 'O - REFERENTE À EXPLOSÃO E INCÊNDIO', letraGrupo: 'O', categoria: 'CATEGORIA II - OCORRÊNCIAS TÍPICAS DE BOMBEIRO MILITAR', prioridadeSugerida: 'Média', corGrupo: '#ef4444' },
  { id: 105, codigo: 'O0105', descricao: 'Incêndio em Lote Vago / Entulho', grupo: 'O - REFERENTE À EXPLOSÃO E INCÊNDIO', letraGrupo: 'O', categoria: 'CATEGORIA II - OCORRÊNCIAS TÍPICAS DE BOMBEIRO MILITAR', prioridadeSugerida: 'Baixa', corGrupo: '#ef4444' },
  { id: 106, codigo: 'O0201', descricao: 'Explosão / Risco de Explosão por GLP ou Combustível', grupo: 'O - REFERENTE À EXPLOSÃO E INCÊNDIO', letraGrupo: 'O', categoria: 'CATEGORIA II - OCORRÊNCIAS TÍPICAS DE BOMBEIRO MILITAR', prioridadeSugerida: 'Alta', corGrupo: '#ef4444' },

  // P - REFERENTE À PREVENÇÃO E VISTORIA
  { id: 201, codigo: 'P0101', descricao: 'Vistoria Preventiva Operacional em Edificação', grupo: 'P - REFERENTE À PREVENÇÃO E VISTORIA', letraGrupo: 'P', categoria: 'CATEGORIA II - OCORRÊNCIAS TÍPICAS DE BOMBEIRO MILITAR', prioridadeSugerida: 'Baixa', corGrupo: '#f59e0b' },
  { id: 202, codigo: 'P0102', descricao: 'Fiscalização de Evento de Grande Público / AVCB', grupo: 'P - REFERENTE À PREVENÇÃO E VISTORIA', letraGrupo: 'P', categoria: 'CATEGORIA II - OCORRÊNCIAS TÍPICAS DE BOMBEIRO MILITAR', prioridadeSugerida: 'Média', corGrupo: '#f59e0b' },
  { id: 203, codigo: 'P0201', descricao: 'Inspeção Técnica de Risco Pós-Sinistro', grupo: 'P - REFERENTE À PREVENÇÃO E VISTORIA', letraGrupo: 'P', categoria: 'CATEGORIA II - OCORRÊNCIAS TÍPICAS DE BOMBEIRO MILITAR', prioridadeSugerida: 'Baixa', corGrupo: '#f59e0b' },

  // R - REFERENTE ÀS ATIVIDADES DE DEFESA CIVIL
  { id: 301, codigo: 'R0101', descricao: 'Risco Iminente de Desabamento / Colapso Estrutural', grupo: 'R - REFERENTE ÀS ATIVIDADES DE DEFESA CIVIL', letraGrupo: 'R', categoria: 'CATEGORIA II - OCORRÊNCIAS TÍPICAS DE BOMBEIRO MILITAR', prioridadeSugerida: 'Alta', corGrupo: '#eab308' },
  { id: 302, codigo: 'R0102', descricao: 'Alagamento / Inundação com Pessoas Ilhadas', grupo: 'R - REFERENTE ÀS ATIVIDADES DE DEFESA CIVIL', letraGrupo: 'R', categoria: 'CATEGORIA II - OCORRÊNCIAS TÍPICAS DE BOMBEIRO MILITAR', prioridadeSugerida: 'Alta', corGrupo: '#eab308' },
  { id: 303, codigo: 'R0103', descricao: 'Queda ou Risco Iminente de Queda de Árvore', grupo: 'R - REFERENTE ÀS ATIVIDADES DE DEFESA CIVIL', letraGrupo: 'R', categoria: 'CATEGORIA II - OCORRÊNCIAS TÍPICAS DE BOMBEIRO MILITAR', prioridadeSugerida: 'Média', corGrupo: '#eab308' },
  { id: 304, codigo: 'R0201', descricao: 'Deslizamento de Encosta / Talude com Risco', grupo: 'R - REFERENTE ÀS ATIVIDADES DE DEFESA CIVIL', letraGrupo: 'R', categoria: 'CATEGORIA II - OCORRÊNCIAS TÍPICAS DE BOMBEIRO MILITAR', prioridadeSugerida: 'Alta', corGrupo: '#eab308' },

  // S - REFERENTE À BUSCA E SALVAMENTO
  { id: 401, codigo: 'S0101', descricao: 'Acidente de Trânsito com Vítima Presa às Ferragens', grupo: 'S - REFERENTE À BUSCA E SALVAMENTO', letraGrupo: 'S', categoria: 'CATEGORIA II - OCORRÊNCIAS TÍPICAS DE BOMBEIRO MILITAR', prioridadeSugerida: 'Alta', corGrupo: '#f97316' },
  { id: 402, codigo: 'S0201', descricao: 'Salvamento Aquático / Afogamento em Andamento', grupo: 'S - REFERENTE À BUSCA E SALVAMENTO', letraGrupo: 'S', categoria: 'CATEGORIA II - OCORRÊNCIAS TÍPICAS DE BOMBEIRO MILITAR', prioridadeSugerida: 'Alta', corGrupo: '#f97316' },
  { id: 403, codigo: 'S0202', descricao: 'Busca de Pessoa Perdida em Mata ou Local de Difícil Acesso', grupo: 'S - REFERENTE À BUSCA E SALVAMENTO', letraGrupo: 'S', categoria: 'CATEGORIA II - OCORRÊNCIAS TÍPICAS DE BOMBEIRO MILITAR', prioridadeSugerida: 'Alta', corGrupo: '#f97316' },
  { id: 404, codigo: 'S0301', descricao: 'Salvamento de Pessoa em Altura / Elevador / Poço', grupo: 'S - REFERENTE À BUSCA E SALVAMENTO', letraGrupo: 'S', categoria: 'CATEGORIA II - OCORRÊNCIAS TÍPICAS DE BOMBEIRO MILITAR', prioridadeSugerida: 'Média', corGrupo: '#f97316' },
  { id: 405, codigo: 'S0401', descricao: 'Captura de Animal Silvestre / Serpente Peçonhenta', grupo: 'S - REFERENTE À BUSCA E SALVAMENTO', letraGrupo: 'S', categoria: 'CATEGORIA II - OCORRÊNCIAS TÍPICAS DE BOMBEIRO MILITAR', prioridadeSugerida: 'Média', corGrupo: '#f97316' },
  { id: 406, codigo: 'S0402', descricao: 'Risco ou Ataque de Insetos / Abelhas / Marimbondos', grupo: 'S - REFERENTE À BUSCA E SALVAMENTO', letraGrupo: 'S', categoria: 'CATEGORIA II - OCORRÊNCIAS TÍPICAS DE BOMBEIRO MILITAR', prioridadeSugerida: 'Alta', corGrupo: '#f97316' },

  // V - REFERENTE AO ATENDIMENTO PRÉ-HOSPITALAR (APH)
  { id: 501, codigo: 'V0101', descricao: 'Parada Cardiorrespiratória (PCR) / Mal Súbito Grave', grupo: 'V - REFERENTE AO ATENDIMENTO PRÉ-HOSPITALAR (APH)', letraGrupo: 'V', categoria: 'CATEGORIA II - OCORRÊNCIAS TÍPICAS DE BOMBEIRO MILITAR', prioridadeSugerida: 'Alta', corGrupo: '#ec4899' },
  { id: 502, codigo: 'V0102', descricao: 'Trauma Grave / Queda de Nível com Lesões Múltiplas', grupo: 'V - REFERENTE AO ATENDIMENTO PRÉ-HOSPITALAR (APH)', letraGrupo: 'V', categoria: 'CATEGORIA II - OCORRÊNCIAS TÍPICAS DE BOMBEIRO MILITAR', prioridadeSugerida: 'Alta', corGrupo: '#ec4899' },
  { id: 503, codigo: 'V0103', descricao: 'Crise Convulsiva / Perda de Consciência em Via Pública', grupo: 'V - REFERENTE AO ATENDIMENTO PRÉ-HOSPITALAR (APH)', letraGrupo: 'V', categoria: 'CATEGORIA II - OCORRÊNCIAS TÍPICAS DE BOMBEIRO MILITAR', prioridadeSugerida: 'Média', corGrupo: '#ec4899' },
  { id: 504, codigo: 'V0104', descricao: 'Queimadura Térmica ou Química Grave', grupo: 'V - REFERENTE AO ATENDIMENTO PRÉ-HOSPITALAR (APH)', letraGrupo: 'V', categoria: 'CATEGORIA II - OCORRÊNCIAS TÍPICAS DE BOMBEIRO MILITAR', prioridadeSugerida: 'Alta', corGrupo: '#ec4899' },

  // CATEGORIA III - AÇÕES E OPERAÇÕES DECORRENTES DO SIDS
  // A - AÇÕES DE DEFESA SOCIAL
  { id: 601, codigo: 'A0101', descricao: 'Apoio em Ação de Defesa Social Integrada (PMMG/PCMG)', grupo: 'A - AÇÕES DE DEFESA SOCIAL', letraGrupo: 'A', categoria: 'CATEGORIA III - AÇÕES E OPERAÇÕES DECORRENTES DO SIDS', prioridadeSugerida: 'Média', corGrupo: '#3b82f6' },
  { id: 602, codigo: 'A0201', descricao: 'Preservação de Local de Crime / Isolamento Integrado', grupo: 'A - AÇÕES DE DEFESA SOCIAL', letraGrupo: 'A', categoria: 'CATEGORIA III - AÇÕES E OPERAÇÕES DECORRENTES DO SIDS', prioridadeSugerida: 'Baixa', corGrupo: '#3b82f6' },

  // Q - DEMONSTRAÇÕES, PALESTRAS E TREINAMENTOS
  { id: 701, codigo: 'Q0101', descricao: 'Instrução / Simulado de Emergência e Evacuação', grupo: 'Q - DEMONSTRAÇÕES, PALESTRAS E TREINAMENTOS', letraGrupo: 'Q', categoria: 'CATEGORIA III - AÇÕES E OPERAÇÕES DECORRENTES DO SIDS', prioridadeSugerida: 'Baixa', corGrupo: '#8b5cf6' },
  { id: 702, codigo: 'Q0201', descricao: 'Palestra Educativa de Prevenção a Acidentes e Incêndios', grupo: 'Q - DEMONSTRAÇÕES, PALESTRAS E TREINAMENTOS', letraGrupo: 'Q', categoria: 'CATEGORIA III - AÇÕES E OPERAÇÕES DECORRENTES DO SIDS', prioridadeSugerida: 'Baixa', corGrupo: '#8b5cf6' },

  // W - PROCEDIMENTOS ADMINISTRATIVOS CIAD
  { id: 801, codigo: 'W0101', descricao: 'Registro de Atendimento Administrativo CIAD / SIDS', grupo: 'W - PROCEDIMENTOS ADMINISTRATIVOS CIAD', letraGrupo: 'W', categoria: 'CATEGORIA III - AÇÕES E OPERAÇÕES DECORRENTES DO SIDS', prioridadeSugerida: 'Baixa', corGrupo: '#6366f1' },

  // Y - OPERAÇÕES DE DEFESA SOCIAL
  { id: 901, codigo: 'Y0101', descricao: 'Operação Férias Mais Seguras / Operação Alferes', grupo: 'Y - OPERAÇÕES DE DEFESA SOCIAL', letraGrupo: 'Y', categoria: 'CATEGORIA III - AÇÕES E OPERAÇÕES DECORRENTES DO SIDS', prioridadeSugerida: 'Média', corGrupo: '#06b6d4' },
  { id: 902, codigo: 'Y0201', descricao: 'Operação Integrada de Trânsito Rodoviário / Carnaval', grupo: 'Y - OPERAÇÕES DE DEFESA SOCIAL', letraGrupo: 'Y', categoria: 'CATEGORIA III - AÇÕES E OPERAÇÕES DECORRENTES DO SIDS', prioridadeSugerida: 'Média', corGrupo: '#06b6d4' },

  // X - COORDENAÇÃO E CONTROLE OPERACIONAL E ADMINISTRATIVO
  { id: 951, codigo: 'X0101', descricao: 'Coordenação de Sala de Operações / Posto de Comando Avançado', grupo: 'X - COORDENAÇÃO E CONTROLE OPERACIONAL E ADMINISTRATIVO', letraGrupo: 'X', categoria: 'CATEGORIA III - AÇÕES E OPERAÇÕES DECORRENTES DO SIDS', prioridadeSugerida: 'Alta', corGrupo: '#14b8a6' },

  // U - COMUNICAÇÕES, DENÚNCIAS, RECLAMAÇÕES E SOLICITAÇÕES DIVERSAS
  { id: 981, codigo: 'U0101', descricao: 'Solicitação de Informação / Triagem e Apoio ao Cidadão 193', grupo: 'U - COMUNICAÇÕES, DENÚNCIAS, RECLAMAÇÕES E SOLICITAÇÕES DIVERSAS', letraGrupo: 'U', categoria: 'CATEGORIA III - AÇÕES E OPERAÇÕES DECORRENTES DO SIDS', prioridadeSugerida: 'Baixa', corGrupo: '#64748b' },
  { id: 982, codigo: 'U0201', descricao: 'Denúncia de Irregularidade em Prevenção contra Incêndio', grupo: 'U - COMUNICAÇÕES, DENÚNCIAS, RECLAMAÇÕES E SOLICITAÇÕES DIVERSAS', letraGrupo: 'U', categoria: 'CATEGORIA III - AÇÕES E OPERAÇÕES DECORRENTES DO SIDS', prioridadeSugerida: 'Baixa', corGrupo: '#64748b' },
];

export const ORGAOS_AUXILIARES_CBMMG: OrgaoAuxiliar[] = [
  { id: 1, sigla: 'CBMMG', nome: 'Corpo de Bombeiros Militar de Minas Gerais', tipo: 'Titular' },
  { id: 2, sigla: 'PMMG', nome: 'Polícia Militar de Minas Gerais', tipo: 'Segurança' },
  { id: 3, sigla: 'PCMG', nome: 'Polícia Civil de Minas Gerais', tipo: 'Investigação/Perícia' },
  { id: 4, sigla: 'SAMU 192', nome: 'Serviço de Atendimento Móvel de Urgência', tipo: 'Saúde' },
  { id: 5, sigla: 'DEFESA CIVIL', nome: 'Coordenadoria Estadual de Defesa Civil (CEDEC)', tipo: 'Defesa Civil' },
  { id: 6, sigla: 'CEMIG', nome: 'Companhia Energética de Minas Gerais', tipo: 'Concessionária' },
  { id: 7, sigla: 'COPASA', nome: 'Companhia de Saneamento de Minas Gerais', tipo: 'Concessionária' },
  { id: 8, sigla: 'DER-MG', nome: 'Departamento de Edificações e Estradas de Rodagem de MG', tipo: 'Trânsito Rodoviário' },
  { id: 9, sigla: 'PRF', nome: 'Polícia Rodoviária Federal', tipo: 'Segurança Rodoviária' },
  { id: 10, sigla: 'CONCESSIONÁRIA', nome: 'Concessionária de Rodovias (Arteris / EPR / Eco135)', tipo: 'Apoio Rodoviário' },
];
