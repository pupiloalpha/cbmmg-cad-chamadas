#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
cbmmg_bridge.py - Conector Local e Ponte CORS para API CAD do CBMMG
===================================================================
Resolve os bloqueios de firewall da PRODEMGE e de CORS para uso com
o Dashboard PWA, GitHub Pages e Streamlit.

CICLO OPERACIONAL:
  - Carregamento automático a cada 10 minutos (600s) com todas as
    informações atualizadas (chamadas e recursos).
  - Pode ser alterado via argumento de linha de comando:
    python cbmmg_bridge.py --intervalo 600

COMO USAR:
1. Instale requests:
   pip install requests

2. Execute:
   python cbmmg_bridge.py
"""

import os
import sys
import time
import json
from datetime import datetime
from http.server import HTTPServer, BaseHTTPRequestHandler
import threading

try:
    import requests
    import urllib3
    # Desativa avisos de certificados da cadeia ICP-Brasil da PRODEMGE
    urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
except ImportError:
    print("\n❌ Biblioteca 'requests' não encontrada!")
    print("Por favor, execute: pip install requests\n")
    sys.exit(1)

BASE_URL = "https://apicadbm.bombeiros.mg.gov.br"
INTERVALO_MINIMO_TECNICO = 6  # 5s exigido pelo manual
INTERVALO_OPERACAO = 600       # Padrão: 10 minutos (600s) conforme solicitado
PORTA_LOCAL = 8080

# Verifica se o usuário passou um intervalo personalizado (ex: --intervalo 300)
if "--intervalo" in sys.argv:
    try:
        idx = sys.argv.index("--intervalo")
        INTERVALO_OPERACAO = int(sys.argv[idx + 1])
    except (IndexError, ValueError):
        pass

dados_em_memoria = {
    "dataset": "ativos",
    "fonte": "banco",
    "atualizado_em": datetime.utcnow().isoformat(),
    "total": 0,
    "chamadas": [],
    "dados": [],
    "recursos": []
}
ultima_chamada_remota = 0.0

def obter_token():
    token = os.environ.get("CBM_API_TOKEN", "").strip()
    if not token:
        print("\n" + "="*65)
        print("  🚒 CBMMG CAD - Agente Local de Sincronização (10 minutos)")
        print("="*65)
        token = input("Cole o seu token da API CAD (cbm_live_...): ").strip()
    return token

def testar_e_conectar(token):
    headers = {
        "Authorization": f"Bearer {token}",
        "User-Agent": "CBMMG-Dashboard-Bridge/1.0"
    }
    print(f"\n🔍 Testando conectividade com {BASE_URL}/codigos ...")
    try:
        r = requests.get(f"{BASE_URL}/codigos", headers=headers, timeout=25, verify=False)
        if r.status_code == 200:
            print("✅ Conexão validada com sucesso! Resposta 200 OK da API CAD CBMMG.")
            return True
        elif r.status_code == 401:
            print("❌ ERRO 401: Credencial inválida! O token está incorreto ou foi revogado.")
            return False
        elif r.status_code == 429:
            print("⏳ ERRO 429: Rate limit atingido. Aguarde 30s e tente novamente.")
            return False
        else:
            print(f"⚠️ Servidor retornou HTTP {r.status_code}: {r.text[:200]}")
            return False
    except requests.exceptions.Timeout:
        print("❌ Timeout na conexão! O servidor da API não respondeu em 25 segundos.")
        print("Verifique se o seu computador está conectado à internet.")
        return False
    except Exception as e:
        print(f"❌ Erro ao conectar: {e}")
        return False

def buscar_ativos(token):
    global ultima_chamada_remota, dados_em_memoria
    headers = {
        "Authorization": f"Bearer {token}",
        "User-Agent": "CBMMG-Dashboard-Bridge/1.0"
    }
    
    agora = time.time()
    espera = INTERVALO_MINIMO_TECNICO - (agora - ultima_chamada_remota)
    if espera > 0:
        time.sleep(espera)
    
    ultima_chamada_remota = time.time()
    try:
        print(f"[{datetime.now().strftime('%H:%M:%S')}] 📡 Consultando {BASE_URL}/ativos ...")
        r = requests.get(f"{BASE_URL}/ativos", headers=headers, timeout=35, verify=False)
        if r.status_code == 200:
            resp_json = r.json()
            
            # Normalização robusta da resposta
            chamadas = []
            recursos = []

            # 1. Estrutura oficial do manual CBMMG da rota GET /ativos
            if "chamadas" in resp_json:
                ch_bloco = resp_json["chamadas"]
                if isinstance(ch_bloco, dict):
                    chamadas = ch_bloco.get("dados", [])
                elif isinstance(ch_bloco, list):
                    chamadas = ch_bloco

            if "recursos" in resp_json:
                rec_bloco = resp_json["recursos"]
                if isinstance(rec_bloco, dict):
                    recursos = rec_bloco.get("dados", [])
                elif isinstance(rec_bloco, list):
                    recursos = rec_bloco

            # 2. Estrutura alternativa onde 'dados' envelopa chamadas e recursos
            if not chamadas:
                dados_bloco = resp_json.get("dados", {})
                if isinstance(dados_bloco, dict):
                    chamadas = dados_bloco.get("chamadas", [])
                    recursos = recursos or dados_bloco.get("recursos", [])
                elif isinstance(dados_bloco, list):
                    chamadas = dados_bloco
            
            # Se chamadas estiver vazio em /ativos, tenta consultar /ativos/chamadas
            if not chamadas:
                time.sleep(INTERVALO_MINIMO_TECNICO)
                ultima_chamada_remota = time.time()
                r_ch = requests.get(f"{BASE_URL}/ativos/chamadas", headers=headers, timeout=30, verify=False)
                if r_ch.status_code == 200:
                    ch_json = r_ch.json()
                    c_dados = ch_json.get("dados", [])
                    if isinstance(c_dados, list) and len(c_dados) > 0:
                        chamadas = c_dados
            
            # Monta o pacote de dados unificado
            pacote = {
                "dataset": "ativos",
                "fonte": "banco",
                "atualizado_em": resp_json.get("atualizado_em", datetime.utcnow().isoformat()),
                "total": len(chamadas),
                "chamadas": chamadas,
                "dados": chamadas,
                "recursos": recursos
            }
            dados_em_memoria = pacote

            # Grava no arquivo cbmmg_cad_dados.json
            with open("cbmmg_cad_dados.json", "w", encoding="utf-8") as f:
                json.dump(pacote, f, ensure_ascii=False, indent=2)
            
            # Também grava na pasta public/ se estiver rodando dentro do projeto
            if os.path.exists("public"):
                with open("public/dados_cad.json", "w", encoding="utf-8") as f:
                    json.dump(pacote, f, ensure_ascii=False, indent=2)

            minutos = INTERVALO_OPERACAO // 60
            print(f"[{datetime.now().strftime('%H:%M:%S')}] ✅ Sucesso! {len(chamadas)} chamadas ativas e {len(recursos)} recursos empenhados.")
            print(f"   💾 Arquivo 'cbmmg_cad_dados.json' atualizado.")
            print(f"   ⏳ Próxima atualização automática agendada em {minutos} minutos ({INTERVALO_OPERACAO}s).\n")
            return True
        elif r.status_code == 429:
            print(f"[{datetime.now().strftime('%H:%M:%S')}] ⏳ 429 Rate Limit atingido.")
        else:
            print(f"[{datetime.now().strftime('%H:%M:%S')}] ⚠️ Servidor retornou HTTP {r.status_code}")
    except Exception as e:
        print(f"[{datetime.now().strftime('%H:%M:%S')}] ⚠️ Erro na sincronização: {e}")
    return False

class LocalCorsHandler(BaseHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

    def do_GET(self):
        if self.path in ['/', '/dados', '/api/cad', '/ativos', '/cbmmg_cad_dados.json']:
            conteudo = json.dumps(dados_em_memoria, ensure_ascii=False).encode('utf-8')
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Content-Length', str(len(conteudo)))
            self.end_headers()
            self.wfile.write(conteudo)
        else:
            self.send_response(404)
            self.end_headers()
            self.wfile.write(b'{"erro": "Rota nao encontrada"}')

    def log_message(self, format, *args):
        pass

def iniciar_servidor_http():
    server = HTTPServer(('127.0.0.1', PORTA_LOCAL), LocalCorsHandler)
    server.serve_forever()

def main():
    print("="*65)
    print("  🚒 CBMMG CAD - Agente Local & Ponte de Dados (Ciclo 10 min)")
    print("="*65)
    
    token = obter_token()
    if not token:
        print("❌ Token não informado. Encerrando.")
        return

    sucesso = testar_e_conectar(token)
    if not sucesso:
        print("\n❌ Não foi possível autenticar com a API.")
        print("Verifique seu token e tente novamente.")
        return

    # Inicia servidor HTTP local
    print(f"\n🌐 Servidor local CORS rodando em http://127.0.0.1:{PORTA_LOCAL}/dados")
    t = threading.Thread(target=iniciar_servidor_http, daemon=True)
    t.start()

    # Primeira busca imediata
    buscar_ativos(token)

    minutos = INTERVALO_OPERACAO // 60
    print(f"🔄 Loop ativo: Carregamento automático a cada {minutos} minutos.")
    print("Pressione Ctrl+C para encerrar o agente.\n")
    try:
        while True:
            time.sleep(INTERVALO_OPERACAO)
            buscar_ativos(token)
    except KeyboardInterrupt:
        print("\n👋 Agente encerrado.")

if __name__ == "__main__":
    main()
