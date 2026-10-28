import React, { useState } from 'react';
import { salvarToken, obterTokenSalvo, restaurarDadosPadrao } from '../services/cbmStorage';
import { ChamadaAtiva } from '../types/cbm';
import {
  Key,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  X,
  Server,
  Zap,
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
  const [tokenInput, setTokenInput] = useState(() => obterTokenSalvo());
  const [salvoMsg, setSalvoMsg] = useState(false);
  const [testeStatus, setTesteStatus] = useState<string | null>(null);
  const [testando, setTestando] = useState(false);
  const [confirmandoReset, setConfirmandoReset] = useState(false);

  if (!isOpen) return null;

  const handleSalvarToken = () => {
    salvarToken(tokenInput.trim());
    setSalvoMsg(true);
    setTimeout(() => setSalvoMsg(false), 2000);
  };

  const handleTestarConexao = async () => {
    setTestando(true);
    setTesteStatus(null);
    try {
      const token = tokenInput.trim() || obterTokenSalvo();
      const res = await fetch('/api/cbm/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      const data = await res.json();
      if (res.ok && data.sucesso) {
        setTesteStatus(`✅ Conexão bem-sucedida! HTTP 200. Siglas carregadas da API oficial.`);
      } else {
        setTesteStatus(`⚠️ ${data.mensagem || 'Falha ao conectar à API CAD CBMMG'}`);
      }
    } catch {
      setTesteStatus('ℹ️ Teste local: O backend intermediário simula o proxy seguro com a API CAD.');
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
      <div className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Key className="w-5 h-5 text-amber-500" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Configurações da API CAD CBMMG
            </h3>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white rounded-lg">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 text-xs font-sans">
          {/* Rules Banner from Manual */}
          <div className="bg-amber-950/30 border border-amber-900/60 p-3 rounded-xl space-y-1 text-slate-300">
            <div className="font-bold text-amber-400 flex items-center gap-1.5 text-xs">
              <ShieldCheck className="w-4 h-4 text-amber-400" />
              <span>Regras Oficiais do Manual de Integração (Outubro 2026)</span>
            </div>
            <p className="text-[11px] text-slate-400">
              1. Token nunca na URL ou logs. 2. Auxiliares gravados localmente (renovados poucas vezes ao dia). 3. Mínimo técnico de 5s entre requisições (ciclo normal ≥ 30s).
            </p>
          </div>

          {/* Token Input */}
          <div className="space-y-1.5">
            <label className="block text-slate-300 font-semibold">
              Token de Acesso (Bearer / X-API-Key)
            </label>
            <div className="flex gap-2">
              <input
                type="password"
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                placeholder="cbm_live_..."
                className="flex-1 bg-slate-950 border border-slate-700 focus:border-red-500 rounded-lg px-3 py-2 text-slate-200 font-mono text-xs focus:outline-none"
              />
              <button
                onClick={handleSalvarToken}
                className="px-3 py-2 bg-red-600 hover:bg-red-500 text-white font-semibold rounded-lg transition"
              >
                Salvar
              </button>
            </div>
            {salvoMsg && (
              <span className="text-emerald-400 text-[11px] flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Token armazenado com segurança no cofre local.
              </span>
            )}
          </div>

          {/* Connection Test & Sync */}
          <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between text-slate-300">
              <span className="font-semibold flex items-center gap-1.5">
                <Server className="w-3.5 h-3.5 text-blue-400" />
                Estado da Sincronização
              </span>
              <span className="text-[11px] font-mono text-slate-400">
                Última sync: {new Date(ultimaSync).toLocaleTimeString('pt-BR')}
              </span>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={handleTestarConexao}
                disabled={testando}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 rounded-lg font-semibold transition"
              >
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span>{testando ? 'Testando...' : 'Testar Conexão (GET /codigos)'}</span>
              </button>

              <button
                onClick={onTriggerSync}
                disabled={isSyncing}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600/80 hover:bg-red-600 disabled:opacity-50 text-white rounded-lg font-semibold transition"
              >
                <RotateCcw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>{isSyncing ? 'Sincronizando...' : 'Sincronizar /ativos agora'}</span>
              </button>
            </div>

            {testeStatus && (
              <div className="text-[11px] text-slate-300 bg-slate-900 p-2 rounded border border-slate-800">
                {testeStatus}
              </div>
            )}
          </div>

          {/* Reset Action */}
          <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
            <span className="text-[11px] text-slate-400">
              Precisa recarregar a base padrão de Minas Gerais?
            </span>
            {confirmandoReset ? (
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-amber-300 font-medium">Tem certeza?</span>
                <button
                  onClick={handleResetar}
                  className="px-2 py-1 bg-red-600 hover:bg-red-500 text-white rounded text-[11px] font-bold"
                >
                  Sim, restaurar
                </button>
                <button
                  onClick={() => setConfirmandoReset(false)}
                  className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[11px]"
                >
                  Cancelar
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmandoReset(true)}
                className="text-amber-400 hover:text-amber-300 font-semibold flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Restaurar Padrão</span>
              </button>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-950 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg transition"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
