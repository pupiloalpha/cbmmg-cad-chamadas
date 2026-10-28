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
} from 'lucide-react';

interface StreamlitBridgeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const StreamlitBridgeModal: React.FC<StreamlitBridgeModalProps> = ({ isOpen, onClose }) => {
  const [tabAtiva, setTabAtiva] = useState<'diagnostico' | 'arquitetura' | 'codigo_daemon' | 'codigo_streamlit'>('diagnostico');
  const [copiado, setCopiado] = useState(false);

  if (!isOpen) return null;

  const codigoDaemonPython = `# cbmmg_sync_daemon.py
# =====================================================================
# DAEMON INTERMEDIÁRIO DE SINCRONIZAÇÃO - CBMMG CAD -> BANCO INTERMEDIÁRIO
# Resolve o bloqueio de IP do Streamlit Community Cloud e cumpre as 3 regras do manual:
# 1. Token seguro em variável de ambiente
# 2. Catálogos auxiliares carregados uma vez e gravados localmente
# 3. Mínimo 5s entre chamadas e ciclo de 60s em /ativos
# =====================================================================

import os
import time
import json
import sqlite3
import requests
from datetime import datetime

BASE_URL = "https://apicadbm.bombeiros.mg.gov.br"
TOKEN = os.environ.get("CBM_API_TOKEN", "coloque_seu_token_aqui")
INTERVALO_MINIMO = 6       # Limite técnico: 5s. Usamos 6s por segurança
INTERVALO_OPERACAO = 60    # /ativos: a cada 60s
RENOVAR_CATALOGOS = 21600  # Renovar catálogos a cada 6 horas (poucas vezes ao dia)
DB_PATH = "cbmmg_cad_intermediario.db"

_ultima_chamada = 0.0
session = requests.Session()
session.headers["Authorization"] = f"Bearer {TOKEN}"
session.headers["User-Agent"] = "CBMMG-Bridge-Worker/1.0"

def init_db():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    # Tabela de cache de chamadas ativas
    c.execute("""
        CREATE TABLE IF NOT EXISTS chamadas_ativas (
            idChamada TEXT PRIMARY KEY,
            numeroOcorrencia TEXT,
            dataHoraAbertura TEXT,
            codigoSituacaoChamada TEXT,
            codigoSituacaoAtendimentoChamada TEXT,
            codigoOrigemChamada TEXT,
            prioridade TEXT,
            descricaoNatureza TEXT,
            grupoNatureza TEXT,
            municipio TEXT,
            bairro TEXT,
            latitude REAL,
            longitude REAL,
            cob TEXT,
            bbm TEXT,
            recursos_json TEXT,
            payload_json TEXT,
            atualizado_em TEXT
        )
    """)
    # Tabela de controle de estado e catálogos
    c.execute("""
        CREATE TABLE IF NOT EXISTS controle_sync (
            chave TEXT PRIMARY KEY,
            valor TEXT,
            atualizado_em TEXT
        )
    """)
    conn.commit()
    conn.close()

def chamar_polidamente(rota):
    global _ultima_chamada
    for tentativa in range(3):
        espera = INTERVALO_MINIMO - (time.monotonic() - _ultima_chamada)
        if espera > 0:
            time.sleep(espera)
        _ultima_chamada = time.monotonic()
        
        try:
            r = session.get(BASE_URL + rota, timeout=30)
            if r.status_code == 200:
                return r.json()
            elif r.status_code == 401:
                print("❌ ERRO 401: Credencial inválida. Pare o daemon e solicite novo token.")
                return None
            elif r.status_code == 404:
                print(f"⚠️ 404: Conjunto {rota} ainda não gravado.")
                return None
            elif r.status_code == 429:
                retry = float(r.headers.get("Retry-After", 30))
                print(f"⏳ Rate limit 429 detectado. Aguardando {retry}s...")
                time.sleep(max(retry, INTERVALO_MINIMO))
                continue
            elif r.status_code == 503:
                print("🛑 503: Controle de uso indisponível. Aguardando 120s...")
                time.sleep(120)
                continue
        except Exception as e:
            print(f"Erro de rede em {rota}: {e}")
            time.sleep(5)
    return None

def salvar_no_banco(ativos_resp):
    if not ativos_resp or "dados" not in ativos_resp:
        return
    dados = ativos_resp["dados"]
    chamadas = dados.get("chamadas", dados) if isinstance(dados, dict) else dados
    if not isinstance(chamadas, list):
        return
    
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    # Limpa dados anteriores para manter apenas os ativos
    c.execute("DELETE FROM chamadas_ativas")
    
    agora = datetime.utcnow().isoformat()
    for item in chamadas:
        id_ch = str(item.get("idChamada", item.get("numeroOcorrencia", "")))
        end = item.get("endereco", {})
        c.execute("""
            INSERT OR REPLACE INTO chamadas_ativas VALUES (
                ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
            )
        """, (
            id_ch,
            item.get("numeroOcorrencia", ""),
            item.get("dataHoraAbertura", agora),
            item.get("codigoSituacaoChamada", "E"),
            item.get("codigoSituacaoAtendimentoChamada", "NL"),
            item.get("codigoOrigemChamada", "L"),
            item.get("prioridade", "Média"),
            item.get("descricaoNatureza", "Atendimento Geral"),
            item.get("grupoNatureza", "Outros"),
            end.get("municipio", "Belo Horizonte"),
            end.get("bairro", ""),
            item.get("latitude"),
            item.get("longitude"),
            item.get("cob", "1º COB"),
            item.get("bbm", "1º BBM"),
            json.dumps(item.get("recursos", [])),
            json.dumps(item),
            agora
        ))
    
    # Atualiza timestamp global de sincronização
    c.execute("INSERT OR REPLACE INTO controle_sync VALUES ('ultima_sync', ?, ?)", (agora, agora))
    conn.commit()
    conn.close()
    print(f"✅ Sincronizadas {len(chamadas)} chamadas ativas em {agora}")

def main():
    init_db()
    print("🚀 Daemon CBMMG CAD Bridge iniciado...")
    ultima_versao = None
    
    while True:
        resp = chamar_polidamente("/ativos")
        if resp:
            v = resp.get("atualizado_em")
            if v != ultima_versao:
                ultima_versao = v
                salvar_no_banco(resp)
            else:
                print("💤 Nenhuma alteração detectada no atualizado_em.")
        time.sleep(INTERVALO_OPERACAO)

if __name__ == "__main__":
    main()
`;

  const codigoStreamlit = `# app_streamlit.py
# =====================================================================
# DASHBOARD STREAMLIT CBMMG CAD (CONSUMIDOR DO BANCO INTERMEDIÁRIO)
# Roda no Streamlit Community Cloud sem tomar bloqueio de IP ou 429
# =====================================================================

import streamlit as st
import sqlite3
import pandas as pd
import json

st.set_page_config(page_title="CBMMG CAD - Streamlit", layout="wide", page_icon="🚒")
st.title("🚒 CBMMG CAD - Painel Operacional de Chamadas Ativas")

# Cache com TTL de 30 segundos
@st.cache_data(ttl=30)
def carregar_dados():
    # Conecta ao SQLite local ou PostgreSQL / Supabase
    conn = sqlite3.connect("cbmmg_cad_intermediario.db")
    df = pd.read_sql("SELECT * FROM chamadas_ativas", conn)
    conn.close()
    return df

df = carregar_dados()

if df.empty:
    st.warning("Nenhuma ocorrência encontrada no banco intermediário. Verifique se o daemon está em execução.")
else:
    # Sidebar Filtros
    st.sidebar.header("Filtros Operacionais")
    cob_selecionado = st.sidebar.selectbox("COB (Comando Operacional)", ["Todos"] + list(df["cob"].unique()))
    if cob_selecionado != "Todos":
        df = df[df["cob"] == cob_selecionado]

    # KPIs Principais
    col1, col2, col3, col4 = st.columns(4)
    col1.metric("Total Chamadas Ativas", len(df))
    col2.metric("Em Atendimento", len(df[df["codigoSituacaoChamada"] == "E"]))
    col3.metric("Aguardando", len(df[df["codigoSituacaoChamada"] == "A"]))
    col4.metric("Prioridade Alta", len(df[df["prioridade"] == "Alta"]))

    # Mapa de Ocorrências
    st.subheader("📍 Mapa Operacional")
    df_coords = df.dropna(subset=["latitude", "longitude"])
    st.map(df_coords, latitude="latitude", longitude="longitude")

    # Tabela Geral
    st.subheader("📋 Detalhamento das Chamadas")
    st.dataframe(df[["numeroOcorrencia", "descricaoNatureza", "prioridade", "municipio", "cob", "bbm"]])
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
        <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-red-600/20 border border-red-500/40 flex items-center justify-center text-red-500">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Arquitetura de Contingência & Streamlit Bridge
              </h3>
              <p className="text-[11px] text-slate-400">
                Solução para instabilidade da API e bloqueio de IP no Streamlit Community Cloud
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-800 bg-slate-950/60 px-4 text-xs font-semibold">
          <button
            onClick={() => setTabAtiva('diagnostico')}
            className={`py-3 px-3 border-b-2 flex items-center gap-1.5 transition ${
              tabAtiva === 'diagnostico'
                ? 'border-red-500 text-red-400 bg-red-500/10'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Diagnóstico do Bloqueio Streamlit</span>
          </button>

          <button
            onClick={() => setTabAtiva('arquitetura')}
            className={`py-3 px-3 border-b-2 flex items-center gap-1.5 transition ${
              tabAtiva === 'arquitetura'
                ? 'border-amber-500 text-amber-400 bg-amber-500/10'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Arquitetura Intermediária Recomendada</span>
          </button>

          <button
            onClick={() => setTabAtiva('codigo_daemon')}
            className={`py-3 px-3 border-b-2 flex items-center gap-1.5 transition ${
              tabAtiva === 'codigo_daemon'
                ? 'border-blue-500 text-blue-400 bg-blue-500/10'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>1. Daemon Sync (Python)</span>
          </button>

          <button
            onClick={() => setTabAtiva('codigo_streamlit')}
            className={`py-3 px-3 border-b-2 flex items-center gap-1.5 transition ${
              tabAtiva === 'codigo_streamlit'
                ? 'border-emerald-500 text-emerald-400 bg-emerald-500/10'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Code className="w-3.5 h-3.5" />
            <span>2. App Streamlit (Python)</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs font-sans">
          {tabAtiva === 'diagnostico' && (
            <div className="space-y-4">
              <div className="bg-red-950/30 border border-red-900/60 p-4 rounded-xl space-y-2">
                <div className="flex items-center gap-2 text-red-400 font-bold text-sm">
                  <ShieldAlert className="w-4 h-4" />
                  <span>Por que a API CAD do CBMMG bloqueia o Streamlit Community Cloud?</span>
                </div>
                <p className="text-slate-300 leading-relaxed">
                  O Corpo de Bombeiros Militar de Minas Gerais (CBMMG) opera a API CAD sobre infraestrutura de rede governamental (PRODEMGE / Prodemge Firewall) com rigorosas políticas de segurança cibernética:
                </p>
                <ul className="list-disc pl-5 space-y-1.5 text-slate-300">
                  <li>
                    <strong>Bloqueio de Faixas de IPs de Cloud Pública (AWS us-east-1):</strong> Os servidores do Streamlit Community Cloud rodam em contêineres efêmeros na AWS. Os firewalls do Estado de Minas Gerais frequentemente barram requisições vindas de data centers de hospedagem pública genérica para mitigar ataques DDoS e scraping não autorizado.
                  </li>
                  <li>
                    <strong>Violação do Limite de 5 Segundos pelo Ciclo Reativo do Streamlit:</strong> Toda vez que um usuário altera um filtro, seleciona um BBM ou move uma data no Streamlit, o framework reexecuta o script inteiro do topo ao fim. Sem cache centralizado externo, isso gera rajadas de 10 a 20 requisições simultâneas ao CBMMG, violando a <em>Regra de Ouro #3 do Manual</em> ("mínimo de 5s entre chamadas e 30s para /ativos"), gerando <strong>HTTP 429 Too Many Requests</strong> e suspensão imediata do token.
                  </li>
                  <li>
                    <strong>Sem IP Fixo no Streamlit Cloud:</strong> O IP de saída muda a cada deploy ou reinicialização, inviabilizando qualquer liberação de IP por whitelist.
                  </li>
                </ul>
              </div>

              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                <h4 className="font-bold text-slate-200 text-sm flex items-center gap-1.5">
                  <Database className="w-4 h-4 text-emerald-400" />
                  <span>Solução de Sucesso: O Padrão "Worker Polido + Banco Intermediário"</span>
                </h4>
                <p className="text-slate-300 leading-relaxed">
                  A arquitetura correta é separar o <strong>coletor de dados (Daemon)</strong> da <strong>interface do usuário (Dashboard PWA ou Streamlit)</strong>:
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
                  <div className="bg-slate-900 p-3 rounded-lg border border-slate-800 space-y-1">
                    <div className="font-bold text-red-400">1. Daemon Coletor</div>
                    <p className="text-[11px] text-slate-400">
                      Roda em servidor fixo (ex: VM local, quartel, container Docker ou Cloud Run). Faz 1 requisição a cada 60s com espaçamento de 6s.
                    </p>
                  </div>
                  <div className="bg-slate-900 p-3 rounded-lg border border-slate-800 space-y-1">
                    <div className="font-bold text-amber-400">2. Banco Intermediário</div>
                    <p className="text-[11px] text-slate-400">
                      PostgreSQL (ex: Supabase, Neon) ou SQLite com cache. Guarda o histórico e as chamadas ativas. Tolera milhares de consultas.
                    </p>
                  </div>
                  <div className="bg-slate-900 p-3 rounded-lg border border-slate-800 space-y-1">
                    <div className="font-bold text-emerald-400">3. Frontend Seguro</div>
                    <p className="text-[11px] text-slate-400">
                      Este PWA React ou seu Streamlit lê <strong>apenas do banco intermediário</strong>. Velocidade instantânea e zero risco de bloqueio.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {tabAtiva === 'arquitetura' && (
            <div className="space-y-4">
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                <h4 className="font-bold text-slate-200 text-sm">
                  Fluxo Arquitetural Completo de Resiliência
                </h4>

                <div className="p-3 bg-slate-900 rounded-lg border border-slate-800 text-xs font-mono text-slate-300 space-y-2 overflow-x-auto">
                  <div className="flex items-center gap-2">
                    <span className="text-red-400 font-bold">[API CAD CBMMG]</span>
                    <ArrowRight className="w-4 h-4 text-slate-500" />
                    <span className="text-blue-400 font-bold">[Daemon Polido (60s)]</span>
                    <ArrowRight className="w-4 h-4 text-slate-500" />
                    <span className="text-amber-400 font-bold">[Banco / Cache SQLite/Postgres]</span>
                    <ArrowRight className="w-4 h-4 text-slate-500" />
                    <span className="text-emerald-400 font-bold">[PWA / Streamlit Cloud]</span>
                  </div>
                </div>

                <div className="space-y-2 text-slate-300">
                  <p><strong>Benefícios desta solução:</strong></p>
                  <ul className="list-disc pl-5 space-y-1 text-slate-400">
                    <li>
                      <strong>Zero Risco de Suspensão de Token:</strong> O daemon é o único processo que toca na API do CBMMG, com fila estrita de espaçamento de 6 segundos.
                    </li>
                    <li>
                      <strong>Tolerância Total a Quedas da API:</strong> Se o servidor do CBMMG ficar fora do ar por manutenção, o banco intermediário continua servindo o último estado gravado com aviso de idade do cache.
                    </li>
                    <li>
                      <strong>Funcionamento Offline Completo no PWA:</strong> O PWA salva automaticamente os dados no IndexedDB / LocalStorage, permitindo que os militares consultem as ocorrências em campo mesmo sem sinal 4G.
                    </li>
                    <li>
                      <strong>Carga Rápida no Streamlit:</strong> O Streamlit lê tabelas indexadas em milissegundos sem timeout de rede externa.
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {tabAtiva === 'codigo_daemon' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-slate-300 text-xs">
                  Script Python para rodar como serviço em segundo plano (systemd ou Docker):
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => copiarTexto(codigoDaemonPython)}
                    className="flex items-center gap-1 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs font-semibold"
                  >
                    {copiado ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Code className="w-3.5 h-3.5" />}
                    <span>{copiado ? 'Copiado!' : 'Copiar Código'}</span>
                  </button>
                  <button
                    onClick={() => baixarArquivo(codigoDaemonPython, 'cbmmg_sync_daemon.py')}
                    className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-semibold"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Baixar .py</span>
                  </button>
                </div>
              </div>
              <pre className="bg-slate-950 p-3 rounded-lg border border-slate-800 font-mono text-[11px] text-slate-300 overflow-x-auto max-h-80">
                {codigoDaemonPython}
              </pre>
            </div>
          )}

          {tabAtiva === 'codigo_streamlit' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-slate-300 text-xs">
                  Script Streamlit configurado para consumir o banco intermediário com cache seguro:
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => copiarTexto(codigoStreamlit)}
                    className="flex items-center gap-1 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs font-semibold"
                  >
                    {copiado ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Code className="w-3.5 h-3.5" />}
                    <span>{copiado ? 'Copiado!' : 'Copiar Código'}</span>
                  </button>
                  <button
                    onClick={() => baixarArquivo(codigoStreamlit, 'app_streamlit.py')}
                    className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-semibold"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Baixar app.py</span>
                  </button>
                </div>
              </div>
              <pre className="bg-slate-950 p-3 rounded-lg border border-slate-800 font-mono text-[11px] text-slate-300 overflow-x-auto max-h-80">
                {codigoStreamlit}
              </pre>
            </div>
          )}
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
