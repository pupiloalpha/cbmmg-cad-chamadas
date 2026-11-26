import React, { useState } from 'react';
import {
  carregarTodasTabelasAuxiliares,
  obterTotalNaturezasOficiaisCarregadas,
  obterTotalUnidadesOficiaisCarregadas,
  restaurarDadosPadrao,
  limparCacheOperacionalLocal,
} from '../services/cbmStorage';
import { ChamadaAtiva } from '../types/cbm';
import {
  ShieldCheck,
  CheckCircle2,
  RotateCcw,
  X,
  Lock,
  Radio,
  BookOpen,
  Database,
  RefreshCw,
  Trash2,
} from 'lucide-react';

interface ApiSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onResetData: (chamadas: ChamadaAtiva[]) => void;
  ultimaSync: string;
  onAuxiliaresUpdated?: () => void;
}

export const ApiSettingsModal: React.FC<ApiSettingsModalProps> = ({
  isOpen,
  onClose,
  onResetData,
  ultimaSync,
  onAuxiliaresUpdated,
}) => {
  const [carregandoAuxiliares, setCarregandoAuxiliares] = useState(false);
  const [statusAuxiliares, setStatusAuxiliares] = useState<string | null>(null);
  const [cacheLimpoMsg, setCacheLimpoMsg] = useState(false);
  const [totalNaturezas, setTotalNaturezas] = useState(() => obterTotalNaturezasOficiaisCarregadas());
  const [totalUnidades, setTotalUnidades] = useState(() => obterTotalUnidadesOficiaisCarregadas());
  const [confirmandoReset, setConfirmandoReset] = useState(false);

  if (!isOpen) return null;

  const handleCarregarTabelasAuxiliares = async () => {
    setCarregandoAuxiliares(true);
    setStatusAuxiliares(null);
    try {
      const res = await carregarTodasTabelasAuxiliares(true);
      if (res.sucesso) {
        setTotalNaturezas(res.totalNaturezas);
        setTotalUnidades(res.totalUnidades);
        onAuxiliaresUpdated?.();
        setStatusAuxiliares(
          `Tabelas auxiliares carregadas: ${res.totalNaturezas} naturezas CAD, ${res.totalUnidades} unidades CBMMG e dicionários operacionais atualizados.`
        );
      } else {
        setStatusAuxiliares(`Não foi possível obter as tabelas via gateway. O catálogo local continua em uso.`);
      }
    } catch (err: any) {
      setStatusAuxiliares(`Erro ao carregar tabelas auxiliares: ${err.message}`);
    } finally {
      setCarregandoAuxiliares(false);
    }
  };

  const handleLimparCacheSessao = () => {
    limparCacheOperacionalLocal();
    const dados = restaurarDadosPadrao();
    onResetData(dados);
    setCacheLimpoMsg(true);
    setTimeout(() => setCacheLimpoMsg(false), 3000);
  };

  const handleResetar = () => {
    limparCacheOperacionalLocal();
    const dados = restaurarDadosPadrao();
    onResetData(dados);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <img
              src={`${import.meta.env.BASE_URL}assets/aistudio/LogoCorpoDeBombeiros_57dfdd49.png`}
              alt="CBMMG"
              className="w-8 h-8 object-contain shrink-0"
            />
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Configurações da API CAD CBMMG
              </h3>
              <p className="text-[11px] text-slate-400">
                Gateway Seguro, Privacidade LGPD e Tabelas Auxiliares
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-5 space-y-4 text-xs font-sans overflow-y-auto">
          {/* Information Banner */}
          <div className="bg-gradient-to-r from-emerald-950/40 via-slate-950 to-slate-950 border border-emerald-900/60 p-3.5 rounded-xl space-y-2 text-slate-300">
            <div className="font-bold text-emerald-400 flex items-center gap-1.5 text-xs">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Arquitetura Blindada e Conformidade CAD CBMMG</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
              <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800">
                <span className="font-semibold text-emerald-300 block">Isolamento de Origem</span>
                <span className="text-slate-400">
                  Credenciais e endereço da origem permanecem protegidos no servidor. O navegador consome apenas o gateway seguro.
                </span>
              </div>
              <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800">
                <span className="font-semibold text-emerald-300 block">Sanitização & Cadência</span>
                <span className="text-slate-400">
                  Dados pessoais de solicitantes são descartados na borda antes do cache compartilhado (ciclo 10 min / ≥30s).
                </span>
              </div>
            </div>
          </div>

          {/* Read-Only Gateway Status */}
          <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 shrink-0">
                <Lock className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-slate-200 font-semibold">Gateway da API Fixo (Somente Borda)</div>
                <div className="text-[11px] font-mono text-slate-400 truncate">
                  /api/cbm/* • Bloqueio geográfico BR ativo
                </div>
              </div>
            </div>
            <span className="px-2 py-1 rounded bg-emerald-950/70 border border-emerald-800/60 text-emerald-300 text-[10px] font-bold uppercase shrink-0">
              Protegido
            </span>
          </div>

          {/* Single Section: Tabelas Auxiliares */}
          <div className="p-4 bg-slate-950/90 rounded-xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between text-slate-200">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-emerald-400" />
                <span className="font-semibold text-sm">Tabelas Auxiliares do CAD</span>
              </div>
              <span className="text-[11px] font-mono text-slate-400 flex items-center gap-1">
                <Radio className="w-2.5 h-2.5 text-emerald-400 animate-pulse" />
                Sync: {new Date(ultimaSync).toLocaleTimeString('pt-BR')}
              </span>
            </div>

            <p className="text-[11px] text-slate-400 leading-relaxed">
              Carrega via gateway seguro as tabelas oficiais de naturezas (<code>/api/cbm/naturezas</code>), unidades de serviço (<code>/api/cbm/unidades-servico</code>) e códigos operacionais (<code>/api/cbm/codigos</code>).
            </p>

            <div className="bg-slate-900 p-3 rounded-lg border border-slate-800 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs">
                <BookOpen className="w-4 h-4 text-blue-400 shrink-0" />
                <div>
                  <div className="font-semibold text-slate-200">Tabelas Oficiais em Memória</div>
                  <div className="text-[11px] text-slate-400">
                    Naturezas: <strong className="text-emerald-400 font-mono">{totalNaturezas || 2245}</strong> • Unidades CBMMG: <strong className="text-emerald-400 font-mono">{totalUnidades || 588}</strong>
                  </div>
                </div>
              </div>

              {/* Botão Único de Carregar Tabelas Auxiliares */}
              <button
                onClick={handleCarregarTabelasAuxiliares}
                disabled={carregandoAuxiliares}
                className="flex items-center gap-2 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg font-semibold transition cursor-pointer shadow-md text-xs shrink-0"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${carregandoAuxiliares ? 'animate-spin' : ''}`} />
                <span>{carregandoAuxiliares ? 'Carregando...' : 'Atualizar Tabelas'}</span>
              </button>
            </div>

            {statusAuxiliares && (
              <div className="text-[11px] text-slate-200 bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                {statusAuxiliares}
              </div>
            )}
          </div>

          {/* Local Data Hygiene & Reset */}
          <div className="pt-2 border-t border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <div>
                <div className="text-[11px] font-semibold text-slate-300">
                  Higiene de Dados em Estação Compartilhada
                </div>
                <div className="text-[11px] text-slate-500">
                  Remove imediatamente ocorrências e recursos salvos no navegador (TTL padrão: 12h).
                </div>
              </div>
              <button
                type="button"
                onClick={handleLimparCacheSessao}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-red-950/70 text-red-300 border border-slate-700 hover:border-red-700/70 rounded-lg text-[11px] font-semibold transition cursor-pointer shrink-0"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Limpar Cache Local</span>
              </button>
            </div>

            {cacheLimpoMsg && (
              <div className="text-emerald-400 text-[11px] flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Dados operacionais removidos do armazenamento local do navegador.
              </div>
            )}

            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] text-slate-500">
                Restaurar base de demonstração:
              </span>
              {confirmandoReset ? (
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-amber-300 font-medium">Confirmar?</span>
                  <button
                    onClick={handleResetar}
                    className="px-2.5 py-1 bg-red-600 hover:bg-red-500 text-white rounded text-[11px] font-bold cursor-pointer"
                  >
                    Sim
                  </button>
                  <button
                    onClick={() => setConfirmandoReset(false)}
                    className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[11px] cursor-pointer"
                  >
                    Não
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmandoReset(true)}
                  className="text-amber-400 hover:text-amber-300 font-medium flex items-center gap-1 text-[11px] cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Restaurar Base</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-950 border-t border-slate-800 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg transition cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
