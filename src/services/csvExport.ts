import { DICIONARIO_SIGLAS, obterDescricaoSituacaoAtendimento } from '../data/catalogoAuxiliares';
import { ChamadaAtiva, RecursoCadAtivo, RecursoEmpenhoBase } from '../types/cbm';
import {
  formatarNumeroChamadaCad,
  obterReferenciaTemporalChamadas,
  parseDataCadParaIso,
} from './cbmStorage';

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
  let str = String(val);

  // Prevenção contra CSV Formula Injection em planilhas (Excel/LibreOffice),
  // preservando números negativos legítimos (ex: latitude/longitude).
  const isNumericValue = typeof val === 'number' || /^-?\d+(\.\d+)?$/.test(str.trim());
  if (!isNumericValue && /^[ \t\r\n]*[=+\-@\t\r]/.test(str)) {
    str = `'${str}`;
  }

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

function calcularMinutosDecorridos(iso?: string, referenciaMs?: number): string {
  if (!iso || !referenciaMs) return '';
  const parsed = parseDataCadParaIso(iso);
  if (!parsed) return '';
  const ms = new Date(parsed).getTime();
  if (isNaN(ms)) return '';
  return String(Math.max(0, Math.round((referenciaMs - ms) / 60000)));
}

function formatarCategoriaRecurso(cat: RecursoCadAtivo['categoriaRecurso']): string {
  if (cat === 'VTR') return 'Viatura (VTR)';
  if (cat === 'BM') return 'Bombeiro (BM)';
  return 'Brigadista (BRIG)';
}

function formatarSituacaoRecurso(sit: RecursoCadAtivo['codigoSituacaoRecurso']): string {
  if (sit === 'D') return 'Disponível';
  if (sit === 'E') return 'Empenhado';
  return 'Indisponível';
}

export function exportarRecursosParaCSV(
  recursos: RecursoCadAtivo[],
  chamadas: ChamadaAtiva[] = [],
  nomeArquivo = 'cbmmg_cad_recursos.csv'
): boolean {
  if (!recursos || recursos.length === 0) {
    return false;
  }

  const referenciaMs = obterReferenciaTemporalChamadas(chamadas);

  const mapaChamadasPorId = new Map<string, ChamadaAtiva>();
  const mapaEmpenhosPorRecursoId = new Map<string, { chamada: ChamadaAtiva; sit?: string; dataInicio?: string }[]>();
  const mapaEmpenhosPorPrefixo = new Map<string, { chamada: ChamadaAtiva; sit?: string; dataInicio?: string }[]>();

  for (const ch of chamadas) {
    mapaChamadasPorId.set(String(ch.idChamada), ch);
    for (const emp of ch.recursos || []) {
      const sit = (emp.codigoSituacaoEmpenhoRecurso || emp.codigoSituacaoRecurso || '').toUpperCase();
      if (sit === 'TR') continue;
      const item = { chamada: ch, sit, dataInicio: emp.dataHoraAtivacao };
      if (emp.idRecurso !== undefined && emp.idRecurso !== null) {
        const key = String(emp.idRecurso);
        if (!mapaEmpenhosPorRecursoId.has(key)) mapaEmpenhosPorRecursoId.set(key, []);
        mapaEmpenhosPorRecursoId.get(key)!.push(item);
      }
      if (emp.prefixo) {
        const pKey = emp.prefixo.trim().toUpperCase();
        if (!mapaEmpenhosPorPrefixo.has(pKey)) mapaEmpenhosPorPrefixo.set(pKey, []);
        mapaEmpenhosPorPrefixo.get(pKey)!.push(item);
      }
    }
  }

  const cabecalhos = [
    'ID Recurso',
    'Prefixo',
    'Complemento',
    'Categoria',
    'Código Tipo Recurso',
    'ID Meio Material',
    'Placa',
    'Prefixo Meio Material',
    'COB / Comando',
    'BBM / Unidade',
    'Cia Ind / Subunidade',
    'Unidade de Serviço',
    'ID Unidade Serviço',
    'Código Situação',
    'Situação Recurso',
    'Código Indisponibilidade',
    'Motivo Indisponibilidade',
    'Código Restrição Empenho',
    'Data/hora Ativação',
    'Tempo Ativado (min)',
    'Data/hora Expiração',
    'Última Atualização (Versão Lógica)',
    'Qtd. Componentes',
    'Guarnição / Componentes',
    'Qtd. Empenhos Ativos',
    'Situação Empenho',
    'Data/hora Início Empenho',
    'Tempo de Empenho (min)',
    'Data/hora Situação Empenho',
    'Tempo na Situação Empenho (min)',
    'Destino Empenho',
    'ID(s) Chamada(s)',
    'Nº(s) Chamada(s) CAD',
    'Natureza(s) da(s) Chamada(s)',
    'Município(s) da(s) Chamada(s)',
    'Local(is) da(s) Chamada(s)',
    'Situação(ões) da(s) Chamada(s)',
  ];

  const linhas = recursos.map((r) => {
    const componentesStr =
      r.componentes && r.componentes.length > 0
        ? r.componentes
            .map((c) => {
              const base = [c.codigoPessoa, c.nomePessoa].filter(Boolean).join(' - ');
              return c.idFuncaoComponenteRecurso ? `${base} (Func:${c.idFuncaoComponenteRecurso})` : base;
            })
            .filter(Boolean)
            .join(' | ')
        : (r.nomesComponentes || []).join(' | ');

    // Consolida empenhos da base do recurso + cruzamento com chamadas ativas
    let empenhos: RecursoEmpenhoBase[] = r.empenhosNaoEncerrados ? [...r.empenhosNaoEncerrados] : [];
    if (empenhos.length === 0 && (r.idChamadaEmpenho || r.empenhoSituacao)) {
      empenhos = [
        {
          idChamada: r.idChamadaEmpenho || '',
          codigoSituacaoEmpenhoRecurso: r.empenhoSituacao,
        },
      ];
    }
    if (empenhos.length === 0) {
      const viaChamadas =
        mapaEmpenhosPorRecursoId.get(String(r.id)) ||
        mapaEmpenhosPorPrefixo.get(r.prefixo.trim().toUpperCase()) ||
        [];
      if (viaChamadas.length > 0) {
        empenhos = viaChamadas.map((vc) => ({
          idChamada: String(vc.chamada.idChamada),
          codigoSituacaoEmpenhoRecurso: vc.sit,
          dataHoraInicio: vc.dataInicio,
        }));
      }
    }

    const situacoesEmp = empenhos
      .map((e) => {
        if (!e.codigoSituacaoEmpenhoRecurso) return '';
        const sig = e.codigoSituacaoEmpenhoRecurso.toUpperCase();
        const desc = DICIONARIO_SIGLAS.empenho_situacao[sig as keyof typeof DICIONARIO_SIGLAS.empenho_situacao];
        return desc ? `${sig} - ${desc}` : sig;
      })
      .filter(Boolean)
      .join(' | ');

    const datasInicioEmp = empenhos
      .map((e) => formatarDataHoraCadCSV(e.dataHoraInicio))
      .filter(Boolean)
      .join(' | ');

    const temposEmp = empenhos
      .map((e) => calcularMinutosDecorridos(e.dataHoraInicio, referenciaMs))
      .filter(Boolean)
      .join(' | ');

    const datasSitEmp = empenhos
      .map((e) => formatarDataHoraCadCSV(e.dataHoraInicioSituacaoEmpenhoRecurso))
      .filter(Boolean)
      .join(' | ');

    const temposSitEmp = empenhos
      .map((e) => calcularMinutosDecorridos(e.dataHoraInicioSituacaoEmpenhoRecurso, referenciaMs))
      .filter(Boolean)
      .join(' | ');

    const destinosEmp = empenhos
      .map((e) => e.descricaoLocalDestinoRecurso || '')
      .filter(Boolean)
      .join(' | ');

    const idsChamadasUnicos = Array.from(
      new Set(empenhos.map((e) => e.idChamada).filter(Boolean))
    );

    const numsChamadaCad: string[] = [];
    const naturezasChamada: string[] = [];
    const municipiosChamada: string[] = [];
    const locaisChamada: string[] = [];
    const situacoesChamada: string[] = [];

    for (const idCh of idsChamadasUnicos) {
      const ch = mapaChamadasPorId.get(idCh);
      if (ch) {
        numsChamadaCad.push(ch.numeroChamadaFormatado || formatarNumeroChamadaCad(ch.numeroOcorrencia));
        const codNat = ch.codigoNaturezaRaw || ch.codigoNatureza || '';
        naturezasChamada.push(
          [codNat, ch.descricaoNatureza].filter(Boolean).join(' - ')
        );
        if (ch.endereco?.municipio) municipiosChamada.push(ch.endereco.municipio);
        if (ch.endereco?.logradouro) locaisChamada.push(ch.endereco.logradouro);
        situacoesChamada.push(
          `${ch.codigoSituacaoAtendimentoChamada} - ${obterDescricaoSituacaoAtendimento(ch.codigoSituacaoAtendimentoChamada)}`
        );
      } else {
        numsChamadaCad.push(formatarNumeroChamadaCad(idCh));
      }
    }

    const colunas = [
      r.id,
      r.prefixo,
      r.complementoPrefixo || '',
      formatarCategoriaRecurso(r.categoriaRecurso),
      r.idTipoRecurso || '',
      r.idMeioMaterial || '',
      r.placaMeioMaterial || '',
      r.prefixoMeioMaterial || '',
      r.cob || '',
      r.bbm || '',
      r.ciaInd || r.subunidade || '',
      r.nomeUnidade || '',
      r.idUnidadeServico || '',
      r.codigoSituacaoRecurso,
      formatarSituacaoRecurso(r.codigoSituacaoRecurso),
      r.idMotivoIndisponibilidadeRecurso || '',
      r.motivoIndisponibilidadeDescricao || '',
      r.idMotivoRestricaoEmpenho || '',
      formatarDataHoraCadCSV(r.dataHoraAtivacao),
      calcularMinutosDecorridos(r.dataHoraAtivacao, referenciaMs),
      formatarDataHoraCadCSV(r.dataHoraExpiracao),
      formatarDataHoraCadCSV(r.versaoLogica),
      String(r.componentesQtd ?? (r.componentes?.length || r.nomesComponentes?.length || 0)),
      componentesStr,
      String(empenhos.length),
      situacoesEmp,
      datasInicioEmp,
      temposEmp,
      datasSitEmp,
      temposSitEmp,
      destinosEmp,
      idsChamadasUnicos.join(' | '),
      numsChamadaCad.join(' | '),
      naturezasChamada.join(' | '),
      municipiosChamada.join(' | '),
      locaisChamada.join(' | '),
      situacoesChamada.join(' | '),
    ];

    return colunas.map(escapeCSVSemicolon).join(';');
  });

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
