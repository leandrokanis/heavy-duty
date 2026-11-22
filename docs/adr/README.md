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
| [ADR-006](006-mcp-no-processo-da-api.md) | Servidor MCP no processo da API | Aceita |
| [ADR-007](007-smtp-proprio.md) | Envio de e-mail por servidor SMTP próprio no kasparov | Aceita |
| [ADR-008](008-escopo-heavy-duty-nos-pacotes.md) | Escopo @heavy-duty nos pacotes do workspace | Aceita |
| [ADR-009](009-ui-nextjs-base-ui-animate-ui.md) | UI em Next.js com Base UI e Animate UI | Aceita |
| [ADR-010](010-estado-do-jogo-derivado.md) | Estado do jogo derivado do histórico de treinos | Aceita |
| [ADR-011](011-ambiente-de-desenvolvimento-docker-compose.md) | Ambiente de desenvolvimento com Docker Compose | Aceita |
| [ADR-012](012-lint-e-formatacao-com-biome.md) | Lint e formatação com Biome | Aceita |
| [ADR-013](013-sqlite-com-drizzle-e-better-sqlite3.md) | Acesso ao SQLite com Drizzle ORM e better-sqlite3 | Aceita |
| [ADR-014](014-id-em-uuid-v7.md) | ID de entidade em UUID v7 | Aceita |
| [ADR-015](015-empacotamento-com-docker-compose-e-cloudflared.md) | Empacotamento de produção com Docker Compose e cloudflared | Aceita |
| [ADR-016](016-icones-lucide.md) | Ícones do Lucide | Aceita |
| [ADR-017](017-contrato-da-api-com-zod-openapi.md) | Contrato da API com zod-openapi e Swagger UI | Aceita |
| [ADR-018](018-backup-diario-com-restic.md) | Backup diário com restic | Aceita |
| [ADR-019](019-autenticacao-com-chave-de-acesso.md) | Autenticação do app web com chave de acesso | Aceita |
| [ADR-020](020-autenticacao-do-mcp-com-oauth.md) | Autenticação do MCP com OAuth 2.1 emitido pelo próprio app | Aceita |
| [ADR-021](021-sincronizacao-da-fila-sem-sinal.md) | Sincronização da fila de séries sem sinal | Aceita |
| [ADR-022](022-fim-do-treino-na-fila-de-sincronizacao.md) | Fim do treino na fila de sincronização | Aceita |
| [ADR-023](023-exercicio-pulado-na-fila-de-sincronizacao.md) | Exercício pulado na fila de sincronização | Aceita |
| [ADR-025](025-correcao-da-serie-na-fila-de-sincronizacao.md) | Correção da série na fila de sincronização | Aceita |
| [ADR-026](026-confirmacao-em-duas-chamadas-no-mcp.md) | Confirmação em duas chamadas nas ferramentas do MCP que alteram o histórico | Aceita |

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
