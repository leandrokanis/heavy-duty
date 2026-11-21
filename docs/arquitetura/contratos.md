# Contratos da API HTTP

Este documento descreve cada rota HTTP da API em português: objetivo, story de origem, respostas, erros e idempotência. A fonte do contrato é o schema Zod de cada rota, declarado com `@hono/zod-openapi` (ADR-017). O documento OpenAPI gerado fica em `openapi.json`, nesta pasta.

## Regras dos contratos

- Toda rota nova, alterada ou removida atualiza este arquivo, `openapi.json` e, se a rota tiver ferramenta MCP equivalente, `mcp.md`, no mesmo commit.
- Execute `pnpm --filter @heavy-duty/api openapi` para gerar `openapi.json`. O comando `pnpm --filter @heavy-duty/api openapi:check` falha quando o arquivo versionado difere do gerado.
- Quando a API abriu o banco, ela serve o documento em `/api/openapi.json` e o Swagger UI em `/api/docs`, em todos os ambientes, atrás da sessão de acesso (US-F14-01, ADR-019). O documento declara o esquema de segurança `sessionCookie` (`apiKey` no cookie `hd_session`), exigido em todas as rotas; as rotas públicas declaram `security: []`.

## Formato de erro comum

Todo erro HTTP tem o corpo `{ code, message }`: `code` em inglês, em `snake_case`, e `message` em português (`docs/convencoes/codigo.md`, Seção 3). O schema é `Error`, em `apps/api/src/http/errors.ts`.

| Status | `code` | `message` | Quando |
|---|---|---|---|
| 400 | `invalid_request` | `requisição inválida` | A entrada não passa no schema da rota |
| 401 | `unauthenticated` | `Entre com a sua chave de acesso.` | A rota exige sessão de acesso e o cookie `hd_session` falta, venceu, foi encerrado ou não existe. A resposta não diferencia o motivo |
| 403 | `forbidden_origin` | `origem não permitida` | Método `POST`, `PUT`, `PATCH` ou `DELETE` em `/api/*` com cabeçalho `Origin` diferente de `APP_ORIGIN` |
| 404 | `not_found` | `recurso não encontrado` | Nenhuma rota atende o caminho. Com o banco aberto, um caminho desconhecido em `/api/*` sem sessão responde 401 antes |
| 500 | `internal_error` | `erro interno do servidor` | Erro inesperado; o motivo vai para o log, não para a resposta |

O erro de domínio de cada story acrescenta o próprio `code`, com a `message` do cenário do PRD. O `kind` do `DomainError` define o status: `invalid` 400, `unauthenticated` 401, `not_found` 404, `conflict` 409 e `not_found_reference` 422 (`apps/api/src/http/errors.ts`). O 404 de domínio vale para o recurso do caminho da rota que não existe, como o programa ou a letra (US-F02-01). A referência no corpo que não existe, como o exercício, responde 422.

## Sessão de acesso e guardas

- A guarda de sessão (`apps/api/src/modules/auth/session.middleware.ts`) protege `/api/*` em todos os ambientes. A lista de rotas públicas é fechada: `GET /api/health` e as quatro rotas da cerimônia de cadastro e de entrada. Uma rota nova nasce protegida.
- A guarda de origem (`apps/api/src/http/origin-guard.ts`) roda antes da guarda de sessão. Sem cabeçalho `Origin`, a requisição segue: cliente fora do navegador não carrega o cookie de outra pessoa.
- A guarda, as rotas de dados, o documento OpenAPI e o Swagger UI só existem quando a API abriu o banco. Sem banco, só `/api/health` responde.
- O `/mcp` não muda nesta story: responde 404 em produção e funciona fora de produção com a guarda de host, até a US-F16-01.
- Quando o uso renova a sessão de acesso (no máximo uma vez por dia), a resposta reenvia o cookie `hd_session` com `Max-Age` de 30 dias.

O cookie `hd_session` tem `HttpOnly`, `SameSite=Lax`, `Path=/`, `Max-Age=2592000` (30 dias) e `Secure` quando `APP_ORIGIN` usa `https`. O cookie não tem `Domain`. O valor é um token aleatório de 32 bytes em base64url; o banco guarda só o SHA-256 (`dados.md`).

## GET /api/health

| Campo | Valor |
|---|---|
| Objetivo | Informar se a API está no ar e se o banco responde |
| Story | EN-S0 |
| Autenticação | Nenhuma (`security: []`). A resposta não traz dado de treino nem configuração |
| Efeito colateral | Nenhum. A rota executa `SELECT 1` no banco |
| Idempotência | Idempotente |

| Status | Corpo | Quando |
|---|---|---|
| 200 | `{ "status": "ok", "database": "up" }` | O banco responde ao `SELECT 1` |
| 503 | `{ "status": "unavailable", "database": "down" }` | O banco não abriu ou não responde |
| 500 | `{ "code": "internal_error", "message": "erro interno do servidor" }` | Erro inesperado |

O serviço `api` do Compose usa a rota como healthcheck.

## Autenticação

As seis rotas desta seção vêm da US-F14-01 (ADR-019). A credencial é a chave de acesso (passkey, WebAuthn) com verificação do usuário. O corpo das cerimônias leva a resposta do navegador (`RegistrationResponseJSON` ou `AuthenticationResponseJSON`, da `@simplewebauthn/browser`) no campo `response`, como objeto JSON livre: o adaptador da biblioteca valida o conteúdo. O desafio de cada cerimônia vale 5 minutos, uma vez só, e fica na memória do processo da API.

| Status | `code` | `message` | Quando |
|---|---|---|---|
| 400 | `enrollment_token_invalid` | `Link de cadastro inválido ou vencido. Gere outro link no servidor.` | O token do link de cadastro falta, não existe, venceu (15 minutos) ou já foi usado |
| 400 | `enrollment_failed` | `Não foi possível criar a chave de acesso. Tente de novo.` | O desafio falta, venceu, foi usado ou é de outra cerimônia, ou a biblioteca recusou a resposta |
| 401 | `sign_in_failed` | `Não foi possível entrar. Tente de novo.` | A chave de acesso não está cadastrada, o desafio falta, venceu, foi usado ou é de cadastro, ou a biblioteca recusou a resposta (origem, RP ID, verificação do usuário, assinatura ou contador menor) |

As respostas de erro e o log não trazem token, desafio nem chave pública (FR-028). A exceção da biblioteca, que cita o desafio na mensagem, vira a recusa da cerimônia sem passar pelo log.

### POST /api/auth/enrollment/options

| Campo | Valor |
|---|---|
| Objetivo | Começar o cadastro de uma chave de acesso com o token do link de cadastro |
| Story | US-F14-01 |
| Autenticação | Nenhuma (`security: []`). O token do link de cadastro é a permissão |
| Corpo | `{ "token": "<token do fragmento do link>" }` |
| Efeito colateral | Emite um desafio de cadastro. No primeiro cadastro, grava o `user.id` estável em `settings` (chave `webauthn_user_id`) |
| Idempotência | Não idempotente: cada chamada emite um desafio novo. O token não é consumido |

| Status | Corpo | Quando |
|---|---|---|
| 200 | Opções para `navigator.credentials.create()`: `rp.id` igual ao RP ID, `user.id` estável, `authenticatorSelection` com `residentKey` e `userVerification` `required`, `attestation` `none`, `excludeCredentials` com as chaves cadastradas | O token vale |
| 400 | `enrollment_token_invalid` | O token não vale |
| 403 | `forbidden_origin` | `Origin` de outro site |
| 500 | `internal_error` | Erro inesperado |

### POST /api/auth/enrollment/verify

| Campo | Valor |
|---|---|
| Objetivo | Concluir o cadastro, consumir o link de cadastro e abrir uma sessão de acesso |
| Story | US-F14-01 |
| Autenticação | Nenhuma (`security: []`) |
| Corpo | `{ "token": "<token>", "response": RegistrationResponseJSON }` |
| Efeito colateral | Consome o desafio. Depois da verificação, numa transação, consome o token (`UPDATE … WHERE used_at IS NULL AND expires_at > ?`) e grava a chave em `auth_credentials`. Cria a sessão de acesso e grava o cookie `hd_session` |
| Idempotência | Não idempotente. Duas verificações simultâneas com o mesmo token cadastram uma chave só; a segunda recebe `enrollment_token_invalid` |

| Status | Corpo | Quando |
|---|---|---|
| 201 | `{ "expiresAt" }`, com `Set-Cookie: hd_session=…` | A chave foi cadastrada |
| 400 | `enrollment_token_invalid` ou `enrollment_failed` | O token não vale, ou a cerimônia falhou. Na falha da cerimônia, o token continua sem uso |
| 403 | `forbidden_origin` | `Origin` de outro site |
| 500 | `internal_error` | Erro inesperado |

### POST /api/auth/sign-in/options

| Campo | Valor |
|---|---|
| Objetivo | Começar a entrada com uma chave de acesso descoberta pelo autenticador |
| Story | US-F14-01 |
| Autenticação | Nenhuma (`security: []`) |
| Corpo | Nenhum |
| Efeito colateral | Emite um desafio de entrada |
| Idempotência | Não idempotente: cada chamada emite um desafio novo |

| Status | Corpo | Quando |
|---|---|---|
| 200 | Opções para `navigator.credentials.get()`: `rpId`, `userVerification` `required`, sem `allowCredentials` | Sempre |
| 403 | `forbidden_origin` | `Origin` de outro site |
| 500 | `internal_error` | Erro inesperado |

### POST /api/auth/sign-in/verify

| Campo | Valor |
|---|---|
| Objetivo | Concluir a entrada e abrir uma sessão de acesso |
| Story | US-F14-01 |
| Autenticação | Nenhuma (`security: []`) |
| Corpo | `{ "response": AuthenticationResponseJSON }` |
| Efeito colateral | Consome o desafio, busca a chave pelo `id` da resposta e verifica com a chave pública e o contador gravados. Atualiza `counter` e `last_used_at`, cria a sessão de acesso e grava o cookie `hd_session` |
| Idempotência | Não idempotente. O mesmo desafio não entra duas vezes |

| Status | Corpo | Quando |
|---|---|---|
| 200 | `{ "expiresAt" }`, com `Set-Cookie: hd_session=…` | A chave foi verificada |
| 400 | `invalid_request` | O corpo não é um objeto JSON |
| 401 | `sign_in_failed` | A entrada foi recusada; nenhuma sessão é criada |
| 403 | `forbidden_origin` | `Origin` de outro site |
| 500 | `internal_error` | Erro inesperado |

### GET /api/auth/session

| Campo | Valor |
|---|---|
| Objetivo | Dizer se a sessão de acesso do cookie vale, para o app web escolher entre a tela pedida e a tela de entrada |
| Story | US-F14-01 |
| Autenticação | Sessão de acesso |
| Efeito colateral | Pode renovar a sessão de acesso, como qualquer rota protegida |
| Idempotência | Idempotente |

| Status | Corpo | Quando |
|---|---|---|
| 200 | `{ "expiresAt" }` | A sessão de acesso vale. O corpo não traz dado de treino |
| 401 | `unauthenticated` | Sem sessão de acesso válida |
| 500 | `internal_error` | Erro inesperado |

### DELETE /api/auth/session

| Campo | Valor |
|---|---|
| Objetivo | Encerrar a sessão de acesso (saída) |
| Story | US-F14-01 |
| Autenticação | Sessão de acesso |
| Efeito colateral | Apaga a linha de `auth_sessions` e responde com `Set-Cookie` que apaga `hd_session` (`Max-Age=0`) |
| Idempotência | A primeira chamada responde 204; a seguinte, com o cookie antigo, responde 401 |

| Status | Corpo | Quando |
|---|---|---|
| 204 | Nenhum | A sessão de acesso terminou |
| 401 | `unauthenticated` | Sem sessão de acesso válida |
| 403 | `forbidden_origin` | `Origin` de outro site |
| 500 | `internal_error` | Erro inesperado |

## Catálogo de grupos musculares e músculos

As três rotas desta seção vêm da US-F01-01. As rotas existem só quando a API abriu o banco e exigem sessão de acesso em todos os ambientes (US-F14-01).

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
| Autenticação | Sessão de acesso (cookie `hd_session`) |
| Efeito colateral | Nenhum |
| Idempotência | Idempotente |

| Status | Corpo | Quando |
|---|---|---|
| 200 | `{ "muscleGroups": [{ "id", "slug", "name", "position" }] }` | Sempre que o banco responde |
| 401 | `{ "code": "unauthenticated", "message": "Entre com a sua chave de acesso." }` | Sem sessão de acesso válida |
| 500 | `{ "code": "internal_error", "message": "erro interno do servidor" }` | Erro inesperado |

A semente do banco cria os grupos com slug em inglês (`chest`, `back`, `lower-back`, `shoulders`, `biceps`, `triceps`, `abs`, `quadriceps`, `hamstrings`, `glutes`, `calves`) e nome em português. Uma nova execução da semente mantém o `id` de cada grupo.

### GET /api/muscles

| Campo | Valor |
|---|---|
| Objetivo | Listar os músculos cadastrados, cada um com o grupo muscular, em ordem de `slug` |
| Story | US-F01-01 |
| Autenticação | Sessão de acesso (cookie `hd_session`) |
| Efeito colateral | Nenhum |
| Idempotência | Idempotente |

| Status | Corpo | Quando |
|---|---|---|
| 200 | `{ "muscles": [{ "id", "slug", "name", "muscleGroup": { "id", "slug", "name" } }] }` | Sempre que o banco responde |
| 401 | `{ "code": "unauthenticated", "message": "Entre com a sua chave de acesso." }` | Sem sessão de acesso válida |
| 500 | `{ "code": "internal_error", "message": "erro interno do servidor" }` | Erro inesperado |

### POST /api/muscles

| Campo | Valor |
|---|---|
| Objetivo | Cadastrar um músculo num grupo muscular |
| Story | US-F01-01 |
| Autenticação | Sessão de acesso (cookie `hd_session`) |
| Corpo | `{ "name": "tríceps braquial", "muscleGroupSlug": "triceps" }`. Os dois campos são opcionais no schema, e o service recusa o campo ausente com o erro de domínio |
| Efeito colateral | Grava uma linha em `muscles`. O nome fica sem os espaços das pontas. O slug vem do nome, sem acento, em caixa baixa e com `-` no lugar dos caracteres que não são letra nem dígito |
| Idempotência | Não idempotente. A repetição do mesmo músculo recusa com 409 `muscle_already_exists` |

| Status | Corpo | Quando |
|---|---|---|
| 201 | `{ "id", "slug", "name", "muscleGroup": { "id", "slug", "name" } }` | O músculo foi cadastrado |
| 400 | `{ "code": "muscle_group_required" \| "muscle_name_required", "message" }` | Falta o grupo ou o nome |
| 400 | `{ "code": "invalid_request", "message": "requisição inválida" }` | O corpo não é JSON, ou um campo não é texto |
| 401 | `{ "code": "unauthenticated", "message": "Entre com a sua chave de acesso." }` | Sem sessão de acesso válida |
| 409 | `{ "code": "muscle_already_exists", "message": "músculo já cadastrado" }` | O músculo já existe |
| 422 | `{ "code": "muscle_group_not_found", "message": "grupo muscular não encontrado" }` | O grupo não existe no catálogo |
| 500 | `{ "code": "internal_error", "message": "erro interno do servidor" }` | Erro inesperado |

## Catálogo de exercícios

As duas rotas desta seção vêm da US-F01-02. Como as rotas de músculo, elas existem só quando a API abriu o banco e exigem sessão de acesso.

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
| Autenticação | Sessão de acesso (cookie `hd_session`) |
| Efeito colateral | Nenhum |
| Idempotência | Idempotente |

| Status | Corpo | Quando |
|---|---|---|
| 200 | `{ "exercises": [Exercise] }` | Sempre que o banco responde |
| 401 | `{ "code": "unauthenticated", "message": "Entre com a sua chave de acesso." }` | Sem sessão de acesso válida |
| 500 | `{ "code": "internal_error", "message": "erro interno do servidor" }` | Erro inesperado |

O objeto `Exercise` tem a forma `{ "id", "slug", "name", "kind", "muscles": [{ "id", "slug", "name", "role", "muscleGroup": { "id", "slug", "name" } }], "muscleGroups": [{ "id", "slug", "name" }] }`. O `kind` é `reps` ou `time`, e o `role` é `primary` ou `secondary`. Os músculos vêm com os principais antes dos secundários e, em cada papel, em ordem de `slug`. Os grupos vêm sem repetição, na ordem de `position`.

### POST /api/exercises

| Campo | Valor |
|---|---|
| Objetivo | Cadastrar um exercício de repetição ou de tempo com os músculos que ele ativa |
| Story | US-F01-02 |
| Autenticação | Sessão de acesso (cookie `hd_session`) |
| Corpo | `{ "name": "Supino reto", "kind": "reps", "primaryMuscleSlugs": ["peitoral-maior"], "secondaryMuscleSlugs": ["triceps-braquial"] }`. Os quatro campos são opcionais no schema, e o service recusa o campo ausente ou inválido com o erro de domínio. Os slugs vêm de `GET /api/muscles` |
| Efeito colateral | Grava uma linha em `exercises` e uma linha em `exercise_muscles` por músculo. O nome fica sem os espaços das pontas, e o slug segue a mesma regra do slug do músculo. O cadastro é atômico: em qualquer recusa ou falha, nenhuma linha fica gravada |
| Idempotência | Não idempotente. A repetição do mesmo exercício recusa com 409 `exercise_already_exists` |

| Status | Corpo | Quando |
|---|---|---|
| 201 | `Exercise` | O exercício foi cadastrado |
| 400 | `{ "code": "exercise_name_required" \| "exercise_kind_required" \| "exercise_kind_invalid" \| "exercise_muscle_required" \| "exercise_muscle_duplicated", "message" }` | A entrada está incompleta ou inválida |
| 400 | `{ "code": "invalid_request", "message": "requisição inválida" }` | O corpo não é JSON, um campo de texto não é texto ou uma lista de slugs não é lista de textos |
| 401 | `{ "code": "unauthenticated", "message": "Entre com a sua chave de acesso." }` | Sem sessão de acesso válida |
| 409 | `{ "code": "exercise_already_exists", "message": "exercício já cadastrado" }` | O exercício já existe |
| 422 | `{ "code": "muscle_not_found", "message": "músculo não encontrado" }` | Um músculo informado não existe no catálogo |
| 500 | `{ "code": "internal_error", "message": "erro interno do servidor" }` | Erro inesperado |

## Programa

As cinco rotas desta seção vêm da US-F02-01. As rotas existem só quando a API abriu o banco e exigem sessão de acesso em todos os ambientes (ADR-019). As ferramentas MCP `create_program`, `add_program_day`, `add_planned_exercise`, `get_program` e `list_programs` chamam o mesmo service, `apps/api/src/modules/programs/program.service.ts`, e devolvem o mesmo objeto e as mesmas recusas (`mcp.md`).

Cada ação de escrita é atômica: em qualquer recusa ou falha, nenhuma linha fica gravada e o programa ativo não muda. A carga trafega em gramas (`loadG`), e o alvo de tempo e o descanso trafegam em segundos (`targetSeconds`, `restSeconds`). Toda medida é um inteiro até `Number.MAX_SAFE_INTEGER`, sem fração.

O objeto `Program` tem a forma `{ "id", "name", "goal", "isActive", "createdAt", "days": [ProgramDay] }`. O `goal` é `strength`, `hypertrophy` ou `endurance`, e o `createdAt` vem em ISO 8601, em UTC. O objeto `ProgramDay` tem a forma `{ "letter", "label", "exercises": [PlannedExercise] }`, com as letras na ordem do plano (ordem de inclusão). O `label` fica `null` na letra sem nome. O objeto `PlannedExercise` tem a forma `{ "exercise": { "id", "slug", "name", "kind" }, "sets", "targetReps", "targetSeconds", "loadG", "restSeconds" }`, com os exercícios na ordem da letra (ordem de inclusão). O exercício de repetição tem `targetReps` preenchido e `targetSeconds` nulo; o exercício de tempo tem o contrário.

| Status | `code` | `message` | Quando |
|---|---|---|---|
| 400 | `program_name_required` | `informe o nome do programa` | O corpo não traz `name`, ou o nome fica vazio depois do `trim` |
| 400 | `program_goal_required` | `informe o objetivo do programa` | O corpo não traz `goal`, ou traz um texto vazio |
| 400 | `program_goal_invalid` | `objetivo inválido` | O `goal` não é `strength`, `hypertrophy` nem `endurance` |
| 400 | `program_day_letter_required` | `informe a letra` | O corpo não traz `letter`, ou traz um texto vazio |
| 400 | `program_day_letter_invalid` | `a letra deve ser de A a Z` | A letra do corpo ou do caminho não é um caractere só de A a Z, em maiúscula ou minúscula. Letra acentuada, número e símbolo são recusados |
| 400 | `planned_exercise_exercise_required` | `informe o exercício` | O corpo não traz `exerciseSlug`, ou traz um texto vazio |
| 400 | `planned_exercise_sets_invalid` | `informe as séries, a partir de 1` | O corpo não traz `sets`, ou `sets` não é inteiro a partir de 1 |
| 400 | `planned_exercise_load_required` | `informe a carga` | O corpo não traz `loadG` |
| 400 | `planned_exercise_load_invalid` | `carga inválida` | O `loadG` é negativo, tem fração ou passa do inteiro seguro |
| 400 | `planned_exercise_rest_required` | `informe o descanso` | O corpo não traz `restSeconds` |
| 400 | `planned_exercise_rest_invalid` | `descanso inválido` | O `restSeconds` é negativo, tem fração ou passa do inteiro seguro |
| 400 | `planned_exercise_target_time` | `este exercício é medido por tempo` | O corpo traz `targetReps` para um exercício de tempo, com ou sem `targetSeconds` |
| 400 | `planned_exercise_target_reps` | `este exercício é medido por repetições` | O corpo traz `targetSeconds` para um exercício de repetição, com ou sem `targetReps` |
| 400 | `planned_exercise_target_required` | `informe o alvo da série` | O exercício de repetição vem sem `targetReps`, ou o de tempo vem sem `targetSeconds`. O valor `null` conta como ausente |
| 400 | `planned_exercise_target_invalid` | `alvo inválido` | O alvo não é inteiro a partir de 1 |
| 404 | `program_not_found` | `programa não encontrado` | Nenhum programa tem o `programId` do caminho |
| 404 | `program_day_not_found` | `letra não encontrada no programa` | O programa não tem a letra do caminho |
| 409 | `program_day_letter_duplicated` | `letra já existe no programa` | O programa já tem a letra. A comparação usa a letra em maiúscula |
| 409 | `planned_exercise_duplicated` | `exercício já está na letra` | A letra já tem o exercício. O mesmo exercício em outra letra é aceito |
| 422 | `exercise_not_found` | `exercício não encontrado` | O slug não existe no catálogo, ou o exercício está arquivado |

O service confere a entrada nesta ordem e devolve só a primeira recusa:

- Criar programa: nome, objetivo ausente, objetivo inválido.
- Acrescentar letra: letra ausente, letra inválida, programa, letra repetida.
- Acrescentar exercício do programa: letra inválida, exercício ausente, séries, carga ausente, carga inválida, descanso ausente, descanso inválido, programa, letra no programa, exercício no catálogo, alvo do tipo errado, alvo ausente, alvo inválido, exercício já na letra.

A entrada é conferida antes das consultas ao banco. O alvo é a exceção, porque o tipo do exercício só aparece depois da busca no catálogo.

### POST /api/programs

| Campo | Valor |
|---|---|
| Objetivo | Criar um programa com nome e objetivo. O programa criado passa a ser o único programa ativo |
| Story | US-F02-01 |
| Autenticação | Sessão de acesso (cookie `hd_session`) |
| Corpo | `{ "name": "Programa 1", "goal": "hypertrophy" }`. Os dois campos são opcionais no schema, e o service recusa o campo ausente ou inválido com o erro de domínio. O nome não precisa ser único |
| Efeito colateral | Desativa o programa ativo anterior e grava uma linha em `programs` com `is_active` verdadeiro, na mesma transação. O nome fica sem os espaços das pontas. O `createdAt` vem do relógio da API |
| Idempotência | Não idempotente. Cada chamada cria um programa novo |

| Status | Corpo | Quando |
|---|---|---|
| 201 | `Program`, sem letras | O programa foi criado |
| 400 | `{ "code": "program_name_required" \| "program_goal_required" \| "program_goal_invalid", "message" }` | A entrada está incompleta ou inválida |
| 400 | `{ "code": "invalid_request", "message": "requisição inválida" }` | O corpo não é JSON, ou um campo não é texto |
| 401 | `{ "code": "unauthenticated", "message": "Entre com a sua chave de acesso." }` | Sem sessão de acesso válida |
| 500 | `{ "code": "internal_error", "message": "erro interno do servidor" }` | Erro inesperado |

### GET /api/programs

| Campo | Valor |
|---|---|
| Objetivo | Listar os programas com as letras e os exercícios do programa |
| Story | US-F02-01 |
| Autenticação | Sessão de acesso (cookie `hd_session`) |
| Efeito colateral | Nenhum |
| Idempotência | Idempotente |

| Status | Corpo | Quando |
|---|---|---|
| 200 | `{ "programs": [Program] }` | Sempre que o banco responde. O programa ativo vem primeiro, e os outros vêm do mais novo para o mais antigo por `createdAt`. O `id` decrescente desempata dois programas do mesmo milissegundo |
| 401 | `{ "code": "unauthenticated", "message": "Entre com a sua chave de acesso." }` | Sem sessão de acesso válida |
| 500 | `{ "code": "internal_error", "message": "erro interno do servidor" }` | Erro inesperado |

### GET /api/programs/{programId}

| Campo | Valor |
|---|---|
| Objetivo | Mostrar um programa com as letras na ordem do plano e os exercícios de cada letra na ordem da letra |
| Story | US-F02-01 |
| Autenticação | Sessão de acesso (cookie `hd_session`) |
| Efeito colateral | Nenhum |
| Idempotência | Idempotente |

| Status | Corpo | Quando |
|---|---|---|
| 200 | `Program` | O programa existe |
| 401 | `{ "code": "unauthenticated", "message": "Entre com a sua chave de acesso." }` | Sem sessão de acesso válida |
| 404 | `{ "code": "program_not_found", "message": "programa não encontrado" }` | Nenhum programa tem o `programId`. Um `programId` que não é UUID também responde 404 |
| 500 | `{ "code": "internal_error", "message": "erro interno do servidor" }` | Erro inesperado |

### POST /api/programs/{programId}/days

| Campo | Valor |
|---|---|
| Objetivo | Acrescentar uma letra ao fim da ordem do plano |
| Story | US-F02-01 |
| Autenticação | Sessão de acesso (cookie `hd_session`) |
| Corpo | `{ "letter": "A", "label": "Superior" }`. A `letter` é opcional no schema, e o service recusa a letra ausente ou inválida. O `label` é opcional e aceita `null` |
| Efeito colateral | Grava uma linha em `program_days` com a letra em maiúscula e `position` igual à maior `position` do programa mais 1, a partir de 1. O nome fica sem os espaços das pontas, e o nome vazio, só com espaços, nulo ou ausente fica `null` |
| Idempotência | Não idempotente. A repetição da mesma letra recusa com 409 `program_day_letter_duplicated` |

| Status | Corpo | Quando |
|---|---|---|
| 201 | `Program`, com a letra nova no fim | A letra foi acrescentada |
| 400 | `{ "code": "program_day_letter_required" \| "program_day_letter_invalid", "message" }` | A letra falta ou não é de A a Z |
| 400 | `{ "code": "invalid_request", "message": "requisição inválida" }` | O corpo não é JSON, ou um campo não é texto |
| 401 | `{ "code": "unauthenticated", "message": "Entre com a sua chave de acesso." }` | Sem sessão de acesso válida |
| 404 | `{ "code": "program_not_found", "message": "programa não encontrado" }` | Nenhum programa tem o `programId` |
| 409 | `{ "code": "program_day_letter_duplicated", "message": "letra já existe no programa" }` | O programa já tem a letra |
| 500 | `{ "code": "internal_error", "message": "erro interno do servidor" }` | Erro inesperado |

### POST /api/programs/{programId}/days/{letter}/exercises

| Campo | Valor |
|---|---|
| Objetivo | Acrescentar um exercício do catálogo ao fim de uma letra, com séries, alvo, carga e descanso |
| Story | US-F02-01 |
| Autenticação | Sessão de acesso (cookie `hd_session`) |
| Corpo | `{ "exerciseSlug": "supino-reto", "sets": 3, "targetReps": 10, "loadG": 40000, "restSeconds": 90 }` para um exercício de repetição; `{ "exerciseSlug": "prancha", "sets": 3, "targetSeconds": 45, "loadG": 0, "restSeconds": 60 }` para um exercício de tempo. Os campos são opcionais no schema, e o service recusa o campo ausente ou inválido. `targetReps` e `targetSeconds` aceitam `null`. O slug vem de `GET /api/exercises`. A letra do caminho aceita minúscula |
| Efeito colateral | Grava uma linha em `planned_exercises` com `position` igual à maior `position` da letra mais 1, a partir de 1. A carga zero e o descanso zero são aceitos |
| Idempotência | Não idempotente. A repetição do mesmo exercício na mesma letra recusa com 409 `planned_exercise_duplicated` |

| Status | Corpo | Quando |
|---|---|---|
| 201 | `Program`, com o exercício novo no fim da letra | O exercício foi acrescentado |
| 400 | `{ "code", "message" }` com `program_day_letter_invalid` ou um dos `code` 400 que começam com `planned_exercise_` | A letra do caminho ou o corpo está incompleto ou inválido |
| 400 | `{ "code": "invalid_request", "message": "requisição inválida" }` | O corpo não é JSON, `exerciseSlug` não é texto ou uma medida não é número |
| 401 | `{ "code": "unauthenticated", "message": "Entre com a sua chave de acesso." }` | Sem sessão de acesso válida |
| 404 | `{ "code": "program_not_found" \| "program_day_not_found", "message" }` | O programa ou a letra não existe |
| 409 | `{ "code": "planned_exercise_duplicated", "message": "exercício já está na letra" }` | A letra já tem o exercício |
| 422 | `{ "code": "exercise_not_found", "message": "exercício não encontrado" }` | O exercício não existe no catálogo ou está arquivado |
| 500 | `{ "code": "internal_error", "message": "erro interno do servidor" }` | Erro inesperado |

## Situação do app

A rota desta seção vem da US-F14-02. A rota existe só quando a API abriu o banco e exige sessão de acesso (US-F14-01). A ferramenta MCP `get_system_status` devolve o mesmo objeto (`mcp.md`), pelo mesmo service `getSystemStatus`, em `apps/api/src/modules/system/system-status.service.ts`.

### GET /api/system/status

| Campo | Valor |
|---|---|
| Objetivo | Mostrar a situação do backup diário: a execução mais recente, a última bem-sucedida e as execuções recentes |
| Story | US-F14-02 |
| Autenticação | Sessão de acesso (cookie `hd_session`) |
| Efeito colateral | Nenhum. A rota só lê a tabela `backup_runs` |
| Idempotência | Idempotente |

| Status | Corpo | Quando |
|---|---|---|
| 200 | `{ "backup": { "latestRun", "lastSuccessfulRun", "recentRuns" } }` | Sempre que o banco responde |
| 401 | `{ "code": "unauthenticated", "message": "Entre com a sua chave de acesso." }` | Sem sessão de acesso válida |
| 500 | `{ "code": "internal_error", "message": "erro interno do servidor" }` | Erro inesperado |

Cada execução de backup tem `id`, `startedAt`, `finishedAt`, `status` (`succeeded` ou `failed`), `sizeBytes` e `error`. As datas vêm em ISO 8601, em UTC. `sizeBytes` é o tamanho em bytes da cópia do banco e fica `null` na falha. `error` traz o motivo da falha e fica `null` no sucesso.

- `latestRun` é a execução com o início mais recente, com sucesso ou falha.
- `lastSuccessfulRun` é a execução bem-sucedida mais recente, mesmo quando ela já saiu de `recentRuns`. A data mostra quantos dias o app ficou sem backup.
- `recentRuns` traz até 7 execuções, da mais nova para a mais antiga.

Sem nenhuma execução registrada, a resposta é `{ "backup": { "latestRun": null, "lastSuccessfulRun": null, "recentRuns": [] } }`.

O motivo da falha começa pela etapa em inglês (`snapshot failed` ou `offsite copy failed`) e traz a última linha da saída de erro da ferramenta de cópia. O texto não tem caractere de controle, troca a senha do repositório e a credencial em URL (`://usuário:senha@`) por `***` e tem no máximo 500 caracteres (`docs/arquitetura/backup.md`). Exemplo: `offsite copy failed: Fatal: wrong password or no key found`.
