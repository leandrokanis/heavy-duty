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

## Catálogo de exercícios

As duas rotas desta seção vêm da US-F01-02. Como as rotas de músculo, elas existem só fora de `NODE_ENV=production` e só quando a API abriu o banco. Em produção, as duas respondem 404.

As recusas do cadastro vêm do service `addExercise`, em `apps/api/src/modules/catalog/exercise.service.ts`. A ferramenta MCP `add_exercise` devolve as mesmas recusas, com o mesmo `code` e a mesma `message` (`mcp.md`). O service confere a entrada nesta ordem e devolve só a primeira recusa: nome, tipo ausente, tipo inválido, músculo principal, músculo repetido, músculo inexistente e exercício repetido.

| Status | `code` | `message` | Quando |
|---|---|---|---|
| 400 | `exercise_name_required` | `informe o nome do exercício` | O corpo não traz `name`, ou o nome não tem letra nem dígito depois do `trim` |
| 400 | `exercise_kind_required` | `informe o tipo do exercício` | O corpo não traz `kind`, ou traz um texto vazio |
| 400 | `exercise_kind_invalid` | `tipo de exercício inválido` | O `kind` não é `reps` nem `time` |
| 400 | `exercise_muscle_required` | `informe ao menos um músculo` | O corpo não traz `primaryMuscleSlugs`, traz a lista vazia ou só traz músculos secundários |
| 400 | `exercise_muscle_duplicated` | `músculo repetido no exercício` | O mesmo slug aparece duas vezes na mesma lista ou nas duas listas |
| 409 | `exercise_already_exists` | `exercício já cadastrado` | Já existe um exercício com o mesmo slug. O slug ignora maiúsculas, acentos e espaços nas pontas |
| 422 | `muscle_not_found` | `músculo não encontrado` | Um dos slugs informados não existe no catálogo de músculos |

### GET /api/exercises

| Campo | Valor |
|---|---|
| Objetivo | Listar os exercícios ativos (sem `archived_at`), em ordem de `slug`, cada um com o tipo, os músculos com o papel e os grupos musculares que trabalha |
| Story | US-F01-02 |
| Autenticação | Nenhuma até a US-F14-01. A rota não existe em produção |
| Efeito colateral | Nenhum |
| Idempotência | Idempotente |

| Status | Corpo | Quando |
|---|---|---|
| 200 | `{ "exercises": [Exercise] }` | Sempre que o banco responde |
| 500 | `{ "code": "internal_error", "message": "erro interno do servidor" }` | Erro inesperado |

O objeto `Exercise` tem a forma `{ "id", "slug", "name", "kind", "muscles": [{ "id", "slug", "name", "role", "muscleGroup": { "id", "slug", "name" } }], "muscleGroups": [{ "id", "slug", "name" }] }`. O `kind` é `reps` ou `time`, e o `role` é `primary` ou `secondary`. Os músculos vêm com os principais antes dos secundários e, em cada papel, em ordem de `slug`. Os grupos vêm sem repetição, na ordem de `position`.

### POST /api/exercises

| Campo | Valor |
|---|---|
| Objetivo | Cadastrar um exercício de repetição ou de tempo com os músculos que ele ativa |
| Story | US-F01-02 |
| Autenticação | Nenhuma até a US-F14-01. A rota não existe em produção |
| Corpo | `{ "name": "Supino reto", "kind": "reps", "primaryMuscleSlugs": ["peitoral-maior"], "secondaryMuscleSlugs": ["triceps-braquial"] }`. Os quatro campos são opcionais no schema, e o service recusa o campo ausente ou inválido com o erro de domínio. Os slugs vêm de `GET /api/muscles` |
| Efeito colateral | Grava uma linha em `exercises` e uma linha em `exercise_muscles` por músculo. O nome fica sem os espaços das pontas, e o slug segue a mesma regra do slug do músculo. O cadastro é atômico: em qualquer recusa ou falha, nenhuma linha fica gravada |
| Idempotência | Não idempotente. A repetição do mesmo exercício recusa com 409 `exercise_already_exists` |

| Status | Corpo | Quando |
|---|---|---|
| 201 | `Exercise` | O exercício foi cadastrado |
| 400 | `{ "code": "exercise_name_required" \| "exercise_kind_required" \| "exercise_kind_invalid" \| "exercise_muscle_required" \| "exercise_muscle_duplicated", "message" }` | A entrada está incompleta ou inválida |
| 400 | `{ "code": "invalid_request", "message": "requisição inválida" }` | O corpo não é JSON, um campo de texto não é texto ou uma lista de slugs não é lista de textos |
| 409 | `{ "code": "exercise_already_exists", "message": "exercício já cadastrado" }` | O exercício já existe |
| 422 | `{ "code": "muscle_not_found", "message": "músculo não encontrado" }` | Um músculo informado não existe no catálogo |
| 500 | `{ "code": "internal_error", "message": "erro interno do servidor" }` | Erro inesperado |
