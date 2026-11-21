# Suíte ponta a ponta

Testes ponta a ponta com Playwright e playwright-bdd. Os cenários vêm dos cenários de aceite do PRD.

Estado: o scaffold (EN-S0) criou a suíte com os cenários `@EN-S0` em `features/app-shell.feature`. A US-F01-01 acrescentou os cenários `@US-F01-01` em `features/catalog-muscles.feature`, e a US-F01-02, os cenários `@US-F01-02` em `features/catalog-exercises.feature`, os dois contra a API por HTTP e pelo `/mcp`. A US-F14-02 acrescentou o cenário `@US-F14-02` "falha no backup" em `features/system-backup.feature`. A US-F14-01 acrescentou os cenários `@US-F14-01` em `features/auth.feature` e passou a exigir a sessão de acesso nos outros cenários. A US-F02-01 acrescentou os cenários `@US-F02-01` em `features/programs.feature`, contra a API por HTTP e pelo `/mcp`. Os cenários do fluxo da academia entram na onda 3 (F03).

## Estrutura planejada

```text
e2e/
  features/<feature>.feature   cenários em inglês
  steps/<feature>.steps.ts     implementação dos passos
  playwright.config.ts
```

## Regras dos cenários

- Escreva o arquivo `.feature` em inglês. O cenário traduz o cenário em português do PRD.
- Marque cada cenário com a tag da story: `@US-F03-02`. A tag liga o teste ao PRD.
- Emule um celular (`devices['Pixel 7']` ou `devices['iPhone 15']`) no projeto padrão do Playwright.

## Comandos

```sh
pnpm --filter @heavy-duty/e2e exec playwright install chromium   # instala o navegador, uma vez
pnpm e2e                                                         # executa a suíte inteira
pnpm --filter @heavy-duty/e2e run test --grep @EN-S0             # executa os cenários de uma tag
pnpm --filter @heavy-duty/e2e run test --grep @US-F01-01         # executa os cenários do catálogo de músculos
pnpm --filter @heavy-duty/e2e run test --grep @US-F01-02         # executa os cenários do catálogo de exercícios
pnpm --filter @heavy-duty/e2e run test --grep @US-F14-02         # executa o cenário da falha no backup
pnpm --filter @heavy-duty/e2e run test --grep @US-F14-01         # executa os cenários da chave de acesso
pnpm --filter @heavy-duty/e2e run test --grep @US-F02-01         # executa os cenários do programa
```

A suíte sobe três servidores (`webServer` em `playwright.config.ts`). Os cenários rodam em três projetos, todos com `devices['Pixel 7']` (Chromium): `catalog-muscles`, só com `features/catalog-muscles.feature`; `mobile`, com o restante menos o programa, que depende do primeiro; e `programs`, só com `features/programs.feature`, que depende do `mobile`:

| Servidor | Endereço | Variável da porta | Observação |
|---|---|---|---|
| Proxy de origem única (`support/proxy.ts`) | `localhost:3100` | `E2E_PORT` | Mesmo roteamento do `Caddyfile`: `/api/*` e `/mcp*` para a API, o resto para o app web. É o `baseURL` do navegador |
| Build de produção do app web | `127.0.0.1:3102` | `E2E_WEB_PORT` | — |
| API, com `NODE_ENV=test` | `127.0.0.1:3101` | `E2E_API_PORT` | `APP_ORIGIN=http://localhost:3100`. Banco novo a cada execução em `e2e/.data/heavy-duty.e2e.sqlite`, com as migrações e a semente aplicadas antes da subida |

A chave de acesso exige uma origem só para o app e a API, e o RP ID não aceita endereço IP: por isso o navegador usa `http://localhost:3100` (ADR-019). A pasta `e2e/.data/` fica fora do Git. Os passos chamam as rotas de dados pelo proxy e o `/mcp` direto na API. A suíte não depende de Docker.

## Sessão de acesso nos cenários

- O fixture de worker `sessionCookie` (`steps/auth-fixtures.ts`) cadastra uma chave de acesso pelo fluxo real: executa `pnpm --filter @heavy-duty/api auth:enroll` contra o banco do e2e, abre o link de cadastro num contexto com o autenticador virtual do Chromium e toca "Criar chave de acesso". Não existe comando de teste que crie sessão.
- O fixture `request` manda o cookie `hd_session` desse worker. Os cenários de catálogo e de backup estendem o `test` de `auth-fixtures.ts`.
- Os cenários de tela usam o passo "Given the athlete signed in with a passkey", que põe o cookie do worker no contexto do navegador.
- Os cenários `@US-F14-01` criam o próprio autenticador virtual (`WebAuthn.addVirtualAuthenticator` pelo CDP). O Chromium aceita um autenticador `internal` por página; o cenário que precisa de dois navegadores cadastra num contexto separado e copia a chave com `WebAuthn.getCredentials` e `WebAuthn.addCredential`.
- O cenário "sessão de acesso vencida" fica nos testes da API, porque o e2e não controla o relógio da API.
- Nenhuma afirmação conta linhas no banco compartilhado.

Os cenários de catálogo dividem o mesmo banco e rodam em paralelo (`fullyParallel`). Por isso:

- O `test` com o estado do catálogo fica em `steps/catalog-fixtures.ts`, importado pelos arquivos de passos. A opção `steps` do `defineBddConfig` lista o arquivo, para o `bddgen` achar o `test`.
- Os cenários `@US-F01-01` esperam o catálogo sem músculos e cadastram "tríceps braquial" e "peitoral maior". Por isso rodam antes, no projeto `catalog-muscles`, e o projeto `mobile` só começa depois. Com `--grep @US-F01-02`, o Playwright roda também o projeto `catalog-muscles`, que é dependência.
- O `Background` de `catalog-exercises.feature` aceita o músculo já cadastrado (409 `muscle_already_exists`), porque os cenários `@US-F01-01` ou outro cenário do mesmo arquivo podem ter cadastrado o músculo antes.
- Cada cenário cadastra um exercício com nome próprio, para não colidir com outro cenário na recusa de exercício repetido.
- O passo de recusa confere o status 400 e a `message`. O `code` de cada recusa fica coberto nos testes de integração da API.
- O `.feature` usa o nome do músculo, e o passo troca o nome pelo slug que `GET /api/muscles` devolve.

O cenário `@US-F14-02` executa `pnpm --filter @heavy-duty/api backup:run` contra o banco da API do e2e, com o repositório do restic numa pasta que não existe e a senha insegura de desenvolvimento. O comando termina com código 1 e registra a falha. Depois, o passo chama `get_system_status` pelo `/mcp` e confere a execução mais recente. Detalhes do cenário:

- O caminho do banco vem de `steps/api-server.ts`, a mesma constante que o `playwright.config.ts` usa para subir a API.
- O cenário não depende do restic no host. Sem o binário, o motivo é `offsite copy failed: backup tool not found`; com o binário, o motivo é o erro do restic sobre o repositório.
- O passo confere só a execução mais recente (`latestRun`), sem contar linhas de `backup_runs`, porque o banco do e2e é compartilhado.
- O cenário "backup diário" fica no teste de integração com o restic real, dentro do contêiner `backup` (`docs/arquitetura/backup.md`).

Os cenários `@US-F02-01` mudam o programa ativo, que é um só no banco. Por isso:

- O projeto `programs` roda os cenários em série (`fullyParallel: false`), depois do `mobile`. Assim os cenários `@US-F01-02` recebem o 201 que esperam ao cadastrar "Supino reto" e "Prancha".
- Com `--grep @US-F02-01`, o Playwright roda também os projetos `catalog-muscles` e `mobile`, que são dependências.
- O estado do cenário fica no fixture `program` de `steps/program-fixtures.ts`, que estende o `test` do catálogo. O passo guarda o `id` de cada programa criado e confere o programa pelo `id`, sem contar linhas.
- O `Background` cadastra os músculos e os exercícios "Supino reto" (`reps`) e "Prancha" (`time`) e aceita o 409 do item já cadastrado.
- O `.feature` usa o texto do PRD ("40 kg", "10 reps", "45 s"). O passo converte a carga em gramas (40 kg vira `40000`) e o alvo em `targetReps` ou `targetSeconds`.
- O passo de recusa confere um status 4xx e a `message`. O `code` e o status exato de cada recusa ficam cobertos nos testes de integração da API.
