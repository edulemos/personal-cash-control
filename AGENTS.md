# Regras de Arquitetura e Organização de Pastas do Projeto

Este arquivo define as diretrizes e regras para agentes e desenvolvedores sobre como organizar e manter o código do projeto **Personal Cash Control**.

Toda vez que você (agente) for adicionar, modificar ou remover arquivos, certifique-se de seguir a estrutura e as regras abaixo. Este é um app **financeiro**, então segurança e integridade dos dados do usuário têm prioridade sobre conveniência.

## Estrutura de Diretórios (Best Practices para Electron)

```
personal-cash-control/
├── src/
│   ├── main/               # Processo Principal (Node.js/Electron)
│   │   ├── index.js        # Ponto de entrada, criação de janelas, ciclo de vida do app
│   │   ├── ipc/             # Handlers de IPC, um arquivo por domínio (ex: transactions.ipc.js)
│   │   ├── database/        # Conexão, migrations e queries (ex: sqlite)
│   │   ├── services/        # Regras de negócio puras (cálculo de saldo, relatórios, etc)
│   │   └── config/          # Configurações do app, paths, constantes
│   ├── preload/
│   │   └── preload.js       # Único ponto de contextBridge, expõe API mínima e tipada
│   ├── renderer/            # Frontend (React/Vue/Vanilla)
│   │   ├── index.html
│   │   ├── app.js
│   │   ├── components/
│   │   ├── pages/
│   │   ├── styles/
│   │   └── assets/          # Imagens, ícones e fontes usados só pelo renderer
│   └── shared/              # Tipos, constantes e utilitários usados por main E renderer
│       ├── types.js (ou .ts)
│       └── ipc-channels.js  # Nomes dos canais IPC centralizados (evita strings soltas)
├── tests/
│   ├── unit/                 # Testes de services/utils (Vitest/Jest)
│   └── e2e/                  # Testes end-to-end (Playwright + Electron)
├── build/                    # Recursos de empacotamento (ícones, entitlements)
├── .env.example
├── package.json
├── electron-builder.yml      # Config de build/distribuição
└── AGENTS.md
```

> Dica: se o projeto crescer, considere migrar para TypeScript. Em um app financeiro, tipagem forte evita boa parte dos bugs de cálculo e de contrato entre main/renderer.

## Regras Importantes

### 1. Separação de Preocupações
Nunca misture código do Node.js (`fs`, `path`, acesso a banco, etc) diretamente no `src/renderer`. Todo acesso ao sistema nativo ou ao banco de dados deve passar por `ipcRenderer` → `preload` → handler em `src/main/ipc`.

### 2. Segurança (obrigatório, não opcional)
Como o app lida com dados financeiros do usuário, siga estas configurações em **toda** `BrowserWindow`:

- `contextIsolation: true`
- `nodeIntegration: false`
- `sandbox: true` sempre que possível
- Nunca use `remote` module (está deprecated e é inseguro)
- Defina uma **Content Security Policy** restritiva no `index.html` (ex: `default-src 'self'`)
- No `preload.js`, exponha via `contextBridge.exposeInMainWorld` **apenas** as funções estritamente necessárias, nunca o `ipcRenderer` inteiro
- Valide e sanitize **todo** payload recebido nos handlers de IPC no processo main (nunca confie em dado vindo do renderer)
- Trate links externos com `setWindowOpenHandler` para evitar abrir URLs arbitrárias dentro do app

### 3. Padrão de Comunicação IPC
- Centralize os nomes de canais em `src/shared/ipc-channels.js` (evita erro de digitação e facilita busca/refatoração)
- Prefira `ipcMain.handle` / `ipcRenderer.invoke` (padrão request-response com Promise) ao invés de `send`/`on`, exceto para eventos one-way (ex: notificar progresso)
- Um handler por responsabilidade clara (ex: `transactions:create`, `transactions:list`, `reports:monthly`) — evite handlers genéricos tipo `db:query`

### 4. Armazenamento e Integridade dos Dados
- Use um banco local estruturado (`better-sqlite3` é uma boa opção para Electron: síncrono, rápido, sem dependências nativas problemáticas) ao invés de arquivos JSON soltos, especialmente conforme o volume de transações cresce
- Rode migrations versionadas — nunca altere o schema manualmente em produção
- Implemente **backup automático** local (ex: cópia do arquivo `.sqlite` antes de migrations, ou export periódico) — perda de dados financeiros é um problema sério
- Ofereça exportação de dados (CSV/PDF/JSON) para o usuário não ficar "preso" ao app
- Se houver dados sensíveis (ex: sincronização em nuvem, senha de acesso ao app), considere criptografia em repouso (`better-sqlite3` com extensão SQLCipher, ou `safeStorage` do Electron para segredos pontuais)

### 5. Estilização (UI/UX)
O frontend deve sempre focar em uma estética moderna, limpa e responsiva (modo escuro, cores harmônicas, fontes modernas). Para dados financeiros:
- Formate valores monetários e datas conforme o locale do usuário (ex: `Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })`)
- Use cores consistentes para indicar ganho/gasto (ex: verde/vermelho) em todo o app

### 6. Caminhos
Ao referenciar arquivos entre `src/main`, `src/renderer` e `src/preload`, use sempre caminhos absolutos via `path.join(__dirname, ...)`. Nunca hardcode caminhos relativos frágeis (`../../..`).

### 7. Ponto de Entrada
O campo `main` no `package.json` deve sempre apontar para `src/main/index.js`.

### 8. Testes
- Testes unitários (Vitest ou Jest) para toda lógica de negócio em `src/main/services` (cálculos de saldo, categorização, relatórios) — essa é a parte mais crítica de estar correta
- Testes E2E com Playwright (tem suporte oficial a Electron) para os fluxos principais: criar transação, editar, excluir, gerar relatório
- Toda função de cálculo financeiro (soma, conversão, agregação) precisa de teste cobrindo casos de borda (valores negativos, zero, arredondamento)

### 9. Qualidade de Código
- ESLint + Prettier configurados e rodando no pre-commit (ex: via `husky` + `lint-staged`)
- Commits seguindo Conventional Commits (`feat:`, `fix:`, `refactor:`, `chore:`) para manter histórico legível e permitir changelog automático

### 10. Build e Distribuição
- Use `electron-builder` com config em `electron-builder.yml`, separada do `package.json` para manter organização
- Nunca commitar `dist/`, `out/` ou pastas de build no controle de versão
- Se for lançar atualizações, planeje `electron-updater` desde já — é mais fácil configurar auto-update no início do que retroativamente

### 11. Variáveis de Ambiente e Configuração
- Nenhum segredo (chaves de API, tokens) deve ser commitado. Use `.env` (com `.env.example` versionado) e garanta que `.env` está no `.gitignore`
- Configurações do usuário (preferências, tema) devem ficar separadas dos dados financeiros — use `electron-store` para isso, e o banco (`better-sqlite3`) só para as transações
