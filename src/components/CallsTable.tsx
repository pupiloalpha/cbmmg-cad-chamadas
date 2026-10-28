import React, { useState, useMemo } from 'react';
import { ChamadaAtiva } from '../types/cbm';
import { CORES_SITUACAO_ATENDIMENTO, DICIONARIO_SIGLAS } from '../data/catalogoAuxiliares';
import { exportarChamadasParaCSV } from '../services/csvExport';
import {
  FileSpreadsheet,
  MapPin,
  Eye,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Shield,
  Truck,
  AlertTriangle,
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
  const paginatedData = chamadasOrdenadas.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const handleSort = (field: 'dataHoraAbertura' | 'prioridade' | 'municipio') => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  const handleExportCSV = () => {
    const dataHoraStr = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    exportarChamadasParaCSV(chamadasOrdenadas, `cbmmg_cad_chamadas_${dataHoraStr}.csv`);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
      {/* Table Header Action Bar */}
      <div className="p-4 border-b border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-950/60">
        <div>
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-red-500" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-100">
              Quadro Geral de Ocorrências Ativas
            </h3>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Dados operacionais em tempo real com enriquecimento de viaturas e unidades
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-2 bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg text-xs font-semibold shadow transition cursor-pointer"
            title="Exportar dados filtrados no formato CSV compatível com Excel"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Exportar CSV ({chamadas.length})</span>
          </button>
        </div>
      </div>

      {/* Table Element */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800 text-[10px]">
            <tr>
              <th className="py-3 px-4">Ocorrência / Horário</th>
              <th className="py-3 px-4">Natureza do Atendimento</th>
              <th className="py-3 px-4">
                <button
                  onClick={() => handleSort('prioridade')}
                  className="flex items-center gap-1 hover:text-white"
                >
                  <span>Prioridade</span>
                  <ArrowUpDown className="w-3 h-3" />
                </button>
              </th>
              <th className="py-3 px-4">Status Atendimento</th>
              <th className="py-3 px-4">
                <button
                  onClick={() => handleSort('municipio')}
                  className="flex items-center gap-1 hover:text-white"
                >
                  <span>Município / Endereço</span>
                  <ArrowUpDown className="w-3 h-3" />
                </button>
              </th>
              <th className="py-3 px-4">Unidade Militar</th>
              <th className="py-3 px-4">Viaturas Empenhadas</th>
              <th className="py-3 px-4 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-sans">
            {paginatedData.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-slate-500">
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
                    className="hover:bg-slate-800/50 transition cursor-pointer group"
                    onClick={() => onSelectChamada(c)}
                  >
                    {/* 1. Ocorrência & Horário */}
                    <td className="py-3 px-4">
                      <div className="font-mono font-bold text-red-400 text-xs group-hover:text-red-300">
                        {c.numeroOcorrencia}
                      </div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                        <span>{new Date(c.dataHoraAbertura).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                        <span className="text-slate-600">•</span>
                        <span className="text-slate-500 font-mono">+{c.tempoDecorridoMinutos || 0}m</span>
                      </div>
                    </td>

                    {/* 2. Natureza */}
                    <td className="py-3 px-4 max-w-[240px]">
                      <div className="font-semibold text-slate-200 truncate" title={c.descricaoNatureza}>
                        {c.descricaoNatureza}
                      </div>
                      <div className="text-[10px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                        <span className="px-1.5 py-0.2 bg-slate-800 text-slate-300 rounded font-mono">
                          {c.codigoNatureza || 'A00'}
                        </span>
                        <span className="text-slate-500">{c.grupoNatureza}</span>
                      </div>
                    </td>

                    {/* 3. Prioridade */}
                    <td className="py-3 px-4">
                      {c.prioridade === 'Alta' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500/20 text-red-300 border border-red-500/30">
                          <AlertTriangle className="w-2.5 h-2.5" />
                          Alta
                        </span>
                      ) : c.prioridade === 'Média' ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          Média
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-500/20 text-blue-300 border border-blue-500/30">
                          Baixa
                        </span>
                      )}
                    </td>

                    {/* 4. Status Atendimento */}
                    <td className="py-3 px-4">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold border ${corObj.bg}`}
                      >
                        {sitTexto}
                      </span>
                    </td>

                    {/* 5. Município / Endereço */}
                    <td className="py-3 px-4 max-w-[200px]">
                      <div className="font-medium text-slate-200 truncate">
                        {c.endereco.municipio}
                      </div>
                      <div className="text-[11px] text-slate-400 truncate" title={`${c.endereco.logradouro || ''} ${c.endereco.bairro || ''}`}>
                        {c.endereco.bairro ? `${c.endereco.bairro}` : c.endereco.logradouro || 'Área urbana'}
                      </div>
                    </td>

                    {/* 6. Unidade CBMMG */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="font-semibold text-slate-300">{c.cob}</div>
                      <div className="text-[10px] text-slate-400">{c.bbm} {c.ciaInd ? `• ${c.ciaInd}` : ''}</div>
                    </td>

                    {/* 7. Viaturas */}
                    <td className="py-3 px-4">
                      {c.recursos.length > 0 ? (
                        <div className="flex flex-wrap items-center gap-1">
                          {c.recursos.slice(0, 2).map((r, i) => (
                            <span
                              key={i}
                              className="bg-slate-800 text-amber-300 border border-slate-700 font-mono text-[10px] px-1.5 py-0.5 rounded font-bold"
                            >
                              {r.prefixo}
                            </span>
                          ))}
                          {c.recursos.length > 2 && (
                            <span className="text-[10px] text-slate-400">+{c.recursos.length - 2}</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-500 italic text-[11px]">Sem empenho</span>
                      )}
                    </td>

                    {/* 8. Ações */}
                    <td className="py-3 px-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1.5">
                        {c.latitude !== null && c.longitude !== null && onLocateOnMap && (
                          <button
                            onClick={() => onLocateOnMap(c)}
                            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-blue-400 hover:text-blue-300 rounded transition"
                            title="Localizar no mapa"
                          >
                            <MapPin className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => onSelectChamada(c)}
                          className="p-1.5 bg-red-600/80 hover:bg-red-600 text-white rounded transition flex items-center gap-1 text-[11px] px-2"
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
      <div className="p-3 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400 bg-slate-950/40">
        <div className="flex items-center gap-2">
          <span>Itens por página:</span>
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="bg-slate-900 border border-slate-700 text-slate-200 rounded px-2 py-1 text-xs"
          >
            <option value={5}>5</option>
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
          </select>
          <span className="text-slate-500 ml-2">
            Mostrando {Math.min((currentPage - 1) * pageSize + 1, chamadasOrdenadas.length)} a{' '}
            {Math.min(currentPage * pageSize, chamadasOrdenadas.length)} de {chamadasOrdenadas.length}
          </span>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-slate-300"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="px-3 py-1 font-mono text-xs text-slate-300">
            Página {currentPage} de {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-slate-300"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
