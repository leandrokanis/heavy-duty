# Heavy Duty

Monorepo open source do Heavy Duty, um app pessoal de musculação. A UI (`apps/ui`) é um PWA em Next.js para registrar o treino no celular. A API (`apps/api`) guarda os dados e expõe um servidor MCP para administrar o app pelo Claude. O produto está descrito em `docs/prd.md`.

Estado atual: o scaffold (EN-S0) criou os quatro pacotes do workspace (`heavy-duty`, `@heavy-duty/ui`, `@heavy-duty/api` e `@heavy-duty/e2e`), o ambiente de desenvolvimento com Docker Compose e a preparação da produção. Os apps ainda não têm regra de domínio. As stories seguem o roadmap da onda 1 do PRD (F01 e F14).

## Idioma

- Escreva em inglês: código, identificadores, comentários, nomes de teste, arquivos `.feature`, mensagens de commit e descrições de API e de ferramenta MCP.
- Escreva em português do Brasil: documentação (`docs/`, `README.md`, `CONTEXT.md`, `CONTRIBUTING.md`), descrição de PR e texto exibido ao usuário na UI.
- Siga `docs/convencoes/escrita-tecnica.md` em todo texto em português.
- Use os termos de `CONTEXT.md`. O glossário liga cada termo do domínio ao nome no código.

## Mapa do repositório

| Caminho | Conteúdo |
|---|---|
| `apps/ui/` | PWA em Next.js, com Base UI e Animate UI. Regras em `apps/ui/CLAUDE.md` |
| `apps/api/` | API em Node e Hono, servidor MCP e SQLite. Regras em `apps/api/CLAUDE.md` |
| `e2e/` | Testes ponta a ponta com Playwright e playwright-bdd |
| `infra/` | Imagens Docker, `Caddyfile` do proxy de desenvolvimento e configuração do túnel |
| `compose.yaml`, `compose.prod.yaml` | Ambiente de desenvolvimento (ADR-011) e sobreposição de produção (ADR-015) |
| `DESIGN.md` | Diretrizes de interface (HIG), com referência no iOS 27 e no macOS 27 |
| `docs/prd.md` | Requisitos de produto: features, stories e cenários de aceite |
| `docs/gamificacao.md` | Projeto de gamificação (Octalysis) das ondas 5 a 7 |
| `docs/arquitetura/` | Modelo C4 (contexto e contêineres), um arquivo por contêiner e o modelo de dados |
| `docs/adr/` | Registros de decisão de arquitetura (ADR) |
| `docs/convencoes/` | Código, comentários, testes, escrita técnica e Git |
| `docs/qualidade.md` | Definição de pronto, verificações automáticas e revisão |
| `specs/` | Pasta local, fora do Git: plano do MVP e artefatos de trabalho de cada story |

## Comandos

```sh
pnpm install                          # instala as dependências do workspace
pnpm dev                              # inicia todos os apps em modo de desenvolvimento
pnpm test                             # executa os testes de todos os apps
pnpm lint                             # executa o lint de todos os apps
pnpm typecheck                        # verifica os tipos de todos os apps
pnpm e2e                              # executa a suíte ponta a ponta
pnpm --filter @heavy-duty/api test    # executa os testes de um app só
pnpm --filter @heavy-duty/api openapi:check  # confere o contrato versionado da API
pnpm --filter @heavy-duty/api backup:run     # executa o backup uma vez (ADR-018)
```

O ambiente de desenvolvimento sobe com Docker Compose, no projeto `heavy-duty`:

```sh
docker compose up -d                                   # sobe web, api e proxy em 127.0.0.1:8080
docker compose logs -f api                             # acompanha o log de um serviço
docker compose exec api pnpm --filter @heavy-duty/api test  # executa os testes dentro do contêiner
docker compose down                                    # encerra os serviços e mantém ./data/
docker compose --profile backup up -d backup           # sobe o agendador do backup, fora do padrão
docker compose --profile backup down                   # encerra os serviços, inclusive o backup
```

Troque a porta do proxy com `PROXY_PORT` e ligue a observação por polling com `DEV_WATCH_POLLING=true`, sem editar o `compose.yaml`.

## Regras que valem sempre

1. Escreva comentário só dos tipos de `docs/convencoes/comentarios.md`, Seção 4, com até 3 linhas, em inglês. Não escreva TODO, ID de ticket, autor, data nem código comentado.
2. Escreva teste com `describe` aninhado no padrão Given/When/Then. O arquivo `.spec.ts` fica ao lado do código testado. Detalhes em `docs/convencoes/testes.md`.
3. Ponha a unidade no identificador: `loadG`, `restSeconds`, `durationSeconds`. Guarde medida como inteiro na menor unidade (gramas, segundos), sem ponto flutuante; a tela converte para kg.
4. Antes de introduzir uma decisão de arquitetura nova, escreva uma ADR em `docs/adr/` com status `Proposta` e peça a decisão do PO.
5. Não leia, não escreva e não repita senha, token ou chave. O arquivo `.env` fica fora do Git; o `.env.example` usa marcadores como `<TOKEN>`.
6. Não crie commit, branch remota nem PR sem pedido explícito.
7. Escreva a mensagem de commit em Conventional Commits, em inglês: `<tipo>(<escopo>): <assunto>`. Tipos: `feat`, `fix`, `docs`, `test`, `refactor`, `perf`, `build`, `ci`, `chore`, `revert`. Escopos: `ui`, `api`, `mcp`, `e2e`, `docs`, `deps`, `repo`. Ponha `Refs: <id-da-story>` no rodapé. Detalhes em `docs/convencoes/git.md`, Seção 4.
8. Ao terminar uma tarefa, execute `pnpm lint`, `pnpm typecheck` e `pnpm test` e relate o resultado real.

## Documento por tarefa

| Tarefa | Leia antes |
|---|---|
| Implementar uma story | a story em `docs/prd.md` e a pasta local da story em `specs/` |
| Criar módulo, rota ou ferramenta MCP | `docs/arquitetura/api.md` e `docs/convencoes/codigo.md` |
| Criar ou alterar tabela do banco | `docs/arquitetura/dados.md` |
| Criar ou alterar tela ou componente de UI | `DESIGN.md` |
| Implementar janela, progresso, mapa, aviso ou período (ondas 5 a 7) | `docs/gamificacao.md` |
| Escrever teste | `docs/convencoes/testes.md` |
| Escrever ou revisar comentário | `docs/convencoes/comentarios.md` |
| Escrever ou revisar documentação | `docs/convencoes/escrita-tecnica.md` |
| Fazer commit ou abrir PR | `docs/convencoes/git.md` e `docs/qualidade.md` |
| Tomar decisão de arquitetura | `docs/adr/README.md` |

## Fluxo de uma story

1. Especifique a story em `specs/<id-da-story>-<slug>/spec.md`.
2. Escreva o plano técnico da story em `plan.md`, na mesma pasta.
3. Implemente com TDD, um teste de comportamento por passo do plano. Registre os ciclos em `tdd.md`.
4. Verifique contra o plano e os critérios de aceite. Registre o resultado em `qa.md`.
5. Faça o commit e abra o PR com o modelo de `.github/pull_request_template.md`.

A pasta `specs/` da raiz fica fora do Git (`.gitignore`): os artefatos de trabalho da story (`spec.md`, `plan.md`, `tdd.md`, `qa.md`, `decisoes.md`) não entram no commit. O que precisa ficar no repositório vai para o lugar definitivo: decisão de arquitetura em `docs/adr/`, contrato em `docs/arquitetura/`, termo em `CONTEXT.md` e requisito em `docs/prd.md`.

Se as skills `dev-*` estiverem instaladas, a pasta local da story é o `FEATURE_DIR` delas. O nome da pasta começa com o ID da story do PRD (`US-F03-02`) e termina com um slug em inglês, como `specs/US-F03-02-one-tap-set/`.

## Glossário do domínio

@CONTEXT.md
