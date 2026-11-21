# ADR-017: Contrato da API com zod-openapi e Swagger UI

| Campo | Valor |
|---|---|
| Status | Aceita |
| Data | 2026-11-21 |
| Decisor | PO, por delegação no plano do MVP |
| Requisitos relacionados | NFR02, R07, ADR-004, EN-S0 (FR-008 a FR-013) |

## Contexto

Cada rota HTTP precisa de um contrato com schema de entrada, de saída e de erro, documentado e conferido em cada ciclo (`specs/plano-mvp.md`, Seção 6, arquivo local). O erro de domínio tem `code` em inglês e `message` em português (`docs/convencoes/codigo.md`, Seção 3; `apps/api/CLAUDE.md`, regra 8). Sem autenticação, nenhum caminho com dado ou com administração fica público (NFR02, R07); a autenticação chega na US-F14-01 e na US-F16-01.

## Decisão

Toda rota HTTP é declarada com `@hono/zod-openapi` 1.6.3 (MIT), sobre Zod 4.6.7, e a documentação é servida pelo `@hono/swagger-ui` 0.6.2 (MIT). Detalhes que o código segue:

- O schema Zod da rota é a fonte do contrato. A API serve o documento OpenAPI 3.1 em `/api/openapi.json` e o Swagger UI em `/api/docs`.
- O script `pnpm --filter @heavy-duty/api openapi` grava `docs/arquitetura/openapi.json`, com 2 espaços e quebra de linha final. O script `openapi:check` compara o arquivo versionado com o gerado, mostra as linhas diferentes e termina com código 1 quando os dois diferem.
- O erro HTTP comum é `{ code, message }`: `not_found` (404), `invalid_request` (400, pelo hook de validação de `createRouter()`) e `internal_error` (500, pelo `onError`). O schema fica em `apps/api/src/http/errors.ts`.
- Com `NODE_ENV=production`, a API não monta `/api/docs`, `/api/openapi.json` nem `/mcp`, até a autenticação existir. A saúde (`GET /api/health`) continua pública, porque não devolve dado de treino.

## Consequências

- O contrato, a validação e a documentação vêm do mesmo schema, sem arquivo escrito à mão.
- Mudança de rota sem gerar o `openapi.json` quebra o `openapi:check`, que entra nas verificações de cada ciclo.
- Toda rota usa `createRouter()` em vez de `new OpenAPIHono()`, para herdar o formato de erro do hook de validação.
- `docs/arquitetura/contratos.md` descreve cada rota em português, e o arquivo é atualizado no mesmo commit da rota.

## Alternativas consideradas

| Alternativa | Motivo da recusa |
|---|---|
| Documento OpenAPI escrito à mão | Desencontra do código sem aviso |
| `hono-openapi` com validadores separados | Mais um pacote para o mesmo resultado; o `@hono/zod-openapi` é mantido no repositório do Hono |
| Scalar no lugar do Swagger UI | O plano do MVP pede o Swagger UI |
