# Contratos da API HTTP

Este documento descreve cada rota HTTP da API em português: objetivo, story de origem, respostas, erros e idempotência. A fonte do contrato é o schema Zod de cada rota, declarado com `@hono/zod-openapi` (ADR-017). O documento OpenAPI gerado fica em `openapi.json`, nesta pasta.

## Regras dos contratos

- Toda rota nova, alterada ou removida atualiza este arquivo, `openapi.json` e, se a rota tiver ferramenta MCP equivalente, `mcp.md`, no mesmo commit.
- Execute `pnpm --filter @heavy-duty/api openapi` para gerar `openapi.json`. O comando `pnpm --filter @heavy-duty/api openapi:check` falha quando o arquivo versionado difere do gerado.
- Fora de `NODE_ENV=production`, a API serve o documento em `/api/openapi.json` e o Swagger UI em `/api/docs`. Em produção, os dois caminhos respondem 404 até a autenticação existir (US-F14-01).

## Formato de erro comum

Todo erro HTTP tem o corpo `{ code, message }`: `code` em inglês, em `snake_case`, e `message` em português (`docs/convencoes/codigo.md`, Seção 3). O schema é `Error`, em `apps/api/src/http/errors.ts`.

| Status | `code` | `message` | Quando |
|---|---|---|---|
| 400 | `invalid_request` | `requisição inválida` | A entrada não passa no schema da rota |
| 404 | `not_found` | `recurso não encontrado` | Nenhuma rota atende o caminho |
| 500 | `internal_error` | `erro interno do servidor` | Erro inesperado; o motivo vai para o log, não para a resposta |

O erro de domínio de cada story acrescenta o próprio `code`, com a `message` do cenário do PRD.

## GET /api/health

| Campo | Valor |
|---|---|
| Objetivo | Informar se a API está no ar e se o banco responde |
| Story | EN-S0 |
| Autenticação | Nenhuma. A resposta não traz dado de treino nem configuração |
| Efeito colateral | Nenhum. A rota executa `SELECT 1` no banco |
| Idempotência | Idempotente |

| Status | Corpo | Quando |
|---|---|---|
| 200 | `{ "status": "ok", "database": "up" }` | O banco responde ao `SELECT 1` |
| 503 | `{ "status": "unavailable", "database": "down" }` | O banco não abriu ou não responde |
| 500 | `{ "code": "internal_error", "message": "erro interno do servidor" }` | Erro inesperado |

O serviço `api` do Compose usa a rota como healthcheck.
