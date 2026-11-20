# Regras de apps/api

API em Node e Hono com dois canais: HTTP para a UI e MCP para o Claude (persona Planejador, P2). Os dados ficam num arquivo SQLite no servidor do PO.

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

Módulos previstos: `catalog` (grupo muscular, músculo, exercício), `programs`, `workouts`, `system` (estado do backup). O módulo `windows` entra na onda 5.

## Regras

1. A rota HTTP e a ferramenta MCP chamam o mesmo service. A regra de negócio não fica na rota nem na ferramenta.
2. Toda rota e toda ferramenta MCP exigem autenticação. Sem credencial válida, a resposta não contém dado de treino (NFR02, R07).
3. Ferramenta MCP que apaga ou altera histórico declara `destructiveHint: true` e só age depois de confirmação explícita (US-F06-02).
4. Nome de ferramenta MCP em `snake_case`, com verbo primeiro: `list_programs`, `add_exercise`, `remove_workout`.
5. Datas trafegam e ficam no banco em ISO 8601, em UTC. A conversão para o fuso do usuário é da UI.
6. A gravação de série aceita uma chave de idempotência. A mesma chave grava uma série só.
7. Editar o programa não altera treino já registrado (US-F02-02). O treino guarda os valores executados, não uma referência ao programa.
8. Erro de domínio retorna `code` em inglês (`muscle_group_required`) e `message` em português, com o texto do cenário do PRD.

## Testes

- Teste de integração usa SQLite em memória (`:memory:`), com as migrações aplicadas.
- O teste não acessa a rede nem o relógio real.
- Siga `docs/convencoes/testes.md`.

## Comandos

```sh
pnpm --filter @tap/api dev
pnpm --filter @tap/api test
pnpm --filter @tap/api lint
pnpm --filter @tap/api typecheck
```
