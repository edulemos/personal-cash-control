# Personal Cash Control 💰

Um aplicativo desktop de controle financeiro pessoal moderno, seguro e rápido, construído com Electron e Node.js.

## Tecnologias

- **Electron** (Processo Principal e Renderização Isolados)
- **Node.js**
- **SQLite** (`better-sqlite3` para armazenamento local de alto desempenho)
- **HTML/CSS/JS (Vanilla)** com design focado em Glassmorphism e Dark Mode moderno.

## Como Executar o Projeto

1. Instale as dependências:
   ```bash
   npm install
   ```

2. Execute o projeto em ambiente de desenvolvimento:
   ```bash
   npm start
   ```

## Arquitetura e Regras

O projeto segue padrões estritos de segurança e qualidade. O banco de dados local é salvo na pasta de dados de usuário do sistema operacional, e a comunicação entre interface e regras de negócio é totalmente isolada por Context Bridge (IPC).

Para os desenvolvedores e IA agentes, os detalhes e diretrizes de estrutura do código e boas práticas podem ser encontrados no arquivo [AGENTS.md](./AGENTS.md).
