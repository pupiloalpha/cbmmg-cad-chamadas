import React, { useMemo, useState, useRef, useEffect } from 'react';
import { ChamadaAtiva, FiltrosOperacionais } from '../types/cbm';
import {
  UNIDADES_SERVICO_CBMMG,
  DICIONARIO_SIGLAS,
} from '../data/catalogoAuxiliares';
import {
  obterNaturezasBombeiroAtivas,
  formatarCodigoNatureza,
  normalizarParaBusca,
} from '../services/cbmStorage';
import {
  Search,
  RotateCcw,
  Shield,
  Clock,
  ChevronDown,
  Check,
  X,
  Building,
  Flag,
  Flame,
  CloudRain,
  SlidersHorizontal,
} from 'lucide-react';

interface MultiSelectCheckboxDropdownProps {
  label: string;
  icon: React.ReactNode;
  options: { value: string; label: string; subLabel?: string }[];
  selectedValues: string[];
  onChange: (selected: string[]) => void;
  allLabel: string;
  alignRight?: boolean;
  widthClass?: string;
}

const MultiSelectCheckboxDropdown: React.FC<MultiSelectCheckboxDropdownProps> = ({
  label,
  icon,
  options,
  selectedValues,
  onChange,
  allLabel,
  alignRight = false,
  widthClass,
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
    const q = normalizarParaBusca(search);
    const qAlnum = q.replace(/[^a-z0-9]/g, '');
    return options.filter((opt) => {
      const lbl = normalizarParaBusca(opt.label);
      const sub = opt.subLabel ? normalizarParaBusca(opt.subLabel) : '';
      const val = normalizarParaBusca(opt.value);
      return (
        lbl.includes(q) ||
        sub.includes(q) ||
        (qAlnum.length >= 2 && (lbl.replace(/[^a-z0-9]/g, '').includes(qAlnum) || val.includes(qAlnum)))
      );
    });
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
    <div className={`relative ${isOpen ? 'z-50' : 'z-10'}`} ref={containerRef}>
      <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
        {icon}
        {label}
      </label>

      {/* Trigger Button */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between gap-1.5 bg-slate-950/90 border rounded-lg px-2.5 py-2 text-xs text-left cursor-pointer transition select-none ${
          isOpen
            ? 'border-red-500/80 ring-1 ring-red-500/30'
            : selectedValues.length > 0
            ? 'border-red-500/50 bg-red-950/20 text-red-200'
            : 'border-slate-800 hover:border-slate-700 text-slate-200'
        }`}
      >
        <div className="flex items-center gap-1.5 truncate flex-1 min-w-0">
          {selectedValues.length > 0 && (
            <span className="flex-shrink-0 bg-red-600 text-white font-bold text-[10px] w-4 h-4 rounded-full flex items-center justify-center tabular-nums">
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
              className="p-0.5 hover:text-white hover:bg-slate-800 rounded transition cursor-pointer"
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
        <div
          className={`absolute ${
            alignRight ? 'right-0 sm:right-0 sm:left-auto' : 'left-0'
          } top-full mt-1.5 ${
            widthClass || 'w-72 sm:w-80'
          } max-w-[calc(100vw-2.5rem)] bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-[150] overflow-hidden flex flex-col text-xs animate-in fade-in zoom-in-95 duration-100`}
        >
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
                  className={`font-semibold hover:underline cursor-pointer ${
                    isAllSelected ? 'text-red-400' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Marcar Todos
                </button>
                <span className="text-slate-600">•</span>
                <button
                  type="button"
                  onClick={() => onChange([])}
                  className="text-slate-400 hover:text-slate-200 hover:underline cursor-pointer"
                >
                  Limpar
                </button>
              </div>
            </div>

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

          {/* Options List */}
          <div className="max-h-56 overflow-y-auto p-1.5 space-y-0.5 divide-y divide-slate-800/40">
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

            {filteredOptions.length === 0 ? (
              <div className="p-3 text-center text-slate-500 text-[11px]">
                Nenhum item encontrado.
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

          <div className="p-2 bg-slate-950/90 border-t border-slate-800 flex items-center justify-between text-[10px] text-slate-400">
            <span>
              {selectedValues.length === 0
                ? 'Todos incluídos'
                : `${selectedValues.length} selecionado(s)`}
            </span>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded font-medium transition cursor-pointer"
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
  chamadas: ChamadaAtiva[];
  naturezasVersion?: number;
}

export const FiltersBar: React.FC<FiltersBarProps> = ({
  filtros,
  onChangeFiltros,
  onResetFiltros,
  totalFiltrado,
  totalGeral,
  chamadas,
  naturezasVersion = 0,
}) => {
  const [mostrarAvancados, setMostrarAvancados] = useState(false);

  // 1. Lista única e oficial de COBs + Comando Especializado (CEB)
  const listaCobs = useMemo(() => {
    const cobsMap: Record<string, string> = {
      '1º COB': 'RMBH e Região Central / Divinópolis',
      '2º COB': 'Triângulo Mineiro e Alto Paranaíba',
      '3º COB': 'Zona da Mata e Campo das Vertentes',
      '4º COB': 'Norte de Minas e Noroeste',
      '5º COB': 'Leste de Minas e Vale do Aço',
      '6º COB': 'Sul de Minas',
      'CEB': 'Comando Especializado (BEMAD, BOA e CEOAs)',
      'ADM / APOIO': 'Ensino, Técnico e Direção (ABM, CAT, DAT)',
    };
    const set = new Set<string>();
    UNIDADES_SERVICO_CBMMG.forEach((u) => set.add(u.cob));
    return Array.from(set)
      .sort((a, b) => {
        const order = (v: string) => (v === 'ADM / APOIO' ? 2 : v === 'CEB' ? 1 : 0);
        const oa = order(a);
        const ob = order(b);
        if (oa !== ob) return oa - ob;
        return a.localeCompare(b, undefined, { numeric: true });
      })
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
        map.set(
          u.bbm,
          u.semAreaDefinida ? `Atuação Estadual (${u.cob})` : `${u.municipioSede} (${u.cob})`
        );
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

  // 3. Lista de Cias Ind e Subunidades CEOA dependente dos COBs / BBMs selecionados
  const listaCiasInd = useMemo(() => {
    let unidades = UNIDADES_SERVICO_CBMMG.filter((u) => !!u.ciaInd || !!u.subunidade);
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
      const chave = u.subunidade || u.ciaInd;
      if (chave && !map.has(chave)) {
        map.set(
          chave,
          u.subunidade
            ? `${u.municipioSede} • ${u.bbm} / ${u.cob}`
            : `${u.municipioSede} • ${u.cob}`
        );
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

    let novosBbms = filtros.bbms || [];
    if (cobsValidos.length > 0) {
      const bbmsPermitidos = new Set(
        UNIDADES_SERVICO_CBMMG.filter((u) => cobsValidos.includes(u.cob)).map((u) => u.bbm)
      );
      novosBbms = novosBbms.filter((b) => bbmsPermitidos.has(b));
    }

    let novasCiasInd = filtros.ciasInd || [];
    if (cobsValidos.length > 0) {
      const ciasPermitidas = new Set(
        UNIDADES_SERVICO_CBMMG.filter((u) => cobsValidos.includes(u.cob) && (u.ciaInd || u.subunidade)).map(
          (u) => (u.subunidade || u.ciaInd)!
        )
      );
      novasCiasInd = novasCiasInd.filter((c) => ciasPermitidas.has(c));
    }

    onChangeFiltros({
      ...filtros,
      cobs: cobsValidos,
      cob: cobsValidos.length === 1 ? cobsValidos[0] : cobsValidos.length === 0 ? 'TODOS' : cobsValidos.join(', '),
      bbms: novosBbms,
      bbm: novosBbms.length === 1 ? novosBbms[0] : novosBbms.length === 0 ? 'TODOS' : novosBbms.join(', '),
      ciasInd: novasCiasInd,
      ciaInd:
        novasCiasInd.length === 1 ? novasCiasInd[0] : novasCiasInd.length === 0 ? 'TODOS' : novasCiasInd.join(', '),
    });
  };

  // Manipulação de seleção múltipla para BBMs
  const handleBbmsChange = (novosBbms: string[]) => {
    const bbmsValidos = novosBbms.filter((b) => b !== 'TODOS');

    let novasCiasInd = filtros.ciasInd || [];
    if (bbmsValidos.length > 0) {
      const ciasPermitidas = new Set(
        UNIDADES_SERVICO_CBMMG.filter((u) => bbmsValidos.includes(u.bbm) && (u.ciaInd || u.subunidade)).map(
          (u) => (u.subunidade || u.ciaInd)!
        )
      );
      novasCiasInd = novasCiasInd.filter((c) => ciasPermitidas.has(c));
    }

    onChangeFiltros({
      ...filtros,
      bbms: bbmsValidos,
      bbm: bbmsValidos.length === 1 ? bbmsValidos[0] : bbmsValidos.length === 0 ? 'TODOS' : bbmsValidos.join(', '),
      ciasInd: novasCiasInd,
      ciaInd:
        novasCiasInd.length === 1 ? novasCiasInd[0] : novasCiasInd.length === 0 ? 'TODOS' : novasCiasInd.join(', '),
    });
  };

  // Manipulação de seleção múltipla para Cias Ind
  const handleCiasIndChange = (novasCiasInd: string[]) => {
    const ciasValidas = novasCiasInd.filter((c) => c !== 'TODOS');
    onChangeFiltros({
      ...filtros,
      ciasInd: ciasValidas,
      ciaInd: ciasValidas.length === 1 ? ciasValidas[0] : ciasValidas.length === 0 ? 'TODOS' : ciasValidas.join(', '),
    });
  };

  // 4. Lista de Naturezas reativa: ativas no momento (com contagem) + Grupos + Catálogo CBMMG
  const listaNaturezas = useMemo(() => {
    const itens: { value: string; label: string; subLabel?: string }[] = [];
    const jaAdicionados = new Set<string>();

    const contagemPorCodigo = new Map<
      string,
      { value: string; codFormatado: string; descricao: string; letra: string; total: number }
    >();

    for (const c of chamadas) {
      const codBruto = c.codigoNatureza || (c.idNatureza ? String(c.idNatureza) : '');
      const codNorm = codBruto.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
      if (!codNorm) continue;
      const existente = contagemPorCodigo.get(codNorm);
      if (existente) {
        existente.total += 1;
      } else {
        contagemPorCodigo.set(codNorm, {
          value: codNorm,
          codFormatado: formatarCodigoNatureza(codNorm),
          descricao: c.descricaoNatureza || 'Sem descrição',
          letra: (c.letraGrupoNatureza || codNorm.charAt(0) || 'S').toUpperCase(),
          total: 1,
        });
      }
    }

    const ativasOrdenadas = Array.from(contagemPorCodigo.values()).sort((a, b) => b.total - a.total);
    for (const natAtiva of ativasOrdenadas) {
      jaAdicionados.add(natAtiva.value);
      itens.push({
        value: natAtiva.value,
        label: `${natAtiva.codFormatado} - ${natAtiva.descricao}`,
        subLabel: `${natAtiva.total} ativa(s) agora • Grupo ${natAtiva.letra}`,
      });
    }

    const gruposFixos: { value: string; label: string; subLabel?: string }[] = [
      { value: 'CAT_II', label: '★ Categoria II (Típicas Bombeiro Militar)', subLabel: 'Grupos O, P, R, S, V' },
      { value: 'CAT_III', label: '★ Categoria III (Ações e Operações SIDS)', subLabel: 'Grupos A, Q, W, Y, X, U' },
      { value: 'O', label: 'Grupo O - Explosão e Incêndio', subLabel: 'Categoria II BM' },
      { value: 'P', label: 'Grupo P - Prevenção e Vistoria', subLabel: 'Categoria II BM' },
      { value: 'R', label: 'Grupo R - Atividades de Defesa Civil', subLabel: 'Categoria II BM' },
      { value: 'S', label: 'Grupo S - Busca e Salvamento', subLabel: 'Categoria II BM' },
      { value: 'V', label: 'Grupo V - Atendimento Pré-Hospitalar (APH)', subLabel: 'Categoria II BM' },
      { value: 'A', label: 'Grupo A - Ações de Defesa Social', subLabel: 'Categoria III SIDS' },
      { value: 'Q', label: 'Grupo Q - Demonstrações e Treinamentos', subLabel: 'Categoria III SIDS' },
      { value: 'W', label: 'Grupo W - Procedimentos CIAD', subLabel: 'Categoria III SIDS' },
      { value: 'Y', label: 'Grupo Y - Operações de Defesa Social', subLabel: 'Categoria III SIDS' },
      { value: 'X', label: 'Grupo X - Coordenação e Controle Operacional', subLabel: 'Categoria III SIDS' },
      { value: 'U', label: 'Grupo U - Comunicações e Solicitações', subLabel: 'Categoria III SIDS' },
    ];
    for (const grp of gruposFixos) {
      if (!jaAdicionados.has(grp.value)) {
        jaAdicionados.add(grp.value);
        itens.push(grp);
      }
    }

    const cadNaturezas = obterNaturezasBombeiroAtivas();
    for (const nat of cadNaturezas) {
      if (!nat.codigo) continue;
      const codNorm = nat.codigo.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
      if (jaAdicionados.has(codNorm)) continue;
      jaAdicionados.add(codNorm);
      const codFormatado = formatarCodigoNatureza(codNorm);
      const letra = codNorm.charAt(0).toUpperCase();
      itens.push({
        value: codNorm,
        label: `${codFormatado} - ${nat.descricao}`,
        subLabel: `Grupo ${letra}`,
      });
    }

    return itens;
  }, [chamadas, naturezasVersion]);

  const handleNaturezasChange = (novasNaturezas: string[]) => {
    const naturezasValidas = novasNaturezas.filter((n) => n !== 'TODOS');
    onChangeFiltros({
      ...filtros,
      naturezas: naturezasValidas,
      naturezaGrupo:
        naturezasValidas.length === 1
          ? naturezasValidas[0]
          : naturezasValidas.length === 0
          ? 'TODOS'
          : naturezasValidas.join(', '),
    });
  };

  const filtroChuvaAtivo = Boolean(filtros.filtroChuva && filtros.filtroChuva !== 'TODOS');

  // Contagem de filtros ativos dentro do painel "Mais filtros"
  const qtdAvancadosAtivos =
    (filtros.bbms?.length ? 1 : 0) +
    (filtros.ciasInd?.length ? 1 : 0) +
    (filtros.situacaoAtendimento !== 'TODOS' ? 1 : 0) +
    (filtros.prioridade !== 'TODOS' ? 1 : 0) +
    (filtros.apenasComGeolocalizacao ? 1 : 0);

  const temAlgumFiltroAtivo =
    Boolean(filtros.termoBusca?.trim()) ||
    filtros.periodoTempo !== 'todas' ||
    (filtros.cobs?.length ?? 0) > 0 ||
    (filtros.bbms?.length ?? 0) > 0 ||
    (filtros.ciasInd?.length ?? 0) > 0 ||
    (filtros.naturezas?.length ?? 0) > 0 ||
    filtros.situacaoChamada !== 'TODOS' ||
    filtros.situacaoAtendimento !== 'TODOS' ||
    filtros.prioridade !== 'TODOS' ||
    filtros.apenasComGeolocalizacao ||
    filtroChuvaAtivo;

  return (
    <div className="relative z-30 bg-slate-900/90 border border-slate-800/80 rounded-xl p-3.5 sm:p-4 space-y-3">
      {/* Nível 1: Busca + Janela de Tempo (Todas, 2h, 8h, 24h) + Ações */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-2.5">
        {/* Search Input */}
        <div className="relative flex-1 min-w-0">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={filtros.termoBusca}
            onChange={(e) => onChangeFiltros({ ...filtros, termoBusca: e.target.value })}
            placeholder="Buscar ocorrência, natureza, relato, município, bairro ou viatura..."
            className="w-full bg-slate-950/90 border border-slate-800 focus:border-red-500/80 rounded-lg pl-9 pr-8 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none transition"
          />
          {filtros.termoBusca && (
            <button
              type="button"
              onClick={() => onChangeFiltros({ ...filtros, termoBusca: '' })}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-0.5 rounded hover:bg-slate-800 transition cursor-pointer"
              title="Limpar busca"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Temporal Filters: Todas, 2h, 8h, 24h */}
        <div className="flex items-center justify-between sm:justify-start gap-1 bg-slate-950/90 p-1 rounded-lg border border-slate-800 text-xs overflow-x-auto">
          <span className="text-[10px] font-semibold uppercase text-slate-500 px-1.5 hidden sm:flex items-center gap-1 shrink-0">
            <Clock className="w-3 h-3 text-slate-400" />
            Tempo:
          </span>
          {(
            [
              { id: 'todas', label: 'Todas' },
              { id: '2h', label: '2h' },
              { id: '8h', label: '8h' },
              { id: '24h', label: '24h' },
            ] as const
          ).map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onChangeFiltros({ ...filtros, periodoTempo: item.id })}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition cursor-pointer whitespace-nowrap tabular-nums ${
                filtros.periodoTempo === item.id
                  ? 'bg-red-600 text-white font-semibold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/70'
              }`}
              title={
                item.id === 'todas'
                  ? 'Exibir todas as chamadas ativas'
                  : `Filtrar últimas ${item.label}`
              }
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Clear Filters Button (desktop inline / compact) */}
        {temAlgumFiltroAtivo && (
          <button
            type="button"
            onClick={onResetFiltros}
            className="hidden lg:flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-800/90 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-xs font-medium transition border border-slate-700/80 cursor-pointer shrink-0"
            title="Limpar todos os filtros"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Limpar</span>
          </button>
        )}
      </div>

      {/* Nível 1B: Comando (COB/CEB) + Natureza + Botão "Mais filtros" */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 items-end text-xs">
        <MultiSelectCheckboxDropdown
          label="COB / Comando"
          icon={<Shield className="w-3 h-3 text-red-400" />}
          options={listaCobs}
          selectedValues={filtros.cobs || []}
          onChange={handleCobsChange}
          allLabel="Todos os Comandos (COBs + CEB)"
        />

        <MultiSelectCheckboxDropdown
          label="Natureza"
          icon={<Flame className="w-3 h-3 text-amber-400" />}
          options={listaNaturezas}
          selectedValues={filtros.naturezas || []}
          onChange={handleNaturezasChange}
          allLabel="Todas as Naturezas"
          widthClass="w-80 sm:w-96"
        />

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setMostrarAvancados((prev) => !prev)}
            className={`flex-1 flex items-center justify-between gap-2 px-3 py-2 rounded-lg border text-xs font-medium transition cursor-pointer ${
              mostrarAvancados || qtdAvancadosAtivos > 0
                ? 'bg-slate-800/90 border-slate-700 text-white'
                : 'bg-slate-950/90 border-slate-800 hover:border-slate-700 text-slate-300'
            }`}
          >
            <span className="flex items-center gap-1.5">
              <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
              <span>Mais filtros</span>
              {qtdAvancadosAtivos > 0 && (
                <span className="bg-red-600 text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full tabular-nums">
                  {qtdAvancadosAtivos}
                </span>
              )}
            </span>
            <ChevronDown
              className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${
                mostrarAvancados ? 'rotate-180' : ''
              }`}
            />
          </button>

          {temAlgumFiltroAtivo && (
            <button
              type="button"
              onClick={onResetFiltros}
              className="lg:hidden flex items-center justify-center gap-1 px-3 py-2 bg-slate-800/90 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-xs font-medium transition border border-slate-700/80 cursor-pointer shrink-0"
              title="Limpar todos os filtros"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Limpar</span>
            </button>
          )}
        </div>
      </div>

      {/* Nível 2 (Expansível): Unidades específicas, Status, Prioridade, GPS */}
      {mostrarAvancados && (
        <div className="pt-3 border-t border-slate-800/80 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 text-xs animate-in fade-in duration-150">
          <MultiSelectCheckboxDropdown
            label="BBM / Unidade"
            icon={<Building className="w-3 h-3 text-blue-400" />}
            options={listaBbms}
            selectedValues={filtros.bbms || []}
            onChange={handleBbmsChange}
            allLabel="Todos os BBMs / BEMAD / BOA"
          />

          <MultiSelectCheckboxDropdown
            label="CIA IND / CEOA"
            icon={<Flag className="w-3 h-3 text-amber-400" />}
            options={listaCiasInd}
            selectedValues={filtros.ciasInd || []}
            onChange={handleCiasIndChange}
            allLabel="Todas Cias Ind e CEOAs"
            alignRight={true}
          />

          <div>
            <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
              Status do Atendimento
            </label>
            <select
              value={filtros.situacaoAtendimento}
              onChange={(e) => onChangeFiltros({ ...filtros, situacaoAtendimento: e.target.value })}
              className="w-full bg-slate-950/90 border border-slate-800 focus:border-red-500/80 rounded-lg px-2.5 py-2 text-xs text-slate-200 focus:outline-none"
            >
              <option value="TODOS">Todos os Status</option>
              {Object.entries(DICIONARIO_SIGLAS.chamada_atendimento_situacao).map(([sigla, desc]) => (
                <option key={sigla} value={sigla}>
                  {sigla} - {desc}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
              Prioridade
            </label>
            <select
              value={filtros.prioridade}
              onChange={(e) => onChangeFiltros({ ...filtros, prioridade: e.target.value })}
              className="w-full bg-slate-950/90 border border-slate-800 focus:border-red-500/80 rounded-lg px-2.5 py-2 text-xs text-slate-200 focus:outline-none"
            >
              <option value="TODOS">Todas Prioridades</option>
              <option value="Alta">Alta (Emergência)</option>
              <option value="Média">Média (Urgência)</option>
              <option value="Baixa">Baixa (Eletiva)</option>
            </select>
          </div>

          <div className="sm:col-span-2 lg:col-span-4 pt-1 flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer text-slate-300 hover:text-white select-none">
              <input
                type="checkbox"
                checked={filtros.apenasComGeolocalizacao}
                onChange={(e) =>
                  onChangeFiltros({ ...filtros, apenasComGeolocalizacao: e.target.checked })
                }
                className="rounded bg-slate-950 border-slate-700 text-red-600 focus:ring-0 focus:ring-offset-0"
              />
              <span>Apenas ocorrências com coordenadas no mapa (GPS)</span>
            </label>
          </div>
        </div>
      )}

      {/* Barra Resumo de Resultados & Chips Ativos */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/70 text-[11px] text-slate-400">
        <div className="flex flex-wrap items-center gap-2">
          <span className="tabular-nums">
            Exibindo <strong className="text-slate-200">{totalFiltrado}</strong> de{' '}
            <strong className="text-slate-200">{totalGeral}</strong> chamadas ativas
          </span>

          {filtros.periodoTempo !== 'todas' && (
            <button
              type="button"
              onClick={() => onChangeFiltros({ ...filtros, periodoTempo: 'todas' })}
              className="inline-flex items-center gap-1 bg-slate-800 hover:bg-slate-700 text-slate-200 px-2 py-0.5 rounded-md transition cursor-pointer"
              title="Remover filtro de tempo"
            >
              <Clock className="w-3 h-3 text-slate-400" />
              <span>{`Últimas ${filtros.periodoTempo}`}</span>
              <X className="w-3 h-3 text-slate-400" />
            </button>
          )}

          {filtroChuvaAtivo && (
            <button
              type="button"
              onClick={() => onChangeFiltros({ ...filtros, filtroChuva: 'TODOS' })}
              className="inline-flex items-center gap-1 bg-cyan-950/70 hover:bg-cyan-900/70 text-cyan-300 border border-cyan-800/60 px-2 py-0.5 rounded-md transition cursor-pointer"
              title="Remover filtro de ocorrências relacionadas com chuva"
            >
              <CloudRain className="w-3 h-3" />
              <span>Chuva / Temporal</span>
              <X className="w-3 h-3" />
            </button>
          )}

          {filtros.prioridade !== 'TODOS' && (
            <button
              type="button"
              onClick={() => onChangeFiltros({ ...filtros, prioridade: 'TODOS' })}
              className="inline-flex items-center gap-1 bg-red-950/60 hover:bg-red-900/60 text-red-300 border border-red-800/60 px-2 py-0.5 rounded-md transition cursor-pointer"
              title="Remover filtro de prioridade"
            >
              <span>Prioridade: {filtros.prioridade}</span>
              <X className="w-3 h-3" />
            </button>
          )}

          {filtros.situacaoAtendimento !== 'TODOS' && (
            <button
              type="button"
              onClick={() => onChangeFiltros({ ...filtros, situacaoAtendimento: 'TODOS' })}
              className="inline-flex items-center gap-1 bg-amber-950/60 hover:bg-amber-900/60 text-amber-300 border border-amber-800/60 px-2 py-0.5 rounded-md transition cursor-pointer"
              title="Remover filtro de status"
            >
              <span>Status: {filtros.situacaoAtendimento}</span>
              <X className="w-3 h-3" />
            </button>
          )}

          {filtros.situacaoChamada !== 'TODOS' && (
            <button
              type="button"
              onClick={() => onChangeFiltros({ ...filtros, situacaoChamada: 'TODOS' })}
              className="inline-flex items-center gap-1 bg-blue-950/60 hover:bg-blue-900/60 text-blue-300 border border-blue-800/60 px-2 py-0.5 rounded-md transition cursor-pointer"
              title="Remover filtro de atendimento"
            >
              <span>{filtros.situacaoChamada === 'E' ? 'Em Atendimento' : 'Aguardando'}</span>
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {!mostrarAvancados && filtros.apenasComGeolocalizacao && (
          <button
            type="button"
            onClick={() => onChangeFiltros({ ...filtros, apenasComGeolocalizacao: false })}
            className="inline-flex items-center gap-1 bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-0.5 rounded-md transition cursor-pointer"
          >
            <span>Apenas com GPS</span>
            <X className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  );
};
