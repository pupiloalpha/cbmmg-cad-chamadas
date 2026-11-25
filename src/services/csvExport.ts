import { DICIONARIO_SIGLAS, obterDescricaoSituacaoAtendimento } from '../data/catalogoAuxiliares';
import { ChamadaAtiva } from '../types/cbm';
import { formatarNumeroChamadaCad } from './cbmStorage';

export type FormatoCsvExportacao = 'cad' | 'completo';

function formatarDataHoraCadCSV(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';

  const partes = new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(d);

  const get = (type: Intl.DateTimeFormatPartTypes) =>
    partes.find((p) => p.type === type)?.value || '00';

  return `${get('day')}/${get('month')}/${get('year')} ${get('hour')}:${get('minute')}:${get('second')}`;
}

function formatarNaturezaCadCSV(c: ChamadaAtiva): string {
  const codRaw =
    c.codigoNaturezaRaw || (c.codigoNatureza ? c.codigoNatureza.replace(/\./g, '').toUpperCase() : '');
  const desc = (c.descricaoNatureza || '').trim();
  const flagCt = c.tentado ? '(T)' : '(C)';

  const codPrio =
    c.codigoPrioridadeCad ||
    (c.prioridade === 'Alta' ? '1' : c.prioridade === 'Baixa' ? '3' : '2');
  const labelPrio =
    codPrio === '1'
      ? '1 - Alta'
      : codPrio === '2'
      ? '2 - Média'
      : codPrio === '3'
      ? '3 - Baixa'
      : `${codPrio} - ${c.prioridade || 'Média'}`;

  const prefixo = codRaw ? `${codRaw} - ` : '';
  return `${prefixo}${desc} ${flagCt} (Prioridade: ${labelPrio})`;
}

function inferirTipoClassificacaoCad(c: ChamadaAtiva): string {
  if ((c.codigoSituacaoAtendimentoChamada || '').toUpperCase() !== 'CL') {
    return '';
  }
  return c.naturezaAtividade ? 'ATIVIDADE' : 'BOLETIM DE OCORRENCIA';
}

function escapeCSVSemicolon(val: unknown): string {
  if (val === null || val === undefined) return '';
  const str = String(val);
  if (str.includes(';') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function exportarChamadasParaCSV(
  chamadas: ChamadaAtiva[],
  nomeArquivo = 'cbmmg_chamadas_ativas.csv',
  formato: FormatoCsvExportacao = 'cad'
): boolean {
  if (!chamadas || chamadas.length === 0) {
    return false;
  }

  // Cabeçalho oficial de 16 colunas idêntico ao exportado pelo Sistema CAD Java
  const cabecalhosCad = [
    'Nº chamada',
    'Nº REDS',
    'Data/hora de criação',
    'Local do fato',
    'Latitude  do local',
    'Longitude do local',
    'Natureza',
    'Unidade Responsável',
    'Recursos empenhados',
    'Alerta',
    'Destaque',
    'Envolve autoridade',
    'Tipo de classificação',
    'Situação',
    'Data/hora da situação atual',
    'Evento associado',
  ];

  const cabecalhosCompletos = [
    ...cabecalhosCad,
    'Município',
    'COB / Comando',
    'BBM / Unidade',
    'Cia Ind / CEOA',
    'Área Territorial',
    'Grupo Natureza',
    'Relação Chuva',
    'Origem Acionamento',
    'Qtd. Recursos',
    'Tempo Decorrido (min)',
  ];

  const cabecalhos = formato === 'completo' ? cabecalhosCompletos : cabecalhosCad;

  const linhas = chamadas.map((c) => {
    const numChamada = c.numeroChamadaFormatado || formatarNumeroChamadaCad(c.numeroOcorrencia);
    const reds = c.numeroRedsPrincipal || '';
    const dataCriacao = formatarDataHoraCadCSV(c.dataHoraAbertura);
    const localFato = c.endereco.logradouro || c.endereco.municipio || '';
    const latCsv = c.latitudeOriginal !== undefined ? c.latitudeOriginal : c.latitude;
    const lngCsv = c.longitudeOriginal !== undefined ? c.longitudeOriginal : c.longitude;
    const naturezaCad = formatarNaturezaCadCSV(c);
    const unidadeResp = c.unidadeResponsavelCad || c.nomeUnidade || c.ciaInd || c.bbm || '';
    const prefixos = c.recursos.map((r) => r.prefixo).filter(Boolean).join(', ');
    const alertaStr = c.alerta ? 'Sim' : 'Não';
    const destaqueStr = c.destaque ? 'Sim' : 'Não';
    const autoridadeStr = c.envolveAutoridade ? 'Sim' : 'Não';
    const tipoClassif = inferirTipoClassificacaoCad(c);
    const situacaoCad = obterDescricaoSituacaoAtendimento(c.codigoSituacaoAtendimentoChamada);
    const dataSituacao = c.dataHoraSituacaoAtual ? formatarDataHoraCadCSV(c.dataHoraSituacaoAtual) : '';
    const evento = c.eventoAssociado || 'Não';

    const colunasCad = [
      numChamada,
      reds,
      dataCriacao,
      localFato,
      latCsv ?? '',
      lngCsv ?? '',
      naturezaCad,
      unidadeResp,
      prefixos,
      alertaStr,
      destaqueStr,
      autoridadeStr,
      tipoClassif,
      situacaoCad,
      dataSituacao,
      evento,
    ];

    if (formato === 'completo') {
      const origem =
        DICIONARIO_SIGLAS.origem_acionamento[c.codigoOrigemChamada] || c.codigoOrigemChamada;
      const areaTerritorial = c.areaCob
        ? `${c.areaCob} • ${c.areaBbm || ''}${c.areaCiaInd ? ` • ${c.areaCiaInd}` : ''}`
        : '-';
      const relChuva = c.relacaoChuva
        ? `${c.relacaoChuva === 'direta' ? 'Direta' : 'Correlata'}${c.motivoChuva ? ` (${c.motivoChuva})` : ''}`
        : 'Não';

      colunasCad.push(
        c.endereco.municipio,
        c.cob,
        c.bbm,
        c.ciaInd || c.subunidade || '-',
        areaTerritorial,
        c.grupoNatureza,
        relChuva,
        origem,
        String(c.totalBombeiros),
        String(c.tempoDecorridoMinutos || 0)
      );
    }

    return colunasCad.map(escapeCSVSemicolon).join(';');
  });

  // UTF-8 BOM para compatibilidade imediata de acentuação no Microsoft Excel e LibreOffice
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
