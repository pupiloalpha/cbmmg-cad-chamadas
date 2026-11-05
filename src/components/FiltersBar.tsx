import React, { useMemo, useState, useRef, useEffect } from 'react';
import { FiltrosOperacionais } from '../types/cbm';
import {
  UNIDADES_SERVICO_CBMMG,
  CATALOGO_NATUREZAS_CBMMG,
  DICIONARIO_SIGLAS,
} from '../data/catalogoAuxiliares';
import {
  Filter,
  Search,
  RotateCcw,
  Calendar,
  Shield,
  Clock,
  ChevronDown,
  Check,
  X,
  Building,
  Flag,
} from 'lucide-react';

interface MultiSelectCheckboxDropdownProps {
  label: string;
  icon: React.ReactNode;
  options: { value: string; label: string; subLabel?: string }[];
  selectedValues: string[];
  onChange: (selected: string[]) => void;
  placeholder: string;
  allLabel: string;
}

const MultiSelectCheckboxDropdown: React.FC<MultiSelectCheckboxDropdownProps> = ({
  label,
  icon,
  options,
  selectedValues,
  onChange,
  placeholder,
  allLabel,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const filteredOptions = useMemo(() => {
    if (!search.trim()) return options;
    const q = search.toLowerCase();
    return options.filter(
      (opt) => opt.label.toLowerCase().includes(q) || (opt.subLabel && opt.subLabel.toLowerCase().includes(q))
    );
  }, [options, search]);

  const isAllSelected = selectedValues.length === 0;

  const handleToggle = (val: string) => {
    if (selectedValues.includes(val)) {
      onChange(selectedValues.filter((v) => v !== val));
    } else {
      onChange([...selectedValues, val]);
    }
  };

  const handleSelectAll = () => {
    onChange([]);
  };

  const handleClear = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    onChange([]);
  };

  const displayText = useMemo(() => {
    if (isAllSelected) return allLabel;
    if (selectedValues.length === 1) {
      const match = options.find((o) => o.value === selectedValues[0]);
      return match ? match.label : selectedValues[0];
    }
    return `${selectedValues.length} selecionados`;
  }, [isAllSelected, selectedValues, allLabel, options]);

  return (
    <div className="relative" ref={containerRef}>
      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
        {icon}
        {label}
      </label>

      {/* Trigger Button */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between gap-1.5 bg-slate-950 border rounded-lg px-2.5 py-1.5 text-xs text-left cursor-pointer transition select-none ${
          isOpen
            ? 'border-red-500 ring-1 ring-red-500/30'
            : selectedValues.length > 0
            ? 'border-red-500/60 bg-red-950/20 text-red-200'
            : 'border-slate-700 hover:border-slate-600 text-slate-200'
        }`}
      >
        <div className="flex items-center gap-1.5 truncate flex-1 min-w-0">
          {selectedValues.length > 0 && (
            <span className="flex-shrink-0 bg-red-600 text-white font-bold text-[10px] w-4 h-4 rounded-full flex items-center justify-center">
              {selectedValues.length}
            </span>
          )}
          <span className="truncate">{displayText}</span>
        </div>

        <div className="flex items-center gap-1 flex-shrink-0 text-slate-400">
          {selectedValues.length > 0 && (
            <button
              type="button"
              onClick={handleClear}
              className="p-0.5 hover:text-white hover:bg-slate-800 rounded transition"
              title="Limpar seleção"
            >
              <X className="w-3 h-3" />
            </button>
          )}
          <ChevronDown
            className={`w-3.5 h-3.5 transition-transform duration-200 ${
              isOpen ? 'rotate-180 text-red-400' : ''
            }`}
          />
        </div>
      </div>

      {/* Popover Dropdown */}
      {isOpen && (
        <div className="absolute left-0 top-full mt-1.5 w-72 sm:w-80 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-50 overflow-hidden flex flex-col text-xs animate-in fade-in zoom-in-95 duration-100">
          {/* Header Controls */}
          <div className="p-2.5 bg-slate-950/80 border-b border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-300">
                {label} ({options.length})
              </span>
              <div className="flex items-center gap-2 text-[10px]">
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className={`font-semibold hover:underline ${
                    isAllSelected ? 'text-red-400' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Marcar Todos
                </button>
                <span className="text-slate-600">•</span>
                <button
                  type="button"
                  onClick={() => onChange([])}
                  className="text-slate-400 hover:text-slate-200 hover:underline"
                >
                  Limpar
                </button>
              </div>
            </div>

            {/* Internal Search if many options */}
            {options.length > 5 && (
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={`Filtrar ${label.toLowerCase()}...`}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-7 pr-2.5 py-1 text-[11px] text-slate-200 placeholder-slate-500 focus:outline-none focus:border-red-500"
                  autoFocus
                />
              </div>
            )}
          </div>

          {/* Options List with Checkboxes */}
          <div className="max-h-56 overflow-y-auto p-1.5 space-y-0.5 divide-y divide-slate-800/40">
            {/* "Todos" Option */}
            <div
              onClick={handleSelectAll}
              className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg cursor-pointer transition select-none ${
                isAllSelected
                  ? 'bg-red-950/40 text-red-300 font-medium'
                  : 'hover:bg-slate-800/70 text-slate-300'
              }`}
            >
              <div
                className={`w-4 h-4 rounded border flex items-center justify-center transition ${
                  isAllSelected
                    ? 'bg-red-600 border-red-600 text-white'
                    : 'border-slate-600 bg-slate-950'
                }`}
              >
                {isAllSelected && <Check className="w-3 h-3 stroke-[3]" />}
              </div>
              <span className="text-xs font-semibold">{allLabel}</span>
            </div>

            {/* Individual Checkbox Items */}
            {filteredOptions.length === 0 ? (
              <div className="p-3 text-center text-slate-500 text-[11px]">
                Nenhuma unidade encontrada.
              </div>
            ) : (
              filteredOptions.map((opt) => {
                const checked = selectedValues.includes(opt.value);
                return (
                  <div
                    key={opt.value}
                    onClick={() => handleToggle(opt.value)}
                    className={`flex items-start gap-2.5 px-2.5 py-1.5 rounded-lg cursor-pointer transition select-none ${
                      checked
                        ? 'bg-red-950/30 text-white font-medium'
                        : 'hover:bg-slate-800/70 text-slate-300'
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded border mt-0.5 flex-shrink-0 flex items-center justify-center transition ${
                        checked
                          ? 'bg-red-600 border-red-600 text-white'
                          : 'border-slate-600 bg-slate-950 hover:border-slate-500'
                      }`}
                    >
                      {checked && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs truncate">{opt.label}</div>
                      {opt.subLabel && (
                        <div className="text-[10px] text-slate-400 truncate">
                          {opt.subLabel}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer showing count */}
          <div className="p-2 bg-slate-950/90 border-t border-slate-800 flex items-center justify-between text-[10px] text-slate-400">
            <span>
              {selectedValues.length === 0
                ? 'Todas as unidades incluídas'
                : `${selectedValues.length} selecionada(s)`}
            </span>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded font-medium transition"
            >
              Fechar
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

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
  // 1. Lista única e oficial de COBs disponíveis
  const listaCobs = useMemo(() => {
    const cobsMap: Record<string, string> = {
      '1º COB': 'RMBH e Região Central / Divinópolis',
      '2º COB': 'Triângulo Mineiro e Alto Paranaíba',
      '3º COB': 'Zona da Mata e Campo das Vertentes',
      '4º COB': 'Norte de Minas e Noroeste',
      '5º COB': 'Leste de Minas e Vale do Aço',
      '6º COB': 'Sul de Minas',
    };
    const set = new Set<string>();
    UNIDADES_SERVICO_CBMMG.forEach((u) => set.add(u.cob));
    return Array.from(set)
      .sort()
      .map((cob) => ({
        value: cob,
        label: cob,
        subLabel: cobsMap[cob] || 'Comando Operacional',
      }));
  }, []);

  // 2. Lista de BBMs dependente dos COBs selecionados
  const listaBbms = useMemo(() => {
    let unidades = UNIDADES_SERVICO_CBMMG;
    if (filtros.cobs && filtros.cobs.length > 0) {
      unidades = unidades.filter((u) => filtros.cobs.includes(u.cob));
    } else if (filtros.cob && filtros.cob !== 'TODOS') {
      unidades = unidades.filter((u) => u.cob === filtros.cob);
    }
    const map = new Map<string, string>();
    unidades.forEach((u) => {
      if (!map.has(u.bbm)) {
        map.set(u.bbm, `${u.municipioSede} (${u.cob})`);
      }
    });

    return Array.from(map.entries())
      .map(([bbm, sede]) => ({
        value: bbm,
        label: bbm,
        subLabel: sede,
      }))
      .sort((a, b) => a.label.localeCompare(b.label, undefined, { numeric: true }));
  }, [filtros.cobs, filtros.cob]);

  // 3. Lista de Cias Ind autênticas dependente dos COBs / BBMs selecionados
  const listaCiasInd = useMemo(() => {
    let unidades = UNIDADES_SERVICO_CBMMG.filter((u) => !!u.ciaInd);
    if (filtros.cobs && filtros.cobs.length > 0) {
      unidades = unidades.filter((u) => filtros.cobs.includes(u.cob));
    } else if (filtros.cob && filtros.cob !== 'TODOS') {
      unidades = unidades.filter((u) => u.cob === filtros.cob);
    }
    if (filtros.bbms && filtros.bbms.length > 0) {
      unidades = unidades.filter((u) => filtros.bbms.includes(u.bbm));
    } else if (filtros.bbm && filtros.bbm !== 'TODOS') {
      unidades = unidades.filter((u) => u.bbm === filtros.bbm);
    }

    const map = new Map<string, string>();
    unidades.forEach((u) => {
      if (u.ciaInd && !map.has(u.ciaInd)) {
        map.set(u.ciaInd, `${u.municipioSede} • ${u.cob}`);
      }
    });

    return Array.from(map.entries())
      .map(([cia, sede]) => ({
        value: cia,
        label: cia,
        subLabel: sede,
      }))
      .sort((a, b) => a.label.localeCompare(b.label, undefined, { numeric: true }));
  }, [filtros.cobs, filtros.cob, filtros.bbms, filtros.bbm]);

  // Manipulação de seleção múltipla para COBs
  const handleCobsChange = (novosCobs: string[]) => {
    const cobsValidos = novosCobs.filter((c) => c !== 'TODOS');

    // Podar BBMs selecionados que não pertençam aos novos COBs
    let novosBbms = filtros.bbms || [];
    if (cobsValidos.length > 0) {
      const bbmsPermitidos = new Set(
        UNIDADES_SERVICO_CBMMG.filter((u) => cobsValidos.includes(u.cob)).map((u) => u.bbm)
      );
      novosBbms = novosBbms.filter((b) => bbmsPermitidos.has(b));
    }

    // Podar Cias Ind selecionadas que não pertençam aos novos COBs
    let novasCiasInd = filtros.ciasInd || [];
    if (cobsValidos.length > 0) {
      const ciasPermitidas = new Set(
        UNIDADES_SERVICO_CBMMG.filter((u) => cobsValidos.includes(u.cob) && u.ciaInd).map((u) => u.ciaInd!)
      );
      novasCiasInd = novasCiasInd.filter((c) => ciasPermitidas.has(c));
    }

    onChangeFiltros({
      ...filtros,
      cobs: cobsValidos,
      cob: cobsValidos.length === 1 ? cobsValidos[0] : (cobsValidos.length === 0 ? 'TODOS' : cobsValidos.join(', ')),
      bbms: novosBbms,
      bbm: novosBbms.length === 1 ? novosBbms[0] : (novosBbms.length === 0 ? 'TODOS' : novosBbms.join(', ')),
      ciasInd: novasCiasInd,
      ciaInd: novasCiasInd.length === 1 ? novasCiasInd[0] : (novasCiasInd.length === 0 ? 'TODOS' : novasCiasInd.join(', ')),
    });
  };

  // Manipulação de seleção múltipla para BBMs
  const handleBbmsChange = (novosBbms: string[]) => {
    const bbmsValidos = novosBbms.filter((b) => b !== 'TODOS');

    // Podar Cias Ind que não pertençam aos BBMs selecionados
    let novasCiasInd = filtros.ciasInd || [];
    if (bbmsValidos.length > 0) {
      const ciasPermitidas = new Set(
        UNIDADES_SERVICO_CBMMG.filter((u) => bbmsValidos.includes(u.bbm) && u.ciaInd).map((u) => u.ciaInd!)
      );
      novasCiasInd = novasCiasInd.filter((c) => ciasPermitidas.has(c));
    }

    onChangeFiltros({
      ...filtros,
      bbms: bbmsValidos,
      bbm: bbmsValidos.length === 1 ? bbmsValidos[0] : (bbmsValidos.length === 0 ? 'TODOS' : bbmsValidos.join(', ')),
      ciasInd: novasCiasInd,
      ciaInd: novasCiasInd.length === 1 ? novasCiasInd[0] : (novasCiasInd.length === 0 ? 'TODOS' : novasCiasInd.join(', ')),
    });
  };

  // Manipulação de seleção múltipla para Cias Ind
  const handleCiasIndChange = (novasCiasInd: string[]) => {
    const ciasValidas = novasCiasInd.filter((c) => c !== 'TODOS');
    onChangeFiltros({
      ...filtros,
      ciasInd: ciasValidas,
      ciaInd: ciasValidas.length === 1 ? ciasValidas[0] : (ciasValidas.length === 0 ? 'TODOS' : ciasValidas.join(', ')),
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
            placeholder="Buscar por ocorrência (ex: O-2026), natureza (código O01, V01, S04 ou texto), município, bairro, viatura..."
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
        {/* 1. COB (Multi-select com Checkbox) */}
        <MultiSelectCheckboxDropdown
          label="COB (Comando)"
          icon={<Shield className="w-3 h-3 text-red-500" />}
          options={listaCobs}
          selectedValues={filtros.cobs || []}
          onChange={handleCobsChange}
          placeholder="Todos os Comandos"
          allLabel="Todos os Comandos (6 COBs)"
        />

        {/* 2. BBM (Multi-select com Checkbox) */}
        <MultiSelectCheckboxDropdown
          label="BBM (Batalhão)"
          icon={<Building className="w-3 h-3 text-blue-400" />}
          options={listaBbms}
          selectedValues={filtros.bbms || []}
          onChange={handleBbmsChange}
          placeholder="Todos os Batalhões"
          allLabel="Todos os Batalhões"
        />

        {/* 3. CIA IND (Multi-select com Checkbox - Apenas Cias Autênticas CBMMG) */}
        <MultiSelectCheckboxDropdown
          label="CIA IND (Companhia)"
          icon={<Flag className="w-3 h-3 text-amber-400" />}
          options={listaCiasInd}
          selectedValues={filtros.ciasInd || []}
          onChange={handleCiasIndChange}
          placeholder="Todas Cias Ind"
          allLabel="Todas Cias Ind (5 Oficiais)"
        />

        {/* 4. Natureza / Grupo SIDS */}
        <div>
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
            Natureza / Grupo SIDS
          </label>
          <select
            value={filtros.naturezaGrupo}
            onChange={(e) => onChangeFiltros({ ...filtros, naturezaGrupo: e.target.value })}
            className="w-full bg-slate-950 border border-slate-700 focus:border-red-500 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none"
          >
            <option value="TODOS">Todas as Naturezas (Geral)</option>
            <option value="CAT_II">★ Categoria II (Típicas Bombeiro Militar)</option>
            <option value="CAT_III">★ Categoria III (Ações e Operações SIDS)</option>

            <optgroup label="CATEGORIA II - OCORRÊNCIAS TÍPICAS DE BOMBEIRO MILITAR">
              <option value="O">O - REFERENTE À EXPLOSÃO E INCÊNDIO</option>
              <option value="P">P - REFERENTE À PREVENÇÃO E VISTORIA</option>
              <option value="R">R - REFERENTE ÀS ATIVIDADES DE DEFESA CIVIL</option>
              <option value="S">S - REFERENTE À BUSCA E SALVAMENTO</option>
              <option value="V">V - REFERENTE AO ATENDIMENTO PRÉ-HOSPITALAR (APH)</option>
            </optgroup>

            <optgroup label="CATEGORIA III - AÇÕES E OPERAÇÕES DECORRENTES DO SIDS">
              <option value="A">A - AÇÕES DE DEFESA SOCIAL</option>
              <option value="Q">Q - DEMONSTRAÇÕES, PALESTRAS E TREINAMENTOS</option>
              <option value="W">W - PROCEDIMENTOS ADMINISTRATIVOS CIAD</option>
              <option value="Y">Y - OPERAÇÕES DE DEFESA SOCIAL</option>
              <option value="X">X - COORDENAÇÃO E CONTROLE OPERACIONAL E ADMINISTRATIVO</option>
              <option value="U">U - COMUNICAÇÕES, DENÚNCIAS, RECLAMAÇÕES E SOLICITAÇÕES DIVERSAS</option>
            </optgroup>
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
          {(totalFiltrado < totalGeral ||
            (filtros.cobs && filtros.cobs.length > 0) ||
            (filtros.bbms && filtros.bbms.length > 0) ||
            (filtros.ciasInd && filtros.ciasInd.length > 0)) && (
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
