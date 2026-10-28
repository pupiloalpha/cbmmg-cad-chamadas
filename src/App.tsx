import React, { useState, useEffect, useMemo, useRef } from 'react';
import { ChamadaAtiva, FiltrosOperacionais } from './types/cbm';
import {
  carregarChamadasArmazenadas,
  salvarChamadasArmazenadas,
  filtrarChamadas,
  calcularKPIs,
  obterUltimaSync,
  obterTokenSalvo,
  sincronizarAgenteLocal,
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
  Radio,
  RefreshCw,
  CheckCircle2,
  Clock,
  Play,
  Pause,
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

const INTERVALO_REFRESH_SEGUNDOS = 600; // 10 minutos conforme solicitado

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

  // Ciclo Automático de 10 minutos
  const [autoRefreshAtivo, setAutoRefreshAtivo] = useState(true);
  const [segundosRestantes, setSegundosRestantes] = useState(INTERVALO_REFRESH_SEGUNDOS);

  // Inicializar dados do cache persistente
  useEffect(() => {
    const dados = carregarChamadasArmazenadas();
    setChamadas(dados);
  }, []);

  const exibirToast = (msg: string) => {
    setToastNotificacao(msg);
    setTimeout(() => setToastNotificacao(null), 4000);
  };

  // Execução da sincronização periódica (tenta Agente Local -> Proxy API -> Snapshot Estático)
  const executarSincronizacaoPeriodica = async () => {
    setIsSyncing(true);
    let atualizado = false;

    // 1. Tentar primeiro o Agente Local (127.0.0.1:8080)
    try {
      const resLocal = await sincronizarAgenteLocal();
      if (resLocal.sucesso && resLocal.dados && resLocal.dados.length > 0) {
        setChamadas(resLocal.dados);
        setUltimaSync(new Date().toISOString());
        exibirToast(`🔄 Auto-refresh (10 min): ${resLocal.dados.length} ocorrências sincronizadas via Agente Local.`);
        atualizado = true;
      }
    } catch {
      // Ignora e tenta próxima fonte
    }

    // 2. Se local não respondeu, tentar proxy da API (se token configurado)
    if (!atualizado) {
      try {
        const token = obterTokenSalvo();
        if (token) {
          const res = await fetch('/api/cbm/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token }),
          });
          const data = await res.json();
          if (data.sucesso && data.dados) {
            const arr = Array.isArray(data.dados) ? data.dados : (data.dados.chamadas || []);
            if (arr.length > 0) {
              setChamadas(arr);
              setUltimaSync(new Date().toISOString());
              exibirToast(`🔄 Auto-refresh (10 min): Sincronizado com API CAD.`);
              atualizado = true;
            }
          }
        }
      } catch {
        // Ignora e tenta snapshot
      }
    }

    // 3. Fallback: Recarrega snapshot estático
    if (!atualizado) {
      try {
        const resSnap = await sincronizarSnapshotEstatico();
        if (resSnap.sucesso && resSnap.dados && resSnap.dados.length > 0) {
          setChamadas(resSnap.dados);
          setUltimaSync(new Date().toISOString());
          exibirToast(`🔄 Auto-refresh (10 min): Dados operacionais atualizados.`);
          atualizado = true;
        }
      } catch {
        // Mantém dados existentes
      }
    }

    setIsSyncing(false);
    setSegundosRestantes(INTERVALO_REFRESH_SEGUNDOS);
  };

  // Timer regressivo de 10 minutos
  useEffect(() => {
    if (!autoRefreshAtivo) return;

    const timer = setInterval(() => {
      setSegundosRestantes((prev) => {
        if (prev <= 1) {
          executarSincronizacaoPeriodica();
          return INTERVALO_REFRESH_SEGUNDOS;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [autoRefreshAtivo]);

  // Filtragem dos dados
  const chamadasFiltradas = useMemo(() => {
    return filtrarChamadas(chamadas, filtros);
  }, [chamadas, filtros]);

  // Cálculo de KPIs
  const kpis = useMemo(() => {
    return calcularKPIs(chamadasFiltradas);
  }, [chamadasFiltradas]);

  // Disparar sincronização manual
  const handleTriggerSync = async () => {
    await executarSincronizacaoPeriodica();
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
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping shrink-0" />
            <div className="text-xs">
              <span className="font-semibold text-slate-200">
                Central de Operações CBMMG (COBOM 193)
              </span>
              <span className="text-slate-500 mx-1.5">•</span>
              <span className="text-slate-400">
                Minas Gerais: <strong>6 Comandos Operacionais (COBs)</strong> integrados
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            {/* Auto-Refresh 10 Min Countdown Control */}
            <div className="flex items-center gap-1.5 bg-slate-950 px-2.5 py-1.5 rounded-lg border border-slate-800 text-xs shadow-inner">
              <Clock className="w-3.5 h-3.5 text-blue-400" />
              <span className="text-slate-400 hidden lg:inline">Ciclo 10 min:</span>
              <span className="font-mono font-bold text-amber-400">
                {autoRefreshAtivo ? `${Math.floor(segundosRestantes / 60)}:${(segundosRestantes % 60).toString().padStart(2, '0')}` : 'Pausado'}
              </span>
              <button
                onClick={() => setAutoRefreshAtivo((prev) => !prev)}
                className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition ml-0.5 cursor-pointer"
                title={autoRefreshAtivo ? 'Pausar contagem de 10 minutos' : 'Ativar atualização automática de 10 minutos'}
              >
                {autoRefreshAtivo ? <Pause className="w-3 h-3 text-amber-400" /> : <Play className="w-3 h-3 text-emerald-400" />}
              </button>
            </div>

            {/* Quick Local Agent Sync Button */}
            <button
              onClick={async () => {
                setIsSyncing(true);
                const res = await sincronizarAgenteLocal();
                exibirToast(res.mensagem);
                if (res.sucesso && res.dados) {
                  setChamadas(res.dados);
                  setUltimaSync(new Date().toISOString());
                }
                setIsSyncing(false);
              }}
              disabled={isSyncing}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 border border-emerald-700/60 rounded-lg text-xs font-semibold transition cursor-pointer"
              title="Sincronizar diretamente com o agente Python local (http://127.0.0.1:8080)"
            >
              <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
              <span>Agente Local</span>
            </button>

            {/* View Mode Switcher */}
            <div className="flex items-center bg-slate-950 p-1 rounded-lg border border-slate-800">
              <button
                onClick={() => setModoVisualizacao('mapa')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs transition ${
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
                className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs transition ${
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
                className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs transition ${
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
          onFiltrarSituacao={(sit) =>
            setFiltros({
              ...filtros,
              situacaoChamada: sit,
            })
          }
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
            Em conformidade com o Manual de Integração API CAD • Cache Local e Suporte Offline Ativos
          </div>
        </div>
      </footer>

      {/* Floating Notification Toast */}
      {toastNotificacao && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 border border-slate-700 text-slate-200 px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2.5 text-xs animate-in slide-in-from-bottom duration-200">
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
