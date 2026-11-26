import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import {
  RotateCcw,
  Settings,
  Smartphone,
  Server,
  Map,
  BarChart3,
  LayoutGrid,
  Play,
  Pause,
} from 'lucide-react';

export type ModoVisualizacao = 'mapa' | 'graficos' | 'ambos' | 'lista';

interface HeaderProps {
  onOpenSettings: () => void;
  onTriggerSync: () => void;
  isSyncing: boolean;
  totalChamadas: number;
  modoVisualizacao: ModoVisualizacao;
  onChangeModoVisualizacao: (modo: ModoVisualizacao) => void;
  autoRefreshAtivo: boolean;
  onToggleAutoRefresh: () => void;
  segundosRestantes: number;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenSettings,
  onTriggerSync,
  isSyncing,
  totalChamadas,
  modoVisualizacao,
  onChangeModoVisualizacao,
  autoRefreshAtivo,
  onToggleAutoRefresh,
  segundosRestantes,
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  const tempoFormatado = `${Math.floor(segundosRestantes / 60)}:${(segundosRestantes % 60)
    .toString()
    .padStart(2, '0')}`;

  return (
    <header className="bg-slate-950/95 border-b border-slate-800/80 sticky top-0 z-40 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-2.5 flex items-center justify-between gap-3">
        {/* Left: Brand & Subtle Status */}
        <div className="flex items-center gap-2.5 min-w-0">
          <img
            src={`${import.meta.env.BASE_URL}assets/aistudio/LogoCorpoDeBombeiros_57dfdd49.png`}
            alt="Brasão CBMMG"
            className="w-9 h-9 sm:w-10 sm:h-10 object-contain shrink-0"
          />

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-sm sm:text-base font-black text-white tracking-wide flex items-center gap-1.5">
                <span className="text-red-500">CBMMG</span>
                <span className="text-slate-200 font-bold">CAD</span>
              </h1>
              <span
                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-950/70 border border-emerald-800/60 text-emerald-400"
                title={`Gateway Seguro Ativo • ${totalChamadas} chamadas ativas (6 COBs + CEB)`}
                aria-label="Servidor CAD conectado"
              >
                <Server className="w-3 h-3" />
                <span className="text-[10px] font-mono font-semibold text-emerald-300 hidden sm:inline tabular-nums">
                  {totalChamadas}
                </span>
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block truncate">
              Corpo de Bombeiros Militar de Minas Gerais • Chamadas Ativas
            </p>
          </div>
        </div>

        {/* Center: View Switcher (Desktop) */}
        <div className="hidden md:flex items-center bg-slate-900 p-0.5 rounded-lg border border-slate-800 text-xs">
          <button
            type="button"
            onClick={() => onChangeModoVisualizacao('ambos')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md transition cursor-pointer ${
              modoVisualizacao === 'ambos' || modoVisualizacao === 'lista'
                ? 'bg-slate-800 text-white font-semibold shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>Visão Geral</span>
          </button>
          <button
            type="button"
            onClick={() => onChangeModoVisualizacao('mapa')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md transition cursor-pointer ${
              modoVisualizacao === 'mapa'
                ? 'bg-slate-800 text-white font-semibold shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Map className="w-3.5 h-3.5" />
            <span>Mapa</span>
          </button>
          <button
            type="button"
            onClick={() => onChangeModoVisualizacao('graficos')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md transition cursor-pointer ${
              modoVisualizacao === 'graficos'
                ? 'bg-slate-800 text-white font-semibold shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Indicadores</span>
          </button>
        </div>

        {/* Right: Cycle Timer, Sync, Settings, Install PWA */}
        <div className="flex items-center gap-1.5 sm:gap-2 text-xs shrink-0">
          {/* Compact 10-min Cycle Control */}
          <button
            type="button"
            onClick={onToggleAutoRefresh}
            className="flex items-center gap-1.5 px-2 py-1.5 bg-slate-900 hover:bg-slate-800 rounded-lg border border-slate-800 text-slate-300 transition cursor-pointer"
            title={
              autoRefreshAtivo
                ? 'Sincronização automática a cada 10 min ativa • Clique para pausar'
                : 'Sincronização automática pausada • Clique para retomar'
            }
          >
            {autoRefreshAtivo ? (
              <Pause className="w-3 h-3 text-slate-400" />
            ) : (
              <Play className="w-3 h-3 text-emerald-400" />
            )}
            <span className="font-mono text-[11px] font-semibold tabular-nums text-slate-200">
              {autoRefreshAtivo ? tempoFormatado : 'Pausado'}
            </span>
          </button>

          {/* Primary Sync Button */}
          <button
            type="button"
            onClick={onTriggerSync}
            disabled={isSyncing}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white rounded-lg transition font-semibold cursor-pointer"
            title="Atualizar chamadas ativas"
            aria-label="Atualizar chamadas ativas"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">
              {isSyncing ? 'Atualizando...' : 'Atualizar'}
            </span>
          </button>

          {/* Settings Button */}
          <button
            type="button"
            onClick={onOpenSettings}
            className="p-2 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white rounded-lg border border-slate-800 transition cursor-pointer"
            title="Configurações e Tabelas Auxiliares"
          >
            <Settings className="w-4 h-4" />
          </button>

          {/* PWA Install Button */}
          {isInstallable && !isInstalled && (
            <button
              type="button"
              onClick={install}
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-lg border border-slate-700 transition cursor-pointer"
              title="Instalar App PWA"
            >
              <Smartphone className="w-3.5 h-3.5 text-red-400" />
              <span className="hidden lg:inline">Instalar App</span>
            </button>
          )}

          {isIOS && !isInstalled && (
            <>
              <button
                onClick={() => setShowIOSGuide(true)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-[11px] font-medium border border-slate-700"
              >
                <Smartphone className="w-3.5 h-3.5 text-amber-400" />
                <span>Instalar no iOS</span>
              </button>

              {showIOSGuide && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
                  <div className="w-full max-w-sm rounded-2xl bg-slate-900 border border-slate-700 p-6 shadow-2xl text-slate-200">
                    <div className="flex items-center gap-3 mb-3 border-b border-slate-800 pb-3">
                      <img
                        src={`${import.meta.env.BASE_URL}icon.svg`}
                        alt="Novo Ícone PWA CBMMG CAD"
                        className="w-12 h-12 rounded-2xl shadow-lg border border-red-500/40 object-contain bg-slate-950 p-1"
                      />
                      <div>
                        <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                          <Smartphone className="w-4 h-4 text-red-500" />
                          Instalar no iPhone / iPad
                        </h3>
                        <p className="text-[11px] text-slate-400">CBMMG CAD • Dados & Estatística</p>
                      </div>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      1. Toque no botão <strong>Compartilhar</strong> (ícone de quadrado com seta para cima) na barra inferior do Safari.<br />
                      2. Role a lista para baixo e toque em <strong>Adicionar à Tela de Início</strong>.<br />
                      3. O novo ícone de dados e estatísticas do CBMMG CAD aparecerá na sua tela de aplicativos.
                    </p>
                    <button
                      onClick={() => setShowIOSGuide(false)}
                      className="mt-5 w-full rounded-lg bg-red-600 hover:bg-red-500 py-2 text-xs font-bold text-white transition"
                    >
                      Entendi
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </header>
  );
};
