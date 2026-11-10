import React, { useState } from 'react';
import {
  obterProxyUrl,
  salvarProxyUrl,
  PROXY_REVERSO_PADRAO,
  carregarTodasTabelasAuxiliares,
  obterTotalNaturezasOficiaisCarregadas,
  restaurarDadosPadrao,
} from '../services/cbmStorage';
import { ChamadaAtiva } from '../types/cbm';
import {
  ShieldCheck,
  CheckCircle2,
  RotateCcw,
  X,
  Globe,
  Radio,
  BookOpen,
  Database,
  RefreshCw,
} from 'lucide-react';

interface ApiSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onResetData: (chamadas: ChamadaAtiva[]) => void;
  ultimaSync: string;
}

export const ApiSettingsModal: React.FC<ApiSettingsModalProps> = ({
  isOpen,
  onClose,
  onResetData,
  ultimaSync,
}) => {
  const [proxyUrlInput, setProxyUrlInput] = useState(() => obterProxyUrl());
  const [salvoMsg, setSalvoMsg] = useState(false);
  const [carregandoAuxiliares, setCarregandoAuxiliares] = useState(false);
  const [statusAuxiliares, setStatusAuxiliares] = useState<string | null>(null);
  const [totalNaturezas, setTotalNaturezas] = useState(() => obterTotalNaturezasOficiaisCarregadas());
  const [confirmandoReset, setConfirmandoReset] = useState(false);

  if (!isOpen) return null;

  const handleSalvarProxy = () => {
    salvarProxyUrl(proxyUrlInput.trim() || PROXY_REVERSO_PADRAO);
    setSalvoMsg(true);
    setTimeout(() => setSalvoMsg(false), 2500);
  };

  const handleRestaurarProxyPadrao = () => {
    setProxyUrlInput(PROXY_REVERSO_PADRAO);
    salvarProxyUrl(PROXY_REVERSO_PADRAO);
    setSalvoMsg(true);
    setTimeout(() => setSalvoMsg(false), 2500);
  };

  const handleCarregarTabelasAuxiliares = async () => {
    setCarregandoAuxiliares(true);
    setStatusAuxiliares(null);
    try {
      const res = await carregarTodasTabelasAuxiliares(true);
      if (res.sucesso) {
        setTotalNaturezas(res.totalNaturezas);
        setStatusAuxiliares(
          `✅ Tabelas auxiliares carregadas com sucesso! ${res.totalNaturezas} naturezas CAD registradas e dicionários de situações operacionais atualizados.`
        );
      } else {
        setStatusAuxiliares(`⚠️ Não foi possível obter as tabelas via proxy. O catálogo local continua em uso.`);
      }
    } catch (err: any) {
      setStatusAuxiliares(`❌ Erro ao carregar tabelas auxiliares: ${err.message}`);
    } finally {
      setCarregandoAuxiliares(false);
    }
  };

  const handleResetar = () => {
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
                Integração via Proxy Seguro e Tabelas Auxiliares
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
              <span>Padrões de Comunicação do Manual CAD CBMMG</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
              <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800">
                <span className="font-semibold text-emerald-300 block">Autenticação no Servidor</span>
                <span className="text-slate-400">
                  Token Bearer injetado exclusivamente pelo Nginx. O frontend não expõe credenciais.
                </span>
              </div>
              <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800">
                <span className="font-semibold text-emerald-300 block">Cadência das Chamadas</span>
                <span className="text-slate-400">
                  Ciclo de 10 min automático com intervalo de segurança mínimo de 30 segundos.
                </span>
              </div>
            </div>
          </div>

          {/* Proxy URL Configuration */}
          <div className="space-y-1.5">
            <label className="block text-slate-300 font-semibold flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-blue-400" />
                URL do Proxy Reverso Nginx
              </span>
              <button
                type="button"
                onClick={handleRestaurarProxyPadrao}
                className="text-[11px] text-amber-400 hover:text-amber-300 underline cursor-pointer"
              >
                Restaurar padrão ({PROXY_REVERSO_PADRAO})
              </button>
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={proxyUrlInput}
                onChange={(e) => setProxyUrlInput(e.target.value)}
                placeholder="https://cobom-cad.duckdns.org"
                className="flex-1 bg-slate-950 border border-slate-700 focus:border-emerald-500 rounded-lg px-3 py-2 text-slate-200 font-mono text-xs focus:outline-none"
              />
              <button
                onClick={handleSalvarProxy}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-lg transition cursor-pointer"
              >
                Salvar
              </button>
            </div>
            {salvoMsg && (
              <span className="text-emerald-400 text-[11px] flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                URL do proxy atualizada com sucesso.
              </span>
            )}
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
              Carrega diretamente da API CAD a tabela oficial de naturezas (<code>/dados-auxiliares/naturezas</code> com mais de 2.200 tipos de atendimento cadastrados) e as tabelas de códigos de situação de chamadas e empenho de viaturas/recursos (<code>/codigos</code>).
            </p>

            <div className="bg-slate-900 p-3 rounded-lg border border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs">
                <BookOpen className="w-4 h-4 text-blue-400 shrink-0" />
                <div>
                  <div className="font-semibold text-slate-200">Naturezas Oficiais em Memória</div>
                  <div className="text-[11px] text-slate-400">
                    Total ativo: <strong className="text-emerald-400 font-mono">{totalNaturezas || 2245}</strong> naturezas mapeadas
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
                <span>{carregandoAuxiliares ? 'Carregando...' : 'Carregar Tabelas Auxiliares'}</span>
              </button>
            </div>

            {statusAuxiliares && (
              <div className="text-[11px] text-slate-200 bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                {statusAuxiliares}
              </div>
            )}
          </div>

          {/* Reset Action */}
          <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
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
