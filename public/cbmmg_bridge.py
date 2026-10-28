#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
cbmmg_bridge.py - Conector Local e Ponte CORS para API CAD do CBMMG
===================================================================
Resolve os bloqueios de firewall da PRODEMGE e de CORS para uso com
o Dashboard PWA, GitHub Pages e Streamlit.

COMO USAR:
1. Instale a biblioteca requests:
   pip install requests

2. Execute o script:
   python cbmmg_bridge.py

O script irá:
  - Testar seu token com a API do CBMMG (GET /codigos)
  - Coletar as chamadas ativas (GET /ativos) respeitando o limite de 60s
  - Salvar um snapshot em 'cbmmg_cad_dados.json'
  - Abrir um servidor local em http://127.0.0.1:8080 com CORS liberado
    para que o seu painel web possa ler os dados diretamente em tempo real!
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
    # Desativa avisos de certificados auto-assinados/ICP-Brasil do governo
    urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
except ImportError:
    print("\n❌ Biblioteca 'requests' não encontrada!")
    print("Por favor, execute: pip install requests\n")
    sys.exit(1)

BASE_URL = "https://apicadbm.bombeiros.mg.gov.br"
INTERVALO_MINIMO = 6       # Mínimo de 5s exigido pelo manual
INTERVALO_OPERACAO = 60    # /ativos: a cada 60s
PORTA_LOCAL = 8080

dados_em_memoria = {
    "dataset": "chamadas",
    "fonte": "banco",
    "atualizado_em": datetime.utcnow().isoformat(),
    "total": 0,
    "dados": []
}
ultima_chamada_remota = 0.0

def obter_token():
    token = os.environ.get("CBM_API_TOKEN", "").strip()
    if not token:
        print("\n" + "="*60)
        print("  🚒 CBMMG CAD - Autenticação da API")
        print("="*60)
        token = input("Cole o seu token (ex: cbm_live_...): ").strip()
    return token

def testar_e_conectar(token):
    headers = {
        "Authorization": f"Bearer {token}",
        "User-Agent": "CBMMG-Dashboard-Bridge/1.0"
    }
    print(f"\n🔍 Testando conectividade com {BASE_URL}/codigos ...")
    try:
        # verify=False é essencial pois PRODEMGE usa cadeia ICP-Brasil não inclusa no certifi padrão
        r = requests.get(f"{BASE_URL}/codigos", headers=headers, timeout=25, verify=False)
        if r.status_code == 200:
            print("✅ Conexão validada com sucesso! Resposta 200 OK da API CAD CBMMG.")
            return True
        elif r.status_code == 401:
            print("❌ ERRO 401: Credencial inválida! O token está incorreto ou foi revogado.")
            return False
        elif r.status_code == 429:
            print("⏳ ERRO 429: Rate limit atingido. Aguarde alguns segundos e tente novamente.")
            return False
        else:
            print(f"⚠️ Servidor retornou HTTP {r.status_code}: {r.text[:200]}")
            return False
    except requests.exceptions.SSLError as e:
        print(f"⚠️ Erro SSL detectado: {e}. Tentando contornar...")
        return False
    except requests.exceptions.Timeout:
        print("❌ Timeout na conexão! O servidor da API não respondeu em 25 segundos.")
        print("Verifique se seu IP local tem acesso à rede da PRODEMGE ou se há VPN ativa.")
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
    espera = INTERVALO_MINIMO - (agora - ultima_chamada_remota)
    if espera > 0:
        time.sleep(espera)
    
    ultima_chamada_remota = time.time()
    try:
        r = requests.get(f"{BASE_URL}/ativos", headers=headers, timeout=30, verify=False)
        if r.status_code == 200:
            resp_json = r.json()
            dados_em_memoria = resp_json
            # Salva no arquivo local para uso off-line ou importação manual
            with open("cbmmg_cad_dados.json", "w", encoding="utf-8") as f:
                json.dump(resp_json, f, ensure_ascii=False, indent=2)
            
            qtd = resp_json.get("total", len(resp_json.get("dados", [])))
            data_hora = resp_json.get("atualizado_em", datetime.now().strftime("%H:%M:%S"))
            print(f"[{datetime.now().strftime('%H:%M:%S')}] ✅ Sincronizadas {qtd} chamadas ativas do CBMMG. (Salvo em cbmmg_cad_dados.json)")
            return True
        elif r.status_code == 429:
            print(f"[{datetime.now().strftime('%H:%M:%S')}] ⏳ 429 Rate Limit. Aguardando próximo ciclo...")
        else:
            print(f"[{datetime.now().strftime('%H:%M:%S')}] ⚠️ HTTP {r.status_code} em /ativos")
    except Exception as e:
        print(f"[{datetime.now().strftime('%H:%M:%S')}] ⚠️ Falha na leitura: {e}")
    return False

class LocalCorsHandler(BaseHTTPRequestHandler):
    def end_headers(self):
        # Permite acesso direto de qualquer frontend (GitHub Pages, AI Studio ou Localhost)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

    def do_GET(self):
        if self.path in ['/', '/dados', '/api/cad', '/ativos']:
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
        # Silencia logs normais de requests para manter o console limpo
        pass

def iniciar_servidor_http():
    server = HTTPServer(('127.0.0.1', PORTA_LOCAL), LocalCorsHandler)
    server.serve_forever()

def main():
    print("="*60)
    print("  🚒 CBMMG CAD - Agente Local & Ponte de Dados")
    print("="*60)
    
    token = obter_token()
    if not token:
        print("❌ Token não informado. Encerrando.")
        return

    sucesso = testar_e_conectar(token)
    if not sucesso:
        print("\n❌ Não foi possível autenticar com a API.")
        print("Verifique se seu token foi copiado exatamente como recebido por e-mail.")
        return

    # Inicia servidor HTTP local com CORS em thread separada
    print(f"\n🌐 Iniciando servidor local com CORS em http://127.0.0.1:{PORTA_LOCAL}/dados ...")
    t = threading.Thread(target=iniciar_servidor_http, daemon=True)
    t.start()
    print("✅ Servidor local pronto! No seu Dashboard, ative a opção 'Conectar ao Agente Local'.\n")

    # Primeira busca imediata
    buscar_ativos(token)

    # Loop de atualização a cada 60 segundos
    print("🔄 Ciclo contínuo de atualização ativado (a cada 60s). Pressione Ctrl+C para encerrar.\n")
    try:
        while True:
            time.sleep(INTERVALO_OPERACAO)
            buscar_ativos(token)
    except KeyboardInterrupt:
        print("\n👋 Agente encerrado pelo usuário.")

if __name__ == "__main__":
    main()
