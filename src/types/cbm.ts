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
  | 'AO';

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
  dataHoraAtivacao: string;
  codigoSituacaoRecurso?: CodigoSituacaoEmpenho;
  codigoSituacaoEmpenhoRecurso?: CodigoSituacaoEmpenho;
  idUnidadeServico?: number;
  unidadeNome?: string;
  componentes?: number; // Qtd bombeiros
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
  descricaoNatureza: string;
  grupoNatureza: string;
  
  // Localização
  endereco: EnderecoOcorrencia;
  latitude: number | null;
  longitude: number | null;
  
  // Estrutura Militar CBMMG
  cob: string;
  bbm: string;
  ciaInd?: string;
  idUnidadeServico?: number;
  nomeUnidade?: string;
  
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
  cob: string; // 'TODOS' ou nome do COB
  bbm: string; // 'TODOS' ou BBM
  ciaInd: string; // 'TODOS' ou Cia Ind
  naturezaGrupo: string; // 'TODOS' ou grupo
  situacaoChamada: string; // 'TODOS' | 'E' | 'A'
  situacaoAtendimento: string; // 'TODOS' | código
  origem: string; // 'TODOS' | 'L' | 'I' | 'B' | 'A'
  prioridade: string; // 'TODOS' | 'Alta' | 'Média' | 'Baixa'
  periodoTempo: 'todas' | '2h' | '6h' | '12h' | '24h' | 'personalizado';
  dataInicio?: string;
  dataFim?: string;
  apenasComGeolocalizacao: boolean;
  termoBusca: string;
}

export interface KpiOperacional {
  totalAtivas: number;
  emAndamento: number;
  aguardando: number;
  recursosEmpenhados: number;
  totalBombeiros: number;
  comCoordenadas: number;
  semCoordenadas: number;
  tempoMedioEsperaMin: number;
  taxaAtendimentoPct: number;
  prioridadeAltaQtd: number;
}
