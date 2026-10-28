import React from 'react';
import { ChamadaAtiva } from '../types/cbm';
import {
  calcularDistribuicaoPorNatureza,
  calcularDistribuicaoPorOrigem,
  calcularDistribuicaoPorPrioridade,
  calcularDistribuicaoPorSituacao,
  calcularEvolucaoHoras,
} from '../services/cbmStorage';
import { BarChart3, TrendingUp, AlertCircle, PhoneCall, PieChart } from 'lucide-react';

interface ChartsSectionProps {
  chamadas: ChamadaAtiva[];
}

export const ChartsSection: React.FC<ChartsSectionProps> = ({ chamadas }) => {
  const distribuicaoNatureza = calcularDistribuicaoPorNatureza(chamadas);
  const distribuicaoSituacao = calcularDistribuicaoPorSituacao(chamadas);
  const distribuicaoOrigem = calcularDistribuicaoPorOrigem(chamadas);
  const distribuicaoPrioridade = calcularDistribuicaoPorPrioridade(chamadas);
  const evolucaoHoras = calcularEvolucaoHoras(chamadas);

  const maxHora = Math.max(...evolucaoHoras.map((h) => h.total), 1);
  const maxNatureza = Math.max(...distribuicaoNatureza.map((n) => n.total), 1);
  const totalChamadas = chamadas.length || 1;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* 1. Evolução Temporal das Aberturas por Hora */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-md flex flex-col justify-between">
        <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-2">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-red-500" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
              Distribuição Temporal das Aberturas por Hora
            </h3>
          </div>
          <span className="text-[11px] text-slate-400 font-mono">Últimas 12 Horas</span>
        </div>

        {/* Bar Timeline Chart */}
        <div className="h-44 flex items-end gap-1.5 pt-4 pb-2 px-1">
          {evolucaoHoras.map((item, idx) => {
            const pct = Math.round((item.total / maxHora) * 100);
            return (
              <div key={idx} className="flex-1 flex flex-col items-center gap-1.5 group h-full justify-end">
                <div className="relative w-full flex items-end justify-center h-32">
                  <span className="absolute -top-5 text-[10px] font-mono font-bold text-slate-300 opacity-0 group-hover:opacity-100 transition">
                    {item.total}
                  </span>
                  <div
                    style={{ height: `${Math.max(pct, 6)}%` }}
                    className={`w-full max-w-[28px] rounded-t transition-all duration-300 ${
                      item.total > 0
                        ? 'bg-gradient-to-t from-red-800 to-red-500 group-hover:from-red-600 group-hover:to-red-400 shadow-[0_0_8px_rgba(239,68,68,0.3)]'
                        : 'bg-slate-800'
                    }`}
                  />
                </div>
                <span className="text-[9px] font-mono text-slate-400 group-hover:text-white transition">
                  {item.hora}
                </span>
              </div>
            );
          })}
        </div>

        <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-400">
          <span>Pico operacional detectado no turno diurno</span>
          <span className="font-mono text-slate-300">Total no período: {chamadas.length}</span>
        </div>
      </div>

      {/* 2. Ocorrências por Natureza de Atendimento */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-md flex flex-col justify-between">
        <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-2">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-amber-500" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
              Ocorrências por Natureza (Mais Frequentes)
            </h3>
          </div>
          <span className="text-[11px] text-slate-400 font-mono">Ranking Top 7</span>
        </div>

        <div className="space-y-2.5 my-auto">
          {distribuicaoNatureza.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-500">
              Nenhuma natureza no filtro selecionado
            </div>
          ) : (
            distribuicaoNatureza.map((item, idx) => {
              const pct = Math.round((item.total / totalChamadas) * 100);
              const barWidth = Math.round((item.total / maxNatureza) * 100);
              return (
                <div key={idx} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-300 truncate max-w-[280px]">
                      {item.nome}
                    </span>
                    <span className="font-mono font-bold text-slate-200 ml-2">
                      {item.total}{' '}
                      <span className="text-[10px] text-slate-500 font-normal">({pct}%)</span>
                    </span>
                  </div>
                  <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
                    <div
                      style={{ width: `${barWidth}%` }}
                      className="bg-gradient-to-r from-amber-600 to-red-500 h-full rounded-full transition-all duration-500"
                    />
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-400">
          <span>Catálogo CAD CBMMG integrado</span>
          <span className="font-mono text-amber-400">
            {distribuicaoNatureza[0]?.nome || 'Sem dados'} ({distribuicaoNatureza[0]?.total || 0})
          </span>
        </div>
      </div>

      {/* 3. Situação Operacional de Atendimento */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-md">
        <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-2">
          <div className="flex items-center gap-2">
            <PieChart className="w-4 h-4 text-blue-500" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
              Situação do Atendimento Operacional
            </h3>
          </div>
          <span className="text-[11px] text-slate-400 font-mono">Status CAD</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-1">
          {distribuicaoSituacao.map((item, idx) => {
            const pct = Math.round((item.total / totalChamadas) * 100);
            return (
              <div
                key={idx}
                className="bg-slate-950/70 border border-slate-800 rounded-lg p-2.5 flex flex-col justify-between"
              >
                <span className="text-[11px] text-slate-400 font-medium truncate mb-1">
                  {item.situacao}
                </span>
                <div className="flex items-baseline justify-between">
                  <span className="text-lg font-mono font-bold text-slate-200">{item.total}</span>
                  <span className="text-[10px] text-slate-500 font-mono">{pct}%</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. Origem do Acionamento & Nível de Prioridade */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-md flex flex-col justify-between">
        <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-2">
          <div className="flex items-center gap-2">
            <PhoneCall className="w-4 h-4 text-emerald-500" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
              Origem do Acionamento & Prioridade
            </h3>
          </div>
          <span className="text-[11px] text-slate-400 font-mono">Consolidação</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          {/* Origem */}
          <div className="space-y-2 bg-slate-950/70 p-3 rounded-lg border border-slate-800">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              Canal de Entrada
            </div>
            {distribuicaoOrigem.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between text-xs">
                <span className="text-slate-300 truncate">{item.origem}</span>
                <span className="font-mono font-bold text-emerald-400">{item.total}</span>
              </div>
            ))}
          </div>

          {/* Prioridade */}
          <div className="space-y-2 bg-slate-950/70 p-3 rounded-lg border border-slate-800">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              Classificação de Risco
            </div>
            {distribuicaoPrioridade.map((item, idx) => {
              const cor =
                item.prioridade === 'Alta'
                  ? 'text-red-400'
                  : item.prioridade === 'Média'
                  ? 'text-amber-400'
                  : 'text-blue-400';
              return (
                <div key={idx} className="flex items-center justify-between text-xs">
                  <span className="text-slate-300">{item.prioridade}</span>
                  <span className={`font-mono font-bold ${cor}`}>{item.total}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="pt-2 mt-2 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-400">
          <span className="flex items-center gap-1">
            <AlertCircle className="w-3 h-3 text-red-400" />
            Triagem conforme protocolo do CBMMG
          </span>
          <span className="font-mono text-slate-300">Central 193</span>
        </div>
      </div>
    </div>
  );
};
