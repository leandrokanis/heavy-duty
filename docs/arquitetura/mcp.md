# Ferramentas do servidor MCP

Este documento lista as ferramentas do servidor MCP da API: nome, descrição, parâmetros, se a ferramenta é destrutiva e o service que ela chama. O servidor MCP roda no processo da API, em `/mcp` (ADR-006).

## Transporte e acesso

- O servidor usa o `WebStandardStreamableHTTPServerTransport` do `@modelcontextprotocol/sdk` 1.32.2, sem estado e com resposta JSON. Cada requisição cria um servidor MCP e um transporte (`apps/api/src/mcp/server.ts`).
- O cliente envia `POST /mcp` com o cabeçalho `Accept: application/json, text/event-stream`.
- Fora de `NODE_ENV=production`, o `/mcp` fica disponível sem autenticação, só no ambiente de desenvolvimento. Em produção, o `/mcp` responde 404 até a US-F16-01 trazer a autenticação (ADR-017).
- O servidor se apresenta como `heavy-duty` e declara a capacidade `tools`.
- O `/mcp` só atende requisição cujo cabeçalho `Host` esteja na lista de hosts permitidos, e cujo `Origin`, quando vier, também esteja. Fora da lista, a resposta é 403 com `{ "code": "forbidden_host", "message": "host não permitido" }`. A regra barra o ataque de DNS rebinding: uma página aberta no navegador não alcança o `/mcp` por um domínio que ela controla (`apps/api/src/mcp/host-guard.ts`).
- A lista vem da variável `MCP_ALLOWED_HOSTS`, com nomes de host separados por vírgula e sem porta. O padrão é `localhost,127.0.0.1,[::1]`, que atende o proxy de desenvolvimento em `127.0.0.1:8080`. A produção acrescenta o domínio público na US-F16-01. A lista não substitui a autenticação: ela barra o navegador, não um cliente que fala direto com a API.

## Regras das ferramentas

- O nome da ferramenta é em `snake_case`, com verbo primeiro (`apps/api/CLAUDE.md`, regra 4).
- A ferramenta chama o mesmo service da rota HTTP (ADR-006).
- A ferramenta que apaga ou altera histórico declara `destructiveHint: true` e só age depois de confirmação explícita (US-F06-02).
- O registro das ferramentas fica em `apps/api/src/mcp/tools/index.ts`. Ferramenta nova, alterada ou removida atualiza este arquivo no mesmo commit.

## Lista de ferramentas

As ferramentas existem só quando a API abriu o banco. Sem banco, `tools/list` devolve uma lista vazia.

| Ferramenta | Descrição | Parâmetros | Destrutiva | Service |
|---|---|---|---|---|
| `list_muscle_groups` | List the muscle groups of the catalog, in catalog order. | Nenhum | Não (`readOnlyHint: true`) | `listMuscleGroups`, em `modules/catalog/muscle-group.service.ts` |
| `list_muscles` | List the registered muscles, each with its muscle group, ordered by slug. | Nenhum | Não (`readOnlyHint: true`) | `listMuscles`, em `modules/catalog/muscle.service.ts` |
| `add_muscle` | Register a muscle in a muscle group. muscleGroupSlug is a slug from list_muscle_groups, such as "triceps". | `name` (texto), `muscleGroupSlug` (texto) | Não (`destructiveHint: false`) | `addMuscle`, em `modules/catalog/muscle.service.ts` |
| `list_exercises` | List the active exercises ordered by slug, each with its kind, its muscles with role (primary or secondary) and muscle group, and the muscle groups it works. | Nenhum | Não (`readOnlyHint: true`) | `listExercises`, em `modules/catalog/exercise.service.ts` |
| `add_exercise` | Register an exercise. kind is "reps" (measured in repetitions) or "time" (measured in seconds). primaryMuscleSlugs needs at least one muscle; secondaryMuscleSlugs is optional. Both take slugs from list_muscles, such as "peitoral-maior". | `name` (texto), `kind` (texto: `reps` ou `time`), `primaryMuscleSlugs` (lista de textos), `secondaryMuscleSlugs` (lista de textos, opcional) | Não (`destructiveHint: false`) | `addExercise`, em `modules/catalog/exercise.service.ts` |
| `get_system_status` | Report the daily backup status: the latest run, the last successful run and up to 7 recent runs, newest first. Each run has startedAt and finishedAt in UTC (ISO 8601), status (succeeded or failed), sizeBytes and the failure reason in error. latestRun and lastSuccessfulRun are null when no such run exists. | Nenhum | Não (`readOnlyHint: true`) | `getSystemStatus`, em `modules/system/system-status.service.ts` |

A US-F01-01 trouxe as três primeiras ferramentas, a US-F01-02 trouxe `list_exercises` e `add_exercise`, e a US-F14-02 trouxe `get_system_status`. As rotas HTTP equivalentes estão em `contratos.md`, nas seções "Catálogo de grupos musculares e músculos", "Catálogo de exercícios" e "Situação do app". O schema aceita os campos de `add_exercise` como opcionais, e o service recusa o campo ausente ou inválido, como na rota HTTP.

## Resultado e erro das ferramentas

- O resultado traz o mesmo objeto da rota HTTP em `structuredContent` e, em JSON, no primeiro item de `content`. Cada ferramenta declara o `outputSchema` desse objeto.
- A recusa de domínio volta com `isError: true` e `{ code, message }` em JSON no texto, igual ao corpo da recusa HTTP. Exemplo: `add_muscle` sem `muscleGroupSlug` devolve `{ "code": "muscle_group_required", "message": "informe o grupo muscular" }`.
- O erro inesperado vai para o log da API e volta com `isError: true` e `{ "code": "internal_error", "message": "erro interno do servidor" }`. O SDK 1.32.2 converte todo erro lançado pela ferramenta em resultado `isError` com a mensagem crua. A tradução em `apps/api/src/mcp/tools/tool-result.ts` impede que o detalhe interno chegue ao cliente.
