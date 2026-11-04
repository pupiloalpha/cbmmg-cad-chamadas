import React, { useState, useEffect, useMemo } from 'react';
import { ChamadaAtiva, FiltrosOperacionais } from './types/cbm';
import {
  carregarChamadasArmazenadas,
  salvarChamadasArmazenadas,
  filtrarChamadas,
  calcularKPIs,
  obterUltimaSync,
  sincronizarProxyReverso,
  sincronizarSnapshotEstatico,
} from './services/cbmStorage';
import { Header } from './components/Header';
import { KPIGrid } from './components/KPIGrid';
import { FiltersBar } from './components/FiltersBar';
import { OperationalMap } from './components/OperationalMap';
import { ChartsSection } from './components/ChartsSection';
import { CallsTable } from './components/CallsTable';
import { CallDetailModal } from './components/CallDetailModal';
import { ImportModal } from './components/ImportModal';
import { StreamlitBridgeModal } from './components/StreamlitBridgeModal';
import { ApiSettingsModal } from './components/ApiSettingsModal';
import { OfflineIndicator } from './components/OfflineIndicator';
import {
  Map,
  BarChart3,
  Shield,
  RotateCcw,
  CheckCircle2,
  Clock,
  Play,
  Pause,
  Server,
} from 'lucide-react';

const FILTROS_PADRAO: FiltrosOperacionais = {
  cob: 'TODOS',
  bbm: 'TODOS',
  ciaInd: 'TODOS',
  naturezaGrupo: 'TODOS',
  situacaoChamada: 'TODOS',
  situacaoAtendimento: 'TODOS',
  origem: 'TODOS',
  prioridade: 'TODOS',
  periodoTempo: 'todas',
  apenasComGeolocalizacao: false,
  termoBusca: '',
};

const INTERVALO_REFRESH_SEGUNDOS = 600; // 10 minutos conforme Regra #3 do manual CBMMG

export default function App() {
  const [chamadas, setChamadas] = useState<ChamadaAtiva[]>([]);
  const [filtros, setFiltros] = useState<FiltrosOperacionais>(FILTROS_PADRAO);
  const [chamadaSelecionada, setChamadaSelecionada] = useState<ChamadaAtiva | null>(null);

  // Modais
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isStreamlitBridgeOpen, setIsStreamlitBridgeOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Sincronização & Estado
  const [isSyncing, setIsSyncing] = useState(false);
  const [ultimaSync, setUltimaSync] = useState(obterUltimaSync());
  const [modoVisualizacao, setModoVisualizacao] = useState<'mapa' | 'graficos' | 'ambos'>('ambos');
  const [toastNotificacao, setToastNotificacao] = useState<string | null>(null);

  // Ciclo Automático de 10 minutos (Regra #3)
  const [autoRefreshAtivo, setAutoRefreshAtivo] = useState(true);
  const [segundosRestantes, setSegundosRestantes] = useState(INTERVALO_REFRESH_SEGUNDOS);

  const exibirToast = (msg: string) => {
    setToastNotificacao(msg);
    setTimeout(() => setToastNotificacao(null), 5000);
  };

  // Sincronização centralizada com o Proxy Reverso Nginx (cobom-cad.duckdns.org)
  const executarSincronizacaoProxy = async (forcar = false) => {
    setIsSyncing(true);
    try {
      const res = await sincronizarProxyReverso(forcar);
      if (res.sucesso && res.dados && res.dados.length > 0) {
        setChamadas(res.dados);
        setUltimaSync(new Date().toISOString());
        exibirToast(`🔄 ${res.mensagem}`);
      } else {
        exibirToast(`ℹ️ ${res.mensagem}`);
      }
    } catch (err: any) {
      exibirToast(`⚠️ Erro na sincronização: ${err.message}`);
    } finally {
      setIsSyncing(false);
      setSegundosRestantes(INTERVALO_REFRESH_SEGUNDOS);
    }
  };

  // Inicializar dados: carrega cache persistente e sincroniza imediatamente com o proxy reverso Nginx
  useEffect(() => {
    const dadosIniciais = carregarChamadasArmazenadas();
    if (dadosIniciais && dadosIniciais.length > 0) {
      setChamadas(dadosIniciais);
    }

    // Dispara leitura imediata das 700+ chamadas ativas via proxy reverso
    executarSincronizacaoProxy(false);
  }, []);

  // Timer regressivo de 10 minutos
  useEffect(() => {
    if (!autoRefreshAtivo) return;

    const timer = setInterval(() => {
      setSegundosRestantes((prev) => {
        if (prev <= 1) {
          executarSincronizacaoProxy(false);
          return INTERVALO_REFRESH_SEGUNDOS;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [autoRefreshAtivo]);

  // Filtragem dos dados operacionais
  const chamadasFiltradas = useMemo(() => {
    return filtrarChamadas(chamadas, filtros);
  }, [chamadas, filtros]);

  // Cálculo de KPIs
  const kpis = useMemo(() => {
    return calcularKPIs(chamadasFiltradas);
  }, [chamadasFiltradas]);

  // Disparar sincronização manual
  const handleTriggerSync = async () => {
    await executarSincronizacaoProxy(false);
  };

  const handleImportSuccess = (novasChamadas: ChamadaAtiva[]) => {
    setChamadas(novasChamadas);
    salvarChamadasArmazenadas(novasChamadas);
    setUltimaSync(new Date().toISOString());
    exibirToast(`${novasChamadas.length} ocorrências importadas e persistidas com sucesso!`);
  };

  const handleResetData = (novasChamadas: ChamadaAtiva[]) => {
    setChamadas(novasChamadas);
    setFiltros(FILTROS_PADRAO);
    exibirToast('Base de dados restaurada para o padrão oficial.');
  };

  const handleLocateOnMap = (chamada: ChamadaAtiva) => {
    setChamadaSelecionada(chamada);
    setModoVisualizacao('ambos');
    window.scrollTo({ top: 380, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-red-600 selection:text-white">
      {/* 1. Top Bar & PWA Header */}
      <Header
        onOpenImport={() => setIsImportOpen(true)}
        onOpenStreamlitBridge={() => setIsStreamlitBridgeOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onTriggerSync={handleTriggerSync}
        isSyncing={isSyncing}
        ultimaSync={ultimaSync}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-5 space-y-5">
        {/* Sub-header Operational Bar */}
        <div className="bg-gradient-to-r from-red-950/40 via-slate-900 to-slate-900 border border-slate-800 p-3.5 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md">
          {/* Status Indicator */}
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping shrink-0" />
            <div className="text-xs">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-200">
                  COBOM 193 CBMMG
                </span>
                <span className="bg-emerald-950/90 text-emerald-300 text-[10px] px-2 py-0.5 rounded border border-emerald-800/80 font-mono font-bold flex items-center gap-1">
                  <Server className="w-3 h-3 text-emerald-400" />
                  Proxy Nginx Ativo: cobom-cad.duckdns.org
                </span>
              </div>
              <div className="text-slate-400 text-[11px] mt-0.5">
                {chamadas.length > 0 ? (
                  <span>
                    <strong>{chamadas.length}</strong> chamadas ativas sincronizadas em Minas Gerais • 6 COBs integrados
                  </span>
                ) : (
                  <span>Conectando ao proxy reverso Nginx...</span>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            {/* Auto-Refresh 10 Min Countdown Control (Regra #3) */}
            <div className="flex items-center gap-1.5 bg-slate-950 px-2.5 py-1.5 rounded-lg border border-slate-800 text-xs shadow-inner">
              <Clock className="w-3.5 h-3.5 text-blue-400" />
              <span className="text-slate-400 hidden lg:inline">Ciclo 10 min:</span>
              <span className="font-mono font-bold text-amber-400">
                {autoRefreshAtivo
                  ? `${Math.floor(segundosRestantes / 60)}:${(segundosRestantes % 60).toString().padStart(2, '0')}`
                  : 'Pausado'}
              </span>
              <button
                onClick={() => setAutoRefreshAtivo((prev) => !prev)}
                className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition ml-0.5 cursor-pointer"
                title={autoRefreshAtivo ? 'Pausar contagem de 10 minutos' : 'Ativar atualização automática de 10 minutos'}
              >
                {autoRefreshAtivo ? (
                  <Pause className="w-3 h-3 text-amber-400" />
                ) : (
                  <Play className="w-3 h-3 text-emerald-400" />
                )}
              </button>
            </div>

            {/* Manual Proxy Sync Button */}
            <button
              onClick={() => executarSincronizacaoProxy(false)}
              disabled={isSyncing}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 border border-emerald-700/60 rounded-lg text-xs font-semibold transition cursor-pointer"
              title="Sincronizar imediatamente através do Proxy Reverso Nginx (respeitando intervalo mínimo de 30s)"
            >
              <RotateCcw className={`w-3.5 h-3.5 text-emerald-400 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Atualizando...' : 'Ler /ativos'}</span>
            </button>

            {/* View Mode Switcher */}
            <div className="flex items-center bg-slate-950 p-1 rounded-lg border border-slate-800">
              <button
                onClick={() => setModoVisualizacao('mapa')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs transition cursor-pointer ${
                  modoVisualizacao === 'mapa'
                    ? 'bg-red-600 text-white font-semibold shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Map className="w-3.5 h-3.5" />
                <span>Mapa</span>
              </button>
              <button
                onClick={() => setModoVisualizacao('graficos')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs transition cursor-pointer ${
                  modoVisualizacao === 'graficos'
                    ? 'bg-red-600 text-white font-semibold shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5" />
                <span>Indicadores</span>
              </button>
              <button
                onClick={() => setModoVisualizacao('ambos')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs transition cursor-pointer ${
                  modoVisualizacao === 'ambos'
                    ? 'bg-red-600 text-white font-semibold shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <span>Visão Dupla</span>
              </button>
            </div>
          </div>
        </div>

        {/* 2. Tactical KPI Cards */}
        <KPIGrid
          kpis={kpis}
          onFiltrarSituacao={(sit) => {
            if (sit === 'AO') {
              setFiltros({
                ...filtros,
                situacaoAtendimento: 'AO',
                situacaoChamada: 'TODOS',
              });
            } else if (sit === 'EM_ATENDIMENTO') {
              setFiltros({
                ...filtros,
                situacaoAtendimento: 'TODOS',
                situacaoChamada: 'E',
              });
            } else {
              setFiltros({
                ...filtros,
                situacaoChamada: sit,
                situacaoAtendimento: 'TODOS',
              });
            }
          }}
        />

        {/* 3. Operational Filter Controls */}
        <FiltersBar
          filtros={filtros}
          onChangeFiltros={setFiltros}
          onResetFiltros={() => setFiltros(FILTROS_PADRAO)}
          totalFiltrado={chamadasFiltradas.length}
          totalGeral={chamadas.length}
        />

        {/* 4. Interactive Map & Indicators Section */}
        {modoVisualizacao === 'ambos' ? (
          <div className="space-y-5">
            <OperationalMap
              chamadas={chamadasFiltradas}
              onSelectChamada={setChamadaSelecionada}
              unidadeSelecionada={filtros.cob}
            />
            <ChartsSection chamadas={chamadasFiltradas} />
          </div>
        ) : modoVisualizacao === 'mapa' ? (
          <OperationalMap
            chamadas={chamadasFiltradas}
            onSelectChamada={setChamadaSelecionada}
            unidadeSelecionada={filtros.cob}
          />
        ) : (
          <ChartsSection chamadas={chamadasFiltradas} />
        )}

        {/* 5. Detailed Calls Table with CSV Export */}
        <CallsTable
          chamadas={chamadasFiltradas}
          onSelectChamada={setChamadaSelecionada}
          onLocateOnMap={handleLocateOnMap}
        />
      </main>

      {/* Footer */}
      <footer className="bg-slate-950 border-t border-slate-900 py-6 text-xs text-slate-500 mt-10">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-red-500" />
            <span>
              Corpo de Bombeiros Militar de Minas Gerais (CBMMG) • Painel CAD Operacional PWA
            </span>
          </div>
          <div className="text-[11px] text-slate-500">
            Proxy Nginx: <strong>https://cobom-cad.duckdns.org</strong> • 3 Regras do Manual Cumpridas • Cache Local e Suporte Offline
          </div>
        </div>
      </footer>

      {/* Floating Notification Toast */}
      {toastNotificacao && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 border border-slate-700 text-slate-200 px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2.5 text-xs animate-in slide-in-from-bottom duration-200 max-w-md">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastNotificacao}</span>
        </div>
      )}

      {/* Offline Connectivity Banner */}
      <OfflineIndicator />

      {/* Modais Operacionais */}
      <CallDetailModal
        chamada={chamadaSelecionada}
        onClose={() => setChamadaSelecionada(null)}
      />

      <ImportModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        onImportSuccess={handleImportSuccess}
      />

      <StreamlitBridgeModal
        isOpen={isStreamlitBridgeOpen}
        onClose={() => setIsStreamlitBridgeOpen(false)}
      />

      <ApiSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onResetData={handleResetData}
        onTriggerSync={handleTriggerSync}
        isSyncing={isSyncing}
        ultimaSync={ultimaSync}
      />
    </div>
  );
}
