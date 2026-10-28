import React, { useState, useEffect } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import {
  Download,
  RotateCcw,
  Upload,
  Settings,
  HelpCircle,
  Flame,
  Radio,
  Server,
  Smartphone,
  Shield,
} from 'lucide-react';

interface HeaderProps {
  onOpenImport: () => void;
  onOpenStreamlitBridge: () => void;
  onOpenSettings: () => void;
  onTriggerSync: () => void;
  isSyncing: boolean;
  ultimaSync: string;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenImport,
  onOpenStreamlitBridge,
  onOpenSettings,
  onTriggerSync,
  isSyncing,
  ultimaSync,
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className="bg-slate-950 border-b border-slate-800 sticky top-0 z-40 backdrop-blur-md bg-slate-950/90 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Left: Brand & Identification */}
        <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-start">
          <div className="flex items-center gap-3">
            <div className="relative">
              <img
                src="/icon.svg"
                alt="Brasão CBMMG"
                className="w-11 h-11 drop-shadow-[0_0_10px_rgba(239,68,68,0.5)] transition hover:scale-105"
              />
              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-slate-950 rounded-full animate-pulse" />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-black text-white tracking-wide flex items-center gap-1.5">
                  <span className="text-red-500">CBMMG</span>
                  <span className="text-slate-300 font-bold">CAD</span>
                  <span className="text-[10px] font-mono font-normal uppercase bg-red-950 text-red-300 px-1.5 py-0.5 rounded border border-red-800">
                    Operacional
                  </span>
                </h1>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                Corpo de Bombeiros Militar de Minas Gerais • Painel de Chamadas Ativas
              </p>
            </div>
          </div>

          {/* Clock for Mobile */}
          <div className="md:hidden font-mono text-xs text-amber-400 font-bold bg-slate-900 px-2.5 py-1 rounded border border-slate-800">
            {currentTime.toLocaleTimeString('pt-BR')}
          </div>
        </div>

        {/* Right: Actions, Sync, Install PWA */}
        <div className="flex flex-wrap items-center justify-end gap-2 w-full md:w-auto text-xs">
          {/* Live Operational Clock */}
          <div className="hidden md:flex items-center gap-1.5 font-mono text-xs text-amber-400 font-bold bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800 shadow-inner">
            <Radio className="w-3.5 h-3.5 text-red-500 animate-pulse" />
            <span>{currentTime.toLocaleTimeString('pt-BR')}</span>
            <span className="text-[10px] text-slate-500 font-sans font-normal">BRT</span>
          </div>

          {/* Sync Trigger Button */}
          <button
            onClick={onTriggerSync}
            disabled={isSyncing}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-slate-300 hover:text-white rounded-lg border border-slate-800 transition shadow-sm font-medium"
            title="Sincronizar chamadas com cache intermediário da API"
          >
            <RotateCcw className={`w-3.5 h-3.5 text-blue-400 ${isSyncing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">{isSyncing ? 'Atualizando...' : 'Atualizar'}</span>
          </button>

          {/* Import JSON/CSV Button */}
          <button
            onClick={onOpenImport}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-200 hover:text-white rounded-lg border border-slate-800 transition shadow-sm font-medium"
            title="Importar arquivos locais JSON da API CAD ou planilhas CSV"
          >
            <Upload className="w-3.5 h-3.5 text-amber-400" />
            <span>Importar Dados</span>
          </button>

          {/* Streamlit Bridge & Architecture Button */}
          <button
            onClick={onOpenStreamlitBridge}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-200 hover:text-white rounded-lg border border-slate-800 transition shadow-sm font-medium"
            title="Solução de Contingência e Bridge para o Streamlit Cloud"
          >
            <Server className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">Streamlit & Arquitetura</span>
          </button>

          {/* Settings Button */}
          <button
            onClick={onOpenSettings}
            className="p-2 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white rounded-lg border border-slate-800 transition"
            title="Configurações da API e Token CAD"
          >
            <Settings className="w-4 h-4" />
          </button>

          {/* PWA Install Button (Mandatory per Skill) */}
          {isInstallable && !isInstalled && (
            <button
              onClick={install}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white font-bold rounded-lg transition shadow-[0_0_12px_rgba(239,68,68,0.4)] animate-bounce"
            >
              <Smartphone className="w-4 h-4" />
              <span>Instalar App PWA</span>
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
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <Smartphone className="w-5 h-5 text-red-500" />
                      Instalar no iPhone / iPad
                    </h3>
                    <p className="mt-3 text-xs text-slate-300 leading-relaxed">
                      1. Toque no botão <strong>Compartilhar</strong> (ícone de quadrado com seta para cima) na barra inferior do Safari.<br />
                      2. Role a lista para baixo e toque em <strong>Adicionar à Tela de Início</strong>.<br />
                      3. O ícone oficial do CBMMG CAD aparecerá na sua tela de aplicativos.
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
