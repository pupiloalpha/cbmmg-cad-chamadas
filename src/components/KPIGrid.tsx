import React from 'react';
import { KpiOperacional } from '../types/cbm';
import { Radio, Truck, Clock, AlertTriangle, CheckCircle2, MapPin, Users } from 'lucide-react';

interface KPIGridProps {
  kpis: KpiOperacional;
  onFiltrarSituacao?: (situacao: string) => void;
}

export const KPIGrid: React.FC<KPIGridProps> = ({ kpis, onFiltrarSituacao }) => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      {/* 1. Total Ativas */}
      <div
        onClick={() => onFiltrarSituacao && onFiltrarSituacao('TODOS')}
        className="bg-slate-900/90 border border-slate-800 hover:border-slate-700 rounded-xl p-3.5 shadow-sm transition cursor-pointer relative overflow-hidden group"
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
        onClick={() => onFiltrarSituacao && onFiltrarSituacao('E')}
        className="bg-slate-900/90 border border-blue-900/50 hover:border-blue-600/60 rounded-xl p-3.5 shadow-sm transition cursor-pointer relative overflow-hidden group"
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
          Viaturas no local ou em direção
        </div>
      </div>

      {/* 3. Aguardando Despacho */}
      <div
        onClick={() => onFiltrarSituacao && onFiltrarSituacao('A')}
        className={`bg-slate-900/90 border rounded-xl p-3.5 shadow-sm transition cursor-pointer relative overflow-hidden group ${
          kpis.aguardando > 0
            ? 'border-amber-600/50 hover:border-amber-500 bg-amber-950/20'
            : 'border-slate-800'
        }`}
      >
        <div className="absolute top-0 right-0 w-16 h-16 bg-amber-600/10 rounded-bl-full pointer-events-none group-hover:bg-amber-600/20 transition" />
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-400">
            Aguardando
          </span>
          <Clock className={`w-4 h-4 ${kpis.aguardando > 0 ? 'text-amber-400 animate-spin' : 'text-slate-500'}`} style={{ animationDuration: '6s' }} />
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-black text-amber-300 font-mono tracking-tight">
            {kpis.aguardando}
          </span>
          <span className="text-[11px] text-amber-400/80">em fila</span>
        </div>
        <div className="mt-2 text-[10px] text-amber-400/90 truncate">
          Espera média: <strong>{kpis.tempoMedioEsperaMin} min</strong>
        </div>
      </div>

      {/* 4. Viaturas Empenhadas */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 shadow-sm relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-16 h-16 bg-red-600/10 rounded-bl-full pointer-events-none group-hover:bg-red-600/20 transition" />
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Viaturas Ativas
          </span>
          <Truck className="w-4 h-4 text-red-400" />
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-black text-white font-mono tracking-tight">
            {kpis.recursosEmpenhados}
          </span>
          <span className="text-[11px] text-slate-400">recursos CAD</span>
        </div>
        <div className="mt-2 flex items-center gap-1 text-[10px] text-slate-400">
          <Users className="w-3 h-3 text-amber-400" />
          <span><strong>{kpis.totalBombeiros}</strong> bombeiros em campo</span>
        </div>
      </div>

      {/* 5. Prioridade Alta / Emergências */}
      <div className="bg-slate-900/90 border border-red-900/50 rounded-xl p-3.5 shadow-sm relative overflow-hidden group">
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
          Risco à vida ou propagação
        </div>
      </div>

      {/* 6. Georreferenciadas */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 shadow-sm relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-600/10 rounded-bl-full pointer-events-none group-hover:bg-emerald-600/20 transition" />
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-400">
            Geolocalização
          </span>
          <MapPin className="w-4 h-4 text-emerald-400" />
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-black text-emerald-300 font-mono tracking-tight">
            {kpis.comCoordenadas}
          </span>
          <span className="text-[11px] text-emerald-400/80">
            ({kpis.totalAtivas > 0 ? Math.round((kpis.comCoordenadas / kpis.totalAtivas) * 100) : 0}%)
          </span>
        </div>
        <div className="mt-2 text-[10px] text-slate-400 truncate">
          {kpis.semCoordenadas > 0 ? `${kpis.semCoordenadas} sem coordenada` : '100% mapeadas'}
        </div>
      </div>
    </div>
  );
};
