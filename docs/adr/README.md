# Registros de decisão de arquitetura

Uma ADR registra uma decisão de arquitetura que continua valendo: o contexto, a decisão, as consequências e as alternativas descartadas. O código cita a ADR num comentário de referência, como `see ADR-005` (`docs/convencoes/comentarios.md`, Seção 4.5).

## Índice

| ADR | Título | Status |
|---|---|---|
| [ADR-001](001-monorepo-pnpm-workspaces.md) | Monorepo com pnpm workspaces | Aceita |
| [ADR-002](002-typescript-em-todo-o-codigo.md) | TypeScript em todo o código | Aceita |
| [ADR-003](003-ui-pwa-react-vite.md) | UI como PWA em React e Vite | Substituída por ADR-009 |
| [ADR-004](004-api-node-hono.md) | API em Node.js com Hono | Aceita |
| [ADR-005](005-sqlite.md) | SQLite como banco de dados | Aceita |
| [ADR-006](006-mcp-no-processo-da-api.md) | Servidor MCP no processo da API | Proposta |
| [ADR-007](007-smtp-proprio.md) | Envio de e-mail por servidor SMTP próprio no kasparov | Aceita |
| [ADR-008](008-escopo-heavy-duty-nos-pacotes.md) | Escopo @heavy-duty nos pacotes do workspace | Aceita |
| [ADR-009](009-ui-nextjs-base-ui-animate-ui.md) | UI em Next.js com Base UI e Animate UI | Aceita |
| [ADR-010](010-estado-do-jogo-derivado.md) | Estado do jogo derivado do histórico de treinos | Aceita |
| [ADR-011](011-ambiente-de-desenvolvimento-docker-compose.md) | Ambiente de desenvolvimento com Docker Compose | Aceita |

## Regras

1. Copie `000-modelo.md` para `NNN-titulo-em-kebab-case.md`, com o próximo número livre de 3 dígitos.
2. Escreva a ADR com status `Proposta`. Só o PO muda o status para `Aceita`.
3. ADR aceita não muda de conteúdo. Para mudar a decisão, escreva uma ADR nova e mude o status da antiga para `Substituída por ADR-NNN`.
4. Atualize o índice desta página no mesmo PR.

## Status

| Status | Sentido |
|---|---|
| Proposta | Em discussão. O código ainda não depende da decisão |
| Aceita | Decisão em vigor |
| Substituída por ADR-NNN | Decisão trocada pela ADR indicada |
| Descartada | Proposta recusada. O registro fica para evitar a mesma discussão |
