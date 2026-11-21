# ADR-020: Autenticação do MCP com OAuth 2.1 emitido pelo próprio app

| Campo | Valor |
|---|---|
| Status | Aceita |
| Data | 2026-11-21 |
| Decisor | PO, por delegação no plano do MVP |
| Requisitos relacionados | NFR02, R07, H12, D15, F16, US-F16-01, ADR-006, ADR-017, ADR-019 |

## Contexto

O PRD pede que o planejador administre o app pelo Claude, com autenticação (F16, D15), e que nenhuma chamada sem credencial devolva dado de treino (NFR02, R07, `docs/prd.md`, Seções 4, 9 e 10). Até esta decisão, o `/mcp` respondia 404 em produção e funcionava sem credencial fora de produção, atrás só da guarda de host (ADR-017; ADR-019). O PO é o único usuário e já prova quem é com a chave de acesso da ADR-019. A API roda num processo só, com o servidor MCP dentro (ADR-006).

A especificação de autorização do MCP define o que o conector remoto espera do servidor:

- O servidor MCP é um servidor de recurso OAuth 2.1 e DEVE publicar os metadados do recurso protegido do RFC 9728, com `authorization_servers` (especificação 2025-06-18 e 2025-11-25, seção "Authorization Server Location").
- O 401 leva a URL desses metadados em `WWW-Authenticate`, no parâmetro `resource_metadata` (RFC 9728, Seção 5.1). Na versão 2025-06-18 o cabeçalho é obrigatório; na 2025-11-25 o servidor pode usar o cabeçalho ou o endereço conhecido, e o cliente tenta `/.well-known/oauth-protected-resource/<caminho>` e depois `/.well-known/oauth-protected-resource` (seção "Protected Resource Metadata Discovery Requirements").
- O servidor de autorização publica os metadados do RFC 8414; para emissor sem caminho, o cliente tenta `/.well-known/oauth-authorization-server` e depois `/.well-known/openid-configuration` (2025-11-25, seção "Authorization Server Metadata Discovery").
- O registro dinâmico de cliente (RFC 7591) é SHOULD na versão 2025-06-18 e MAY na 2025-11-25, que acrescenta o Client ID Metadata Document como SHOULD e põe a ordem: cliente pré-registrado, Client ID Metadata Document se o servidor anunciar `client_id_metadata_document_supported`, e registro dinâmico se houver `registration_endpoint` (2025-11-25, seção "Client Registration Approaches").
- O cliente DEVE mandar o indicador de recurso do RFC 8707 na autorização e no token, e o servidor DEVE conferir que a credencial foi emitida para ele (seções "Resource Parameter Implementation" e "Token Handling").
- A credencial vai só no cabeçalho `Authorization: Bearer`, nunca na query string; credencial inválida ou vencida recebe 401 (seção "Token Requirements").
- O cliente DEVE usar PKCE com `S256` e recusa servidor sem `code_challenge_methods_supported` (2025-11-25, seção "Authorization Code Protection").
- O servidor de autorização DEVE comparar o `redirect_uri` de forma exata, aceitar só `https` ou `localhost`, rodar o token de renovação de cliente público e mostrar o hostname do `redirect_uri` na tela de autorização (seções "Open Redirection", "Communication Security", "Token Theft" e "Localhost Redirect URI Risks").

O cliente OAuth do SDK `@modelcontextprotocol/sdk` 1.32.2, que declara `LATEST_PROTOCOL_VERSION` `2025-11-25` (`dist/esm/types.js`), segue essa ordem: `discoverMetadataWithFallback` tenta o caminho com o sufixo do recurso e depois a raiz; `buildDiscoveryUrls` tenta `oauth-authorization-server` antes de `openid-configuration`; `selectResourceURL` usa o `resource` dos metadados, desde que combine com a URL do servidor; e o registro dinâmico só acontece quando o servidor não anuncia o Client ID Metadata Document (`dist/esm/client/auth.js`).

Não foi possível conferir o endereço de retorno que o conector do Claude registra nem o método de registro que ele usa contra este servidor [a confirmar na tarefa manual do PO, ao conectar o Claude real].

## Decisão

O app é o próprio servidor de autorização OAuth 2.1 do `/mcp`, no processo e no domínio da API, e emite uma credencial opaca, guardada por hash, depois de o PO aprovar o cliente com a sessão de acesso da ADR-019. Detalhes que o código segue:

- **Descoberta.** `GET /.well-known/oauth-protected-resource/mcp` e `GET /.well-known/oauth-protected-resource` devolvem o mesmo documento: `resource` `<APP_ORIGIN>/mcp`, `authorization_servers` `[<APP_ORIGIN>]`, `bearer_methods_supported` `['header']` e `resource_name`. `GET /.well-known/oauth-authorization-server` devolve `issuer` `<APP_ORIGIN>`, `authorization_endpoint` `<APP_ORIGIN>/autorizar`, `token_endpoint` `<APP_ORIGIN>/api/oauth/token`, `registration_endpoint` `<APP_ORIGIN>/api/oauth/register`, `response_types_supported` `['code']`, `grant_types_supported` `['authorization_code', 'refresh_token']`, `code_challenge_methods_supported` `['S256']` e `token_endpoint_auth_methods_supported` `['none']`. Sem `/.well-known/openid-configuration`.
- **Rotas públicas.** `POST /api/oauth/register` e `POST /api/oauth/token` entram na lista fechada de rotas públicas da guarda de sessão da ADR-019. As duas aceitam corpo de até 16 KiB.
- **Registro dinâmico (RFC 7591).** O cliente é público: a resposta traz `token_endpoint_auth_method: none` e nenhum segredo. O `redirect_uri` usa `https`, ou `http` em `localhost`, `127.0.0.1` e `[::1]`, sem fragmento; até 5 por cliente, com até 2.048 caracteres cada; `client_name` com até 100 caracteres. Ficam até 20 clientes nunca aprovados: a cada registro, saem os nunca aprovados com mais de 24 horas e, na lotação, o nunca aprovado mais antigo. Cliente aprovado nunca sai pelo despejo.
- **Autorização.** O `authorization_endpoint` é a tela `/autorizar` do app web, atrás do `AuthGate`; sem sessão, a tela de entrada aparece na mesma URL. A tela chama `GET /api/oauth/authorization` (prévia) e `POST /api/oauth/authorization` (decisão), as duas atrás da sessão de acesso e da guarda de origem. O pedido exige `response_type=code`, PKCE `S256`, cliente registrado e `redirect_uri` igual, letra por letra, a um registrado pelo cliente. O indicador de recurso é opcional e, quando vem, é igual a `<APP_ORIGIN>/mcp`. O `scope` é ignorado. Cliente desconhecido ou `redirect_uri` inválido mostram o erro sem redirecionar; os outros erros voltam ao `redirect_uri` com `error` e `state`. A tela mostra o host do `redirect_uri` em destaque e o nome declarado como dado secundário.
- **Código.** A aprovação grava o SHA-256 de um código aleatório de 32 bytes, válido por 5 minutos e consumido de forma atômica (`UPDATE … WHERE used_at IS NULL AND expires_at > ?`). O código reusado é recusado com `invalid_grant`, sem revogar a autorização. A recusa devolve `error=access_denied`, sem código.
- **Token.** A troca confere cliente, `redirect_uri`, `code_verifier` (`S256`) e recurso, e devolve `access_token`, `token_type: Bearer`, `expires_in: 3600` e `refresh_token`, com `Cache-Control: no-store`. A credencial vale 1 hora; o token de renovação vale 30 dias desde a última emissão. A renovação gera credencial e token de renovação novos na mesma linha (rotação). O reuso de um token de renovação já trocado é recusado com `invalid_grant` e revoga a autorização inteira (RFC 9700, Seção 4.14.2). Os erros seguem os RFC 6749 e 7591 (`{ error, error_description }`).
- **Dados.** Três tabelas: `oauth_clients`, `oauth_authorization_codes` e `oauth_grants`, uma linha por aprovação. O banco guarda só o SHA-256 do código, da credencial e do token de renovação. Não há segredo de assinatura nem variável nova no `.env`. A cada emissão, saem os códigos vencidos e as autorizações com renovação vencida.
- **Guarda do `/mcp`.** O `/mcp` existe em todos os ambientes, só com banco; sem banco, ele, a descoberta e as rotas OAuth respondem 404. A ordem é: guarda de host, guarda da credencial, servidor MCP. A guarda da credencial lê só `Authorization: Bearer` e confere hash, vencimento, revogação e recurso. Sem credencial válida, a resposta é 401 com `WWW-Authenticate: Bearer resource_metadata="<APP_ORIGIN>/.well-known/oauth-protected-resource/mcp"`, mais `error="invalid_token"` quando veio um token, e corpo `{ code: 'mcp_unauthenticated', message }`. A URL vem sempre de `APP_ORIGIN`, nunca do `Host`. O hostname de `APP_ORIGIN` entra sempre na lista de hosts do `/mcp`.
- **Canais separados.** O cookie `hd_session` não abre o `/mcp`, e a credencial do MCP não abre `/api/*`.
- **Revogação.** O comando `pnpm --filter @heavy-duty/api auth:revoke-mcp`, executado no servidor, marca `revoked_at` em todas as autorizações ativas, gasta os códigos pendentes e imprime quantas autorizações revogou. Não cria banco nem executa migração.
- **Sem CORS, sem `iss` (RFC 9207) e sem escopos por ferramenta.**

Esta ADR substitui só o que a ADR-017 e a ADR-019 dizem do `/mcp`: o `/mcp` deixa de ser escondido em produção. As duas continuam com status `Aceita` no resto.

## Consequências

- O planejador conecta o Claude ao domínio público e aprova o acesso uma vez, com a chave de acesso, sem senha nem segredo novo.
- O ambiente de desenvolvimento usa o mesmo fluxo em `http://localhost:8080`, sem valor sensível.
- O proxy de desenvolvimento, o túnel e o proxy do e2e passam a levar `/.well-known/oauth-*` à API.
- Os testes que chamam o `/mcp` passam a mandar uma credencial, emitida pelo helper `createMcpAccessToken` de `apps/api/src/test/mcp-auth.ts`.
- Uma renovação repetida pelo cliente, com o token de renovação antigo, revoga a autorização, e o PO aprova de novo.
- Se o conector do Claude exigir Client ID Metadata Document ou cliente com segredo, a decisão precisa de ADR nova [a confirmar].
- Não há tela para listar ou revogar uma autorização só; o comando revoga todas (D22).

## Alternativas consideradas

| Alternativa | Motivo da recusa |
|---|---|
| Token fixo no `.env` enviado pelo Claude | O conector remoto do Claude usa OAuth; o token fixo seria um segredo de longa duração no servidor |
| Provedor de identidade externo | Serviço a mais e conta de terceiro para um usuário só; a chave de acesso já prova quem é o PO |
| Credencial em JWT assinado | Exige segredo de assinatura no `.env` e não permite revogar sem lista de bloqueio |
| Rotas `/oauth/*` fora de `/api` | Pediriam rota nova no proxy e no túnel; `/api/*` já chega à API |
| Endpoint de autorização servido pela API | A tela de entrada e a sessão vivem no app web; a tela no Next ganha o `AuthGate` sem código novo |
| Client ID Metadata Document | Busca de URL arbitrária pelo servidor (risco de SSRF) e mais código; o SDK cai no registro dinâmico quando o servidor não anuncia o documento |
| Cookie de sessão autenticando o `/mcp` | Mistura os canais e abre o `/mcp` a CSRF pelo navegador |
| Reuso de token de renovação só recusado, sem revogar | O RFC 9700 trata o reuso como sinal de vazamento |
