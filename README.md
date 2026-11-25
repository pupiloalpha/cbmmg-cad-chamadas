# CBMMG CAD — Dashboard Operacional

Dashboard web progressivo (PWA) para acompanhar chamadas operacionais ativas do Corpo de Bombeiros Militar de Minas Gerais (CBMMG). A interface reúne indicadores, filtros, mapa, gráficos e uma tabela detalhada, com sincronização por meio de um proxy reverso e suporte a cache local.

> **Acesso à aplicação:**
>
> O painel integra dados do CAD por meio de serviços externos. O acesso e a disponibilidade dos dados dependem do proxy e das permissões correspondentes. Este repositório não inclui credenciais de acesso.

## Funcionalidades

- Indicadores operacionais e visualização de chamadas ativas.
- Filtros por unidade (COB, BBM e Cia Ind), natureza, situação, origem, prioridade, período, geolocalização e outros critérios disponíveis no painel.
- Mapa interativo e gráficos para explorar os dados filtrados.
- Tabela detalhada com consulta das informações de cada chamada e exportação CSV.
- Sincronização automática em ciclos de 10 minutos, opção de pausar o ciclo e atualização manual.
- Armazenamento local e indicadores de conectividade para continuidade quando a rede ou o serviço remoto estiver indisponível.
- Catálogos auxiliares de naturezas e unidades de serviço, incluindo dados locais de contingência.
- Instalação como PWA em navegadores compatíveis.

## Tecnologias

- React 19 e TypeScript
- Vite e Tailwind CSS
- Express e `tsx` para o servidor intermediário local/Node.js
- Leaflet para mapas
- `vite-plugin-pwa` para recursos de PWA
- Bun para instalação de dependências e execução dos scripts no fluxo de CI

## Requisitos

- [Bun](https://bun.sh/) instalado para seguir os comandos abaixo.
- Acesso ao proxy reverso do CAD para sincronização dos dados em tempo real.

## Executar localmente

```bash
git clone https://github.com/pupiloalpha/cbmmg-cad-chamadas.git
cd cbmmg-cad-chamadas
bun install --frozen-lockfile
bun run dev
```

O servidor de desenvolvimento é iniciado na porta `3000` por padrão. Acesse [http://localhost:3000](http://localhost:3000). Para escolher outra porta, defina `PORT` antes de iniciar, por exemplo:

```bash
PORT=3001 bun run dev
```

No PowerShell, use `$env:PORT="3001"` antes do comando `bun run dev`.

## Configuração do proxy

O servidor intermediário usa `CBMMG_PROXY_URL` como endereço base do proxy reverso. Se a variável não for definida, o código utiliza `https://cobom-cad.duckdns.org` como padrão. Para apontar para outra instância, defina a variável no ambiente do processo:

```bash
CBMMG_PROXY_URL="https://seu-proxy.example" bun run dev
```

No PowerShell:

```powershell
$env:CBMMG_PROXY_URL = "https://seu-proxy.example"
bun run dev
```

O proxy deve disponibilizar os caminhos esperados pelo servidor, incluindo `/ativos`, `/codigos`, `/dados-auxiliares/naturezas` e `/dados-auxiliares/unidades-servico`. A autenticação do CAD deve permanecer no proxy/servidor: não coloque tokens ou outras credenciais no código do frontend, no repositório ou em variáveis `VITE_*`.

O arquivo `.env.example` contém referências a `GEMINI_API_KEY` e `APP_URL` para ambientes que as utilizem; o servidor CAD deste projeto também lê `CBMMG_PROXY_URL` e `PORT` do ambiente.

## Build e execução de produção

Gere os arquivos estáticos com:

```bash
bun run build
```

Para conferir localmente o build do Vite:

```bash
bun run preview
```

O servidor Express também pode servir o build e as rotas `/api/cbm/*` quando executado com `NODE_ENV=production`:

```bash
NODE_ENV=production bun run start
```

Por padrão, o servidor escuta na porta `3000`; a porta pode ser ajustada com `PORT`.

### GitHub Pages e backend

O workflow em `.github/workflows/deploy.yml` compila e publica `dist/` no GitHub Pages. Esse deploy hospeda a aplicação estática, mas **não executa o servidor Express**. Portanto, as rotas `/api/cbm/*` e a integração em tempo real exigem um backend Node.js separado, acessível pelo frontend e configurado de acordo com o ambiente de hospedagem. A publicação somente no Pages não inicia o proxy nem fornece credenciais do CAD.

## Scripts disponíveis

| Comando | Descrição |
| --- | --- |
| `bun run dev` | Inicia o servidor de desenvolvimento com Vite e Express. |
| `bun run start` | Inicia o servidor; com `NODE_ENV=production`, serve o build de `dist/`. |
| `bun run build` | Compila a aplicação para produção em `dist/`. |
| `bun run preview` | Faz preview local do build do Vite. |
| `bun run lint` | Executa a verificação de tipos TypeScript (`tsc --noEmit`). |
| `bun run clean` | Remove `dist` e `server.js`. |

## Rotas do servidor intermediário

| Rota | Finalidade |
| --- | --- |
| `GET /api/cbm/status` | Informa o status do serviço e do cache de chamadas. |
| `/api/cbm/test-connection` | Testa a conexão com o proxy usando `/codigos`. |
| `/api/cbm/naturezas` | Obtém o catálogo de naturezas, recorrendo ao cache local quando disponível. |
| `/api/cbm/unidades-servico` | Obtém o catálogo de unidades, recorrendo ao cache local quando disponível. |
| `/api/cbm/sync` | Sincroniza as chamadas ativas via `/ativos`, respeitando o intervalo de segurança implementado. |

## Estrutura do projeto

```text
.
├── .github/workflows/deploy.yml  # Build e publicação no GitHub Pages
├── public/                       # Ícones, snapshots e demais recursos estáticos
├── server.ts                     # Servidor Express, proxy e cache intermediário
├── src/
│   ├── components/               # Mapa, gráficos, filtros, tabela e modais
│   ├── data/                     # Catálogos e dados de demonstração
│   ├── hooks/                    # Hooks da aplicação, incluindo instalação PWA
│   ├── services/                 # Sincronização, persistência e exportação CSV
│   ├── types/                    # Tipos compartilhados
│   └── App.tsx                   # Composição da interface e fluxo principal
├── package.json
└── vite.config.ts
```

## Dados, acesso e segurança

Os arquivos em `public/` incluem snapshots e catálogos usados como dados locais/de contingência. A aplicação também pode carregar informações operacionais do serviço configurado. Antes de publicar ou redistribuir o projeto, verifique se os dados e recursos são apropriados para exposição pública e se você tem autorização para acessá-los e utilizá-los. Não inclua credenciais, tokens ou informações operacionais restritas em arquivos estáticos ou no histórico do Git.

## Licença

Nenhum arquivo de licença foi identificado neste repositório. Consulte o responsável pelo projeto antes de reutilizar, modificar ou redistribuir o código ou os dados.
