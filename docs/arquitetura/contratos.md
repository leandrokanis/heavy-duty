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

- A guarda de sessão (`apps/api/src/modules/auth/session.middleware.ts`) protege `/api/*` em todos os ambientes. A lista de rotas públicas é fechada: `GET /api/health`, as quatro rotas da cerimônia de cadastro e de entrada, `POST /api/oauth/register` e `POST /api/oauth/token` (ADR-020), e `POST /api/email/unsubscribe` (ADR-037, adendo da ADR-019). Uma rota nova nasce protegida.
- A guarda de origem (`apps/api/src/http/origin-guard.ts`) roda antes da guarda de sessão. Sem cabeçalho `Origin`, a requisição segue: cliente fora do navegador não carrega o cookie de outra pessoa.
- A guarda, as rotas de dados, o documento OpenAPI e o Swagger UI só existem quando a API abriu o banco. Sem banco, só `/api/health` responde.
- O `/mcp` exige a credencial do MCP em todos os ambientes, inclusive em produção (US-F16-01, ADR-020). O cookie `hd_session` não abre o `/mcp`, e a credencial do MCP não abre `/api/*`. O transporte e as ferramentas estão em `mcp.md`.
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

## Autorização do MCP

As rotas desta seção vêm da US-F16-01 (ADR-020). O app é o próprio servidor de autorização OAuth 2.1 do `/mcp`: o cliente do MCP (o conector do Claude) descobre os metadados, se registra, pede autorização, o PO aprova na tela `/autorizar` do app web com a sessão de acesso, e o cliente troca o código por uma credencial do MCP. O banco guarda só o SHA-256 do código, da credencial e do token de renovação (`dados.md`).

As rotas de descoberta, registro e token usam o formato de erro dos RFC 6749 e 7591, que o cliente OAuth lê: `{ "error", "error_description" }`, com `error_description` em inglês (o RFC só aceita ASCII). A prévia e a decisão usam o formato comum `{ code, message }`, que a tela lê. Nenhuma rota desta seção responde com CORS. Sem banco, nenhuma delas é montada: 404.

| Formato | Status | Código | Quando |
|---|---|---|---|
| OAuth | 400 | `invalid_redirect_uri` | O registro traz `redirect_uris` vazio, com mais de 5 itens, com item acima de 2.048 caracteres, com fragmento ou fora de `https` e do loopback (`localhost`, `127.0.0.1`, `[::1]`) |
| OAuth | 400 | `invalid_client_metadata` | O corpo do registro não é JSON, `redirect_uris` não é lista de texto ou `client_name` passa de 100 caracteres |
| OAuth | 400 | `invalid_request` | Falta `grant_type`, `code`, `redirect_uri`, `code_verifier` ou `refresh_token`, ou o corpo do token não passa no schema |
| OAuth | 401 | `invalid_client` | O `client_id` do token falta ou não existe |
| OAuth | 400 | `invalid_grant` | O código ou o token de renovação não existe, venceu, foi usado, foi revogado, é de outro cliente, tem outro `redirect_uri` ou o `code_verifier` não confere |
| OAuth | 400 | `invalid_target` | O `resource` do token difere do recurso da autorização |
| OAuth | 400 | `unsupported_grant_type` | `grant_type` diferente de `authorization_code` e `refresh_token` |
| OAuth | 413 | `invalid_request` | O corpo do registro ou do token passa de 16 KiB |
| Comum | 400 | `oauth_client_unknown` (`Cliente do MCP desconhecido. Conecte o cliente de novo.`) | A prévia ou a decisão traz `client_id` ausente ou desconhecido |
| Comum | 400 | `oauth_redirect_uri_invalid` (`Endereço de retorno não registrado por este cliente do MCP.`) | A prévia ou a decisão traz `redirect_uri` ausente ou diferente, letra por letra, dos registrados pelo cliente |

### GET /.well-known/oauth-protected-resource/mcp e GET /.well-known/oauth-protected-resource

| Campo | Valor |
|---|---|
| Objetivo | Descrever o `/mcp` como recurso protegido (RFC 9728). A raiz atende o cliente que tenta o caminho sem sufixo |
| Story | US-F16-01 |
| Autenticação | Nenhuma (`security: []`). O documento não traz dado de treino |
| Efeito colateral | Nenhum |
| Idempotência | Idempotente |

| Status | Corpo | Quando |
|---|---|---|
| 200 | `{ "resource": "<APP_ORIGIN>/mcp", "authorization_servers": ["<APP_ORIGIN>"], "bearer_methods_supported": ["header"], "resource_name": "Heavy Duty MCP" }` | Sempre, com banco |

### GET /.well-known/oauth-authorization-server

| Campo | Valor |
|---|---|
| Objetivo | Descrever o servidor de autorização do app (RFC 8414) |
| Story | US-F16-01 |
| Autenticação | Nenhuma (`security: []`) |
| Efeito colateral | Nenhum |
| Idempotência | Idempotente |

| Status | Corpo | Quando |
|---|---|---|
| 200 | `issuer` `<APP_ORIGIN>`, `authorization_endpoint` `<APP_ORIGIN>/autorizar`, `token_endpoint` `<APP_ORIGIN>/api/oauth/token`, `registration_endpoint` `<APP_ORIGIN>/api/oauth/register`, `response_types_supported` `["code"]`, `grant_types_supported` `["authorization_code", "refresh_token"]`, `code_challenge_methods_supported` `["S256"]`, `token_endpoint_auth_methods_supported` `["none"]` | Sempre, com banco |

Todas as URLs dos documentos vêm de `APP_ORIGIN`, nunca do cabeçalho `Host`.

### POST /api/oauth/register

| Campo | Valor |
|---|---|
| Objetivo | Registrar um cliente público do MCP (RFC 7591) |
| Story | US-F16-01 |
| Autenticação | Nenhuma (`security: []`). O cliente registrado não acessa nada até o PO aprovar |
| Corpo | JSON com `redirect_uris` (1 a 5) e, opcional, `client_name` (até 100 caracteres). Outros campos são ignorados, inclusive `token_endpoint_auth_method` e `scope` |
| Efeito colateral | Apaga os clientes nunca aprovados com mais de 24 horas. Com 20 clientes nunca aprovados, apaga o mais antigo deles. Grava o cliente em `oauth_clients`. Cliente aprovado nunca sai pelo despejo |
| Idempotência | Não idempotente: cada chamada registra um cliente novo |

| Status | Corpo | Quando |
|---|---|---|
| 201 | `{ "client_id", "client_id_issued_at", "client_name"?, "redirect_uris", "grant_types": ["authorization_code", "refresh_token"], "response_types": ["code"], "token_endpoint_auth_method": "none" }` | O cliente foi registrado, sem segredo |
| 400 | `invalid_redirect_uri` ou `invalid_client_metadata` | Metadados recusados; nada é gravado |
| 413 | `invalid_request` | Corpo acima de 16 KiB; nada é gravado |
| 500 | `internal_error` | Erro inesperado |

### GET /api/oauth/authorization

| Campo | Valor |
|---|---|
| Objetivo | Conferir um pedido de autorização e descrever o pedido para a tela `/autorizar` |
| Story | US-F16-01 |
| Autenticação | Sessão de acesso |
| Query | Os parâmetros do pedido: `response_type`, `client_id`, `redirect_uri`, `code_challenge`, `code_challenge_method`, `state`, `resource` e `scope` (ignorado) |
| Efeito colateral | Nenhum |
| Idempotência | Idempotente |

O cliente e o `redirect_uri` são conferidos primeiro: enquanto os dois não valem, nada redireciona. Depois, `response_type` diferente de `code`, `code_challenge` ausente ou `code_challenge_method` diferente de `S256` voltam ao `redirect_uri` com `error=invalid_request`; `resource` presente e diferente de `<APP_ORIGIN>/mcp`, sem barra final, volta com `error=invalid_target`. O `state` acompanha o erro.

| Status | Corpo | Quando |
|---|---|---|
| 200 | `{ "kind": "consent", "clientName", "redirectHost" }` | O pedido vale. `clientName` é o nome declarado pelo cliente (pode ser `null`); `redirectHost` é o host do `redirect_uri`, o dado confiável |
| 200 | `{ "kind": "error_redirect", "redirectTo" }` | O pedido falhou depois de o cliente e o `redirect_uri` valerem |
| 400 | `oauth_client_unknown` ou `oauth_redirect_uri_invalid` | A tela mostra a mensagem e não redireciona |
| 401 | `unauthenticated` | Sem sessão de acesso |
| 500 | `internal_error` | Erro inesperado |

### POST /api/oauth/authorization

| Campo | Valor |
|---|---|
| Objetivo | Aprovar ou recusar um pedido de autorização |
| Story | US-F16-01 |
| Autenticação | Sessão de acesso e guarda de origem |
| Corpo | JSON com os parâmetros do pedido e `decision` (`approve` ou `deny`) |
| Efeito colateral | Confere o pedido de novo, como a prévia. Na aprovação, numa transação, grava o SHA-256 de um código aleatório de 32 bytes, válido por 5 minutos, em `oauth_authorization_codes` e marca `approved_at` do cliente na primeira aprovação. A recusa não grava nada |
| Idempotência | Não idempotente: cada aprovação emite um código novo |

| Status | Corpo | Quando |
|---|---|---|
| 200 | `{ "redirectTo" }` com `code` e `state` | Aprovação |
| 200 | `{ "redirectTo" }` com `error=access_denied` e `state` | Recusa |
| 200 | `{ "redirectTo" }` com `error=invalid_request` ou `invalid_target` | O pedido falhou depois de o cliente e o `redirect_uri` valerem; nenhum código |
| 400 | `oauth_client_unknown`, `oauth_redirect_uri_invalid` ou `invalid_request` | Nada redireciona; nenhum código |
| 401 | `unauthenticated` | Sem sessão de acesso |
| 403 | `forbidden_origin` | `Origin` de outro site |
| 500 | `internal_error` | Erro inesperado |

### POST /api/oauth/token

| Campo | Valor |
|---|---|
| Objetivo | Trocar um código de autorização ou um token de renovação por uma credencial do MCP |
| Story | US-F16-01 |
| Autenticação | Nenhuma (`security: []`). Cliente público: o `client_id` vai no corpo, sem segredo; um `client_secret` enviado é ignorado |
| Corpo | `application/x-www-form-urlencoded`, com `grant_type`, `client_id` e `resource` (opcional). `authorization_code` pede `code`, `redirect_uri` e `code_verifier`; `refresh_token` pede `refresh_token` |
| Efeito colateral | Apaga os códigos vencidos e as autorizações com renovação vencida. `authorization_code`: consome o código de forma atômica (`UPDATE … WHERE used_at IS NULL AND expires_at > ?`), confere cliente, `redirect_uri`, `code_verifier` (`S256`) e recurso, e grava a autorização em `oauth_grants`; se a conferência falha, a transação desfaz o consumo. `refresh_token`: confere hash, cliente, vencimento e revogação e gera credencial e token de renovação novos na mesma linha (rotação), guardando o hash anterior. O token de renovação já trocado que volta é recusado e revoga a autorização inteira |
| Idempotência | Não idempotente: o código vale uma vez, e cada renovação invalida o token de renovação usado |

| Status | Corpo | Quando |
|---|---|---|
| 200 | `{ "access_token", "token_type": "Bearer", "expires_in": 3600, "refresh_token" }`, com `Cache-Control: no-store` | Troca ou renovação aceita. A credencial vale 1 hora; o token de renovação vale 30 dias desde a última emissão |
| 400 | `invalid_request`, `invalid_grant`, `invalid_target` ou `unsupported_grant_type` | Nenhuma credencial |
| 401 | `invalid_client` | `client_id` ausente ou desconhecido |
| 413 | `invalid_request` | Corpo acima de 16 KiB |
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

As cinco primeiras rotas desta seção vêm da US-F02-01, e as seis rotas de edição vêm da US-F02-02. As rotas existem só quando a API abriu o banco e exigem sessão de acesso em todos os ambientes (ADR-019). As ferramentas MCP do programa (`create_program`, `add_program_day`, `add_planned_exercise`, `update_program`, `activate_program`, `update_program_day`, `remove_program_day`, `update_planned_exercise`, `remove_planned_exercise`, `get_program` e `list_programs`) chamam o mesmo service, `apps/api/src/modules/programs/program.service.ts`, e devolvem o mesmo objeto e as mesmas recusas (`mcp.md`).

Nenhuma rota de edição muda treino já registrado (US-F02-02, FR-009). O treino guarda a letra e os valores executados de cada série; quando a letra ou o exercício do programa sai do plano, só o vínculo do treino com o plano fica nulo (`dados.md`, seção "Execução").

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
| 404 | `planned_exercise_not_found` | `exercício não está na letra` | A letra do caminho não tem o exercício do `exerciseSlug`, ou o slug não existe no catálogo. O exercício arquivado depois de entrar na letra continua sendo encontrado |
| 409 | `program_day_letter_duplicated` | `letra já existe no programa` | O programa já tem a letra. A comparação usa a letra em maiúscula |
| 409 | `planned_exercise_duplicated` | `exercício já está na letra` | A letra já tem o exercício. O mesmo exercício em outra letra é aceito |
| 422 | `exercise_not_found` | `exercício não encontrado` | O slug não existe no catálogo, ou o exercício está arquivado |

O service confere a entrada nesta ordem e devolve só a primeira recusa:

- Criar programa: nome, objetivo ausente, objetivo inválido.
- Acrescentar letra: letra ausente, letra inválida, programa, letra repetida.
- Acrescentar exercício do programa: letra inválida, exercício ausente, séries, carga ausente, carga inválida, descanso ausente, descanso inválido, programa, letra no programa, exercício no catálogo, alvo do tipo errado, alvo ausente, alvo inválido, exercício já na letra.
- Mudar programa: nome, objetivo ausente, objetivo inválido, programa.
- Escolher programa ativo: programa.
- Mudar nome da letra e remover letra: letra inválida, programa, letra no programa.
- Mudar exercício do programa: letra inválida, exercício ausente (só no MCP), séries, carga, descanso, programa, letra no programa, exercício na letra, alvo do tipo errado, alvo inválido.
- Remover exercício do programa: letra inválida, exercício ausente (só no MCP), programa, letra no programa, exercício na letra.

Na edição, o campo ausente mantém o valor, e o `null` em `name`, `goal`, `sets`, `loadG`, `restSeconds` ou no alvo do tipo do exercício é recusado como valor inválido, com o `code` da tabela acima. O `null` no alvo do outro tipo é ignorado, porque é o valor que o cliente leu de volta. A edição sem nenhum campo confere o caminho e devolve o programa sem gravar.

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

### PATCH /api/programs/{programId}

| Campo | Valor |
|---|---|
| Objetivo | Mudar o nome ou o objetivo de um programa |
| Story | US-F02-02 |
| Autenticação | Sessão de acesso (cookie `hd_session`) |
| Corpo | `{ "goal": "strength" }` ou `{ "name": "Programa A" }`. Os dois campos são opcionais e aceitam `null`; só muda o campo enviado |
| Efeito colateral | Atualiza a linha em `programs`. O nome fica sem os espaços das pontas. O objetivo novo não recalcula nada nesta story |
| Idempotência | Idempotente. A mesma chamada repetida deixa o mesmo estado |

| Status | Corpo | Quando |
|---|---|---|
| 200 | `Program` | O programa foi mudado, ou o corpo veio vazio |
| 400 | `{ "code": "program_name_required" \| "program_goal_required" \| "program_goal_invalid", "message" }` | O nome é `null`, vazio ou só espaços; o objetivo é `null`, vazio ou fora da lista |
| 400 | `{ "code": "invalid_request", "message": "requisição inválida" }` | O corpo não é JSON, ou um campo tem o tipo errado (texto no lugar de número, ou o contrário) |
| 401 | `{ "code": "unauthenticated", "message": "Entre com a sua chave de acesso." }` | Sem sessão de acesso válida |
| 404 | `{ "code": "program_not_found", "message": "programa não encontrado" }` | Nenhum programa tem o `programId` |
| 500 | `{ "code": "internal_error", "message": "erro interno do servidor" }` | Erro inesperado |

### POST /api/programs/{programId}/activate

| Campo | Valor |
|---|---|
| Objetivo | Escolher o programa ativo, de onde o próximo treino tira os valores |
| Story | US-F02-02 |
| Autenticação | Sessão de acesso (cookie `hd_session`) |
| Corpo | Nenhum |
| Efeito colateral | Desativa o programa ativo anterior e ativa o escolhido, na mesma transação. O anterior continua cadastrado. Escolher o programa que já é o ativo não grava nada |
| Idempotência | Idempotente |

| Status | Corpo | Quando |
|---|---|---|
| 200 | `Program`, com `isActive` verdadeiro | O programa passou a ser o ativo, ou já era |
| 401 | `{ "code": "unauthenticated", "message": "Entre com a sua chave de acesso." }` | Sem sessão de acesso válida |
| 404 | `{ "code": "program_not_found", "message": "programa não encontrado" }` | Nenhum programa tem o `programId`. O programa ativo não muda |
| 500 | `{ "code": "internal_error", "message": "erro interno do servidor" }` | Erro inesperado |

### PATCH /api/programs/{programId}/days/{letter}

| Campo | Valor |
|---|---|
| Objetivo | Mudar o nome de uma letra do programa |
| Story | US-F02-02 |
| Autenticação | Sessão de acesso (cookie `hd_session`) |
| Corpo | `{ "label": "Empurrar" }`. O `label` é opcional e aceita `null`. A letra do caminho aceita minúscula. A letra em si não muda |
| Efeito colateral | Atualiza o `label` em `program_days`. O nome fica sem os espaços das pontas; o nome vazio, só com espaços ou nulo fica `null`; o campo ausente mantém o nome |
| Idempotência | Idempotente |

| Status | Corpo | Quando |
|---|---|---|
| 200 | `Program` | O nome foi mudado, ou o corpo veio vazio |
| 400 | `{ "code": "program_day_letter_invalid", "message": "a letra deve ser de A a Z" }` | A letra do caminho não é de A a Z |
| 400 | `{ "code": "invalid_request", "message": "requisição inválida" }` | O corpo não é JSON, ou um campo tem o tipo errado (texto no lugar de número, ou o contrário) |
| 401 | `{ "code": "unauthenticated", "message": "Entre com a sua chave de acesso." }` | Sem sessão de acesso válida |
| 404 | `{ "code": "program_not_found" \| "program_day_not_found", "message" }` | O programa ou a letra não existe |
| 500 | `{ "code": "internal_error", "message": "erro interno do servidor" }` | Erro inesperado |

### DELETE /api/programs/{programId}/days/{letter}

| Campo | Valor |
|---|---|
| Objetivo | Remover uma letra do programa, com os exercícios do programa dela, para mudar a frequência |
| Story | US-F02-02 |
| Autenticação | Sessão de acesso (cookie `hd_session`) |
| Corpo | Nenhum |
| Efeito colateral | Apaga a linha em `program_days`; os exercícios do programa da letra saem por `ON DELETE CASCADE`. As outras letras mantêm a ordem relativa, sem renumerar. O treino registrado da letra continua com `letter` e as séries; `program_day_id` e `planned_exercise_id` ficam nulos. Acrescentar de novo a letra cria uma letra vazia no fim |
| Idempotência | Não idempotente. A repetição responde 404 `program_day_not_found` |

| Status | Corpo | Quando |
|---|---|---|
| 200 | `Program`, sem a letra | A letra foi removida. Remover a única letra deixa `days` vazio |
| 400 | `{ "code": "program_day_letter_invalid", "message": "a letra deve ser de A a Z" }` | A letra do caminho não é de A a Z |
| 401 | `{ "code": "unauthenticated", "message": "Entre com a sua chave de acesso." }` | Sem sessão de acesso válida |
| 404 | `{ "code": "program_not_found" \| "program_day_not_found", "message" }` | O programa ou a letra não existe |
| 500 | `{ "code": "internal_error", "message": "erro interno do servidor" }` | Erro inesperado |

### PATCH /api/programs/{programId}/days/{letter}/exercises/{exerciseSlug}

| Campo | Valor |
|---|---|
| Objetivo | Mudar séries, alvo, carga ou descanso de um exercício do programa. O exercício do catálogo não muda: trocar de exercício é remover um e acrescentar outro |
| Story | US-F02-02 |
| Autenticação | Sessão de acesso (cookie `hd_session`) |
| Corpo | `{ "loadG": 42500 }` ou `{ "sets": 4, "targetReps": 8, "restSeconds": 120 }`. Todos os campos são opcionais e aceitam `null`; só muda o campo enviado. A letra do caminho aceita minúscula |
| Efeito colateral | Atualiza a linha em `planned_exercises`. O treino registrado continua com os valores executados. A carga zero e o descanso zero são aceitos |
| Idempotência | Idempotente |

| Status | Corpo | Quando |
|---|---|---|
| 200 | `Program` | O exercício do programa foi mudado, ou o corpo veio vazio |
| 400 | `{ "code", "message" }` com `program_day_letter_invalid`, `planned_exercise_sets_invalid`, `planned_exercise_load_invalid`, `planned_exercise_rest_invalid`, `planned_exercise_target_time`, `planned_exercise_target_reps` ou `planned_exercise_target_invalid` | A letra do caminho ou um campo do corpo é inválido |
| 400 | `{ "code": "invalid_request", "message": "requisição inválida" }` | O corpo não é JSON, ou um campo tem o tipo errado (texto no lugar de número, ou o contrário) |
| 401 | `{ "code": "unauthenticated", "message": "Entre com a sua chave de acesso." }` | Sem sessão de acesso válida |
| 404 | `{ "code": "program_not_found" \| "program_day_not_found" \| "planned_exercise_not_found", "message" }` | O programa, a letra ou o exercício na letra não existe |
| 500 | `{ "code": "internal_error", "message": "erro interno do servidor" }` | Erro inesperado |

### DELETE /api/programs/{programId}/days/{letter}/exercises/{exerciseSlug}

| Campo | Valor |
|---|---|
| Objetivo | Remover um exercício de uma letra do programa |
| Story | US-F02-02 |
| Autenticação | Sessão de acesso (cookie `hd_session`) |
| Corpo | Nenhum |
| Efeito colateral | Apaga a linha em `planned_exercises`. Os outros exercícios da letra mantêm a ordem relativa, sem renumerar. A série registrada continua com o exercício e os valores; `planned_exercise_id` fica nulo. O exercício arquivado depois de entrar na letra também pode ser removido |
| Idempotência | Não idempotente. A repetição responde 404 `planned_exercise_not_found` |

| Status | Corpo | Quando |
|---|---|---|
| 200 | `Program`, sem o exercício na letra | O exercício foi removido. Remover o único exercício deixa a letra vazia |
| 400 | `{ "code": "program_day_letter_invalid", "message": "a letra deve ser de A a Z" }` | A letra do caminho não é de A a Z |
| 401 | `{ "code": "unauthenticated", "message": "Entre com a sua chave de acesso." }` | Sem sessão de acesso válida |
| 404 | `{ "code": "program_not_found" \| "program_day_not_found" \| "planned_exercise_not_found", "message" }` | O programa, a letra ou o exercício na letra não existe |
| 500 | `{ "code": "internal_error", "message": "erro interno do servidor" }` | Erro inesperado |

## Treino do dia

A rota desta seção vem da US-F03-01. A rota existe só quando a API abriu o banco e exige sessão de acesso em todos os ambientes (ADR-019). O treino do dia não tem ferramenta MCP: o planejador vê o programa com `get_program` (`mcp.md` não muda). O service fica em `apps/api/src/modules/workouts/today.service.ts`.

### GET /api/today

| Campo | Valor |
|---|---|
| Objetivo | Mostrar o treino do dia: o programa ativo, as letras na ordem do plano, a letra sugerida para hoje e, em cada exercício do programa, o alvo do programa e a carga preenchida |
| Story | US-F03-01 |
| Autenticação | Sessão de acesso (cookie `hd_session`) |
| Efeito colateral | Nenhum. A rota só lê `programs`, `program_days`, `planned_exercises`, `exercises`, `workouts` e `workout_sets`. Abrir o app, abrir a folha de confirmação e começar o treino não gravam nada |
| Idempotência | Idempotente |

| Status | Corpo | Quando |
|---|---|---|
| 200 | `Today` | Sempre que o banco responde, com ou sem programa ativo |
| 401 | `{ "code": "unauthenticated", "message": "Entre com a sua chave de acesso." }` | Sem sessão de acesso válida. O corpo não tem dado de treino |
| 500 | `{ "code": "internal_error", "message": "erro interno do servidor" }` | Erro inesperado |

O objeto `Today` tem a forma `{ "program": { "id", "name", "goal" } | null, "suggestedLetter": string | null, "days": [TodayDay] }`. Sem programa ativo, a resposta é `{ "program": null, "suggestedLetter": null, "days": [] }`, e a tela mostra o estado vazio.

O objeto `TodayDay` tem a forma `{ "letter", "label", "estimatedDurationSeconds", "exercises": [TodayExercise] }`, com as letras na ordem do plano e os exercícios na ordem da letra. A letra sem exercício vem com `exercises: []` e `estimatedDurationSeconds: 0`.

O objeto `TodayExercise` tem a forma `{ "plannedExerciseId", "exercise": { "id", "slug", "name", "kind" }, "sets", "targetReps", "targetSeconds", "restSeconds", "plannedLoadG", "loadG", "loadSource", "muscleGroups": [{ "slug", "name" }], "secondaryMuscleGroups": [{ "slug", "name" }], "records": [{ "reps", "loadG" }] }`:

- `plannedExerciseId` é o `id` do exercício do programa (linha de `planned_exercises`). A tela envia esse valor na gravação da série (US-F03-02).
- `plannedLoadG` é a carga do programa, em gramas.
- `loadG` é a carga preenchida, em gramas: a carga da série mais recente do mesmo exercício no histórico, em qualquer programa e em qualquer letra. Sem série do exercício, é a carga do programa.
- `loadSource` diz de onde veio a carga preenchida: `last_workout` (histórico) ou `program`.
- `muscleGroups` lista os grupos musculares dos músculos principais do exercício, uma vez cada, na ordem do catálogo. Os músculos secundários ficam de fora. A tela usa a lista para mostrar o estado da janela de cada letra (US-F07-02).
- `secondaryMuscleGroups` lista os grupos dos músculos secundários que nenhum músculo principal do exercício cobre, uma vez cada, na ordem do catálogo. O app web usa as duas listas para o ganho provisório de cada grupo no descanso (US-F10-02, D54).
- `records` lista os recordes do exercício (US-F18-01, D59): para cada número de repetições, a maior carga, e para cada carga, o maior número de repetições, ordenados por `reps` e por `loadG`. A lista vem vazia no exercício de tempo e no exercício sem série. A tela compara a série com essa lista mais as séries do treino em andamento.
- `targetReps` e `targetSeconds` vêm sempre do programa, mesmo que o último treino tenha outro número de repetições.
- O exercício arquivado no catálogo que continua na letra aparece com o nome do catálogo.

Exemplo, com o Supino reto a 42,5 kg no último treino e a Prancha sem treino:

```json
{
  "program": { "id": "0193a1b2-0000-7000-8000-000000000301", "name": "Programa 1", "goal": "hypertrophy" },
  "suggestedLetter": "A",
  "days": [
    {
      "letter": "A",
      "label": "Superior",
      "estimatedDurationSeconds": 675,
      "exercises": [
        {
          "plannedExerciseId": "0193a1b2-0000-7000-8000-000000000401",
          "exercise": { "id": "0193a1b2-0000-7000-8000-000000000201", "slug": "supino-reto", "name": "Supino reto", "kind": "reps" },
          "sets": 3,
          "targetReps": 10,
          "targetSeconds": null,
          "restSeconds": 90,
          "plannedLoadG": 40000,
          "loadG": 42500,
          "loadSource": "last_workout",
          "muscleGroups": [{ "slug": "chest", "name": "peito" }],
          "secondaryMuscleGroups": [],
          "records": [{ "reps": 10, "loadG": 42500 }]
        },
        {
          "plannedExerciseId": "0193a1b2-0000-7000-8000-000000000402",
          "exercise": { "id": "0193a1b2-0000-7000-8000-000000000202", "slug": "prancha", "name": "Prancha", "kind": "time" },
          "sets": 3,
          "targetReps": null,
          "targetSeconds": 45,
          "restSeconds": 60,
          "plannedLoadG": 0,
          "loadG": 0,
          "loadSource": "program",
          "muscleGroups": [{ "slug": "abs", "name": "abdômen" }],
          "secondaryMuscleGroups": [],
          "records": []
        }
      ]
    }
  ]
}
```

Regras do cálculo:

- **Série mais recente.** A série mais recente é a de `performed_at` mais recente. No empate, vale o maior `set_number` e, depois, o maior `id`. Treino encerrado e treino em andamento contam. A busca é pelo exercício (`exercise_id`), então o vínculo nulo com o exercício do programa não muda a carga.
- **Letra sugerida.** A letra sugerida é a letra seguinte, na ordem do plano, à letra do treino mais recente do programa ativo (`started_at` mais recente; no empate, o maior `id`). Depois da última letra, a sugestão volta à primeira. Sem treino do programa ativo, ou com a letra do último treino fora do programa, a sugerida é a primeira letra. A sugestão pula letras sem exercício e fica `null` quando nenhuma letra tem exercício. Treino de outro programa não muda a sugestão.
- **Duração estimada.** A duração estimada é a soma, em cada exercício da letra, de `sets × (execução + restSeconds)`, em segundos inteiros. A execução é `targetSeconds` no exercício de tempo e `targetReps × 3` no exercício de repetição [estimativa: 3 s por repetição, em `SECONDS_PER_REP` de `apps/api/src/modules/workouts/today.config.ts`]. Exemplo: Supino reto 3 × 10 com 90 s de descanso e Prancha 3 × 45 s com 60 s somam `3 × (30 + 90) + 3 × (45 + 60) = 675`.
- **Recordes.** Os recordes vêm de todas as séries de repetição do exercício (`exercise_id`), em qualquer programa, letra e treino, encerrado ou em andamento. A série de tempo fica fora. O recorde é derivado das séries e não fica em tabela (ADR-010): corrigir ou apagar uma série muda a lista na próxima leitura.

## Séries do treino

A rota desta seção vem da US-F03-02. A rota existe só quando a API abriu o banco e exige sessão de acesso em todos os ambientes (ADR-019) e a guarda de origem dos métodos que mudam estado. A gravação da série não tem ferramenta MCP: o registro é do atleta, e as ferramentas de treino do planejador são da F06 (`mcp.md` não muda). O service fica em `apps/api/src/modules/workouts/workout-set.service.ts`. O fim do treino chega depois das séries, por outra rota (seção "Fim do treino").

### POST /api/workouts/{workoutId}/sets

| Campo | Valor |
|---|---|
| Objetivo | Gravar a série que o atleta marcou com "Próximo", com o ID gerado no celular. A primeira série do treino cria o treino |
| Story | US-F03-02 |
| Autenticação | Sessão de acesso (cookie `hd_session`) e `Origin` igual a `APP_ORIGIN` quando o navegador manda o cabeçalho |
| Caminho | `workoutId`: ID do treino em UUID, gerado no celular no toque em "Começar" (UUID v7, ADR-014) |
| Corpo | `{ "id", "workout": { "programId", "letter", "startedAt" }, "plannedExerciseId", "exerciseId", "setNumber", "loadG", "reps", "performedAt" }` no exercício de repetição; o exercício de tempo manda `seconds` no lugar de `reps`. `id`, `programId`, `plannedExerciseId` e `exerciseId` são UUID; `setNumber`, `loadG`, `reps` e `seconds` são inteiros; `startedAt` e `performedAt` são ISO 8601 em UTC. O schema confere só o formato, e o service recusa os valores de domínio com `code` próprio |
| Efeito colateral | Sem treino com o `workoutId`, grava uma linha em `workouts` com o programa, a letra em maiúscula, o `program_day_id` da letra e `started_at`, com `finished_at` e `end_reason` nulos. Depois, grava uma linha em `workout_sets` com o `id` recebido, o exercício, o exercício do programa, o número, a carga, a medida e `performed_at`. As datas ficam normalizadas com `toISOString()`. A recusa não grava nada: a conferência e a gravação ficam numa transação só |
| Idempotência | Idempotente pelo `id` da série. O reenvio com o mesmo `id` e os mesmos valores (`workoutId`, `exerciseId`, `setNumber`, `loadG`, `reps` e `seconds`) responde 200 com a série gravada, sem mudar nada. `performedAt` e `plannedExerciseId` não entram na comparação: o horário é do toque, e o vínculo com o plano fica nulo quando o planejador remove o exercício do programa. O treino também é idempotente pelo `workoutId` com os mesmos dados |

| Status | Corpo | Quando |
|---|---|---|
| 201 | `WorkoutSet` | Série nova gravada; o treino nasceu se ainda não existia |
| 200 | `WorkoutSet`, com os valores do banco | O `id` da série já existe com os mesmos valores |
| 400 | `{ "code": "invalid_request", "message": "requisição inválida" }` | Formato fora do schema: ID que não é UUID, número não inteiro, data fora de ISO 8601 em UTC, campo obrigatório ausente |
| 400 | `{ "code": "program_day_letter_invalid", "message": "a letra deve ser de A a Z" }` | Letra fora de A a Z. A minúscula é aceita e gravada em maiúscula |
| 400 | `{ "code": "workout_set_load_invalid", "message": "carga inválida" }` | `loadG` menor que 0 |
| 400 | `{ "code": "workout_set_reps_invalid", "message": "repetições inválidas" }` | `reps` menor que 1 |
| 400 | `{ "code": "workout_set_seconds_invalid", "message": "tempo inválido" }` | `seconds` menor que 1 |
| 400 | `{ "code": "workout_set_measure_invalid", "message": "informe repetições no exercício de repetição e segundos no exercício de tempo" }` | Nenhuma medida, as duas, ou a medida que não é do tipo do exercício |
| 400 | `{ "code": "workout_set_number_invalid", "message": "número da série inválido" }` | `setNumber` menor que 1 |
| 400 | `{ "code": "workout_set_exercise_mismatch", "message": "exercício diferente do exercício do programa" }` | `exerciseId` diferente do exercício de `plannedExerciseId` |
| 401 | `{ "code": "unauthenticated", "message": "Entre com a sua chave de acesso." }` | Sem sessão de acesso válida. O corpo não tem dado de treino |
| 403 | `{ "code": "forbidden_origin", "message": "origem não permitida" }` | `Origin` diferente de `APP_ORIGIN` |
| 409 | `{ "code": "workout_conflict", "message": "treino já registrado com outros dados" }` | O `workoutId` existe com outro programa, outra letra ou outro início |
| 409 | `{ "code": "workout_set_id_conflict", "message": "série já registrada com outros valores" }` | O `id` da série existe com valores diferentes ou noutro treino |
| 409 | `{ "code": "workout_set_duplicated", "message": "série já registrada neste treino" }` | Outro `id` para o mesmo treino, exercício e número da série |
| 422 | `{ "code": "program_not_found", "message": "programa não encontrado" }` | O programa do corpo não existe |
| 422 | `{ "code": "program_day_not_found", "message": "letra não encontrada no programa" }` | A letra não existe no programa |
| 422 | `{ "code": "planned_exercise_not_found", "message": "exercício não encontrado na letra" }` | O exercício do programa não existe ou é de outra letra |
| 500 | `{ "code": "internal_error", "message": "erro interno do servidor" }` | Erro inesperado |

O objeto `WorkoutSet` tem a forma `{ "id", "workoutId", "exerciseId", "plannedExerciseId", "setNumber", "loadG", "reps", "seconds", "performedAt" }`. `plannedExerciseId` fica `null` quando o planejador removeu o exercício do programa depois da gravação; `reps` ou `seconds` fica `null`, conforme o tipo do exercício.

Exemplo do primeiro toque no Supino reto:

```json
{
  "id": "0193a1b2-0000-7000-8000-000000000501",
  "workout": { "programId": "0193a1b2-0000-7000-8000-000000000301", "letter": "A", "startedAt": "2026-11-21T18:30:00.000Z" },
  "plannedExerciseId": "0193a1b2-0000-7000-8000-000000000401",
  "exerciseId": "0193a1b2-0000-7000-8000-000000000201",
  "setNumber": 1,
  "loadG": 40000,
  "reps": 10,
  "performedAt": "2026-11-21T18:31:05.000Z"
}
```

Ordem da conferência, na mesma transação:

1. Formato, pelo schema (`invalid_request`).
2. Treino existente com programa, letra ou início diferentes: 409 `workout_conflict`.
3. `id` da série existente: 200 se os valores batem, 409 `workout_set_id_conflict` se não. O reenvio responde antes da leitura do plano, então funciona mesmo depois de o planejador mudar o programa.
4. Regras de valor (400).
5. Referências: programa, letra e exercício do programa (422); depois, exercício igual ao do exercício do programa e medida do tipo do exercício (400).
6. Criação do treino, se faltar.
7. Série repetida no treino: 409 `workout_set_duplicated`. O índice único `workout_sets_workout_exercise_set_unique` garante a regra no banco.
8. Gravação da série.

O programa que deixou de ser o ativo depois do "Começar" não impede a série: o treino guarda o programa treinado (`apps/api/CLAUDE.md`, regra 7). O número da série maior que o número de séries do programa é aceito.

## Correção da série

A rota desta seção vem da US-F04-02. A rota existe só quando a API abriu o banco e exige sessão de acesso em todos os ambientes (ADR-019) e a guarda de origem dos métodos que mudam estado. A rota é do atleta. O planejador troca a carga e a medida de qualquer série pelo `update_workout_set` e remove o treino pelo `remove_workout`, as duas ferramentas da US-F06-02 (`mcp.md`, seção "Confirmação em duas chamadas"), sem rota HTTP. O service fica em `apps/api/src/modules/workouts/workout-set-correction.service.ts`.

O app não chama a rota direto da tela. A correção entra na fila local de envio como quarto tipo de item, depois da série, e segue as regras da ADR-025.

O instante de `corrected_at` é o da chegada na API, não o do toque na tela, porque o corpo da ADR-025 não traz instante. A correção que ficou na fila sem sinal recebe o instante em que chegou. A marca indica que a série foi corrigida e não mede quando. A resposta do `PATCH` continua `WorkoutSet`, sem o campo `correctedAt`; o campo aparece em `GET /api/workouts` (seção "Histórico de treinos").

### PATCH /api/workouts/{workoutId}/sets/{setId}

| Campo | Valor |
|---|---|
| Objetivo | Trocar a carga e a medida de uma série gravada, quando o atleta corrige a última série |
| Story | US-F04-02 |
| Autenticação | Sessão de acesso (cookie `hd_session`) e `Origin` igual a `APP_ORIGIN` quando o navegador manda o cabeçalho |
| Caminho | `workoutId` e `setId`: IDs do treino e da série em UUID |
| Corpo | `{ "loadG", "reps" }` no exercício de repetição; o exercício de tempo manda `seconds` no lugar de `reps`. Os valores são absolutos e inteiros. O schema confere só o formato, e o service recusa os valores de domínio com `code` próprio |
| Efeito colateral | Troca `load_g` e `reps` ou `seconds` da linha de `workout_sets`. Quando a carga ou a medida difere da gravada, grava também `corrected_at` com o instante da chegada na API, em UTC e no formato de `toISOString()` (US-F06-01). `id`, `workout_id`, `exercise_id`, `planned_exercise_id`, `set_number` e `performed_at` não mudam. A recusa não grava nada: a conferência e a gravação ficam numa transação só |
| Idempotência | Idempotente: o reenvio com os mesmos valores responde 200 com a mesma série e não muda nada, nem `corrected_at`. Uma segunda correção com outro valor move `corrected_at` para o instante da segunda chegada |

| Status | Corpo | Quando |
|---|---|---|
| 200 | `WorkoutSet`, com os valores gravados | Correção gravada ou reenvio com os mesmos valores. O treino terminado também aceita a correção |
| 400 | `{ "code": "invalid_request", "message": "requisição inválida" }` | Formato fora do schema: ID que não é UUID, número não inteiro, campo obrigatório ausente |
| 400 | `{ "code": "workout_set_load_invalid", "message": "carga inválida" }` | `loadG` menor que 0 |
| 400 | `{ "code": "workout_set_reps_invalid", "message": "repetições inválidas" }` | `reps` menor que 1 |
| 400 | `{ "code": "workout_set_seconds_invalid", "message": "tempo inválido" }` | `seconds` menor que 1 |
| 400 | `{ "code": "workout_set_measure_invalid", "message": "informe repetições no exercício de repetição e segundos no exercício de tempo" }` | Nenhuma medida, as duas, ou a medida que não é do tipo do exercício da série |
| 401 | `{ "code": "unauthenticated", "message": "Entre com a sua chave de acesso." }` | Sem sessão de acesso válida. O corpo não tem dado de treino |
| 403 | `{ "code": "forbidden_origin", "message": "origem não permitida" }` | `Origin` diferente de `APP_ORIGIN` |
| 404 | `{ "code": "workout_not_found", "message": "treino não encontrado" }` | O treino não existe |
| 404 | `{ "code": "workout_set_not_found", "message": "série não encontrada" }` | A série não existe ou é de outro treino |
| 500 | `{ "code": "internal_error", "message": "erro interno do servidor" }` | Erro inesperado |

Exemplo da correção do Supino reto de 45 kg para 42,5 kg:

```json
{ "loadG": 42500, "reps": 10 }
```

Ordem da conferência, na mesma transação:

1. Formato, pelo schema (`invalid_request`).
2. Treino existente: 404 `workout_not_found`.
3. Série existente no treino do caminho: 404 `workout_set_not_found`.
4. Regras de valor (400), as mesmas do registro. A medida do tipo vem do exercício da série (`exercise_id`).
5. Gravação dos valores.

## Fim do treino

A rota desta seção vem da US-F03-04. A rota existe só quando a API abriu o banco e exige sessão de acesso em todos os ambientes (ADR-019) e a guarda de origem. O fim não tem ferramenta MCP própria: o planejador lê o fim pelo `list_workouts` (US-F06-01, seção "Histórico de treinos"), e a correção do fim fica para uma story futura. O `remove_workout` apaga o treino inteiro (US-F06-02). O service fica em `apps/api/src/modules/workouts/workout-finish.service.ts`.

O app não chama a rota direto da tela. O fim entra na fila local de envio depois das séries e dos exercícios pulados do treino (seção "Exercício pulado") e segue as regras da ADR-022.

### POST /api/workouts/{workoutId}/finish

| Campo | Valor |
|---|---|
| Objetivo | Gravar quando e como o treino terminou: na última série (`completed`) ou pelo botão "Encerrar" (`ended_early`) |
| Story | US-F03-04 |
| Autenticação | Sessão de acesso (cookie `hd_session`) e `Origin` igual a `APP_ORIGIN` quando o navegador manda o cabeçalho |
| Caminho | `workoutId`: ID do treino em UUID, o mesmo das séries |
| Corpo | `{ "finishedAt", "endReason" }`. `finishedAt` é ISO 8601 em UTC, com `Z`. `endReason` é `completed` ou `ended_early`. O schema aceita as duas como texto, e o service recusa os valores com `code` próprio |
| Efeito colateral | Grava `finished_at`, normalizado com `toISOString()`, e `end_reason` na linha do treino. A recusa não grava nada: a conferência e a gravação ficam numa transação só |
| Idempotência | Idempotente pelo par instante e motivo. O reenvio com o mesmo `finishedAt` (comparado depois da normalização) e o mesmo `endReason` responde 200 com o treino gravado, sem mudar nada. Outro instante ou outro motivo num treino terminado responde 409 |

| Status | Corpo | Quando |
|---|---|---|
| 200 | `Workout` | Fim gravado agora ou fim idêntico já gravado |
| 400 | `{ "code": "invalid_request", "message": "requisição inválida" }` | Corpo fora do schema: campo ausente ou de outro tipo, ID do caminho que não é UUID |
| 400 | `{ "code": "workout_end_reason_invalid", "message": "motivo do fim inválido" }` | `endReason` fora de `completed` e `ended_early` |
| 400 | `{ "code": "workout_finished_at_invalid", "message": "instante do fim inválido" }` | `finishedAt` vazio, sem `Z`, com deslocamento diferente de `Z` ou que não é data |
| 400 | `{ "code": "workout_finished_before_start", "message": "o fim do treino é anterior ao início" }` | `finishedAt` anterior a `started_at`. O instante igual ao início é aceito |
| 401 | `{ "code": "unauthenticated", "message": "Entre com a sua chave de acesso." }` | Sem sessão de acesso válida. O corpo não tem dado de treino |
| 403 | `{ "code": "forbidden_origin", "message": "origem não permitida" }` | `Origin` diferente de `APP_ORIGIN` |
| 404 | `{ "code": "workout_not_found", "message": "treino não encontrado" }` | Nenhum treino com o `workoutId` |
| 409 | `{ "code": "workout_already_finished", "message": "treino já encerrado com outros dados" }` | O treino já terminou com outro instante ou outro motivo |
| 500 | `{ "code": "internal_error", "message": "erro interno do servidor" }` | Erro inesperado |

O objeto `Workout` tem a forma `{ "id", "programId", "letter", "startedAt", "finishedAt", "endReason" }`. `finishedAt` e `endReason` ficam `null` no treino em andamento; a rota sempre responde com os dois preenchidos.

Exemplo do encerramento antes da última série:

```json
{ "finishedAt": "2026-11-21T19:20:00.000Z", "endReason": "ended_early" }
```

Ordem da conferência, na mesma transação:

1. Formato, pelo schema (`invalid_request`).
2. Motivo (`workout_end_reason_invalid`) e formato do instante (`workout_finished_at_invalid`), nessa ordem, ainda sem ler o banco.
3. Treino existente: 404 `workout_not_found`.
4. Treino já terminado: 200 se o par bate, 409 `workout_already_finished` se não. O reenvio responde antes da regra de tempo.
5. Instante anterior ao início: 400 `workout_finished_before_start`.
6. Gravação do fim.

A API não limita o instante no futuro nem recusa série nova para um treino terminado [fora de escopo da US-F03-04].

## Exercício pulado

A rota desta seção vem da US-F03-05. A rota existe só quando a API abriu o banco e exige sessão de acesso em todos os ambientes (ADR-019) e a guarda de origem. O exercício pulado não tem ferramenta MCP própria: o planejador lê os exercícios que ficaram de fora pelo `list_workouts` (US-F06-01, seção "Histórico de treinos"), e a correção fica para uma story futura. O `remove_workout` apaga o treino com os pulos (US-F06-02). O service fica em `apps/api/src/modules/workouts/workout-skip.service.ts`.

O app não chama a rota direto da tela. O pulado que resta no fim do treino entra na fila local de envio depois das séries e antes do fim, e segue as regras da ADR-023.

### POST /api/workouts/{workoutId}/skips

| Campo | Valor |
|---|---|
| Objetivo | Gravar o exercício que ficou de fora do treino, com o instante do último pulo |
| Story | US-F03-05 |
| Autenticação | Sessão de acesso (cookie `hd_session`) e `Origin` igual a `APP_ORIGIN` quando o navegador manda o cabeçalho |
| Caminho | `workoutId`: ID do treino em UUID, o mesmo das séries |
| Corpo | `{ "plannedExerciseId", "skippedAt" }`. `plannedExerciseId` é o UUID do exercício do programa; o corpo não leva `exerciseId`, a API lê o exercício pelo exercício do programa. `skippedAt` é ISO 8601 em UTC, com `Z`; o schema aceita como texto e o service recusa o valor com `code` próprio |
| Efeito colateral | Grava uma linha em `workout_skips` com o treino, o exercício, o exercício do programa e `skipped_at` normalizado com `toISOString()`. A recusa não grava nada: a conferência e a gravação ficam numa transação só |
| Idempotência | Idempotente pelo par exercício do programa e instante. O reenvio com o mesmo `plannedExerciseId` e o mesmo `skippedAt` (comparado depois da normalização) responde 200 com o registro gravado, sem mudar nada. Outro instante responde 409. Depois de o planejador remover o exercício da letra, o vínculo fica nulo e o reenvio responde 422; o registro original continua |

| Status | Corpo | Quando |
|---|---|---|
| 201 | `WorkoutSkip` | Pulado gravado agora |
| 200 | `WorkoutSkip`, com os valores do banco | O mesmo exercício do programa e o mesmo instante já estão gravados |
| 400 | `{ "code": "invalid_request", "message": "requisição inválida" }` | Corpo fora do schema: campo ausente ou de outro tipo, ID que não é UUID |
| 400 | `{ "code": "workout_skipped_at_invalid", "message": "instante do pulo inválido" }` | `skippedAt` vazio, sem `Z`, com deslocamento diferente de `Z` ou que não é data |
| 400 | `{ "code": "workout_skipped_before_start", "message": "o pulo é anterior ao início do treino" }` | `skippedAt` anterior a `started_at`. O instante igual ao início é aceito |
| 401 | `{ "code": "unauthenticated", "message": "Entre com a sua chave de acesso." }` | Sem sessão de acesso válida. O corpo não tem dado de treino |
| 403 | `{ "code": "forbidden_origin", "message": "origem não permitida" }` | `Origin` diferente de `APP_ORIGIN` |
| 404 | `{ "code": "workout_not_found", "message": "treino não encontrado" }` | Nenhum treino com o `workoutId` |
| 409 | `{ "code": "workout_skip_conflict", "message": "exercício já pulado neste treino com outro instante" }` | O mesmo exercício do programa já está gravado com outro instante |
| 409 | `{ "code": "workout_skip_conflict", "message": "exercício já pulado neste treino" }` | O exercício já está gravado por outro exercício do programa (a letra mudou depois do pulo) |
| 422 | `{ "code": "planned_exercise_not_found", "message": "exercício não encontrado na letra" }` | O exercício do programa não existe ou não é da letra do treino |
| 500 | `{ "code": "internal_error", "message": "erro interno do servidor" }` | Erro inesperado |

O objeto `WorkoutSkip` tem a forma `{ "workoutId", "exerciseId", "plannedExerciseId", "skippedAt" }`. `plannedExerciseId` fica `null` quando o planejador removeu o exercício do programa depois da gravação.

Exemplo do pulo da Prancha:

```json
{ "plannedExerciseId": "0193a1b2-0000-7000-8000-000000000402", "skippedAt": "2026-11-21T18:40:00.000Z" }
```

Ordem da conferência, na mesma transação:

1. Formato, pelo schema (`invalid_request`).
2. Formato do instante, ainda sem ler o banco (`workout_skipped_at_invalid`).
3. Treino existente: 404 `workout_not_found`.
4. Pulo já gravado com o mesmo `plannedExerciseId`: 200 se o instante bate, 409 `workout_skip_conflict` se não. O reenvio responde antes da leitura do plano.
5. Exercício do programa existente e da letra do treino: 422 `planned_exercise_not_found`.
6. Instante anterior ao início: 400 `workout_skipped_before_start`.
7. Exercício já pulado por outro exercício do programa: 409 `workout_skip_conflict`. A chave primária `(workout_id, exercise_id)` garante a regra no banco.
8. Gravação do pulado.

A API não recusa pulado de treino já terminado, porque a fila envia os pulados antes do fim [fora de escopo da US-F03-05].

## Histórico de treinos

A rota desta seção vem da US-F06-01. A rota existe só quando a API abriu o banco e exige sessão de acesso em todos os ambientes (ADR-019). A ferramenta MCP `list_workouts` devolve o mesmo objeto (`mcp.md`), pelo mesmo service `listWorkouts`, em `apps/api/src/modules/workouts/workout-history.service.ts`. O `GET` não passa pela guarda de origem.

### GET /api/workouts

| Campo | Valor |
|---|---|
| Objetivo | Listar os treinos que começaram num intervalo em UTC, com programa, letra, fim, exercícios feitos, séries e exercícios que ficaram de fora, para o planejador consultar o histórico pelo Claude |
| Story | US-F06-01 |
| Autenticação | Sessão de acesso (cookie `hd_session`). A ferramenta MCP exige a credencial do MCP |
| Query | `from` e `to`: instantes ISO 8601 em UTC, com `Z` e milissegundos opcionais. O intervalo é semiaberto: o treino que começa em `from` entra e o que começa em `to` fica de fora. O intervalo tem no máximo 92 dias. O schema aceita os dois como texto opcional, e o service recusa o valor com `code` próprio |
| Efeito colateral | Nenhum. O service e o repositório só fazem `select` em `workouts`, `programs`, `program_days`, `workout_sets`, `exercises` e `workout_skips`, em três consultas |
| Idempotência | Idempotente |

| Status | Corpo | Quando |
|---|---|---|
| 200 | `WorkoutHistory` | Intervalo válido. A lista fica vazia quando nenhum treino começou nele |
| 400 | `{ "code": "workout_range_required", "message": "informe o início e o fim do intervalo em UTC" }` | `from` ou `to` ausente, vazio, sem `Z`, só com a data ou com data que não existe, como `2026-02-30T03:00:00Z` |
| 400 | `{ "code": "workout_range_inverted", "message": "o fim do intervalo deve ser depois do início" }` | `to` igual ou anterior a `from` |
| 400 | `{ "code": "workout_range_too_long", "message": "o intervalo deve ter no máximo 92 dias" }` | Intervalo maior que 92 dias. Os 92 dias exatos são aceitos |
| 401 | `{ "code": "unauthenticated", "message": "Entre com a sua chave de acesso." }` | Sem sessão de acesso válida. O corpo não tem dado de treino |
| 500 | `{ "code": "internal_error", "message": "erro interno do servidor" }` | Erro inesperado |

Forma do `WorkoutHistory`: `{ "workouts": HistoryWorkout[] }`, dos treinos mais antigos para os mais novos (`started_at` e, no empate, `id`).

| Campo do treino | Conteúdo |
|---|---|
| `id` | ID do treino |
| `program` | `{ "id", "name" }` do programa treinado |
| `letter` | Letra treinada, gravada no treino |
| `label` | Nome atual da letra, lido de `program_days.label`. Fica `null` quando a letra não tem nome ou saiu do programa |
| `startedAt`, `finishedAt`, `endReason` | Início, fim e motivo (`completed` ou `ended_early`). `finishedAt` e `endReason` ficam `null` no treino em andamento |
| `exercises` | `[{ "exercise": { "id", "slug", "name", "kind" }, "sets": [...] }]`, na ordem da primeira série de cada exercício. As séries seguem o número da série |
| `leftOut` | `[{ "id", "slug", "name", "kind" }]`: os exercícios pulados que não têm série no treino, na ordem do pulo. O exercício pulado e feito depois fica só em `exercises` |

Cada série tem `id`, `setNumber`, `loadG` (gramas inteiras), `reps`, `seconds` (um dos dois fica `null`), `performedAt` e `correctedAt`. `correctedAt` fica `null` enquanto ninguém corrigiu a série e traz o instante da última correção que mudou um valor (seção "Correção da série").

A consulta devolve os valores gravados no treino, não os do programa: depois de o planejador remover a letra "B", o treino volta com `letter` "B", `label` `null` e as séries registradas (`apps/api/CLAUDE.md`, regra 7). O treino sem série volta com `exercises` e `leftOut` vazios. A API não converte fuso: o Claude converte a semana do PO para UTC, em que a meia-noite de `America/Sao_Paulo` é `03:00Z`. A resposta não tem paginação; o limite de 92 dias contém o tamanho.

Exemplo da semana de 9 a 16 de novembro de 2026:

```text
GET /api/workouts?from=2026-11-09T03:00:00.000Z&to=2026-11-16T03:00:00.000Z
```

```json
{
  "workouts": [
    {
      "id": "0193a1b2-0000-7000-8000-000000000601",
      "program": { "id": "0193a1b2-0000-7000-8000-000000000301", "name": "Programa 1" },
      "letter": "A",
      "label": "Superior",
      "startedAt": "2026-11-09T21:30:00.000Z",
      "finishedAt": "2026-11-09T22:20:00.000Z",
      "endReason": "ended_early",
      "exercises": [
        {
          "exercise": {
            "id": "0193a1b2-0000-7000-8000-000000000201",
            "slug": "supino-reto",
            "name": "Supino reto",
            "kind": "reps"
          },
          "sets": [
            {
              "id": "0193a1b2-0000-7000-8000-000000000501",
              "setNumber": 1,
              "loadG": 42500,
              "reps": 10,
              "seconds": null,
              "performedAt": "2026-11-09T21:31:05.000Z",
              "correctedAt": "2026-11-09T21:32:00.000Z"
            }
          ]
        }
      ],
      "leftOut": [
        {
          "id": "0193a1b2-0000-7000-8000-000000000202",
          "slug": "prancha",
          "name": "Prancha",
          "kind": "time"
        }
      ]
    }
  ]
}
```

Ordem da conferência, antes de ler os treinos:

1. Formato de `from` e `to`, com ida e volta da data (`workout_range_required`).
2. `to` depois de `from` (`workout_range_inverted`).
3. Intervalo de até 92 dias (`workout_range_too_long`).

## Remoção do treino

A rota desta seção vem da US-F03-09 e serve também à US-F20-02 (ADR-032). A rota existe só quando a API abriu o banco e exige sessão de acesso em todos os ambientes (ADR-019) e a guarda de origem. A rota não pede o código de confirmação da ADR-026: a confirmação é a folha da tela. O planejador remove pelo `remove_workout` (US-F06-02), com prévia e código. O service fica em `apps/api/src/modules/workouts/workout-removal.service.ts`.

O descarte do treino em andamento não chama a rota direto da tela: o item `discard` entra na fila local de envio depois de a fila tirar os itens do treino (ADR-032). O "Apagar treino" do histórico chama a rota direto, só com conexão.

### DELETE /api/workouts/{workoutId}

| Campo | Valor |
|---|---|
| Objetivo | Apagar o treino com as séries e os exercícios pulados |
| Story | US-F03-09, US-F20-02 |
| Autenticação | Sessão de acesso (cookie `hd_session`) e `Origin` igual a `APP_ORIGIN` quando o navegador manda o cabeçalho |
| Caminho | `workoutId`: ID do treino em UUID |
| Corpo | Nenhum |
| Efeito colateral | Apaga a linha do treino; as séries e os pulados saem por `ON DELETE CASCADE`. A conferência e a remoção ficam numa transação só |
| Idempotência | O segundo pedido responde 404. O cliente da fila conta o 404 como sucesso, porque o treino talvez nunca tenha chegado ao servidor |

| Status | Corpo | Quando |
|---|---|---|
| 204 | Nenhum | Treino apagado |
| 400 | `{ "code": "invalid_request", "message": "requisição inválida" }` | ID do caminho que não é UUID |
| 401 | `{ "code": "unauthenticated", "message": "Entre com a sua chave de acesso." }` | Sem sessão de acesso válida. O corpo não tem dado de treino |
| 403 | `{ "code": "forbidden_origin", "message": "origem não permitida" }` | `Origin` diferente de `APP_ORIGIN` |
| 404 | `{ "code": "workout_not_found", "message": "treino não encontrado" }` | Nenhum treino com o `workoutId` |
| 500 | `{ "code": "internal_error", "message": "erro interno do servidor" }` | Erro inesperado |

## Janelas de atividade

A rota `GET /api/windows` vem da US-F07-01, a rota `GET /api/levels`, da US-F10-02, e a rota `GET /api/windows/week`, da US-F15b-02. Elas existem só quando a API abriu o banco e exigem sessão de acesso (US-F14-01). A ferramenta MCP `list_activity_windows` devolve o mesmo objeto de `GET /api/windows` (`mcp.md`), pelo mesmo service `listActivityWindows`, em `apps/api/src/modules/windows/window-state.service.ts`.

### GET /api/windows

| Campo | Valor |
|---|---|
| Objetivo | Mostrar o estado da janela de atividade de cada grupo muscular no instante da consulta |
| Story | US-F07-01 |
| Autenticação | Sessão de acesso (cookie `hd_session`) |
| Efeito colateral | Nenhum. A rota só lê as séries, os treinos e os programas |
| Idempotência | Idempotente para o mesmo histórico e o mesmo instante |

| Status | Corpo | Quando |
|---|---|---|
| 200 | `{ "now", "groups" }` | Sempre que o banco responde |
| 401 | `{ "code": "unauthenticated", "message": "Entre com a sua chave de acesso." }` | Sem sessão de acesso válida |
| 500 | `{ "code": "internal_error", "message": "erro interno do servidor" }` | Erro inesperado |

`now` é o relógio da API, em ISO 8601, em UTC. `groups` traz os 11 grupos do catálogo, na ordem do catálogo. Cada grupo tem `muscleGroup` (`slug` e `name`), `state`, `lastTrainedAt`, `opensAt` e `closesAt`. Os três instantes vêm em ISO 8601, em UTC, e ficam `null` em `none`.

O estado vem do último treino do grupo, com os parâmetros de `windows.config.ts` (regras da EN01-01):

| `state` | Quando | Instante que interessa |
|---|---|---|
| `resting` | `now` é anterior a `opensAt` | `opensAt`, a abertura |
| `open` | `now` é igual ou posterior a `opensAt` e anterior a `closesAt` | `closesAt`, o fechamento |
| `cooling` | `now` é igual ou posterior a `closesAt`, sem treino do grupo depois | `closesAt`, o início do esfriamento |
| `none` | Nenhum treino trabalhou o grupo como músculo principal | Nenhum |

Exemplo, com o peito treinado às 10:00Z e 1.200 kg de volume no objetivo hipertrofia:

```json
{
  "now": "2026-11-21T12:00:00.000Z",
  "groups": [
    {
      "muscleGroup": { "slug": "chest", "name": "peito" },
      "state": "resting",
      "lastTrainedAt": "2026-11-21T10:00:00.000Z",
      "opensAt": "2026-11-23T22:00:00.000Z",
      "closesAt": "2026-11-25T22:00:00.000Z"
    }
  ]
}
```

O exemplo mostra um grupo só; a resposta traz os 11.

### GET /api/levels

| Campo | Valor |
|---|---|
| Objetivo | Mostrar o nível de cada grupo muscular no instante da consulta, com os pontos na barra |
| Story | US-F10-02 |
| Autenticação | Sessão de acesso (cookie `hd_session`) |
| Efeito colateral | Nenhum. A rota só lê as séries, os treinos e os programas |
| Idempotência | Idempotente para o mesmo histórico e o mesmo instante |

| Status | Corpo | Quando |
|---|---|---|
| 200 | `{ "now", "groups" }` | Sempre que o banco responde |
| 401 | `{ "code": "unauthenticated", "message": "Entre com a sua chave de acesso." }` | Sem sessão de acesso válida |
| 500 | `{ "code": "internal_error", "message": "erro interno do servidor" }` | Erro inesperado |

`now` é o relógio da API, em ISO 8601, em UTC. `groups` traz os 11 grupos do catálogo, na ordem do catálogo. Cada grupo tem `muscleGroup` (`slug` e `name`), `level` (1 a 20), `points` (pontos inteiros na barra do nível), `levelCost` (o custo do nível, 40 + 3 × (`level` − 1)), `bestLevel` (o maior nível que o grupo alcançou no recálculo do histórico; o esfriamento não o reduz, e a correção ou a remoção de um treino o refazem, D66), `tier` (`bronze`, `silver`, `gold` ou `violet`), `cooling` (o grupo está esfriando: a janela do último treino fechou sem treino depois) e `nextDropAt` (o instante, em ISO 8601 e UTC, em que o grupo esfriando cai um nível; `null` sem esfriamento ou no nível 1, US-F10-03) e `muscleMemory` (o grupo está agora abaixo do melhor nível, e as séries dele rendem em dobro até alcançá-lo, US-F10-04). No nível 20, a barra fica cheia: `points` é igual a `levelCost`. O grupo nunca treinado fica no nível 1, com 0 pontos.

A API recalcula os níveis de todo o histórico a cada leitura (ADR-010), com as regras do pacote `@heavy-duty/game` (ADR-034), pelo service `listMuscleGroupLevels`, em `apps/api/src/modules/windows/progress.service.ts`. Cada série enche a barra de cada grupo do exercício, em ordem de tempo, com o ganho do grupo da D54: o grupo principal recebe 10 × razão × 6 ÷ séries planejadas do grupo na letra, e o secundário, 10 × razão × 0,5. A razão é o feito ÷ o planejado da série, até 2, contra o plano congelado na série (ADR-033). O ganho dobra quando o instante da série cai na janela do treino anterior do grupo (D55, D56) e no primeiro treino do grupo depois de a janela fechar ("bem-vindo de volta", D53) e com o grupo abaixo do melhor nível antes da série, depois da perda do esfriamento e antes do ganho (memória muscular, D63 e D64), sem somar: o máximo é ×2. Do `closesAt` da janela até o treino seguinte do grupo, ou até agora, o grupo esfria e perde `floor(tempo × 40 ÷ 24 h)` pontos; quando a barra chega a zero, o grupo cai um nível e a barra do nível de baixo começa cheia; o nível 1 não cai (D43, D58). A ferramenta MCP `list_muscle_group_levels` devolve o mesmo objeto (`mcp.md`).

Exemplo, com as costas treinadas uma vez, com as 3 séries planejadas no plano:

```json
{
  "now": "2026-11-21T12:00:00.000Z",
  "groups": [
    {
      "muscleGroup": { "slug": "back", "name": "costas" },
      "level": 2,
      "points": 20,
      "levelCost": 43,
      "bestLevel": 2,
      "tier": "bronze",
      "cooling": false,
      "nextDropAt": null,
      "muscleMemory": false
    }
  ]
}
```

### GET /api/windows/week

| Campo | Valor |
|---|---|
| Objetivo | Mostrar a meta semanal e as janelas aproveitadas, perdidas e abertas de uma semana, para a faixa de jogo do treino do dia |
| Story | US-F15b-02 |
| Autenticação | Sessão de acesso (cookie `hd_session`) |
| Efeito colateral | Nenhum. A rota só lê as séries, os treinos, os programas e a tabela `weekly_goals` |
| Idempotência | Idempotente para o mesmo histórico, a mesma meta e o mesmo instante |

| Parâmetro | Onde | Regra |
|---|---|---|
| `from` | Query | Obrigatório. Início da semana, instante UTC em ISO 8601 com `Z`. O celular manda a segunda-feira 00:00 do fuso do aparelho (D74) |

| Status | Corpo | Quando |
|---|---|---|
| 200 | `{ "now", "from", "to", "weeklyGoal", "windowsUsed", "windowsMissed", "windowsOpen", "usedPercent" }` | `from` válido |
| 400 | `{ "code": "week_start_required", "message": "informe o início da semana em UTC" }` | `from` ausente ou fora do formato |
| 401 | `{ "code": "unauthenticated", "message": "Entre com a sua chave de acesso." }` | Sem sessão de acesso válida |
| 500 | `{ "code": "internal_error", "message": "erro interno do servidor" }` | Erro inesperado |

A semana vai de `from`, incluso, a `to` = `from` + 7 × 24 h, exclusivo; a API não converte fuso. A contagem é a da ferramenta `get_windows_used` (US-F15b-01), pelo service `getWeekWindows`, em `apps/api/src/modules/windows/windows-used.service.ts`: cada janela dos 11 grupos conta na semana do desfecho, a aproveitada no treino seguinte do grupo, a perdida no fechamento e a aberta no `now` (D72, D73). `usedPercent` é `windowsUsed` ÷ (`windowsUsed` + `windowsMissed`), arredondado, e fica `null` em 0 de 0. `weeklyGoal` é a meta da linha mais recente de `weekly_goals` definida antes de `to`, e fica `null` sem meta (D75, D76). O planejador define a meta com a ferramenta `set_weekly_goal` (`mcp.md`).

Exemplo, com a meta 6 e as costas treinadas na segunda e na quinta:

```json
{
  "now": "2026-11-21T10:00:00.000Z",
  "from": "2026-11-16T03:00:00.000Z",
  "to": "2026-11-23T03:00:00.000Z",
  "weeklyGoal": 6,
  "windowsUsed": 1,
  "windowsMissed": 0,
  "windowsOpen": 1,
  "usedPercent": 100
}
```

## Avisos no celular

As rotas desta seção vêm da US-F09-01 (ADR-035). Elas existem só quando a API abriu o banco e exigem sessão de acesso. O service fica em `apps/api/src/modules/notifications/push-subscription.service.ts`. A chave pública VAPID vem da variável `VAPID_PUBLIC_KEY`, e a chave privada, do arquivo de `VAPID_PRIVATE_KEY_FILE` (`implantacao.md`); sem as duas, a API sobe com os avisos no celular desligados. A chave privada não sai em resposta nem em log.

### GET /api/notifications/push-key

| Campo | Valor |
|---|---|
| Objetivo | Dar ao app a chave pública VAPID para a inscrição de push, ou dizer que os avisos no celular não estão configurados |
| Story | US-F09-01 |
| Autenticação | Sessão de acesso (cookie `hd_session`) |
| Efeito colateral | Nenhum |
| Idempotência | Idempotente |

| Status | Corpo | Quando |
|---|---|---|
| 200 | `{ "configured": true, "publicKey": "<VAPID_PUBLIC_KEY>" }` | Com a chave pública e a chave privada configuradas |
| 200 | `{ "configured": false, "publicKey": null }` | Sem configuração, ou com configuração parcial |
| 401 | `{ "code": "unauthenticated", "message": "Entre com a sua chave de acesso." }` | Sem sessão de acesso válida |
| 500 | `{ "code": "internal_error", "message": "erro interno do servidor" }` | Erro inesperado |

### PUT /api/notifications/push-subscriptions

| Campo | Valor |
|---|---|
| Objetivo | Guardar a inscrição de push do navegador, pelo `endpoint` |
| Story | US-F09-01 |
| Autenticação | Sessão de acesso (cookie `hd_session`) |
| Efeito colateral | Inclui a linha em `push_subscriptions` ou, com o mesmo `endpoint`, troca `p256dh`, `auth` e `updated_at` |
| Idempotência | Idempotente: o app reenvia a inscrição a cada abertura do treino do dia, porque o Safari não garante o evento `pushsubscriptionchange` |

| Campo do corpo | Regra |
|---|---|
| `endpoint` | URL `https` do serviço de push, com até 2048 caracteres. A API recusa outro protocolo, porque depois manda o aviso para esse endereço |
| `keys.p256dh`, `keys.auth` | Base64url, de 1 a 256 caracteres |

| Status | Corpo | Quando |
|---|---|---|
| 204 | — | Inscrição guardada |
| 400 | `{ "code": "invalid_request", "message": "requisição inválida" }` | Corpo fora do esquema |
| 401 | `{ "code": "unauthenticated", "message": "Entre com a sua chave de acesso." }` | Sem sessão de acesso válida |
| 403 | `{ "code": "forbidden_origin", "message": "origem não permitida" }` | Cabeçalho `Origin` diferente da origem do app |
| 500 | `{ "code": "internal_error", "message": "erro interno do servidor" }` | Erro inesperado |

Exemplo do corpo:

```json
{
  "endpoint": "https://web.push.apple.com/QGuQyavXutnMH...",
  "keys": { "p256dh": "BNcRdreALRFX...", "auth": "tBHItJI5svbpez7KI4CCXg" }
}
```

### DELETE /api/notifications/push-subscriptions

| Campo | Valor |
|---|---|
| Objetivo | Apagar a inscrição de push do navegador quando o atleta desliga os avisos no celular |
| Story | US-F09-01 |
| Autenticação | Sessão de acesso (cookie `hd_session`) |
| Efeito colateral | Apaga a linha de `push_subscriptions` com o `endpoint` |
| Idempotência | Idempotente: responde 204 também sem inscrição com o `endpoint` |

O corpo é `{ "endpoint" }`, com a regra do `PUT`. Os status são os do `PUT`.

O envio de push fica atrás da interface `PushSender` (`push-sender.ts`), com o adaptador da biblioteca `web-push`. A mensagem vai em JSON (`title`, `body`, `tag`, `url`), com o TTL do aviso e urgência `normal`. A inscrição que o serviço de push recusa com 404 ou 410 sai da tabela (`sendPushToAll`); outra falha volta como motivo seguro, sem o `endpoint`, porque o endereço dá acesso à inscrição.

## Avisos por e-mail

A rota desta seção vem da US-F17-04 (ADR-037). Ela existe só quando a API abriu o banco e é pública: o link de desligar funciona sem a sessão de acesso (adendo da ADR-019). O service fica em `apps/api/src/modules/notifications/email-opt-out.service.ts`.

Cada e-mail de aviso leva um token aleatório de 32 bytes em base64url. O banco guarda só o SHA-256 do token, em `notifications.unsubscribe_token_hash`, na linha do canal `email` (`dados.md`). O token vai em dois lugares do e-mail:

- no rodapé, no link da página `<APP_ORIGIN>/desligar-emails#token=<token>`, que abre sem entrar no app e só desliga no toque em "Desligar e-mails" (D90);
- no cabeçalho `List-Unsubscribe: <<APP_ORIGIN>/api/email/unsubscribe?token=<token>>`, com `List-Unsubscribe-Post: List-Unsubscribe=One-Click`, para o cliente de e-mail desligar com um clique (RFC 8058).

### POST /api/email/unsubscribe

| Campo | Valor |
|---|---|
| Objetivo | Desligar os avisos por e-mail com o token do link de um e-mail |
| Story | US-F17-04 |
| Autenticação | Nenhuma (`security: []`); vale o token do e-mail |
| Efeito colateral | Com um token de e-mail enviado, grava `email_enabled = false` em `settings`. Os avisos no celular continuam |
| Idempotência | Idempotente |

O token vem no corpo JSON, `{ "token": "<token>" }`, como a página manda, ou na URL, `?token=<token>`, com o corpo `List-Unsubscribe=One-Click` em `application/x-www-form-urlencoded`, como o cliente de e-mail manda. O token do corpo vale sobre o da URL.

| Status | Corpo | Quando |
|---|---|---|
| 204 | Vazio | Sempre que o corpo é aceito: com token válido, desconhecido, de outro canal, com mais de 64 caracteres ou sem token. A resposta não diz se o token existe |
| 400 | `{ "code": "invalid_request", … }` | Corpo que não é JSON válido |
| 403 | `{ "code": "forbidden_origin", "message": "origem não permitida" }` | `Origin` de outro site. O `POST` do cliente de e-mail chega sem `Origin` e passa |
| 413 | `{ "code": "payload_too_large", "message": "corpo maior que 1 KiB" }` | Corpo maior que 1 KiB |
| 500 | `{ "code": "internal_error", "message": "erro interno do servidor" }` | Erro inesperado |

O `GET` da mesma URL não desliga nada e responde 401, como toda rota protegida: filtros de e-mail abrem os links sozinhos (D90). O token não vence (ADR-037). O planejador religa os e-mails pelo Claude, com `set_email_notices` (`mcp.md`).

## Situação do app

A rota desta seção vem da US-F14-02. A rota existe só quando a API abriu o banco e exige sessão de acesso (US-F14-01). A ferramenta MCP `get_system_status` devolve o mesmo objeto (`mcp.md`), pelo mesmo service `getSystemStatus`, em `apps/api/src/modules/system/system-status.service.ts`.

### GET /api/system/status

| Campo | Valor |
|---|---|
| Objetivo | Mostrar a situação do backup diário (a execução mais recente, a última bem-sucedida e as execuções recentes) e o envio dos avisos por canal |
| Story | US-F14-02; envio dos avisos na US-F17-01 |
| Autenticação | Sessão de acesso (cookie `hd_session`) |
| Efeito colateral | Nenhum. A rota só lê as tabelas `backup_runs` e `notifications` |
| Idempotência | Idempotente |

| Status | Corpo | Quando |
|---|---|---|
| 200 | `{ "backup": { "latestRun", "lastSuccessfulRun", "recentRuns" }, "notices": { "channels" } }` | Sempre que o banco responde |
| 401 | `{ "code": "unauthenticated", "message": "Entre com a sua chave de acesso." }` | Sem sessão de acesso válida |
| 500 | `{ "code": "internal_error", "message": "erro interno do servidor" }` | Erro inesperado |

Cada execução de backup tem `id`, `startedAt`, `finishedAt`, `status` (`succeeded` ou `failed`), `sizeBytes` e `error`. As datas vêm em ISO 8601, em UTC. `sizeBytes` é o tamanho em bytes da cópia do banco e fica `null` na falha. `error` traz o motivo da falha e fica `null` no sucesso.

- `latestRun` é a execução com o início mais recente, com sucesso ou falha.
- `lastSuccessfulRun` é a execução bem-sucedida mais recente, mesmo quando ela já saiu de `recentRuns`. A data mostra quantos dias o app ficou sem backup.
- `recentRuns` traz até 7 execuções, da mais nova para a mais antiga.

Sem nenhuma execução registrada, `backup` é `{ "latestRun": null, "lastSuccessfulRun": null, "recentRuns": [] }`.

O motivo da falha começa pela etapa em inglês (`snapshot failed` ou `offsite copy failed`) e traz a última linha da saída de erro da ferramenta de cópia. O texto não tem caractere de controle, troca a senha do repositório e a credencial em URL (`://usuário:senha@`) por `***` e tem no máximo 500 caracteres (`docs/arquitetura/backup.md`). Exemplo: `offsite copy failed: Fatal: wrong password or no key found`.

`notices.channels` traz um item por canal dos avisos de janela e de queda, nesta ordem: `push` e `email` (US-F17-01, ADR-036, ADR-037).

- `configured` diz se o servidor tem a configuração do canal: as variáveis VAPID no push (ADR-035) e `SMTP_HOST`, `MAIL_FROM` e `MAIL_TO` no e-mail (ADR-037). Com `false`, nada sai pelo canal.
- `lastSentAt` é o fim do envio mais recente com sucesso, em ISO 8601 e UTC, e fica `null` antes do primeiro envio.
- `recentFailures` traz até 5 falhas, da mais nova para a mais antiga, cada uma com `failedAt`, `kind` (`window_open`, `window_close` ou `level_drop`), `letter` e `error`. O motivo é seguro: no e-mail, o código do erro do Nodemailer e, quando há, o código de resposta SMTP, como `ECONNECTION` ou `EENVELOPE (SMTP 550)`, sem endereço, senha nem texto do servidor.

A falha de um canal não impede o outro: o e-mail que falha fica em `recentFailures`, e o aviso no celular sai mesmo assim (cenário "falha no envio" da F17).
