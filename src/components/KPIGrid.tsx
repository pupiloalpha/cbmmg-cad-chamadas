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
        titulo: 'Incêndios (Grupo O)',
        valor: kpis.incendiosQtd,
        pct: pct(kpis.incendiosQtd),
        subtitulo: isGrupoOAtivo
          ? 'Filtro ativo • Clique para limpar'
          : 'Explosão e Incêndio • Clique p/ filtrar',
        icon: <Flame className="w-4 h-4 text-orange-400" />,
        borderClass: isGrupoOAtivo
          ? 'border-orange-400 ring-2 ring-orange-500/40 bg-orange-950/35'
          : 'border-orange-900/50 hover:border-orange-500/70',
        glowClass: 'bg-orange-600/10 group-hover:bg-orange-600/20',
        titleColor: 'text-orange-400',
        valueColor: 'text-orange-300',
        pctColor: 'text-orange-400/80',
      };
    }

    if (card6Tipo === 'GRUPO_S') {
      return {
        acao: 'GRUPO_S',
        ativo: isGrupoSAtivo,
        titulo: 'Salvamentos (Grupo S)',
        valor: kpis.salvamentosQtd,
        pct: pct(kpis.salvamentosQtd),
        subtitulo: isGrupoSAtivo
          ? 'Filtro ativo • Clique para limpar'
          : 'Busca e Salvamento • Clique p/ filtrar',
        icon: <LifeBuoy className="w-4 h-4 text-emerald-400" />,
        borderClass: isGrupoSAtivo
          ? 'border-emerald-400 ring-2 ring-emerald-500/40 bg-emerald-950/35'
          : 'border-emerald-900/50 hover:border-emerald-500/70',
        glowClass: 'bg-emerald-600/10 group-hover:bg-emerald-600/20',
        titleColor: 'text-emerald-400',
        valueColor: 'text-emerald-300',
        pctColor: 'text-emerald-400/80',
      };
    }

    if (card6Tipo === 'GRUPO_V') {
      return {
        acao: 'GRUPO_V',
        ativo: isGrupoVAtivo,
        titulo: 'APH / Resgate (Grupo V)',
        valor: kpis.aphQtd,
        pct: pct(kpis.aphQtd),
        subtitulo: isGrupoVAtivo
          ? 'Filtro ativo • Clique para limpar'
          : 'Atend. Pré-Hospitalar • Clique p/ filtrar',
        icon: <HeartPulse className="w-4 h-4 text-rose-400" />,
        borderClass: isGrupoVAtivo
          ? 'border-rose-400 ring-2 ring-rose-500/40 bg-rose-950/35'
          : 'border-rose-900/50 hover:border-rose-500/70',
        glowClass: 'bg-rose-600/10 group-hover:bg-rose-600/20',
        titleColor: 'text-rose-400',
        valueColor: 'text-rose-300',
        pctColor: 'text-rose-400/80',
      };
    }

    return {
      acao: 'CHUVA',
      ativo: isChuvaAtivo,
      titulo: 'Chuva / Temporal',
      valor: kpis.chuvasQtd,
      pct: pct(kpis.chuvasQtd),
      subtitulo: isChuvaAtivo
        ? 'Filtro de chuvas ativo • Clique p/ limpar'
        : `${kpis.chuvasDiretasQtd} diretas • Clique p/ filtrar`,
      icon: <CloudRain className={`w-4 h-4 text-cyan-400 ${isChuvaAtivo ? 'animate-pulse' : ''}`} />,
      borderClass: isChuvaAtivo
        ? 'border-cyan-400 ring-2 ring-cyan-500/40 bg-cyan-950/35'
        : 'border-cyan-900/50 hover:border-cyan-500/70',
      glowClass: 'bg-cyan-600/10 group-hover:bg-cyan-600/20',
      titleColor: 'text-cyan-400',
      valueColor: 'text-cyan-300',
      pctColor: 'text-cyan-400/80',
    };
  })();

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      {/* 1. Total Ativas */}
      <div
        onClick={() => onFiltrarSituacao && onFiltrarSituacao('TODOS')}
        className="bg-slate-900/90 border border-slate-800 hover:border-slate-600 rounded-xl p-3.5 shadow-sm transition cursor-pointer relative overflow-hidden group"
        title="Clique para exibir todas as chamadas ativas"
      >
        <div className="absolute top-0 right-0 w-16 h-16 bg-red-600/10 rounded-bl-full pointer-events-none group-hover:bg-red-600/20 transition" />
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Chamadas Ativas
          </span>
          <Radio className="w-4 h-4 text-red-500 animate-pulse" />
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-black text-white font-mono tracking-tight">
            {kpis.totalAtivas}
          </span>
          <span className="text-[11px] text-slate-400">CAD Geral</span>
        </div>
        <div className="mt-2 flex items-center gap-1.5 text-[10px] text-slate-400">
          <span className="w-2 h-2 rounded-full bg-red-500 inline-block animate-ping" />
          <span>Monitoramento em tempo real</span>
        </div>
      </div>

      {/* 2. Em Atendimento */}
      <div
        onClick={() => onFiltrarSituacao && onFiltrarSituacao('EM_ATENDIMENTO')}
        className={`bg-slate-900/90 border rounded-xl p-3.5 shadow-sm transition cursor-pointer relative overflow-hidden group ${
          isEmAtendimentoAtivo
            ? 'border-blue-400 ring-2 ring-blue-500/40 bg-blue-950/35'
            : 'border-blue-900/50 hover:border-blue-500/70'
        }`}
        title="Clique para filtrar ocorrências em atendimento"
      >
        <div className="absolute top-0 right-0 w-16 h-16 bg-blue-600/10 rounded-bl-full pointer-events-none group-hover:bg-blue-600/20 transition" />
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-blue-400">
            Em Atendimento
          </span>
          <CheckCircle2 className="w-4 h-4 text-blue-400" />
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-black text-blue-300 font-mono tracking-tight">
            {kpis.emAndamento}
          </span>
          <span className="text-[11px] text-blue-400/80 font-mono font-medium">
            ({kpis.taxaAtendimentoPct}%)
          </span>
        </div>
        <div className="mt-2 text-[10px] text-slate-400 truncate">
          {isEmAtendimentoAtivo ? 'Filtro ativo • Clique p/ limpar' : 'Ocorrências ativas (não AO)'}
        </div>
      </div>

      {/* 3. Aguardando (Situação AO) */}
      <div
        onClick={() => onFiltrarSituacao && onFiltrarSituacao('AO')}
        className={`bg-slate-900/90 border rounded-xl p-3.5 shadow-sm transition cursor-pointer relative overflow-hidden group ${
          isAguardandoAtivo
            ? 'border-amber-400 ring-2 ring-amber-500/40 bg-amber-950/40'
            : kpis.aguardando > 0
            ? 'border-amber-600/50 hover:border-amber-500 bg-amber-950/20'
            : 'border-slate-800 hover:border-slate-700'
        }`}
        title="Clique para filtrar ocorrências aguardando atendimento (AO)"
      >
        <div className="absolute top-0 right-0 w-16 h-16 bg-amber-600/10 rounded-bl-full pointer-events-none group-hover:bg-amber-600/20 transition" />
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-400">
            Aguardando (AO)
          </span>
          <Clock
            className={`w-4 h-4 ${kpis.aguardando > 0 ? 'text-amber-400 animate-spin' : 'text-slate-500'}`}
            style={{ animationDuration: '6s' }}
          />
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-black text-amber-300 font-mono tracking-tight">
            {kpis.aguardando}
          </span>
          <span className="text-[11px] text-amber-400/80">em fila (AO)</span>
        </div>
        <div className="mt-2 text-[10px] text-amber-400/90 truncate">
          {isAguardandoAtivo ? (
            'Filtro ativo • Clique p/ limpar'
          ) : (
            <>
              Espera média: <strong>{kpis.tempoMedioEsperaMin} min</strong>
            </>
          )}
        </div>
      </div>

      {/* 4. Viaturas Ativas (prefixo não-BM) & Recursos Empenhados (sem TR) */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 shadow-sm relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-16 h-16 bg-red-600/10 rounded-bl-full pointer-events-none group-hover:bg-red-600/20 transition" />
        <div className="flex items-center justify-between mb-1.5">
          <span
            className="text-[11px] font-semibold uppercase tracking-wider text-slate-400"
            title="Viaturas em campo com prefixo que não inicia em BM (e sem situação TR)"
          >
            Viaturas Ativas
          </span>
          <Truck className="w-4 h-4 text-red-400" />
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-black text-white font-mono tracking-tight">
            {kpis.viaturasAtivas}
          </span>
          <span className="text-[11px] text-slate-400">viaturas (não BM)</span>
        </div>
        <div className="mt-2 flex items-center justify-between text-[10px] text-slate-400">
          <div className="flex items-center gap-1 truncate" title="Recursos empenhados sem a situação TR">
            <Users className="w-3 h-3 text-amber-400 shrink-0" />
            <span>
              <strong>{kpis.recursosEmpenhados}</strong> recursos (sem TR)
            </span>
          </div>
          {kpis.bombeirosSemViatura > 0 && (
            <span
              className="font-mono text-[9px] text-slate-500 shrink-0"
              title="Bombeiros empenhados sem viatura com máscara BM0000000"
            >
              +{kpis.bombeirosSemViatura} BM a pé
            </span>
          )}
        </div>
      </div>

      {/* 5. Prioridade Alta / Emergências (Clicável para filtrar) */}
      <div
        onClick={() => onFiltrarSituacao && onFiltrarSituacao('PRIORIDADE_ALTA')}
        className={`bg-slate-900/90 border rounded-xl p-3.5 shadow-sm transition cursor-pointer relative overflow-hidden group ${
          isPrioridadeAltaAtivo
            ? 'border-red-400 ring-2 ring-red-500/40 bg-red-950/40'
            : 'border-red-900/50 hover:border-red-500/70'
        }`}
        title="Clique para filtrar chamadas de Prioridade Alta"
      >
        <div className="absolute top-0 right-0 w-16 h-16 bg-red-600/10 rounded-bl-full pointer-events-none group-hover:bg-red-600/20 transition" />
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-red-400">
            Prioridade Alta
          </span>
          <AlertTriangle className="w-4 h-4 text-red-400 animate-pulse" />
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-black text-red-400 font-mono tracking-tight">
            {kpis.prioridadeAltaQtd}
          </span>
          <span className="text-[11px] text-red-300/80">Código Vermelho</span>
        </div>
        <div className="mt-2 text-[10px] text-red-300/80 truncate">
          {isPrioridadeAltaAtivo
            ? 'Filtro ativo • Clique p/ limpar'
            : 'Risco à vida • Clique p/ filtrar'}
        </div>
      </div>

      {/* 6. Chuva / Temporal (ou Grupo Operacional Dinâmico quando Chuvas = 0) */}
      <div
        onClick={() => onFiltrarSituacao && onFiltrarSituacao(card6Config.acao)}
        className={`bg-slate-900/90 border rounded-xl p-3.5 shadow-sm transition cursor-pointer relative overflow-hidden group ${card6Config.borderClass}`}
        title={`Clique para filtrar: ${card6Config.titulo}`}
      >
        <div
          className={`absolute top-0 right-0 w-16 h-16 rounded-bl-full pointer-events-none transition ${card6Config.glowClass}`}
        />
        <div className="flex items-center justify-between mb-1.5">
          <span className={`text-[11px] font-semibold uppercase tracking-wider ${card6Config.titleColor}`}>
            {card6Config.titulo}
          </span>
          {card6Config.icon}
        </div>
        <div className="flex items-baseline gap-2">
          <span className={`text-2xl font-black font-mono tracking-tight ${card6Config.valueColor}`}>
            {card6Config.valor}
          </span>
          <span className={`text-[11px] font-mono font-medium ${card6Config.pctColor}`}>
            ({card6Config.pct}%)
          </span>
        </div>
        <div className="mt-2 text-[10px] text-slate-400 truncate">
          {card6Config.subtitulo}
        </div>
      </div>
    </div>
  );
};
