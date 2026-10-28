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

  empenho_situacao: {
    TR: 'Terminado',
    ED: 'Em Direção',
    EN: 'Encerramento',
    DP: 'Despachado',
    AC: 'A Caminho',
    ER: 'Em Retorno',
    NL: 'No Local',
    LI: 'No Local Intermediário',
    EC: 'Em Controle',
    SU: 'Suspenso',
  } as Record<CodigoSituacaoEmpenho, string>,

  chamada_atendimento_situacao: {
    ER: 'Em Retorno',
    NL: 'No Local',
    CL: 'Classificada',
    DP: 'Despachada',
    EC: 'Em Controle',
    EN: 'Encerramento',
    LI: 'Local Intermediário',
    ED: 'Em Direção',
    TR: 'Terminada',
    AO: 'Atribuída ao Órgão',
  } as Record<CodigoSituacaoAtendimento, string>,
};

export const CORES_SITUACAO_ATENDIMENTO: Record<CodigoSituacaoAtendimento, { bg: string; text: string; hex: string }> = {
  NL: { bg: 'bg-red-500/20 border-red-500/40 text-red-300', text: 'text-red-400', hex: '#ef4444' }, // No Local (Crítico)
  ED: { bg: 'bg-amber-500/20 border-amber-500/40 text-amber-300', text: 'text-amber-400', hex: '#f59e0b' }, // Em Direção
  DP: { bg: 'bg-blue-500/20 border-blue-500/40 text-blue-300', text: 'text-blue-400', hex: '#3b82f6' }, // Despachada
  EC: { bg: 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300', text: 'text-emerald-400', hex: '#10b981' }, // Em Controle
  CL: { bg: 'bg-purple-500/20 border-purple-500/40 text-purple-300', text: 'text-purple-400', hex: '#a855f7' }, // Classificada
  AO: { bg: 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300', text: 'text-cyan-400', hex: '#06b6d4' }, // Atribuída ao Órgão
  LI: { bg: 'bg-orange-500/20 border-orange-500/40 text-orange-300', text: 'text-orange-400', hex: '#ea580c' }, // Local Intermediário
  ER: { bg: 'bg-slate-500/20 border-slate-500/40 text-slate-300', text: 'text-slate-400', hex: '#64748b' }, // Em Retorno
  EN: { bg: 'bg-indigo-500/20 border-indigo-500/40 text-indigo-300', text: 'text-indigo-400', hex: '#6366f1' }, // Encerramento
  TR: { bg: 'bg-zinc-600/20 border-zinc-600/40 text-zinc-300', text: 'text-zinc-400', hex: '#71717a' }, // Terminada
};

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

export const CATALOGO_NATUREZAS_CBMMG: NaturezaAuxiliar[] = [
  // Incêndios
  { id: 101, codigo: 'A0101', descricao: 'Incêndio em Vegetação / Florestal', grupo: 'Incêndio', prioridadeSugerida: 'Alta', corGrupo: '#ef4444' },
  { id: 102, codigo: 'A0102', descricao: 'Incêndio em Edificação Residencial', grupo: 'Incêndio', prioridadeSugerida: 'Alta', corGrupo: '#ef4444' },
  { id: 103, codigo: 'A0103', descricao: 'Incêndio em Edificação Comercial / Industrial', grupo: 'Incêndio', prioridadeSugerida: 'Alta', corGrupo: '#ef4444' },
  { id: 104, codigo: 'A0104', descricao: 'Incêndio em Veículo Automotor', grupo: 'Incêndio', prioridadeSugerida: 'Média', corGrupo: '#ef4444' },
  { id: 105, codigo: 'A0105', descricao: 'Incêndio em Lote Vago / Entulho', grupo: 'Incêndio', prioridadeSugerida: 'Baixa', corGrupo: '#ef4444' },

  // Salvamento e Resgate
  { id: 201, codigo: 'B0201', descricao: 'Acidente de Trânsito com Vítima Presa às Ferragens', grupo: 'Salvamento e Resgate', prioridadeSugerida: 'Alta', corGrupo: '#f97316' },
  { id: 202, codigo: 'B0202', descricao: 'Salvamento Aquático / Afogamento em Andamento', grupo: 'Salvamento e Resgate', prioridadeSugerida: 'Alta', corGrupo: '#f97316' },
  { id: 203, codigo: 'B0203', descricao: 'Busca e Resgate em Área de Difícil Acesso / Altura', grupo: 'Salvamento e Resgate', prioridadeSugerida: 'Alta', corGrupo: '#f97316' },
  { id: 204, codigo: 'B0204', descricao: 'Resgate de Pessoa Presa em Elevador', grupo: 'Salvamento e Resgate', prioridadeSugerida: 'Média', corGrupo: '#f97316' },
  { id: 205, codigo: 'B0205', descricao: 'Tentativa de Autoextermínio / Resgate em Ponte/Viaduto', grupo: 'Salvamento e Resgate', prioridadeSugerida: 'Alta', corGrupo: '#f97316' },
  { id: 206, codigo: 'B0206', descricao: 'Soterramento / Desabamento de Estrutura', grupo: 'Salvamento e Resgate', prioridadeSugerida: 'Alta', corGrupo: '#f97316' },

  // Atendimento Pré-Hospitalar (APH)
  { id: 301, codigo: 'C0301', descricao: 'Parada Cardiorrespiratória (PCR)', grupo: 'Atendimento Pré-Hospitalar', prioridadeSugerida: 'Alta', corGrupo: '#e11d48' },
  { id: 302, codigo: 'C0302', descricao: 'Trauma Grave / Queda de Nível', grupo: 'Atendimento Pré-Hospitalar', prioridadeSugerida: 'Alta', corGrupo: '#e11d48' },
  { id: 303, codigo: 'C0303', descricao: 'Crise Convulsiva / Mal Súbito em Via Pública', grupo: 'Atendimento Pré-Hospitalar', prioridadeSugerida: 'Média', corGrupo: '#e11d48' },
  { id: 304, codigo: 'C0304', descricao: 'Acidente com Queimaduras Graves', grupo: 'Atendimento Pré-Hospitalar', prioridadeSugerida: 'Alta', corGrupo: '#e11d48' },

  // Proteção e Defesa Civil
  { id: 401, codigo: 'D0401', descricao: 'Risco Iminente de Desabamento / Colapso', grupo: 'Proteção e Defesa Civil', prioridadeSugerida: 'Alta', corGrupo: '#eab308' },
  { id: 402, codigo: 'D0402', descricao: 'Alagamento / Inundação com Pessoas Ilhadas', grupo: 'Proteção e Defesa Civil', prioridadeSugerida: 'Alta', corGrupo: '#eab308' },
  { id: 403, codigo: 'D0403', descricao: 'Queda de Árvore sobre Residência ou Via Arterial', grupo: 'Proteção e Defesa Civil', prioridadeSugerida: 'Média', corGrupo: '#eab308' },
  { id: 404, codigo: 'D0404', descricao: 'Vistoria Preventiva / Trinca Estrutural', grupo: 'Proteção e Defesa Civil', prioridadeSugerida: 'Baixa', corGrupo: '#eab308' },

  // Fauna e Meio Ambiente
  { id: 501, codigo: 'E0501', descricao: 'Captura de Serpente Peçonhenta em Residência', grupo: 'Fauna e Meio Ambiente', prioridadeSugerida: 'Média', corGrupo: '#10b981' },
  { id: 502, codigo: 'E0502', descricao: 'Extermínio de Insetos com Ataque / Enxame Ativo', grupo: 'Fauna e Meio Ambiente', prioridadeSugerida: 'Alta', corGrupo: '#10b981' },
  { id: 503, codigo: 'E0503', descricao: 'Captura / Salvamento de Animal em Poço ou Telhado', grupo: 'Fauna e Meio Ambiente', prioridadeSugerida: 'Baixa', corGrupo: '#10b981' },

  // Produtos Perigosos
  { id: 601, codigo: 'F0601', descricao: 'Vazamento de GLP com Fogo / Risco de Explosão', grupo: 'Produtos Perigosos', prioridadeSugerida: 'Alta', corGrupo: '#8b5cf6' },
  { id: 602, codigo: 'F0602', descricao: 'Derramamento de Combustível em Rodovia', grupo: 'Produtos Perigosos', prioridadeSugerida: 'Alta', corGrupo: '#8b5cf6' },
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
