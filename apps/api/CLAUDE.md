# Regras de apps/api

API em Node e Hono com dois canais (arquitetura em `docs/arquitetura/api.md`): HTTP para a UI e MCP para o Claude (persona Planejador, P2). Os dados ficam num arquivo SQLite no servidor do PO.

## Estrutura planejada

```text
src/
  modules/<module>/
    <entity>.routes.ts        rotas HTTP do módulo
    <entity>.service.ts       regras de negócio
    <entity>.repository.ts    acesso ao SQLite
    <entity>.service.spec.ts  teste ao lado do código
  mcp/
    tools/<module>.tools.ts   ferramentas MCP, uma por ação
  db/                         conexão, esquema e migrações
  test/factories/             factories fishery
```

Módulos previstos: `auth` (chave de acesso, sessão de acesso, link de cadastro), `catalog` (grupo muscular, músculo, exercício), `programs`, `workouts`, `system` (estado do backup). O módulo `windows` entra na onda 5, com o volume por grupo muscular (`volume.rules.ts`, função pura, e `windows.config.ts` com os parâmetros) e a simulação das janelas (`window.rules.ts` e `window-parameters.ts`, funções puras, e o service `simulateActivityWindows`) e o estado atual da janela (`windowStateOf` e o service `listActivityWindows`, pela rota `GET /api/windows` e pela ferramenta `list_activity_windows`). Na onda 6a, o módulo ganha o recálculo dos níveis (`progress.rules.ts`, função pura sobre as regras do pacote `@heavy-duty/game`, e o service `listMuscleGroupLevels`, pela rota `GET /api/levels` e pela ferramenta `list_muscle_group_levels`).

## Regras

1. A rota HTTP e a ferramenta MCP chamam o mesmo service. A regra de negócio não fica na rota nem na ferramenta.
2. Toda rota e toda ferramenta MCP exigem autenticação. Sem credencial válida, a resposta não contém dado de treino (NFR02, R07).
   As rotas `/api/*` exigem sessão de acesso em todos os ambientes, pela guarda de `src/modules/auth/session.middleware.ts` (ADR-019). A lista de rotas públicas é fechada: `GET /api/health`, as quatro rotas da cerimônia em `/api/auth/enrollment/*` e `/api/auth/sign-in/*`, e `POST /api/oauth/register` e `POST /api/oauth/token` (ADR-020). Não acrescente rota à lista sem ADR.
   O `/mcp` exige a credencial do MCP (`Authorization: Bearer`) em todos os ambientes, pela guarda de `src/mcp/bearer-guard.ts`, depois da guarda de host (ADR-020). O cookie não abre o `/mcp`, e a credencial do MCP não abre `/api/*`.
   Teste de rota protegida usa `createSignedInApp` ou `createSessionCookie` de `src/test/session.ts`. Teste que chama o `/mcp` usa `createMcpAuthorizedApp` ou `createMcpAccessToken` de `src/test/mcp-auth.ts`. Não crie opção que desligue uma guarda.
3. Ferramenta MCP que apaga ou altera histórico declara `destructiveHint: true` e só age depois de confirmação explícita, em duas chamadas: a primeira, sem `confirmationCode`, devolve a prévia com `applied: false`; a segunda, com o código da prévia, aplica se o estado do treino não mudou (US-F06-02, ADR-026).
4. Nome de ferramenta MCP em `snake_case`, com verbo primeiro: `list_programs`, `add_exercise`, `remove_workout`.
5. Datas trafegam e ficam no banco em ISO 8601, em UTC. A conversão para o fuso do usuário é da UI.
6. A gravação de série (`POST /api/workouts/{workoutId}/sets`) usa o ID da série, gerado no cliente, como chave de idempotência. O mesmo ID com os mesmos valores responde 200 com a série gravada; com outros valores, 409. A primeira série cria o treino. A correção (`PATCH /api/workouts/{workoutId}/sets/{setId}`) troca só a carga e a medida da série, com valores absolutos, e é idempotente: o mesmo corpo responde 200 com a mesma série. A correção que muda um valor também grava `corrected_at` com o relógio da API; o reenvio igual não muda a marca. O treino terminado também aceita a correção (ADR-025).
7. Editar o programa não altera treino já registrado (US-F02-02). O treino guarda a letra treinada e os valores executados de cada série. O vínculo do treino com a letra e o da série com o exercício do programa ficam nulos quando o plano muda (`ON DELETE SET NULL`).
8. Erro de domínio retorna `code` em inglês (`muscle_group_required`) e `message` em português, com o texto do cenário do PRD.
   O service lança `DomainError` (`src/errors/domain-error.ts`) com `code`, `message` e `kind`. Cada canal traduz o erro num lugar só: o `handleError` HTTP converte `kind` em status (`invalid` 400, `unauthenticated` 401, `not_found` 404, `not_found_reference` 422, `conflict` 409), e a ferramenta MCP usa `runTool` (`src/mcp/tools/tool-result.ts`) para devolver `isError: true` com `{ code, message }`. Não valide no schema Zod o campo que o PRD recusa com mensagem própria: o schema aceita o campo opcional, e o service recusa.
   Use `not_found` para o recurso do caminho da rota que não existe, como o programa ou a letra. Use `not_found_reference` para a referência no corpo que não existe, como o exercício ou o músculo.
9. Declare toda rota HTTP com `@hono/zod-openapi` (ADR-017). Rota nova ou alterada regenera `docs/arquitetura/openapi.json` com `pnpm --filter @heavy-duty/api openapi` e atualiza `docs/arquitetura/contratos.md`; ferramenta MCP atualiza `docs/arquitetura/mcp.md`.
10. Gere o ID de entidade com o gerador de UUID v7 de `src/db/id.ts` (ADR-014). Mudança de esquema em `src/db/schema.ts` vira migração com `pnpm --filter @heavy-duty/api db:generate` (ADR-013).

## Testes

- Teste de integração usa SQLite em memória (`:memory:`), com as migrações aplicadas.
- O teste não acessa a rede nem o relógio real.
- Siga `docs/convencoes/testes.md`.

## Comandos

```sh
pnpm --filter @heavy-duty/api dev
pnpm --filter @heavy-duty/api test
pnpm --filter @heavy-duty/api lint
pnpm --filter @heavy-duty/api typecheck
pnpm --filter @heavy-duty/api build          # compila para dist/
pnpm --filter @heavy-duty/api db:generate    # gera a migração a partir do esquema
pnpm --filter @heavy-duty/api db:migrate     # aplica as migrações em DATABASE_PATH
pnpm --filter @heavy-duty/api db:seed        # executa a semente idempotente
pnpm --filter @heavy-duty/api openapi        # regenera docs/arquitetura/openapi.json
pnpm --filter @heavy-duty/api openapi:check  # confere o contrato versionado
pnpm --filter @heavy-duty/api backup:run     # executa o backup uma vez; código 0 ou 1
pnpm --filter @heavy-duty/api backup:scheduler  # inicia o agendador diário do backup
pnpm --filter @heavy-duty/api backup:verify <arquivo>  # confere um banco restaurado
pnpm --filter @heavy-duty/api auth:enroll    # imprime um link de cadastro de chave de acesso; código 0 ou 1
pnpm --filter @heavy-duty/api auth:revoke-mcp  # revoga todas as autorizações do MCP; código 0 ou 1
```

O backup roda num processo separado da API (`src/modules/system/backup/`, ADR-018) e lê a configuração em `src/config/backup-env.ts`. A API não lê as variáveis do restic. O teste com o restic real (`restic-store.integration.spec.ts`) fica `skipped` no host sem o binário e roda dentro do contêiner `backup` (`docs/arquitetura/backup.md`).

O comando `auth:enroll` (`src/modules/auth/enroll.ts`) lê `DATABASE_PATH` e `APP_ORIGIN`, não cria banco nem executa migração, e imprime o link `<APP_ORIGIN>/cadastro#token=…`. O link vale 15 minutos e uma vez só. Não copie o link para arquivo, log ou canal compartilhado.

O comando `auth:revoke-mcp` (`src/modules/auth/revoke-mcp.ts`) lê `DATABASE_PATH`, não cria banco nem executa migração, marca `revoked_at` em todas as autorizações do MCP, gasta os códigos pendentes e imprime só as contagens. Depois dele, o Claude precisa de nova aprovação do PO.
