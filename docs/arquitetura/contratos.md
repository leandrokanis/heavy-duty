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

## Catálogo de grupos musculares e músculos

As três rotas desta seção vêm da US-F01-01. Até a autenticação existir (US-F14-01), as rotas existem só fora de `NODE_ENV=production` e só quando a API abriu o banco. Em produção, as três rotas respondem 404.

As recusas do cadastro vêm do service `addMuscle`, em `apps/api/src/modules/catalog/muscle.service.ts`. A ferramenta MCP `add_muscle` devolve as mesmas recusas, com o mesmo `code` e a mesma `message` (`mcp.md`).

| Status | `code` | `message` | Quando |
|---|---|---|---|
| 400 | `muscle_group_required` | `informe o grupo muscular` | O corpo não traz `muscleGroupSlug`, ou traz um texto vazio |
| 400 | `muscle_name_required` | `informe o nome do músculo` | O corpo não traz `name`, ou o nome não tem letra nem dígito depois do `trim` |
| 409 | `muscle_already_exists` | `músculo já cadastrado` | Já existe um músculo com o mesmo slug. O slug ignora maiúsculas, acentos e espaços nas pontas |
| 422 | `muscle_group_not_found` | `grupo muscular não encontrado` | O `muscleGroupSlug` não existe no catálogo |

### GET /api/muscle-groups

| Campo | Valor |
|---|---|
| Objetivo | Listar os 11 grupos musculares do catálogo (D30), na ordem de `position` |
| Story | US-F01-01 |
| Autenticação | Nenhuma até a US-F14-01. A rota não existe em produção |
| Efeito colateral | Nenhum |
| Idempotência | Idempotente |

| Status | Corpo | Quando |
|---|---|---|
| 200 | `{ "muscleGroups": [{ "id", "slug", "name", "position" }] }` | Sempre que o banco responde |
| 500 | `{ "code": "internal_error", "message": "erro interno do servidor" }` | Erro inesperado |

A semente do banco cria os grupos com slug em inglês (`chest`, `back`, `lower-back`, `shoulders`, `biceps`, `triceps`, `abs`, `quadriceps`, `hamstrings`, `glutes`, `calves`) e nome em português. Uma nova execução da semente mantém o `id` de cada grupo.

### GET /api/muscles

| Campo | Valor |
|---|---|
| Objetivo | Listar os músculos cadastrados, cada um com o grupo muscular, em ordem de `slug` |
| Story | US-F01-01 |
| Autenticação | Nenhuma até a US-F14-01. A rota não existe em produção |
| Efeito colateral | Nenhum |
| Idempotência | Idempotente |

| Status | Corpo | Quando |
|---|---|---|
| 200 | `{ "muscles": [{ "id", "slug", "name", "muscleGroup": { "id", "slug", "name" } }] }` | Sempre que o banco responde |
| 500 | `{ "code": "internal_error", "message": "erro interno do servidor" }` | Erro inesperado |

### POST /api/muscles

| Campo | Valor |
|---|---|
| Objetivo | Cadastrar um músculo num grupo muscular |
| Story | US-F01-01 |
| Autenticação | Nenhuma até a US-F14-01. A rota não existe em produção |
| Corpo | `{ "name": "tríceps braquial", "muscleGroupSlug": "triceps" }`. Os dois campos são opcionais no schema, e o service recusa o campo ausente com o erro de domínio |
| Efeito colateral | Grava uma linha em `muscles`. O nome fica sem os espaços das pontas. O slug vem do nome, sem acento, em caixa baixa e com `-` no lugar dos caracteres que não são letra nem dígito |
| Idempotência | Não idempotente. A repetição do mesmo músculo recusa com 409 `muscle_already_exists` |

| Status | Corpo | Quando |
|---|---|---|
| 201 | `{ "id", "slug", "name", "muscleGroup": { "id", "slug", "name" } }` | O músculo foi cadastrado |
| 400 | `{ "code": "muscle_group_required" \| "muscle_name_required", "message" }` | Falta o grupo ou o nome |
| 400 | `{ "code": "invalid_request", "message": "requisição inválida" }` | O corpo não é JSON, ou um campo não é texto |
| 409 | `{ "code": "muscle_already_exists", "message": "músculo já cadastrado" }` | O músculo já existe |
| 422 | `{ "code": "muscle_group_not_found", "message": "grupo muscular não encontrado" }` | O grupo não existe no catálogo |
| 500 | `{ "code": "internal_error", "message": "erro interno do servidor" }` | Erro inesperado |
