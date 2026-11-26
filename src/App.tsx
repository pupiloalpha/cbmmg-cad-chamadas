import React, { useState, useEffect, useMemo } from 'react';
import { ChamadaAtiva, FiltrosOperacionais, RecursoCadAtivo } from './types/cbm';
import {
  carregarChamadasArmazenadas,
  carregarRecursosArmazenados,
  salvarChamadasArmazenadas,
  salvarRecursosArmazenados,
  reconciliarUnidadesRecursos,
  filtrarChamadas,
  filtrarRecursosBase,
  filtrarRecursosParaExportacao,
  calcularKPIs,
  calcularResumoRecursosBase,
  obterUltimaSync,
  sincronizarProxyReverso,
  sincronizarTabelaNaturezas,
  sincronizarTabelaUnidadesServico,
  normalizarChamadaSids,
} from './services/cbmStorage';
import { Header, ModoVisualizacao } from './components/Header';
import { KPIGrid } from './components/KPIGrid';
import { FiltersBar } from './components/FiltersBar';
import { OperationalMap } from './components/OperationalMap';
import { ChartsSection } from './components/ChartsSection';
import { CallsTable } from './components/CallsTable';
import { CallDetailModal } from './components/CallDetailModal';
import { ApiSettingsModal } from './components/ApiSettingsModal';
import { OfflineIndicator } from './components/OfflineIndicator';
import {
  Map,
  BarChart3,
  LayoutGrid,
  Shield,
  CheckCircle2,
  List,
} from 'lucide-react';

const FILTROS_PADRAO: FiltrosOperacionais = {
  cobs: [],
  bbms: [],
  ciasInd: [],
  naturezas: [],
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
  filtroChuva: 'TODOS',
  termoBusca: '',
};

const INTERVALO_REFRESH_SEGUNDOS = 600; // 10 minutos conforme Regra #3 do manual CBMMG

export default function App() {
  const [chamadas, setChamadas] = useState<ChamadaAtiva[]>([]);
  const [recursosBase, setRecursosBase] = useState<RecursoCadAtivo[]>([]);
  const [filtros, setFiltros] = useState<FiltrosOperacionais>(FILTROS_PADRAO);
  const [chamadaSelecionada, setChamadaSelecionada] = useState<ChamadaAtiva | null>(null);

  // Modais
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Sincronização & Estado
  const [isSyncing, setIsSyncing] = useState(false);
  const [ultimaSync, setUltimaSync] = useState(obterUltimaSync());
  const [modoVisualizacao, setModoVisualizacao] = useState<ModoVisualizacao>('ambos');
  const [isMobile, setIsMobile] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.innerWidth < 768 : false
  );
  const [toastNotificacao, setToastNotificacao] = useState<string | null>(null);
  const [naturezasVersion, setNaturezasVersion] = useState(0);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(max-width: 767px)');
    const onChange = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    setIsMobile(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  // Ciclo Automático de 10 minutos (Regra #3)
  const [autoRefreshAtivo, setAutoRefreshAtivo] = useState(true);
  const [segundosRestantes, setSegundosRestantes] = useState(INTERVALO_REFRESH_SEGUNDOS);

  const exibirToast = (msg: string) => {
    setToastNotificacao(msg);
    setTimeout(() => setToastNotificacao(null), 5000);
  };

  // Sincronização centralizada via Gateway Seguro (/api/cbm/sync)
  const executarSincronizacaoProxy = async (forcar = false) => {
    setIsSyncing(true);
    try {
      const res = await sincronizarProxyReverso(forcar);
      if (res.recursos && res.recursos.length > 0) {
        setRecursosBase(res.recursos);
      }
      if (res.sucesso && res.dados && res.dados.length > 0) {
        setChamadas(res.dados);
        setNaturezasVersion((v) => v + 1);
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

  // Inicializar dados: carrega cache persistente, tabela oficial de naturezas CAD (2.245 registros) e sincroniza com proxy
  useEffect(() => {
    const dadosIniciais = carregarChamadasArmazenadas();
    if (dadosIniciais && dadosIniciais.length > 0) {
      setChamadas(dadosIniciais);
    }

    const recursosIniciais = carregarRecursosArmazenados();
    if (recursosIniciais.length > 0) {
      setRecursosBase(recursosIniciais);
    }

    // Carrega tabelas oficiais de naturezas e unidades de serviço do CAD
    Promise.all([
      sincronizarTabelaNaturezas(false),
      sincronizarTabelaUnidadesServico(false),
    ])
      .then(([resNat, resUn]) => {
        if ((resNat.sucesso && resNat.total > 0) || (resUn.sucesso && resUn.total > 0)) {
          setNaturezasVersion((v) => v + 1);
          setChamadas((prev) => {
            const atualizadas = prev.map((c) => normalizarChamadaSids(c));
            salvarChamadasArmazenadas(atualizadas);
            return atualizadas;
          });
          setRecursosBase((prev) => {
            if (prev.length === 0) return prev;
            const atualizados = reconciliarUnidadesRecursos(prev);
            salvarRecursosArmazenados(atualizados);
            return atualizados;
          });
        }
      })
      .catch(() => {});

    // Dispara leitura das chamadas ativas via proxy reverso
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

  // Filtragem dos recursos cadastrados na base (escopo de comando/unidade)
  const recursosFiltrados = useMemo(() => {
    return filtrarRecursosBase(recursosBase, filtros);
  }, [recursosBase, filtros]);

  // Recortes de recursos para exportação CSV conforme filtros ativos
  const recursosParaExportacao = useMemo(() => {
    return filtrarRecursosParaExportacao(recursosBase, chamadas, chamadasFiltradas, filtros, false);
  }, [recursosBase, chamadas, chamadasFiltradas, filtros]);

  const recursosEmpenhadosFiltrados = useMemo(() => {
    return filtrarRecursosParaExportacao(recursosBase, chamadas, chamadasFiltradas, filtros, true);
  }, [recursosBase, chamadas, chamadasFiltradas, filtros]);

  // Cálculo de KPIs e Resumo da Base de Recursos
  const kpis = useMemo(() => {
    return calcularKPIs(chamadasFiltradas);
  }, [chamadasFiltradas]);

  const resumoRecursos = useMemo(() => {
    return calcularResumoRecursosBase(recursosFiltrados);
  }, [recursosFiltrados]);

  // Disparar sincronização manual
  const handleTriggerSync = async () => {
    await executarSincronizacaoProxy(false);
  };

  const handleResetData = (novasChamadas: ChamadaAtiva[]) => {
    setChamadas(novasChamadas);
    setFiltros(FILTROS_PADRAO);
    exibirToast('Base de dados restaurada para o padrão oficial.');
  };

  const handleLocateOnMap = (chamada: ChamadaAtiva) => {
    setChamadaSelecionada(chamada);
    if (isMobile) {
      setModoVisualizacao('mapa');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      setModoVisualizacao('ambos');
      window.scrollTo({ top: 380, behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-red-600 selection:text-white">
      {/* 1. Top Bar & PWA Header */}
      <Header
        onOpenSettings={() => setIsSettingsOpen(true)}
        onTriggerSync={handleTriggerSync}
        isSyncing={isSyncing}
        totalChamadas={chamadas.length}
        modoVisualizacao={modoVisualizacao}
        onChangeModoVisualizacao={setModoVisualizacao}
        autoRefreshAtivo={autoRefreshAtivo}
        onToggleAutoRefresh={() => setAutoRefreshAtivo((prev) => !prev)}
        segundosRestantes={segundosRestantes}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 pt-3 sm:pt-4 pb-20 md:pb-6 space-y-4">
        {/* 2. Tactical KPI Cards (Desktop sempre; Mobile apenas na aba Geral) */}
        {(!isMobile || modoVisualizacao === 'ambos') && (
          <KPIGrid
            kpis={kpis}
            resumoRecursos={resumoRecursos}
            filtros={filtros}
            onFiltrarSituacao={(sit) => {
              if (sit === 'AO') {
                const ativo = filtros.situacaoAtendimento === 'AO';
                setFiltros({
                  ...filtros,
                  situacaoAtendimento: ativo ? 'TODOS' : 'AO',
                  situacaoChamada: 'TODOS',
                });
              } else if (sit === 'EM_ATENDIMENTO') {
                const ativo = filtros.situacaoChamada === 'E';
                setFiltros({
                  ...filtros,
                  situacaoAtendimento: 'TODOS',
                  situacaoChamada: ativo ? 'TODOS' : 'E',
                });
              } else if (sit === 'PRIORIDADE_ALTA') {
                const ativo = filtros.prioridade === 'Alta';
                setFiltros({
                  ...filtros,
                  prioridade: ativo ? 'TODOS' : 'Alta',
                });
              } else if (sit === 'CHUVA') {
                const ativo = filtros.filtroChuva && filtros.filtroChuva !== 'TODOS';
                setFiltros({
                  ...filtros,
                  filtroChuva: ativo ? 'TODOS' : 'AMPLO',
                });
              } else if (sit === 'GRUPO_O' || sit === 'GRUPO_S' || sit === 'GRUPO_V') {
                const letra = sit.replace('GRUPO_', '');
                const jaAtivo =
                  filtros.naturezas &&
                  filtros.naturezas.length === 1 &&
                  filtros.naturezas[0].toUpperCase() === letra;
                setFiltros({
                  ...filtros,
                  naturezas: jaAtivo ? [] : [letra],
                  naturezaGrupo: jaAtivo ? 'TODOS' : letra,
                });
              } else {
                setFiltros({
                  ...filtros,
                  situacaoChamada: 'TODOS',
                  situacaoAtendimento: 'TODOS',
                  prioridade: 'TODOS',
                  filtroChuva: 'TODOS',
                  naturezas: [],
                  naturezaGrupo: 'TODOS',
                });
              }
            }}
          />
        )}

        {/* 3. Operational Filter Controls (Desktop sempre; Mobile apenas na aba Geral) */}
        {(!isMobile || modoVisualizacao === 'ambos') && (
          <FiltersBar
            filtros={filtros}
            onChangeFiltros={setFiltros}
            onResetFiltros={() => setFiltros(FILTROS_PADRAO)}
            totalFiltrado={chamadasFiltradas.length}
            totalGeral={chamadas.length}
            chamadas={chamadas}
            naturezasVersion={naturezasVersion}
          />
        )}

        {/* 4. Interactive Map & Indicators Section */}
        {isMobile ? (
          <>
            {modoVisualizacao === 'mapa' && (
              <OperationalMap
                chamadas={chamadasFiltradas}
                onSelectChamada={setChamadaSelecionada}
                unidadeSelecionada={filtros.cob}
              />
            )}
            {modoVisualizacao === 'graficos' && (
              <ChartsSection
                chamadas={chamadasFiltradas}
                chamadasTodas={chamadas}
                resumoRecursos={resumoRecursos}
                recursos={recursosParaExportacao}
              />
            )}
            {modoVisualizacao === 'lista' && (
              <CallsTable
                chamadas={chamadasFiltradas}
                chamadasTodas={chamadas}
                recursos={recursosParaExportacao}
                recursosEmpenhados={recursosEmpenhadosFiltrados}
                onSelectChamada={setChamadaSelecionada}
                onLocateOnMap={handleLocateOnMap}
              />
            )}
          </>
        ) : (
          <>
            {modoVisualizacao === 'ambos' || modoVisualizacao === 'lista' ? (
              <div className="space-y-5">
                <OperationalMap
                  chamadas={chamadasFiltradas}
                  onSelectChamada={setChamadaSelecionada}
                  unidadeSelecionada={filtros.cob}
                />
                <ChartsSection
                  chamadas={chamadasFiltradas}
                  chamadasTodas={chamadas}
                  resumoRecursos={resumoRecursos}
                  recursos={recursosParaExportacao}
                />
              </div>
            ) : modoVisualizacao === 'mapa' ? (
              <OperationalMap
                chamadas={chamadasFiltradas}
                onSelectChamada={setChamadaSelecionada}
                unidadeSelecionada={filtros.cob}
              />
            ) : (
              <ChartsSection
                chamadas={chamadasFiltradas}
                chamadasTodas={chamadas}
                resumoRecursos={resumoRecursos}
                recursos={recursosParaExportacao}
              />
            )}

            {/* 5. Detailed Calls Table with CSV Export (Desktop) */}
            <CallsTable
              chamadas={chamadasFiltradas}
              chamadasTodas={chamadas}
              recursos={recursosParaExportacao}
              recursosEmpenhados={recursosEmpenhadosFiltrados}
              onSelectChamada={setChamadaSelecionada}
              onLocateOnMap={handleLocateOnMap}
            />
          </>
        )}
      </main>

      {/* Footer (Desktop) */}
      <footer className="hidden md:block bg-slate-950 border-t border-slate-900 py-5 text-xs text-slate-500 mt-8">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-center sm:text-left">
          <div className="flex items-center gap-2">
            <Shield className="w-3.5 h-3.5 text-red-500" />
            <span>
              Corpo de Bombeiros Militar de Minas Gerais (CBMMG) • Painel CAD
            </span>
          </div>
          <div className="text-[11px] text-slate-500">
            Cache local offline • Atualização automática a cada 10 min
          </div>
        </div>
      </footer>

      {/* Mobile PWA Bottom Navigation Bar */}
      <nav
        aria-label="Navegação rápida"
        className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-slate-950/95 backdrop-blur-md border-t border-slate-800/90 px-2 pt-1.5 pb-[max(0.45rem,env(safe-area-inset-bottom))] flex items-center justify-around text-[11px]"
      >
        <button
          type="button"
          onClick={() => {
            setModoVisualizacao('ambos');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className={`flex-1 flex flex-col items-center gap-0.5 py-1 rounded-lg transition cursor-pointer ${
            modoVisualizacao === 'ambos' ? 'text-white font-semibold' : 'text-slate-400'
          }`}
        >
          <LayoutGrid className={`w-4 h-4 ${modoVisualizacao === 'ambos' ? 'text-red-400' : ''}`} />
          <span>Geral</span>
        </button>
        <button
          type="button"
          onClick={() => {
            setModoVisualizacao('mapa');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className={`flex-1 flex flex-col items-center gap-0.5 py-1 rounded-lg transition cursor-pointer ${
            modoVisualizacao === 'mapa' ? 'text-white font-semibold' : 'text-slate-400'
          }`}
        >
          <Map className={`w-4 h-4 ${modoVisualizacao === 'mapa' ? 'text-red-400' : ''}`} />
          <span>Mapa</span>
        </button>
        <button
          type="button"
          onClick={() => {
            setModoVisualizacao('graficos');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className={`flex-1 flex flex-col items-center gap-0.5 py-1 rounded-lg transition cursor-pointer ${
            modoVisualizacao === 'graficos' ? 'text-white font-semibold' : 'text-slate-400'
          }`}
        >
          <BarChart3 className={`w-4 h-4 ${modoVisualizacao === 'graficos' ? 'text-red-400' : ''}`} />
          <span>Indicadores</span>
        </button>
        <button
          type="button"
          onClick={() => {
            setModoVisualizacao('lista');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className={`flex-1 flex flex-col items-center gap-0.5 py-1 rounded-lg transition cursor-pointer ${
            modoVisualizacao === 'lista' ? 'text-white font-semibold' : 'text-slate-400'
          }`}
        >
          <List className={`w-4 h-4 ${modoVisualizacao === 'lista' ? 'text-red-400' : ''}`} />
          <span>Lista ({chamadasFiltradas.length})</span>
        </button>
      </nav>

      {/* Floating Notification Toast */}
      {toastNotificacao && (
        <div className="fixed bottom-20 md:bottom-5 right-3 sm:right-5 z-50 bg-slate-900 border border-slate-700 text-slate-200 px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2.5 text-xs animate-in slide-in-from-bottom duration-200 max-w-[calc(100vw-1.5rem)] sm:max-w-md">
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

      <ApiSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onResetData={handleResetData}
        ultimaSync={ultimaSync}
        onAuxiliaresUpdated={() => {
          setNaturezasVersion((v) => v + 1);
          setChamadas((prev) => {
            const atualizadas = prev.map((c) => normalizarChamadaSids(c));
            salvarChamadasArmazenadas(atualizadas);
            return atualizadas;
          });
          setRecursosBase((prev) => {
            if (prev.length === 0) return prev;
            const atualizados = reconciliarUnidadesRecursos(prev);
            salvarRecursosArmazenados(atualizados);
            return atualizados;
          });
        }}
      />
    </div>
  );
}
