import { DICIONARIO_SIGLAS } from '../data/catalogoAuxiliares';
import { ChamadaAtiva } from '../types/cbm';

export function exportarChamadasParaCSV(chamadas: ChamadaAtiva[], nomeArquivo = 'cbmmg_chamadas_ativas.csv'): boolean {
  if (!chamadas || chamadas.length === 0) {
    return false;
  }

  const cabecalhos = [
    'Número Ocorrência',
    'Data/Hora Abertura',
    'Situação Chamada',
    'Situação Atendimento',
    'Prioridade',
    'Origem Acionamento',
    'COB',
    'BBM',
    'Cia Ind',
    'Município',
    'Bairro',
    'Logradouro',
    'Latitude',
    'Longitude',
    'Código Natureza',
    'Descrição Natureza',
    'Grupo Natureza',
    'Recursos Empenhados',
    'Total Bombeiros',
    'Órgão Apoio',
    'Tempo Decorrido (min)',
  ];

  const escapeCSV = (val: unknown): string => {
    if (val === null || val === undefined) return '""';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  };

  const linhas = chamadas.map((c) => {
    const sitChamada = DICIONARIO_SIGLAS.SituacaoChamada[c.codigoSituacaoChamada] || c.codigoSituacaoChamada;
    const sitAtend = DICIONARIO_SIGLAS.chamada_atendimento_situacao[c.codigoSituacaoAtendimentoChamada] || c.codigoSituacaoAtendimentoChamada;
    const origem = DICIONARIO_SIGLAS.origem_acionamento[c.codigoOrigemChamada] || c.codigoOrigemChamada;
    const prefixos = c.recursos.map((r) => r.prefixo).join(', ');

    return [
      escapeCSV(c.numeroOcorrencia),
      escapeCSV(new Date(c.dataHoraAbertura).toLocaleString('pt-BR')),
      escapeCSV(sitChamada),
      escapeCSV(sitAtend),
      escapeCSV(c.prioridade),
      escapeCSV(origem),
      escapeCSV(c.cob),
      escapeCSV(c.bbm),
      escapeCSV(c.ciaInd || '-'),
      escapeCSV(c.endereco.municipio),
      escapeCSV(c.endereco.bairro || '-'),
      escapeCSV(c.endereco.logradouro || '-'),
      escapeCSV(c.latitude ?? ''),
      escapeCSV(c.longitude ?? ''),
      escapeCSV(c.codigoNatureza || '-'),
      escapeCSV(c.descricaoNatureza),
      escapeCSV(c.grupoNatureza),
      escapeCSV(prefixos || 'Nenhum'),
      escapeCSV(c.totalBombeiros),
      escapeCSV(c.orgaoApoio || 'CBMMG'),
      escapeCSV(c.tempoDecorridoMinutos || 0),
    ].join(';');
  });

  // UTF-8 BOM para garantir acentos perfeitos no Microsoft Excel e LibreOffice
  const csvContent = '\uFEFF' + [cabecalhos.join(';'), ...linhas].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', nomeArquivo);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  return true;
}
