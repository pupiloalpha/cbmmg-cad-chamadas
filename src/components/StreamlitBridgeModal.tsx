import React, { useState } from 'react';
import {
  X,
  Server,
  Database,
  Cloud,
  ShieldAlert,
  Code,
  Download,
  Check,
  Cpu,
  Layers,
  ArrowRight,
  Globe,
  Sparkles,
} from 'lucide-react';

interface StreamlitBridgeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const StreamlitBridgeModal: React.FC<StreamlitBridgeModalProps> = ({ isOpen, onClose }) => {
  const [tabAtiva, setTabAtiva] = useState<'proxy_nginx' | 'codigo_streamlit' | 'diagnostico'>('proxy_nginx');
  const [copiado, setCopiado] = useState(false);

  if (!isOpen) return null;

  const codigoStreamlitProxy = `# app_streamlit.py
# =====================================================================
# DASHBOARD STREAMLIT CBMMG CAD (VIA PROXY REVERSO NGINX)
# Conecta diretamente a https://cobom-cad.duckdns.org/ativos
# CORS aberto • Token injetado no servidor Nginx • Ciclo de 10 min
# =====================================================================

import streamlit as st
import pandas as pd
import requests
import datetime

st.set_page_config(
    page_title="CBMMG CAD - Streamlit Cloud",
    layout="wide",
    page_icon="🚒"
)

st.title("🚒 CBMMG CAD - Painel de Chamadas Ativas")
st.caption("Central de Operações de Bombeiros (COBOM 193) • Minas Gerais")

PROXY_ATIVOS_URL = "https://cobom-cad.duckdns.org/ativos"

# Regra #3 do Manual: Cache com TTL de 10 minutos (600s)
@st.cache_data(ttl=600)
def carregar_ocorrencias_cad():
    try:
        resp = requests.get(PROXY_ATIVOS_URL, timeout=15)
        if resp.status_code != 200:
            st.error(f"Erro ao consultar proxy reverso: HTTP {resp.status_code}")
            return pd.DataFrame()
            
        data = resp.json()
        
        # Extrai lista oficial de chamadas ativas
        chamadas_raw = (
            data.get("chamadas_ativas", {})
                .get("dados", {})
                .get("response", {})
                .get("dadosVigentesChamadas", {})
                .get("dadosVigentesChamadaV1", [])
        )
        
        registros = []
        for c in chamadas_raw:
            end = c.get("endereco", "")
            lat = float(c["latitude"]) if c.get("latitude") else None
            lng = float(c["longitude"]) if c.get("longitude") else None
            
            # Timestamp em milissegundos
            dh_ms = c.get("dataHoraInclusao")
            dt_abertura = None
            if dh_ms:
                try:
                    dt_abertura = datetime.datetime.fromtimestamp(int(dh_ms) / 1000.0)
                except:
                    pass

            registros.append({
                "idChamada": c.get("id"),
                "numeroChamada": c.get("numeroChamada"),
                "municipio": c.get("municipio", "NÃO INFORMADO"),
                "endereco": end,
                "latitude": lat,
                "longitude": lng,
                "situacao": "Em Atendimento" if c.get("codigoSituacaoChamada") == "E" else "Aguardando",
                "origem": c.get("codigoOrigemChamada", "L"),
                "dataAbertura": dt_abertura,
            })
            
        return pd.DataFrame(registros)
    except Exception as e:
        st.error(f"Exceção ao conectar com proxy: {e}")
        return pd.DataFrame()

df = carregar_ocorrencias_cad()

if df.empty:
    st.warning("Nenhuma chamada ativa retornada no momento pelo proxy reverso.")
else:
    # Sidebar Filtros
    st.sidebar.header("Filtros Operacionais")
    muns = ["TODOS"] + sorted(list(df["municipio"].dropna().unique()))
    mun_sel = st.sidebar.selectbox("Município", muns)
    
    df_filtrado = df if mun_sel == "TODOS" else df[df["municipio"] == mun_sel]

    # KPIs Principais
    c1, c2, c3 = st.columns(3)
    c1.metric("Total Chamadas Ativas", len(df_filtrado))
    c2.metric("Em Atendimento", len(df_filtrado[df_filtrado["situacao"] == "Em Atendimento"]))
    c3.metric("Aguardando", len(df_filtrado[df_filtrado["situacao"] == "Aguardando"]))

    # Mapa de Ocorrências
    st.subheader("📍 Mapa Geográfico de Ocorrências")
    coords_validas = df_filtrado.dropna(subset=["latitude", "longitude"])
    if not coords_validas.empty:
        st.map(coords_validas, latitude="latitude", longitude="longitude")

    # Tabela Detalhada
    st.subheader("📋 Chamadas Ativas")
    st.dataframe(df_filtrado[["numeroChamada", "municipio", "situacao", "endereco", "dataAbertura"]], use_container_width=True)
`;

  const copiarTexto = (texto: string) => {
    navigator.clipboard.writeText(texto);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  };

  const baixarArquivo = (conteudo: string, nomeArquivo: string) => {
    const blob = new Blob([conteudo], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nomeArquivo;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md animate-in fade-in">
      <div className="w-full max-w-4xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-600/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Integração Proxy Nginx & Streamlit Cloud
              </h3>
              <p className="text-[11px] text-slate-400">
                Acesso direto à API CAD sem bloqueio de IP ou exposição de token
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-800 bg-slate-950/60 px-4 text-xs font-semibold shrink-0">
          <button
            onClick={() => setTabAtiva('proxy_nginx')}
            className={`py-3 px-3 border-b-2 flex items-center gap-1.5 transition ${
              tabAtiva === 'proxy_nginx'
                ? 'border-emerald-500 text-emerald-400 bg-emerald-500/10'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>Solução: Proxy Nginx Ativo</span>
          </button>

          <button
            onClick={() => setTabAtiva('codigo_streamlit')}
            className={`py-3 px-3 border-b-2 flex items-center gap-1.5 transition ${
              tabAtiva === 'codigo_streamlit'
                ? 'border-blue-500 text-blue-400 bg-blue-500/10'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Code className="w-3.5 h-3.5" />
            <span>Código Pronto para Streamlit Cloud</span>
          </button>

          <button
            onClick={() => setTabAtiva('diagnostico')}
            className={`py-3 px-3 border-b-2 flex items-center gap-1.5 transition ${
              tabAtiva === 'diagnostico'
                ? 'border-amber-500 text-amber-400 bg-amber-500/10'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Entenda o Bloqueio Resolvido</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs font-sans">
          {tabAtiva === 'proxy_nginx' && (
            <div className="space-y-4">
              <div className="bg-emerald-950/30 border border-emerald-900/60 p-4 rounded-xl space-y-2">
                <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                  <Sparkles className="w-4 h-4" />
                  <span>Problema Resolvido: Proxy Reverso Nginx Operacional!</span>
                </div>
                <p className="text-slate-300 leading-relaxed">
                  Com o proxy reverso Nginx ativo em <strong>https://cobom-cad.duckdns.org</strong>, tanto este painel PWA quanto o Streamlit Cloud podem consumir os dados operacionais em tempo real:
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 pt-2">
                  <div className="bg-slate-900 p-3 rounded-lg border border-slate-800 space-y-1">
                    <span className="font-bold text-emerald-300 block">1. Token Seguro no Nginx</span>
                    <p className="text-[11px] text-slate-400">
                      O token Bearer da API CAD fica guardado no Nginx. Nem o frontend PWA nem o usuário precisam de chave.
                    </p>
                  </div>
                  <div className="bg-slate-900 p-3 rounded-lg border border-slate-800 space-y-1">
                    <span className="font-bold text-blue-300 block">2. CORS Aberto</span>
                    <p className="text-[11px] text-slate-400">
                      O Nginx retorna <code>Access-Control-Allow-Origin: *</code>, permitindo acesso direto a partir de qualquer navegador, GitHub Pages ou Streamlit.
                    </p>
                  </div>
                  <div className="bg-slate-900 p-3 rounded-lg border border-slate-800 space-y-1">
                    <span className="font-bold text-amber-300 block">3. Intervalo de 10 min</span>
                    <p className="text-[11px] text-slate-400">
                      A leitura de <code>/ativos</code> é executada a cada 10 minutos com proteção estrita (≥30s), evitando HTTP 429.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {tabAtiva === 'codigo_streamlit' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-slate-300 text-xs">
                  Script Python para rodar diretamente no Streamlit Community Cloud:
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => copiarTexto(codigoStreamlitProxy)}
                    className="flex items-center gap-1 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs font-semibold cursor-pointer"
                  >
                    {copiado ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Code className="w-3.5 h-3.5" />}
                    <span>{copiado ? 'Copiado!' : 'Copiar Código'}</span>
                  </button>
                  <button
                    onClick={() => baixarArquivo(codigoStreamlitProxy, 'app_cbmmg_streamlit.py')}
                    className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-semibold cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Baixar app.py</span>
                  </button>
                </div>
              </div>
              <pre className="bg-slate-950 p-3 rounded-lg border border-slate-800 font-mono text-[11px] text-slate-300 overflow-x-auto max-h-80">
                {codigoStreamlitProxy}
              </pre>
            </div>
          )}

          {tabAtiva === 'diagnostico' && (
            <div className="space-y-4">
              <div className="bg-amber-950/30 border border-amber-900/60 p-4 rounded-xl space-y-2">
                <h4 className="font-bold text-amber-400 text-sm">
                  Por que o acesso direto falhava antes?
                </h4>
                <p className="text-slate-300 leading-relaxed">
                  O servidor oficial da API CAD do CBMMG possui proteção perimetral (firewall PRODEMGE) que bloqueia conexões diretas originadas de certos provedores de nuvem pública e navegadores com CORS restrito.
                  Com o seu proxy reverso Nginx configurado com sucesso em <strong>https://cobom-cad.duckdns.org</strong>, esse obstáculo foi superado definitivamente.
                </p>
              </div>
            </div>
          )}
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
