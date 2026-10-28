import React, { useMemo } from 'react';
import { FiltrosOperacionais } from '../types/cbm';
import { UNIDADES_SERVICO_CBMMG, CATALOGO_NATUREZAS_CBMMG, DICIONARIO_SIGLAS } from '../data/catalogoAuxiliares';
import { Filter, Search, RotateCcw, Calendar, Shield, Clock } from 'lucide-react';

interface FiltersBarProps {
  filtros: FiltrosOperacionais;
  onChangeFiltros: (novosFiltros: FiltrosOperacionais) => void;
  onResetFiltros: () => void;
  totalFiltrado: number;
  totalGeral: number;
}

export const FiltersBar: React.FC<FiltersBarProps> = ({
  filtros,
  onChangeFiltros,
  onResetFiltros,
  totalFiltrado,
  totalGeral,
}) => {
  // Lista única de COBs disponíveis
  const listaCobs = useMemo(() => {
    const set = new Set<string>();
    UNIDADES_SERVICO_CBMMG.forEach((u) => set.add(u.cob));
    return Array.from(set).sort();
  }, []);

  // Lista de BBMs dependente do COB selecionado
  const listaBbms = useMemo(() => {
    let unidades = UNIDADES_SERVICO_CBMMG;
    if (filtros.cob !== 'TODOS') {
      unidades = unidades.filter((u) => u.cob === filtros.cob);
    }
    const set = new Set<string>();
    unidades.forEach((u) => set.add(u.bbm));
    return Array.from(set).sort();
  }, [filtros.cob]);

  // Lista de Cias Ind dependente do COB / BBM selecionado
  const listaCiasInd = useMemo(() => {
    let unidades = UNIDADES_SERVICO_CBMMG.filter((u) => !!u.ciaInd);
    if (filtros.cob !== 'TODOS') {
      unidades = unidades.filter((u) => u.cob === filtros.cob);
    }
    if (filtros.bbm !== 'TODOS') {
      unidades = unidades.filter((u) => u.bbm === filtros.bbm);
    }
    const set = new Set<string>();
    unidades.forEach((u) => set.add(u.ciaInd!));
    return Array.from(set).sort();
  }, [filtros.cob, filtros.bbm]);

  // Lista de Grupos de Natureza
  const listaGruposNatureza = useMemo(() => {
    const set = new Set<string>();
    CATALOGO_NATUREZAS_CBMMG.forEach((n) => set.add(n.grupo));
    return Array.from(set).sort();
  }, []);

  const handleCobChange = (cob: string) => {
    onChangeFiltros({
      ...filtros,
      cob,
      bbm: 'TODOS',
      ciaInd: 'TODOS',
    });
  };

  const handleBbmChange = (bbm: string) => {
    onChangeFiltros({
      ...filtros,
      bbm,
      ciaInd: 'TODOS',
    });
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg space-y-3.5">
      {/* Top Filter Controls: Search & Temporal Buttons */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1 min-w-[280px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={filtros.termoBusca}
            onChange={(e) => onChangeFiltros({ ...filtros, termoBusca: e.target.value })}
            placeholder="Buscar por ocorrência (ex: O-2026), município, bairro, rua ou viatura..."
            className="w-full bg-slate-950 border border-slate-700 focus:border-red-500 rounded-lg pl-9 pr-4 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none transition shadow-inner font-sans"
          />
          {filtros.termoBusca && (
            <button
              onClick={() => onChangeFiltros({ ...filtros, termoBusca: '' })}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs bg-slate-800 px-1.5 py-0.5 rounded"
            >
              ✕
            </button>
          )}
        </div>

        {/* Temporal Filters Quick Buttons */}
        <div className="flex flex-wrap items-center gap-1.5 bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
          <span className="text-[10px] font-semibold uppercase text-slate-400 px-2 flex items-center gap-1">
            <Clock className="w-3 h-3 text-red-400" />
            Janela:
          </span>
          {(['todas', '2h', '6h', '12h', '24h', 'personalizado'] as const).map((periodo) => (
            <button
              key={periodo}
              onClick={() => onChangeFiltros({ ...filtros, periodoTempo: periodo })}
              className={`px-2.5 py-1 rounded text-xs font-medium transition ${
                filtros.periodoTempo === periodo
                  ? 'bg-red-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              {periodo === 'todas'
                ? 'Todas Ativas'
                : periodo === 'personalizado'
                ? 'Personalizado'
                : `Últimas ${periodo}`}
            </button>
          ))}
        </div>

        {/* Clear Filters Button */}
        <button
          onClick={onResetFiltros}
          className="flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-xs font-semibold transition border border-slate-700"
          title="Resetar todos os filtros"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Limpar</span>
        </button>
      </div>

      {/* Custom Date Interval (if 'personalizado' selected) */}
      {filtros.periodoTempo === 'personalizado' && (
        <div className="flex flex-wrap items-center gap-3 p-2.5 bg-slate-950/80 rounded-lg border border-slate-800 text-xs">
          <div className="flex items-center gap-1 text-slate-400">
            <Calendar className="w-3.5 h-3.5 text-amber-400" />
            <span>Início:</span>
            <input
              type="datetime-local"
              value={filtros.dataInicio || ''}
              onChange={(e) => onChangeFiltros({ ...filtros, dataInicio: e.target.value })}
              className="bg-slate-900 border border-slate-700 text-slate-200 rounded px-2 py-1 text-xs"
            />
          </div>
          <div className="flex items-center gap-1 text-slate-400">
            <span>Fim:</span>
            <input
              type="datetime-local"
              value={filtros.dataFim || ''}
              onChange={(e) => onChangeFiltros({ ...filtros, dataFim: e.target.value })}
              className="bg-slate-900 border border-slate-700 text-slate-200 rounded px-2 py-1 text-xs"
            />
          </div>
        </div>
      )}

      {/* Operational Dropdown Filters */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 text-xs">
        {/* 1. COB */}
        <div>
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
            <Shield className="w-3 h-3 text-red-500" />
            COB (Comando)
          </label>
          <select
            value={filtros.cob}
            onChange={(e) => handleCobChange(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 focus:border-red-500 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none"
          >
            <option value="TODOS">Todos os Comandos (6 COBs)</option>
            {listaCobs.map((cob) => (
              <option key={cob} value={cob}>
                {cob}
              </option>
            ))}
          </select>
        </div>

        {/* 2. BBM */}
        <div>
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
            BBM (Batalhão)
          </label>
          <select
            value={filtros.bbm}
            onChange={(e) => handleBbmChange(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 focus:border-red-500 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none"
          >
            <option value="TODOS">Todos os Batalhões</option>
            {listaBbms.map((bbm) => (
              <option key={bbm} value={bbm}>
                {bbm}
              </option>
            ))}
          </select>
        </div>

        {/* 3. CIA IND */}
        <div>
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
            CIA IND (Companhia)
          </label>
          <select
            value={filtros.ciaInd}
            onChange={(e) => onChangeFiltros({ ...filtros, ciaInd: e.target.value })}
            className="w-full bg-slate-950 border border-slate-700 focus:border-red-500 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none"
          >
            <option value="TODOS">Todas Cias Ind</option>
            {listaCiasInd.map((cia) => (
              <option key={cia} value={cia}>
                {cia}
              </option>
            ))}
          </select>
        </div>

        {/* 4. Natureza / Grupo */}
        <div>
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
            Grupo de Natureza
          </label>
          <select
            value={filtros.naturezaGrupo}
            onChange={(e) => onChangeFiltros({ ...filtros, naturezaGrupo: e.target.value })}
            className="w-full bg-slate-950 border border-slate-700 focus:border-red-500 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none"
          >
            <option value="TODOS">Todas as Naturezas</option>
            {listaGruposNatureza.map((grupo) => (
              <option key={grupo} value={grupo}>
                {grupo}
              </option>
            ))}
          </select>
        </div>

        {/* 5. Situação Atendimento */}
        <div>
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
            Status Atendimento
          </label>
          <select
            value={filtros.situacaoAtendimento}
            onChange={(e) => onChangeFiltros({ ...filtros, situacaoAtendimento: e.target.value })}
            className="w-full bg-slate-950 border border-slate-700 focus:border-red-500 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none"
          >
            <option value="TODOS">Todos os Status</option>
            {Object.entries(DICIONARIO_SIGLAS.chamada_atendimento_situacao).map(([sigla, desc]) => (
              <option key={sigla} value={sigla}>
                {sigla} - {desc}
              </option>
            ))}
          </select>
        </div>

        {/* 6. Prioridade */}
        <div>
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
            Prioridade
          </label>
          <select
            value={filtros.prioridade}
            onChange={(e) => onChangeFiltros({ ...filtros, prioridade: e.target.value })}
            className="w-full bg-slate-950 border border-slate-700 focus:border-red-500 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none"
          >
            <option value="TODOS">Todas Prioridades</option>
            <option value="Alta">Alta (Emergência)</option>
            <option value="Média">Média (Urgência)</option>
            <option value="Baixa">Baixa (Eletiva)</option>
          </select>
        </div>
      </div>

      {/* Filter Status Badge */}
      <div className="flex items-center justify-between pt-1 border-t border-slate-800 text-[11px] text-slate-400">
        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-red-400" />
          <span>
            Exibindo <strong>{totalFiltrado}</strong> de <strong>{totalGeral}</strong> chamadas ativas
          </span>
          {totalFiltrado < totalGeral && (
            <span className="bg-red-500/10 text-red-400 border border-red-500/30 px-2 py-0.5 rounded-full font-medium">
              Filtro ativo
            </span>
          )}
        </div>

        <label className="flex items-center gap-1.5 cursor-pointer hover:text-slate-200 select-none">
          <input
            type="checkbox"
            checked={filtros.apenasComGeolocalizacao}
            onChange={(e) =>
              onChangeFiltros({ ...filtros, apenasComGeolocalizacao: e.target.checked })
            }
            className="rounded bg-slate-950 border-slate-700 text-red-600 focus:ring-0 focus:ring-offset-0"
          />
          <span>Apenas com coordenadas geográficas</span>
        </label>
      </div>
    </div>
  );
};
