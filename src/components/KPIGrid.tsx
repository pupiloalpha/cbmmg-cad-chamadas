import React from 'react';
import { FiltrosOperacionais, KpiOperacional } from '../types/cbm';
import {
  Radio,
  Truck,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Users,
  CloudRain,
  Flame,
  LifeBuoy,
  HeartPulse,
} from 'lucide-react';

interface KPIGridProps {
  kpis: KpiOperacional;
  filtros?: FiltrosOperacionais;
  onFiltrarSituacao?: (situacao: string) => void;
}

export const KPIGrid: React.FC<KPIGridProps> = ({ kpis, filtros, onFiltrarSituacao }) => {
  const isEmAtendimentoAtivo = filtros?.situacaoChamada === 'E';
  const isAguardandoAtivo = filtros?.situacaoAtendimento === 'AO';
  const isPrioridadeAltaAtivo = filtros?.prioridade === 'Alta';
  const isChuvaAtivo = Boolean(filtros?.filtroChuva && filtros.filtroChuva !== 'TODOS');

  const naturezaSelecionadaUnica =
    filtros?.naturezas && filtros.naturezas.length === 1 ? filtros.naturezas[0].toUpperCase() : null;
  const isGrupoOAtivo = naturezaSelecionadaUnica === 'O';
  const isGrupoSAtivo = naturezaSelecionadaUnica === 'S';
  const isGrupoVAtivo = naturezaSelecionadaUnica === 'V';

  // Determina o 6º Card dinâmico:
  // Prioridade: Chuva (se houver chamadas de chuva ou filtro de chuva ativo).
  // Caso contrário (0 chamadas de chuva), substitui automaticamente pelo maior grupo ativo: Incêndios (O), Salvamentos (S) ou APH (V).
  type Card6Tipo = 'CHUVA' | 'GRUPO_O' | 'GRUPO_S' | 'GRUPO_V';
  let card6Tipo: Card6Tipo = 'CHUVA';

  if (isGrupoOAtivo) {
    card6Tipo = 'GRUPO_O';
  } else if (isGrupoSAtivo) {
    card6Tipo = 'GRUPO_S';
  } else if (isGrupoVAtivo) {
    card6Tipo = 'GRUPO_V';
  } else if (isChuvaAtivo || kpis.chuvasQtd > 0) {
    card6Tipo = 'CHUVA';
  } else {
    const opcoes: { tipo: Card6Tipo; qtd: number }[] = [
      { tipo: 'GRUPO_O', qtd: kpis.incendiosQtd },
      { tipo: 'GRUPO_S', qtd: kpis.salvamentosQtd },
      { tipo: 'GRUPO_V', qtd: kpis.aphQtd },
    ];
    opcoes.sort((a, b) => b.qtd - a.qtd);
    card6Tipo = opcoes[0].tipo;
  }

  const card6Config = (() => {
    const pct = (qtd: number) =>
      kpis.totalAtivas > 0 ? Math.round((qtd / kpis.totalAtivas) * 100) : 0;

    if (card6Tipo === 'GRUPO_O') {
      return {
        acao: 'GRUPO_O',
        ativo: isGrupoOAtivo,
        titulo: 'Incêndios',
        valor: kpis.incendiosQtd,
        pct: pct(kpis.incendiosQtd),
        subtitulo: isGrupoOAtivo ? 'Filtro ativo • Limpar' : 'Explosão e incêndio',
        icon: <Flame className="w-4 h-4 text-orange-400" />,
        borderClass: isGrupoOAtivo
          ? 'border-orange-400/80 ring-1 ring-orange-500/40 bg-orange-950/25'
          : 'border-slate-800 hover:border-slate-700 bg-slate-900/80',
        titleColor: isGrupoOAtivo ? 'text-orange-300' : 'text-slate-400',
        valueColor: 'text-orange-300',
        pctColor: 'text-slate-400',
      };
    }

    if (card6Tipo === 'GRUPO_S') {
      return {
        acao: 'GRUPO_S',
        ativo: isGrupoSAtivo,
        titulo: 'Salvamentos',
        valor: kpis.salvamentosQtd,
        pct: pct(kpis.salvamentosQtd),
        subtitulo: isGrupoSAtivo ? 'Filtro ativo • Limpar' : 'Busca e salvamento',
        icon: <LifeBuoy className="w-4 h-4 text-emerald-400" />,
        borderClass: isGrupoSAtivo
          ? 'border-emerald-400/80 ring-1 ring-emerald-500/40 bg-emerald-950/25'
          : 'border-slate-800 hover:border-slate-700 bg-slate-900/80',
        titleColor: isGrupoSAtivo ? 'text-emerald-300' : 'text-slate-400',
        valueColor: 'text-emerald-300',
        pctColor: 'text-slate-400',
      };
    }

    if (card6Tipo === 'GRUPO_V') {
      return {
        acao: 'GRUPO_V',
        ativo: isGrupoVAtivo,
        titulo: 'APH / Resgate',
        valor: kpis.aphQtd,
        pct: pct(kpis.aphQtd),
        subtitulo: isGrupoVAtivo ? 'Filtro ativo • Limpar' : 'Pré-hospitalar',
        icon: <HeartPulse className="w-4 h-4 text-rose-400" />,
        borderClass: isGrupoVAtivo
          ? 'border-rose-400/80 ring-1 ring-rose-500/40 bg-rose-950/25'
          : 'border-slate-800 hover:border-slate-700 bg-slate-900/80',
        titleColor: isGrupoVAtivo ? 'text-rose-300' : 'text-slate-400',
        valueColor: 'text-rose-300',
        pctColor: 'text-slate-400',
      };
    }

    return {
      acao: 'CHUVA',
      ativo: isChuvaAtivo,
      titulo: 'Chuva / Temporal',
      valor: kpis.chuvasQtd,
      pct: pct(kpis.chuvasQtd),
      subtitulo: isChuvaAtivo
        ? 'Filtro ativo • Limpar'
        : `${kpis.chuvasDiretasQtd} diretas`,
      icon: <CloudRain className="w-4 h-4 text-cyan-400" />,
      borderClass: isChuvaAtivo
        ? 'border-cyan-400/80 ring-1 ring-cyan-500/40 bg-cyan-950/25'
        : 'border-slate-800 hover:border-slate-700 bg-slate-900/80',
      titleColor: isChuvaAtivo ? 'text-cyan-300' : 'text-slate-400',
      valueColor: 'text-cyan-300',
      pctColor: 'text-slate-400',
    };
  })();

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3">
      {/* 1. Total Ativas */}
      <button
        type="button"
        onClick={() => onFiltrarSituacao && onFiltrarSituacao('TODOS')}
        className="text-left bg-slate-900/80 border border-slate-800 hover:border-slate-700 rounded-xl p-3.5 transition cursor-pointer"
        title="Exibir todas as chamadas ativas"
      >
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Chamadas Ativas
          </span>
          <Radio className="w-4 h-4 text-red-400" />
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold text-white tabular-nums tracking-tight">
            {kpis.totalAtivas}
          </span>
          <span className="text-[11px] text-slate-500">ativas</span>
        </div>
        <div className="mt-2 flex items-center gap-1.5 text-[11px] text-slate-400">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
          <span>Em operação</span>
        </div>
      </button>

      {/* 2. Em Atendimento */}
      <button
        type="button"
        onClick={() => onFiltrarSituacao && onFiltrarSituacao('EM_ATENDIMENTO')}
        className={`text-left border rounded-xl p-3.5 transition cursor-pointer ${
          isEmAtendimentoAtivo
            ? 'border-blue-400/80 ring-1 ring-blue-500/40 bg-blue-950/25'
            : 'border-slate-800 hover:border-slate-700 bg-slate-900/80'
        }`}
        title="Filtrar ocorrências em atendimento"
      >
        <div className="flex items-center justify-between mb-1.5">
          <span
            className={`text-[11px] font-semibold uppercase tracking-wider ${
              isEmAtendimentoAtivo ? 'text-blue-300' : 'text-slate-400'
            }`}
          >
            Em Atendimento
          </span>
          <CheckCircle2 className="w-4 h-4 text-blue-400" />
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold text-blue-300 tabular-nums tracking-tight">
            {kpis.emAndamento}
          </span>
          <span className="text-[11px] text-slate-400 tabular-nums">
            {kpis.taxaAtendimentoPct}%
          </span>
        </div>
        <div className="mt-2 text-[11px] text-slate-400 truncate">
          {isEmAtendimentoAtivo ? 'Filtro ativo • Limpar' : 'Com recurso empenhado'}
        </div>
      </button>

      {/* 3. Aguardando (Situação AO) */}
      <button
        type="button"
        onClick={() => onFiltrarSituacao && onFiltrarSituacao('AO')}
        className={`text-left border rounded-xl p-3.5 transition cursor-pointer ${
          isAguardandoAtivo
            ? 'border-amber-400/80 ring-1 ring-amber-500/40 bg-amber-950/25'
            : kpis.aguardando > 0
            ? 'border-amber-700/40 hover:border-amber-600/60 bg-amber-950/15'
            : 'border-slate-800 hover:border-slate-700 bg-slate-900/80'
        }`}
        title="Filtrar ocorrências aguardando despacho"
      >
        <div className="flex items-center justify-between mb-1.5">
          <span
            className={`text-[11px] font-semibold uppercase tracking-wider ${
              kpis.aguardando > 0 || isAguardandoAtivo ? 'text-amber-400' : 'text-slate-400'
            }`}
          >
            Aguardando
          </span>
          <Clock
            className={`w-4 h-4 ${kpis.aguardando > 0 ? 'text-amber-400' : 'text-slate-500'}`}
          />
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold text-amber-300 tabular-nums tracking-tight">
            {kpis.aguardando}
          </span>
          <span className="text-[11px] text-slate-400">em fila</span>
        </div>
        <div className="mt-2 text-[11px] text-slate-400 truncate">
          {isAguardandoAtivo ? (
            'Filtro ativo • Limpar'
          ) : (
            <>
              Espera média:{' '}
              <strong className="text-amber-300/90 tabular-nums">
                {kpis.tempoMedioEsperaMin} min
              </strong>
            </>
          )}
        </div>
      </button>

      {/* 4. Viaturas & Recursos */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5">
        <div className="flex items-center justify-between mb-1.5">
          <span
            className="text-[11px] font-semibold uppercase tracking-wider text-slate-400"
            title="Viaturas operacionais ativas em campo"
          >
            Viaturas
          </span>
          <Truck className="w-4 h-4 text-slate-400" />
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold text-white tabular-nums tracking-tight">
            {kpis.viaturasAtivas}
          </span>
          <span className="text-[11px] text-slate-400">em campo</span>
        </div>
        <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
          <div className="flex items-center gap-1 truncate" title="Total de recursos empenhados">
            <Users className="w-3 h-3 text-slate-400 shrink-0" />
            <span className="tabular-nums">
              <strong className="text-slate-300">{kpis.recursosEmpenhados}</strong> recursos
            </span>
          </div>
          {kpis.bombeirosSemViatura > 0 && (
            <span
              className="text-[10px] text-slate-500 shrink-0 tabular-nums"
              title="Bombeiros empenhados sem viatura"
            >
              +{kpis.bombeirosSemViatura} BM
            </span>
          )}
        </div>
      </div>

      {/* 5. Prioridade Alta */}
      <button
        type="button"
        onClick={() => onFiltrarSituacao && onFiltrarSituacao('PRIORIDADE_ALTA')}
        className={`text-left border rounded-xl p-3.5 transition cursor-pointer ${
          isPrioridadeAltaAtivo
            ? 'border-red-400/80 ring-1 ring-red-500/40 bg-red-950/25'
            : 'border-slate-800 hover:border-slate-700 bg-slate-900/80'
        }`}
        title="Filtrar chamadas de prioridade alta"
      >
        <div className="flex items-center justify-between mb-1.5">
          <span
            className={`text-[11px] font-semibold uppercase tracking-wider ${
              isPrioridadeAltaAtivo ? 'text-red-300' : 'text-slate-400'
            }`}
          >
            Prioridade Alta
          </span>
          <AlertTriangle className="w-4 h-4 text-red-400" />
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold text-red-400 tabular-nums tracking-tight">
            {kpis.prioridadeAltaQtd}
          </span>
          <span className="text-[11px] text-slate-400">emergência</span>
        </div>
        <div className="mt-2 text-[11px] text-slate-400 truncate">
          {isPrioridadeAltaAtivo ? 'Filtro ativo • Limpar' : 'Risco à vida'}
        </div>
      </button>

      {/* 6. Chuva / Temporal (ou Grupo Dinâmico quando Chuvas = 0) */}
      <button
        type="button"
        onClick={() => onFiltrarSituacao && onFiltrarSituacao(card6Config.acao)}
        className={`text-left border rounded-xl p-3.5 transition cursor-pointer ${card6Config.borderClass}`}
        title={`Filtrar: ${card6Config.titulo}`}
      >
        <div className="flex items-center justify-between mb-1.5">
          <span className={`text-[11px] font-semibold uppercase tracking-wider ${card6Config.titleColor}`}>
            {card6Config.titulo}
          </span>
          {card6Config.icon}
        </div>
        <div className="flex items-baseline gap-2">
          <span className={`text-2xl font-bold tabular-nums tracking-tight ${card6Config.valueColor}`}>
            {card6Config.valor}
          </span>
          <span className={`text-[11px] tabular-nums ${card6Config.pctColor}`}>
            {card6Config.pct}%
          </span>
        </div>
        <div className="mt-2 text-[11px] text-slate-400 truncate">
          {card6Config.subtitulo}
        </div>
      </button>
    </div>
  );
};
