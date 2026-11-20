# App de treino

Monorepo open source de um app pessoal de musculação. A UI (`apps/ui`) é um PWA para registrar o treino no celular. A API (`apps/api`) guarda os dados e expõe um servidor MCP para administrar o app pelo Claude. O produto está descrito em `docs/prd.md`.

Estado atual: só a documentação e a estrutura de pastas existem. Os apps ainda não têm código. O scaffold dos apps faz parte da onda 1 do PRD (F01 e F14).

## Idioma

- Escreva em inglês: código, identificadores, comentários, nomes de teste, arquivos `.feature`, mensagens de commit e descrições de API e de ferramenta MCP.
- Escreva em português do Brasil: documentação (`docs/`, `README.md`, `CONTEXT.md`, `CONTRIBUTING.md`), descrição de PR e texto exibido ao usuário na UI.
- Siga `docs/convencoes/escrita-tecnica.md` em todo texto em português.
- Use os termos de `CONTEXT.md`. O glossário liga cada termo do domínio ao nome no código.

## Mapa do repositório

| Caminho | Conteúdo |
|---|---|
| `apps/ui/` | PWA em React e Vite. Regras em `apps/ui/CLAUDE.md` |
| `apps/api/` | API em Node e Hono, servidor MCP e SQLite. Regras em `apps/api/CLAUDE.md` |
| `e2e/` | Testes ponta a ponta com Playwright e playwright-bdd |
| `DESIGN.md` | Diretrizes de interface (HIG), com referência no iOS 27 e no macOS 27 |
| `docs/prd.md` | Requisitos de produto: features, stories e cenários de aceite |
| `docs/arquitetura.md` | Componentes, fluxos e decisões pendentes |
| `docs/adr/` | Registros de decisão de arquitetura (ADR) |
| `docs/convencoes/` | Código, comentários, testes, escrita técnica e Git |
| `docs/qualidade.md` | Definição de pronto, verificações automáticas e revisão |
| `docs/specs/` | Uma pasta por story em desenvolvimento |

## Comandos

```sh
pnpm install                    # instala as dependências do workspace
pnpm dev                        # inicia todos os apps em modo de desenvolvimento
pnpm test                       # executa os testes de todos os apps
pnpm lint                       # executa o lint de todos os apps
pnpm typecheck                  # verifica os tipos de todos os apps
pnpm e2e                        # executa a suíte ponta a ponta
pnpm --filter @tap/api test     # executa os testes de um app só
```

Enquanto os apps não têm `package.json`, os scripts terminam sem executar nada.

## Regras que valem sempre

1. Escreva comentário só dos tipos de `docs/convencoes/comentarios.md`, Seção 4, com até 3 linhas, em inglês. Não escreva TODO, ID de ticket, autor, data nem código comentado.
2. Escreva teste com `describe` aninhado no padrão Given/When/Then. O arquivo `.spec.ts` fica ao lado do código testado. Detalhes em `docs/convencoes/testes.md`.
3. Ponha a unidade no identificador: `loadKg`, `restSeconds`, `durationSeconds`.
4. Antes de introduzir uma decisão de arquitetura nova, escreva uma ADR em `docs/adr/` com status `Proposta` e peça a decisão do PO.
5. Não leia, não escreva e não repita senha, token ou chave. O arquivo `.env` fica fora do Git; o `.env.example` usa marcadores como `<TOKEN>`.
6. Não crie commit, branch remota nem PR sem pedido explícito.
7. Escreva a mensagem de commit em Conventional Commits, em inglês: `<tipo>(<escopo>): <assunto>`. Tipos: `feat`, `fix`, `docs`, `test`, `refactor`, `perf`, `build`, `ci`, `chore`, `revert`. Escopos: `ui`, `api`, `mcp`, `e2e`, `docs`, `deps`, `repo`. Ponha `Refs: <id-da-story>` no rodapé. Detalhes em `docs/convencoes/git.md`, Seção 4.
8. Ao terminar uma tarefa, execute `pnpm lint`, `pnpm typecheck` e `pnpm test` e relate o resultado real.

## Documento por tarefa

| Tarefa | Leia antes |
|---|---|
| Implementar uma story | a story em `docs/prd.md` e a pasta da story em `docs/specs/` |
| Criar módulo, rota ou ferramenta MCP | `docs/arquitetura.md` e `docs/convencoes/codigo.md` |
| Criar ou alterar tela ou componente de UI | `DESIGN.md` |
| Escrever teste | `docs/convencoes/testes.md` |
| Escrever ou revisar comentário | `docs/convencoes/comentarios.md` |
| Escrever ou revisar documentação | `docs/convencoes/escrita-tecnica.md` |
| Fazer commit ou abrir PR | `docs/convencoes/git.md` e `docs/qualidade.md` |
| Tomar decisão de arquitetura | `docs/adr/README.md` |

## Fluxo de uma story

1. Especifique a story em `docs/specs/<id-da-story>-<slug>/spec.md`.
2. Quebre a story em issues de um PR cada.
3. Escreva o plano técnico da issue em `plan.md`, na mesma pasta.
4. Implemente com TDD, um teste de comportamento por passo do plano.
5. Verifique contra o plano e os critérios de aceite. Registre o resultado em `qa.md`.
6. Abra o PR com o modelo de `.github/pull_request_template.md`.

Se as skills `dev-*` estiverem instaladas, a pasta da story é o `FEATURE_DIR` delas. O layout está em `docs/specs/README.md`.

## Glossário do domínio

@CONTEXT.md
