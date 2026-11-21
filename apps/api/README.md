# API do Heavy Duty

Serviço que guarda exercícios, programas e treinos em SQLite. A API atende a UI por HTTP e o Claude por MCP.

Estado: scaffold (EN-S0). A API tem `GET /api/health`, o documento OpenAPI, o Swagger UI e o servidor MCP sem ferramenta, sobre SQLite com Drizzle.

## Stack

- Node.js 24 e Hono, conforme a ADR-004
- SQLite, conforme a ADR-005
- SDK oficial do MCP em TypeScript, conforme a ADR-006
- Drizzle ORM com better-sqlite3, conforme a ADR-013
- `@hono/zod-openapi` e Swagger UI, conforme a ADR-017
- Vitest para teste unitário e de integração

## Comandos

```sh
pnpm --filter @heavy-duty/api dev
pnpm --filter @heavy-duty/api test
pnpm --filter @heavy-duty/api build
pnpm --filter @heavy-duty/api db:migrate      # aplica as migrações no arquivo de DATABASE_PATH
pnpm --filter @heavy-duty/api db:seed         # executa a semente, idempotente
pnpm --filter @heavy-duty/api db:generate     # gera a migração a partir de src/db/schema.ts
pnpm --filter @heavy-duty/api openapi         # grava docs/arquitetura/openapi.json
pnpm --filter @heavy-duty/api openapi:check   # falha se o arquivo versionado diferir do gerado
```

## Variáveis de ambiente

As variáveis ficam em `.env`, fora do Git. O `.env.example` lista cada variável com um marcador no lugar do valor sensível, como `<CLOUDFLARE_TUNNEL_ID>`. A API lê `NODE_ENV`, `PORT` (padrão 3001) e `DATABASE_PATH` (padrão `data/heavy-duty.dev.sqlite` fora de produção, obrigatória em produção).
