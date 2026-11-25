import React, { useState, useMemo, useRef, useEffect } from 'react';
import { ChamadaAtiva } from '../types/cbm';
import { CORES_SITUACAO_ATENDIMENTO, DICIONARIO_SIGLAS } from '../data/catalogoAuxiliares';
import { exportarChamadasParaCSV, FormatoCsvExportacao } from '../services/csvExport';
import {
  FileSpreadsheet,
  MapPin,
  Eye,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Shield,
  AlertTriangle,
  CloudRain,
  Clock,
} from 'lucide-react';

interface CallsTableProps {
  chamadas: ChamadaAtiva[];
  onSelectChamada: (chamada: ChamadaAtiva) => void;
  onLocateOnMap?: (chamada: ChamadaAtiva) => void;
}

export const CallsTable: React.FC<CallsTableProps> = ({
  chamadas,
  onSelectChamada,
  onLocateOnMap,
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortField, setSortField] = useState<'dataHoraAbertura' | 'prioridade' | 'municipio'>('dataHoraAbertura');
  const [sortAsc, setSortAsc] = useState(false);
  const [csvMenuAberto, setCsvMenuAberto] = useState(false);
  const csvMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!csvMenuAberto) return;
    const handleClickOutside = (ev: MouseEvent) => {
      if (csvMenuRef.current && !csvMenuRef.current.contains(ev.target as Node)) {
        setCsvMenuAberto(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [csvMenuAberto]);

  // Ordenação
  const chamadasOrdenadas = useMemo(() => {
    return [...chamadas].sort((a, b) => {
      let valA: string | number = '';
      let valB: string | number = '';

      if (sortField === 'dataHoraAbertura') {
        valA = new Date(a.dataHoraAbertura).getTime();
        valB = new Date(b.dataHoraAbertura).getTime();
      } else if (sortField === 'municipio') {
        valA = a.endereco.municipio.toLowerCase();
        valB = b.endereco.municipio.toLowerCase();
      } else if (sortField === 'prioridade') {
        const peso = { Alta: 3, Média: 2, Baixa: 1 };
        valA = peso[a.prioridade as keyof typeof peso] || 0;
        valB = peso[b.prioridade as keyof typeof peso] || 0;
      }

      if (valA < valB) return sortAsc ? -1 : 1;
      if (valA > valB) return sortAsc ? 1 : -1;
      return 0;
    });
  }, [chamadas, sortField, sortAsc]);

  const totalPages = Math.max(1, Math.ceil(chamadasOrdenadas.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedData = chamadasOrdenadas.slice(
    (safeCurrentPage - 1) * pageSize,
    safeCurrentPage * pageSize
  );

  const handleSort = (field: 'dataHoraAbertura' | 'prioridade' | 'municipio') => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  const handleExportCSV = (formato: FormatoCsvExportacao = 'cad') => {
    const dataHoraStr = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const sufixo = formato === 'completo' ? '_completo' : '';
    exportarChamadasParaCSV(
      chamadasOrdenadas,
      `cbmmg_cad_chamadas${sufixo}_${dataHoraStr}.csv`,
      formato
    );
    setCsvMenuAberto(false);
  };

  const renderPrioridadeBadge = (prioridade: string) => {
    if (prioridade === 'Alta') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-500/15 text-red-300 border border-red-500/30">
          <AlertTriangle className="w-2.5 h-2.5" />
          Alta
        </span>
      );
    }
    if (prioridade === 'Média') {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30">
          Média
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-500/15 text-blue-300 border border-blue-500/30">
        Baixa
      </span>
    );
  };

  return (
    <div
      id="quadro-chamadas"
      className="bg-slate-900/90 border border-slate-800/80 rounded-xl overflow-hidden scroll-mt-16"
    >
      {/* Header Action Bar */}
      <div className="p-3.5 sm:p-4 border-b border-slate-800/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-950/50">
        <div>
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-red-500 shrink-0" />
            <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-100">
              Ocorrências Ativas
            </h3>
            <span className="text-[11px] font-semibold text-slate-300 bg-slate-800/80 px-2 py-0.5 rounded-md tabular-nums">
              {chamadas.length}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Ocorrências ativas com recursos e unidades
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
          {/* Mobile Sort Selector */}
          <div className="flex md:hidden items-center gap-1.5 text-xs">
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={sortField}
              onChange={(e) => {
                setSortField(e.target.value as 'dataHoraAbertura' | 'prioridade' | 'municipio');
                setSortAsc(false);
              }}
              aria-label="Ordenar ocorrências"
              className="bg-slate-950 border border-slate-800 text-slate-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-red-500"
            >
              <option value="dataHoraAbertura">Mais recentes</option>
              <option value="prioridade">Prioridade</option>
              <option value="municipio">Município</option>
            </select>
          </div>

          <div className="relative flex items-center" ref={csvMenuRef}>
            <button
              type="button"
              onClick={() => handleExportCSV('cad')}
              className="flex items-center gap-1.5 px-3 py-1.5 sm:py-2 bg-emerald-700/90 hover:bg-emerald-600 text-white rounded-l-lg text-xs font-semibold transition cursor-pointer"
              title="Exportar CSV no padrão oficial do Sistema CAD"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Exportar CSV</span>
            </button>
            <button
              type="button"
              onClick={() => setCsvMenuAberto((prev) => !prev)}
              className="px-1.5 py-1.5 sm:py-2 bg-emerald-800/90 hover:bg-emerald-600 text-white rounded-r-lg border-l border-emerald-600/50 text-xs transition cursor-pointer"
              title="Escolher formato do CSV"
              aria-label="Opções de exportação CSV"
            >
              <ChevronDown className="w-3.5 h-3.5" />
            </button>

            {csvMenuAberto && (
              <div className="absolute right-0 top-full mt-1.5 w-60 bg-slate-900 border border-slate-700 rounded-lg shadow-xl py-1 z-30 text-xs">
                <button
                  type="button"
                  onClick={() => handleExportCSV('cad')}
                  className="w-full text-left px-3 py-2 hover:bg-slate-800 transition cursor-pointer"
                >
                  <div className="font-semibold text-slate-100">Padrão CAD (16 colunas)</div>
                  <div className="text-[10px] text-slate-400">
                    Layout compatível com o CAD Java
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => handleExportCSV('completo')}
                  className="w-full text-left px-3 py-2 hover:bg-slate-800 transition cursor-pointer border-t border-slate-800"
                >
                  <div className="font-semibold text-slate-100">Completo (CAD + Painel)</div>
                  <div className="text-[10px] text-slate-400">
                    Inclui COB, BBM, Cia Ind e Chuva
                  </div>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MOBILE VIEW (< 768px): Vertical Tactical Cards (Zero Horizontal Scroll) */}
      <div className="md:hidden divide-y divide-slate-800/70">
        {paginatedData.length === 0 ? (
          <div className="py-10 px-4 text-center text-xs text-slate-500">
            Nenhuma chamada encontrada com os filtros operacionais atuais.
          </div>
        ) : (
          paginatedData.map((c) => {
            const corObj = CORES_SITUACAO_ATENDIMENTO[c.codigoSituacaoAtendimentoChamada] || {
              bg: 'bg-slate-800 text-slate-300',
              hex: '#64748b',
            };
            const sitTexto =
              DICIONARIO_SIGLAS.chamada_atendimento_situacao[c.codigoSituacaoAtendimentoChamada] ||
              c.codigoSituacaoAtendimentoChamada;
            const horaAbertura = new Date(c.dataHoraAbertura).toLocaleTimeString('pt-BR', {
              hour: '2-digit',
              minute: '2-digit',
            });

            return (
              <div
                key={c.idChamada}
                onClick={() => onSelectChamada(c)}
                className="p-3.5 hover:bg-slate-800/35 active:bg-slate-800/50 transition cursor-pointer space-y-2.5"
              >
                {/* Card Top: Occurrence + Time + Status + Priority */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-mono font-bold text-red-400 text-xs truncate">
                      {c.numeroOcorrencia}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[11px] text-slate-400 tabular-nums shrink-0">
                      <Clock className="w-3 h-3 text-slate-500" />
                      {horaAbertura} · +{c.tempoDecorridoMinutos || 0}m
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {renderPrioridadeBadge(c.prioridade)}
                  </div>
                </div>

                {/* Natureza & Status */}
                <div className="space-y-1.5">
                  <div className="text-sm font-semibold text-slate-100 leading-snug line-clamp-2">
                    {c.descricaoNatureza}
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold border ${corObj.bg}`}
                    >
                      <span className="font-mono font-bold">{c.codigoSituacaoAtendimentoChamada}</span>
                      <span>•</span>
                      <span className="capitalize">{sitTexto}</span>
                    </span>
                    <span className="px-1.5 py-0.5 bg-slate-800/80 text-slate-300 rounded font-mono text-[10px]">
                      {c.codigoNatureza || 'A00'}
                    </span>
                    {c.relacaoChuva && (
                      <span
                        className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[10px] font-medium ${
                          c.relacaoChuva === 'direta'
                            ? 'bg-cyan-950/70 text-cyan-300 border-cyan-800/60'
                            : 'bg-sky-950/60 text-sky-300 border-sky-800/60'
                        }`}
                      >
                        <CloudRain className="w-2.5 h-2.5 shrink-0" />
                        <span className="truncate max-w-[140px]">
                          {c.motivoChuva || (c.relacaoChuva === 'direta' ? 'Chuva direta' : 'Pós-chuva')}
                        </span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Local + Unidade */}
                <div className="bg-slate-950/50 border border-slate-800/70 rounded-lg p-2.5 space-y-1 text-xs">
                  <div className="flex items-start gap-1.5 text-slate-200">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <span className="font-semibold">{c.endereco.municipio}</span>
                      <span className="text-slate-400">
                        {' '}
                        · {c.endereco.bairro || c.endereco.logradouro || 'Área urbana'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-start gap-1.5 text-slate-300">
                    <Shield className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <span className="font-medium">
                        {c.cob} • {c.subunidade ? `${c.bbm} • ${c.subunidade}` : c.ciaInd || c.bbm}
                      </span>
                      {(c.semAreaDefinida || c.cob === 'CEB') && c.areaCob && (
                        <div className="text-[11px] text-cyan-400/90">
                          Área: {c.areaCob} • {c.areaCiaInd || c.areaBbm}
                        </div>
                      )}
                      {!c.semAreaDefinida && c.unidadesApoio && c.unidadesApoio.length > 0 && (
                        <div className="text-[11px] text-amber-400/90">
                          Apoio:{' '}
                          {c.unidadesApoio
                            .map((ap) => (ap.subunidade ? `${ap.bbm} (${ap.subunidade})` : ap.ciaInd || ap.bbm))
                            .join(', ')}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Bottom: Viaturas + Actions */}
                <div className="flex items-center justify-between gap-2 pt-0.5" onClick={(e) => e.stopPropagation()}>
                  <div className="flex flex-wrap items-center gap-1 min-w-0 flex-1">
                    {c.recursos.length > 0 ? (
                      <>
                        {c.recursos.slice(0, 3).map((r, i) => {
                          const codEmp = r.codigoSituacaoEmpenhoRecurso || 'ED';
                          const isBm = r.prefixo?.trim().toUpperCase().startsWith('BM');
                          const isTr = codEmp.toUpperCase() === 'TR';
                          return (
                            <span
                              key={i}
                              className={`border font-mono text-[10px] px-1.5 py-0.5 rounded font-semibold ${
                                isTr
                                  ? 'bg-slate-900 text-slate-500 border-slate-800 line-through'
                                  : isBm
                                  ? 'bg-blue-950/60 text-blue-300 border-blue-800/50'
                                  : 'bg-slate-800 text-amber-300 border-slate-700'
                              }`}
                            >
                              {r.prefixo} <span className="text-slate-400 font-normal">[{codEmp}]</span>
                            </span>
                          );
                        })}
                        {c.recursos.length > 3 && (
                          <span className="text-[10px] text-slate-400 font-mono">
                            +{c.recursos.length - 3}
                          </span>
                        )}
                      </>
                    ) : (
                      <span className="text-[11px] text-slate-500 italic">Sem empenho</span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {c.latitude !== null && c.longitude !== null && onLocateOnMap && (
                      <button
                        type="button"
                        onClick={() => onLocateOnMap(c)}
                        className="p-1.5 bg-slate-800 hover:bg-slate-700 text-blue-400 rounded-lg transition cursor-pointer"
                        title="Localizar no mapa"
                        aria-label="Localizar no mapa"
                      >
                        <MapPin className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => onSelectChamada(c)}
                      className="flex items-center gap-1 px-2.5 py-1.5 bg-red-600/90 hover:bg-red-600 text-white rounded-lg text-[11px] font-semibold transition cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Ficha</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* DESKTOP VIEW (>= 768px): Streamlined 6-Column Table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-950/80 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800 text-[10px]">
            <tr>
              <th className="py-3 px-4">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleSort('dataHoraAbertura')}
                    className="flex items-center gap-1 hover:text-white cursor-pointer"
                    title="Ordenar por horário"
                  >
                    <span>Ocorrência</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                  <span className="text-slate-700">/</span>
                  <button
                    type="button"
                    onClick={() => handleSort('prioridade')}
                    className="hover:text-white cursor-pointer"
                    title="Ordenar por prioridade"
                  >
                    Prio
                  </button>
                </div>
              </th>
              <th className="py-3 px-4">Natureza</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4">
                <button
                  type="button"
                  onClick={() => handleSort('municipio')}
                  className="flex items-center gap-1 hover:text-white cursor-pointer"
                >
                  <span>Localização</span>
                  <ArrowUpDown className="w-3 h-3" />
                </button>
              </th>
              <th className="py-3 px-4">Unidade & Recursos</th>
              <th className="py-3 px-4 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-sans">
            {paginatedData.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-slate-500">
                  Nenhuma chamada encontrada com os filtros operacionais atuais.
                </td>
              </tr>
            ) : (
              paginatedData.map((c) => {
                const corObj = CORES_SITUACAO_ATENDIMENTO[c.codigoSituacaoAtendimentoChamada] || {
                  bg: 'bg-slate-800 text-slate-300',
                  hex: '#64748b',
                };
                const sitTexto =
                  DICIONARIO_SIGLAS.chamada_atendimento_situacao[c.codigoSituacaoAtendimentoChamada] ||
                  c.codigoSituacaoAtendimentoChamada;

                return (
                  <tr
                    key={c.idChamada}
                    className="hover:bg-slate-800/40 transition cursor-pointer group"
                    onClick={() => onSelectChamada(c)}
                  >
                    {/* 1. Ocorrência, Horário & Prioridade */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-red-400 text-xs group-hover:text-red-300">
                          {c.numeroOcorrencia}
                        </span>
                        {renderPrioridadeBadge(c.prioridade)}
                      </div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-1 tabular-nums">
                        <span>
                          {new Date(c.dataHoraAbertura).toLocaleTimeString('pt-BR', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                        <span className="text-slate-600">•</span>
                        <span className="text-slate-500">+{c.tempoDecorridoMinutos || 0}m</span>
                      </div>
                    </td>

                    {/* 2. Natureza */}
                    <td className="py-3 px-4 max-w-[270px]">
                      <div className="font-semibold text-slate-200 truncate" title={c.descricaoNatureza}>
                        {c.descricaoNatureza}
                      </div>
                      <div className="text-[10px] text-slate-400 flex flex-wrap items-center gap-1.5 mt-1">
                        <span className="px-1.5 py-0.2 bg-slate-800 text-slate-300 rounded font-mono">
                          {c.codigoNatureza || 'A00'}
                        </span>
                        <span className="text-slate-500 truncate max-w-[160px]">{c.grupoNatureza}</span>
                        {c.relacaoChuva && (
                          <span
                            className={`inline-flex items-center gap-1 px-1.5 py-0.2 rounded border text-[9px] font-semibold ${
                              c.relacaoChuva === 'direta'
                                ? 'bg-cyan-950/70 text-cyan-300 border-cyan-700/60'
                                : 'bg-sky-950/60 text-sky-300 border-sky-800/60'
                            }`}
                            title={c.motivoChuva || 'Relacionada a chuvas / temporal'}
                          >
                            <CloudRain className="w-2.5 h-2.5 shrink-0" />
                            <span className="truncate max-w-[120px]">
                              {c.motivoChuva || (c.relacaoChuva === 'direta' ? 'Chuva direta' : 'Pós-chuva')}
                            </span>
                          </span>
                        )}
                      </div>
                    </td>

                    {/* 3. Status Atendimento */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-semibold border ${corObj.bg}`}
                        title={`Situação do atendimento: ${sitTexto}`}
                      >
                        <span className="font-mono font-bold text-[10px]">
                          {c.codigoSituacaoAtendimentoChamada}
                        </span>
                        <span>•</span>
                        <span className="capitalize">{sitTexto}</span>
                      </span>
                    </td>

                    {/* 4. Localização */}
                    <td className="py-3 px-4 max-w-[210px]">
                      <div className="font-medium text-slate-200 truncate">
                        {c.endereco.municipio}
                      </div>
                      <div
                        className="text-[11px] text-slate-400 truncate mt-0.5"
                        title={`${c.endereco.logradouro || ''} ${c.endereco.bairro || ''}`}
                      >
                        {c.endereco.bairro ? c.endereco.bairro : c.endereco.logradouro || 'Área urbana'}
                      </div>
                    </td>

                    {/* 5. Unidade & Recursos */}
                    <td className="py-3 px-4 max-w-[260px]">
                      <div className="font-semibold text-slate-300 whitespace-nowrap">
                        {c.cob} • {c.subunidade ? `${c.bbm} • ${c.subunidade}` : c.ciaInd || c.bbm}
                      </div>
                      {(c.semAreaDefinida || c.cob === 'CEB') && c.areaCob ? (
                        <div
                          className="text-[10px] text-cyan-400/90 truncate"
                          title={`Unidade especializada sem área fixa atuando na área de ${c.areaCob} • ${c.areaBbm}${
                            c.areaCiaInd ? ` • ${c.areaCiaInd}` : ''
                          }`}
                        >
                          Área: {c.areaCob} • {c.areaCiaInd || c.areaBbm}
                        </div>
                      ) : !c.semAreaDefinida && c.unidadesApoio && c.unidadesApoio.length > 0 ? (
                        <div
                          className="text-[10px] text-amber-400/90 truncate"
                          title="Unidades empenhadas em apoio operacional"
                        >
                          Apoio:{' '}
                          {c.unidadesApoio
                            .map((ap) => (ap.subunidade ? `${ap.bbm} (${ap.subunidade})` : ap.ciaInd || ap.bbm))
                            .join(', ')}
                        </div>
                      ) : null}

                      <div className="mt-1">
                        {c.recursos.length > 0 ? (
                          <div className="flex flex-wrap items-center gap-1">
                            {c.recursos.slice(0, 2).map((r, i) => {
                              const codEmp = r.codigoSituacaoEmpenhoRecurso || 'ED';
                              const empDesc = DICIONARIO_SIGLAS.empenho_situacao[codEmp] || codEmp;
                              const isBm = r.prefixo?.trim().toUpperCase().startsWith('BM');
                              const isTr = codEmp.toUpperCase() === 'TR';
                              return (
                                <span
                                  key={i}
                                  className={`border font-mono text-[10px] px-1.5 py-0.2 rounded font-semibold inline-flex items-center gap-1 ${
                                    isTr
                                      ? 'bg-slate-900 text-slate-500 border-slate-800 line-through'
                                      : isBm
                                      ? 'bg-blue-950/70 text-blue-300 border-blue-800/60'
                                      : 'bg-slate-800 text-amber-300 border-slate-700'
                                  }`}
                                  title={`Prefixo: ${r.prefixo} ${
                                    isBm ? '(Bombeiro sem viatura)' : '(Viatura Operacional)'
                                  } | Situação: ${codEmp} (${empDesc})`}
                                >
                                  <span>{r.prefixo}</span>
                                  <span className="text-[9px] text-slate-400 font-normal">[{codEmp}]</span>
                                </span>
                              );
                            })}
                            {c.recursos.length > 2 && (
                              <span className="text-[10px] text-slate-400 font-mono font-medium">
                                +{c.recursos.length - 2}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-500 italic text-[10px]">Sem empenho</span>
                        )}
                      </div>
                    </td>

                    {/* 6. Ações */}
                    <td className="py-3 px-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1.5">
                        {c.latitude !== null && c.longitude !== null && onLocateOnMap && (
                          <button
                            type="button"
                            onClick={() => onLocateOnMap(c)}
                            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-blue-400 hover:text-blue-300 rounded transition cursor-pointer"
                            title="Localizar no mapa"
                          >
                            <MapPin className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => onSelectChamada(c)}
                          className="p-1.5 bg-red-600/85 hover:bg-red-600 text-white rounded transition flex items-center gap-1 text-[11px] px-2.5 font-medium cursor-pointer"
                          title="Abrir ficha completa da ocorrência"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Ficha</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="p-3 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400 bg-slate-950/40">
        <div className="flex items-center gap-2">
          <span>Por página:</span>
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="bg-slate-900 border border-slate-700 text-slate-200 rounded px-2 py-1 text-xs tabular-nums"
          >
            <option value={5}>5</option>
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
          </select>
          <span className="text-slate-500 ml-1 tabular-nums">
            {chamadasOrdenadas.length === 0
              ? '0 registros'
              : `${Math.min((safeCurrentPage - 1) * pageSize + 1, chamadasOrdenadas.length)}–${Math.min(
                  safeCurrentPage * pageSize,
                  chamadasOrdenadas.length
                )} de ${chamadasOrdenadas.length}`}
          </span>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setCurrentPage(Math.max(1, safeCurrentPage - 1))}
            disabled={safeCurrentPage === 1}
            className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-slate-300 cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="px-3 py-1 text-xs text-slate-300 tabular-nums">
            {safeCurrentPage} / {totalPages}
          </span>
          <button
            type="button"
            onClick={() => setCurrentPage(Math.min(totalPages, safeCurrentPage + 1))}
            disabled={safeCurrentPage === totalPages}
            className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-slate-300 cursor-pointer"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
