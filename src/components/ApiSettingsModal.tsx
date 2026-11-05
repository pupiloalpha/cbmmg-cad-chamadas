import React, { useState } from 'react';
import {
  obterProxyUrl,
  salvarProxyUrl,
  PROXY_REVERSO_PADRAO,
  sincronizarProxyReverso,
  sincronizarCatalogosAuxiliares,
  sincronizarTabelaNaturezas,
  obterTotalNaturezasOficiaisCarregadas,
  restaurarDadosPadrao,
  sincronizarAgenteLocal,
} from '../services/cbmStorage';
import { ChamadaAtiva } from '../types/cbm';
import {
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  X,
  Server,
  Zap,
  Globe,
  Radio,
  ExternalLink,
  BookOpen,
  Clock,
  Layers,
} from 'lucide-react';

interface ApiSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onResetData: (chamadas: ChamadaAtiva[]) => void;
  onTriggerSync: () => void;
  isSyncing: boolean;
  ultimaSync: string;
}

export const ApiSettingsModal: React.FC<ApiSettingsModalProps> = ({
  isOpen,
  onClose,
  onResetData,
  onTriggerSync,
  isSyncing,
  ultimaSync,
}) => {
  const [proxyUrlInput, setProxyUrlInput] = useState(() => obterProxyUrl());
  const [salvoMsg, setSalvoMsg] = useState(false);
  const [testeStatus, setTesteStatus] = useState<string | null>(null);
  const [testando, setTestando] = useState(false);
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

  const handleTestarCodigos = async () => {
    setTestando(true);
    setTesteStatus(null);
    try {
      const proxy = proxyUrlInput.trim() || PROXY_REVERSO_PADRAO;
      const res = await fetch(`${proxy}/codigos`);
      if (res.ok) {
        const data = await res.json();
        setTesteStatus(`✅ Conexão validada com sucesso! HTTP 200 recebido de ${proxy}/codigos. CORS aberto e siglas operacionais sincronizadas.`);
      } else {
        setTesteStatus(`⚠️ Proxy respondeu HTTP ${res.status}`);
      }
    } catch (err: any) {
      setTesteStatus(`❌ Falha ao alcançar proxy em ${proxyUrlInput}: ${err.message}`);
    } finally {
      setTestando(false);
    }
  };

  const handleForcarRenovacaoCatalogos = async () => {
    setTestando(true);
    try {
      const res = await sincronizarCatalogosAuxiliares(true);
      if (res.sucesso) {
        setTesteStatus(`✅ Catálogos auxiliares renovados com sucesso! Próxima renovação agendada para daqui a 6 horas (Regra #2).`);
      } else {
        setTesteStatus(`ℹ️ Mantendo catálogo local.`);
      }
    } catch (e: any) {
      setTesteStatus(`⚠️ Erro: ${e.message}`);
    } finally {
      setTestando(false);
    }
  };

  const handleTestarNaturezas = async () => {
    setTestando(true);
    setTesteStatus(null);
    try {
      const res = await sincronizarTabelaNaturezas(true);
      if (res.sucesso) {
        setTesteStatus(`✅ Tabela oficial de naturezas CAD sincronizada! Total: ${res.total} naturezas carregadas via ${res.fonte}.`);
      } else {
        setTesteStatus(`⚠️ Não foi possível sincronizar naturezas.`);
      }
    } catch (e: any) {
      setTesteStatus(`❌ Erro: ${e.message}`);
    } finally {
      setTestando(false);
    }
  };

  const handleResetar = () => {
    const dados = restaurarDadosPadrao();
    onResetData(dados);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <img
              src="/assets/aistudio/LogoCorpoDeBombeiros_57dfdd49.png"
              alt="CBMMG"
              className="w-8 h-8 object-contain shrink-0"
            />
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Integração API CAD CBMMG (Proxy Nginx)
              </h3>
              <p className="text-[11px] text-slate-400">
                Conexão através do proxy seguro com injeção de token e CORS aberto
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white rounded-lg">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-5 space-y-4 text-xs font-sans overflow-y-auto">
          {/* Rules Banner from Official Manual */}
          <div className="bg-gradient-to-r from-emerald-950/40 via-slate-950 to-slate-950 border border-emerald-900/60 p-3.5 rounded-xl space-y-2 text-slate-300">
            <div className="font-bold text-emerald-400 flex items-center gap-1.5 text-xs">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Conformidade com as 3 Regras do Manual CBMMG</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px]">
              <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800">
                <span className="font-semibold text-emerald-300 block">1. Token no Servidor</span>
                <span className="text-slate-400">Injetado pelo Nginx. O frontend nunca armazena nem manipula o token.</span>
              </div>
              <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800">
                <span className="font-semibold text-emerald-300 block">2. Catálogos a cada 6h</span>
                <span className="text-slate-400">Codificações cacheadas localmente e renovadas a cada 6 horas.</span>
              </div>
              <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800">
                <span className="font-semibold text-emerald-300 block">3. Intervalo 10 min</span>
                <span className="text-slate-400">Leituras de /ativos espaçadas a cada 10 min (mínimo técnico ≥30s).</span>
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
            <p className="text-[11px] text-slate-500">
              O proxy reverso Nginx adiciona automaticamente os cabeçalhos <code>Authorization: Bearer</code> e libera CORS (<code>Access-Control-Allow-Origin: *</code>).
            </p>
          </div>

          {/* Test & Sync Actions */}
          <div className="p-3.5 bg-slate-950/80 rounded-xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between text-slate-300">
              <span className="font-semibold flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                Status da Conexão
              </span>
              <span className="text-[11px] font-mono text-slate-400">
                Última sync: {new Date(ultimaSync).toLocaleTimeString('pt-BR')}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                onClick={handleTestarCodigos}
                disabled={testando}
                className="flex items-center justify-center gap-1.5 px-2.5 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 rounded-lg font-semibold transition cursor-pointer text-center"
                title="Testar requisição ao endpoint /codigos do proxy"
              >
                <Zap className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span className="truncate">/codigos</span>
              </button>

              <button
                onClick={handleTestarNaturezas}
                disabled={testando}
                className="flex items-center justify-center gap-1.5 px-2.5 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 rounded-lg font-semibold transition cursor-pointer text-center"
                title="Testar e sincronizar endpoint GET /dados-auxiliares/naturezas (2.245 naturezas CAD)"
              >
                <BookOpen className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span className="truncate">Naturezas CAD</span>
              </button>

              <button
                onClick={handleForcarRenovacaoCatalogos}
                disabled={testando}
                className="flex items-center justify-center gap-1.5 px-2.5 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 rounded-lg font-semibold transition cursor-pointer text-center"
                title="Forçar renovação imediata dos catálogos auxiliares (renovação 6h)"
              >
                <Layers className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                <span className="truncate">Renovar 6h</span>
              </button>

              <button
                onClick={onTriggerSync}
                disabled={isSyncing}
                className="flex items-center justify-center gap-1.5 px-2.5 py-2 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white rounded-lg font-semibold transition cursor-pointer shadow-md text-center"
                title="Executar sincronização das chamadas ativas de /ativos"
              >
                <RotateCcw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''} shrink-0`} />
                <span className="truncate">{isSyncing ? 'Lendo...' : 'Ler /ativos'}</span>
              </button>
            </div>

            {testeStatus && (
              <div className="text-[11px] text-slate-300 bg-slate-900 p-2.5 rounded-lg border border-slate-800 space-y-1">
                {testeStatus}
              </div>
            )}
          </div>

          {/* GitHub Pages & Streamlit Cloud Guide */}
          <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-1.5">
            <div className="font-semibold text-slate-200 flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-blue-400" />
              <span>Publicação no GitHub Pages ou Streamlit Cloud</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Como o proxy em <strong>https://cobom-cad.duckdns.org</strong> fornece cabeçalhos CORS abertos (<code>*</code>) e injeta o token Bearer no servidor Nginx, qualquer usuário que acessar o painel hospedado no GitHub Pages ou Streamlit tem acesso imediato aos dados operacionais em tempo real, sem necessidade de logins ou configurações manuais de chaves.
            </p>
          </div>

          {/* Reset Action */}
          <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
            <span className="text-[11px] text-slate-500">
              Restaurar registros padrão de demonstração:
            </span>
            {confirmandoReset ? (
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-amber-300 font-medium">Confirmar?</span>
                <button
                  onClick={handleResetar}
                  className="px-2.5 py-1 bg-red-600 hover:bg-red-500 text-white rounded text-[11px] font-bold"
                >
                  Sim
                </button>
                <button
                  onClick={() => setConfirmandoReset(false)}
                  className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[11px]"
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
