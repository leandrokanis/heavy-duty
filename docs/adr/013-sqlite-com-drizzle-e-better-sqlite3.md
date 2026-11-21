# ADR-013: Acesso ao SQLite com Drizzle ORM e better-sqlite3

| Campo | Valor |
|---|---|
| Status | Aceita |
| Data | 2026-11-21 |
| Decisor | PO, por delegação no plano do MVP |
| Requisitos relacionados | ADR-005, F14, EN-S0 (FR-016 a FR-021) |

## Contexto

O banco é um arquivo SQLite no kasparov, escrito por um processo só, em modo WAL (ADR-005). A API precisa de um esquema tipado em TypeScript, de migrações versionadas e de um banco em memória para os testes de integração (`apps/api/CLAUDE.md`, seção "Testes"). `docs/arquitetura/api.md` já citava o Drizzle como proposta.

## Decisão

A API acessa o SQLite pelo Drizzle ORM 0.45.4 (Apache-2.0) sobre o driver better-sqlite3 13.2.0 (MIT), e gera as migrações com o drizzle-kit 0.31.11 (MIT). Detalhes que o código segue:

- O esquema fica em `apps/api/src/db/schema.ts`, e as migrações geradas ficam em `apps/api/src/db/migrations/`, versionadas.
- A conexão (`apps/api/src/db/connection.ts`) cria a pasta do arquivo, abre o banco e aplica `journal_mode = WAL`, `foreign_keys = ON` e `busy_timeout = 5000`.
- O caminho do arquivo vem de `DATABASE_PATH`. Fora de produção, o padrão é `data/heavy-duty.dev.sqlite` na raiz do repositório; em produção, a variável é obrigatória.
- Os scripts `db:migrate` e `db:seed` são idempotentes. O serviço `api` do Compose executa os dois antes de iniciar o servidor.
- O teste de integração usa `createTestDatabase()` (`apps/api/src/test/database.ts`): SQLite em memória com as migrações aplicadas.
- A primeira migração cria a tabela `settings`, com `key` (chave primária), `value` e `updated_at` (ISO 8601 em UTC).

## Consequências

- O esquema TypeScript é a fonte das migrações e dos tipos das consultas.
- O better-sqlite3 é síncrono e nativo. Sem binário pré-compilado para a plataforma, a instalação compila o módulo e exige `python3`, `make` e `g++`, que as imagens Docker instalam no estágio de build. No host de desenvolvimento, em 2026-11-21, a instalação compilou o módulo.
- O better-sqlite3 13.2.0 já abre o banco com `foreign_keys = 1` e `busy_timeout = 5000` por padrão (conferido em 2026-11-21). A conexão declara os dois pragmas mesmo assim, para não depender do padrão do driver.
- O pnpm 10 bloqueia scripts de instalação. O `pnpm-workspace.yaml` libera `better-sqlite3` e `esbuild` em `onlyBuiltDependencies`.

## Alternativas consideradas

| Alternativa | Motivo da recusa |
|---|---|
| Prisma | Motor de consulta separado e geração de cliente; mais peso para um banco de um usuário |
| Kysely com migrações próprias | Sem gerador de migração a partir do esquema |
| `node:sqlite` nativo do Node.js 24 | O módulo ainda é experimental no Node.js 24 [a confirmar: estado em 2026-11] e não tem integração estável com o drizzle-kit |
