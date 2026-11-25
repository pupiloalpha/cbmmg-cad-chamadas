export type CodigoOrigemChamada = 'L' | 'I' | 'B' | 'A';
export type CodigoSituacaoChamada = 'E' | 'A';
export type CodigoSituacaoAtendimento =
  | 'ER'
  | 'NL'
  | 'CL'
  | 'DP'
  | 'EC'
  | 'EN'
  | 'LI'
  | 'ED'
  | 'TR'
  | 'AO'
  | 'AC'
  | 'SU';

export type CodigoSituacaoEmpenho =
  | 'TR'
  | 'ED'
  | 'EN'
  | 'DP'
  | 'AC'
  | 'ER'
  | 'NL'
  | 'LI'
  | 'EC'
  | 'SU';

export interface NaturezaAuxiliar {
  id: number | string;
  codigo: string;
  descricao: string;
  grupo: string;
  letraGrupo?: string;
  categoria?: 'CATEGORIA II - OCORRÊNCIAS TÍPICAS DE BOMBEIRO MILITAR' | 'CATEGORIA III - AÇÕES E OPERAÇÕES DECORRENTES DO SIDS';
  prioridadeSugerida?: 'Alta' | 'Média' | 'Baixa';
  corGrupo?: string;
}

export interface OrgaoAuxiliar {
  id: number | string;
  sigla: string;
  nome: string;
  tipo: string;
}

export interface UnidadeServicoAuxiliar {
  id: number;
  nome: string;
  sigla: string;
  cob: string;
  bbm: string;
  ciaInd?: string;
  subunidade?: string;
  semAreaDefinida?: boolean;
  municipioSede: string;
  latitudeSede?: number;
  longitudeSede?: number;
}

export interface RecursoEmpenhado {
  idRecurso: number | string;
  prefixo: string; // ex: ABT-04, UR-12, ABS-02, AR-09, BOA-01
  tipo?: string; // Auto Bomba Tanque, Unidade Resgate, Auto Salvamento, etc.
  placaMeioMaterial?: string;
  complementoPrefixo?: string;
  prefixoMeioMaterial?: string;
  dataHoraAtivacao?: string;
  codigoSituacaoRecurso?: CodigoSituacaoEmpenho;
  codigoSituacaoEmpenhoRecurso?: CodigoSituacaoEmpenho;
  idUnidadeServico?: number;
  unidadeNome?: string;
  componentes?: number; // Qtd bombeiros
  nomesMilitares?: string[];
  idMotivoIndisponibilidadeRecurso?: number | null;
}

export interface EnderecoOcorrencia {
  logradouro?: string;
  numero?: string;
  bairro?: string;
  municipio: string;
  uf: string;
  cep?: string;
  referencia?: string;
}

export type FiltroChuvaModo = 'TODOS' | 'ESTRITO' | 'AMPLO';

export interface ChamadaAtiva {
  idChamada: string | number;
  numeroOcorrencia: string;
  dataHoraAbertura: string;
  codigoSituacaoChamada: CodigoSituacaoChamada; // 'E' (em andamento) | 'A' (aguardando)
  codigoSituacaoAtendimentoChamada: CodigoSituacaoAtendimento;
  codigoOrigemChamada: CodigoOrigemChamada;
  prioridade: 'Alta' | 'Média' | 'Baixa' | string;
  
  // Natureza
  idNatureza?: number | string;
  codigoNatureza?: string;
  codigoNaturezaRaw?: string; // ex: V01023 (sem ponto, padrão CAD Java)
  descricaoNatureza: string;
  grupoNatureza: string;
  letraGrupoNatureza?: string;
  categoriaNatureza?: string;
  codigoPrioridadeCad?: string; // '1' | '2' | '3'
  tentado?: boolean;
  naturezaAtividade?: boolean;

  // Classificação Operacional (Período Chuvoso)
  relacaoChuva?: 'direta' | 'consequencia';
  motivoChuva?: string;

  // Localização
  endereco: EnderecoOcorrencia;
  latitude: number | null;
  longitude: number | null;
  temCoordenada?: boolean;
  latitudeOriginal?: number | null;
  longitudeOriginal?: number | null;

  // Estrutura Militar CBMMG
  cob: string;
  bbm: string;
  ciaInd?: string;
  subunidade?: string; // ex: 1ª CEOA .. 6ª CEOA (subordinadas ao BOA / CEB)
  semAreaDefinida?: boolean; // true para unidades do CEB (BEMAD, BOA, CEOA)
  areaCob?: string; // COB territorial do local da ocorrência
  areaBbm?: string; // BBM territorial do local da ocorrência
  areaCiaInd?: string; // Cia Ind territorial do local da ocorrência
  unidadesApoio?: { cob: string; bbm: string; ciaInd?: string; subunidade?: string }[];
  idUnidadeServico?: number;
  nomeUnidade?: string;
  unidadeResponsavelCad?: string; // Descrição oficial CAD, ex: "2BBM (CONTAGEM)"

  // Campos de Padronização CAD Java
  numeroChamadaFormatado?: string; // ex: 2021-18948455-0
  numeroRedsPrincipal?: string; // ex: (BM) 2023-010543179-001
  alerta?: boolean;
  destaque?: boolean;
  envolveAutoridade?: boolean;
  dataHoraSituacaoAtual?: string;
  eventoAssociado?: string;

  // Recursos & Empenhos
  recursos: RecursoEmpenhado[];
  totalBombeiros: number;

  // Tempos operacionais
  tempoDecorridoMinutos?: number;
  historicoObservacoes?: string[];
  orgaoApoio?: string;
}

export interface EnvelopeApiCad<T> {
  dataset?: string;
  categoria?: string;
  fonte: 'banco' | 'arquivo' | 'cache' | 'simulado';
  atualizado_em: string;
  total: number;
  dados: T;
  aviso?: string;
  statusConexao?: {
    online: boolean;
    emCache: boolean;
    segundosUltimaSync?: number;
    proximaSyncDisponivelEm?: number;
  };
}

export interface FiltrosOperacionais {
  // Multi-seleção de Unidades e Comandos CBMMG
  cobs: string[]; // ex: ['1º COB', '3º COB'], vazio ou com 'TODOS' significa todos
  bbms: string[]; // ex: ['1º BBM', '2º BBM'], vazio ou com 'TODOS' significa todos
  ciasInd: string[]; // ex: ['1ª Cia Ind', '2ª Cia Ind'], vazio ou com 'TODOS' significa todos
  
  // Retrocompatibilidade
  cob: string; // 'TODOS' ou nome do COB
  bbm: string; // 'TODOS' ou BBM
  ciaInd: string; // 'TODOS' ou Cia Ind
  
  naturezas?: string[]; // Multi-seleção de naturezas ou grupos oficiais (vazio = todas)
  naturezaGrupo: string; // 'TODOS' ou grupo (retrocompatibilidade)
  filtroChuva?: FiltroChuvaModo; // Filtro híbrido de período chuvoso
  situacaoChamada: string; // 'TODOS' | 'E' | 'A'
  situacaoAtendimento: string; // 'TODOS' | código
  origem: string; // 'TODOS' | 'L' | 'I' | 'B' | 'A'
  prioridade: string; // 'TODOS' | 'Alta' | 'Média' | 'Baixa'
  periodoTempo: 'todas' | '2h' | '8h' | '24h';
  apenasComGeolocalizacao: boolean;
  termoBusca: string;
}

export interface KpiOperacional {
  totalAtivas: number;
  emAndamento: number;
  aguardando: number;
  viaturasAtivas: number; // Viaturas com prefixo não-BM (sem situação TR)
  recursosEmpenhados: number; // Total de recursos empenhados sem situação TR
  bombeirosSemViatura: number; // Recursos com prefixo BM (máscara BM0000000, sem TR)
  totalBombeiros: number; // Substituído cálculo inferido por recursos empenhados sem TR
  comCoordenadas: number;
  semCoordenadas: number;
  tempoMedioEsperaMin: number;
  taxaAtendimentoPct: number;
  prioridadeAltaQtd: number;
  chuvasQtd: number;
  chuvasDiretasQtd: number;
  incendiosQtd: number;
  salvamentosQtd: number;
  aphQtd: number;
}

export type CategoriaRecursoBase = 'VTR' | 'BM' | 'BRIG';
export type SituacaoRecursoBase = 'D' | 'E' | 'I';

export interface RecursoCadAtivo {
  id: string;
  prefixo: string;
  complementoPrefixo?: string;
  idTipoRecurso?: string;
  idMeioMaterial?: string;
  placaMeioMaterial?: string;
  prefixoMeioMaterial?: string;
  idUnidadeServico?: string;
  nomeUnidade?: string;
  cob?: string;
  bbm?: string;
  ciaInd?: string;
  subunidade?: string;
  categoriaRecurso: CategoriaRecursoBase;
  codigoSituacaoRecurso: SituacaoRecursoBase;
  idMotivoIndisponibilidadeRecurso?: string;
  motivoIndisponibilidadeDescricao?: string;
  idMotivoRestricaoEmpenho?: string;
  dataHoraAtivacao?: string;
  dataHoraExpiracao?: string;
  empenhoSituacao?: string;
  idChamadaEmpenho?: string;
  componentesQtd: number;
  nomesComponentes?: string[];
}

export interface MotivoRecursoResumo {
  codigo: string;
  descricao: string;
  total: number;
  viaturas: number;
  efetivo: number;
}

export interface ResumoRecursosBase {
  totalBase: number;
  viaturasTotal: number;
  viaturasEmCampo: number;
  viaturasDisponiveis: number;
  viaturasIndisponiveis: number;
  bmTotal: number;
  bmEmCampo: number;
  bmDisponiveis: number;
  bmIndisponiveis: number;
  brigadistasTotal: number;
  brigadistasEmCampo: number;
  brigadistasDisponiveis: number;
  brigadistasIndisponiveis: number;
  efetivoTotal: number;
  efetivoEmCampo: number;
  efetivoDisponivel: number;
  efetivoIndisponivel: number;
  disponiveisTotal: number;
  empenhadosTotal: number;
  indisponiveisTotal: number;
  comRestricaoTotal: number;
  disponiveisComRestricao: number;
  indisponiveisComRestricao: number;
  empenhadosComRestricao: number;
  comExpiracaoTotal: number;
  motivosIndisponibilidade: MotivoRecursoResumo[];
  motivosRestricao: { codigo: string; total: number }[];
}

