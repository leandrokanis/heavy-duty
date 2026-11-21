# Suíte ponta a ponta

Testes ponta a ponta com Playwright e playwright-bdd. Os cenários vêm dos cenários de aceite do PRD.

Estado: o scaffold (EN-S0) criou a suíte com os cenários `@EN-S0` em `features/app-shell.feature`. A US-F01-01 acrescentou os cenários `@US-F01-01` em `features/catalog-muscles.feature`, e a US-F01-02, os cenários `@US-F01-02` em `features/catalog-exercises.feature`, os dois contra a API por HTTP e pelo `/mcp`. Os cenários do fluxo da academia entram na onda 3 (F03).

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
```

A suíte sobe dois servidores (`webServer` em `playwright.config.ts`). Os cenários rodam em dois projetos, os dois com `devices['Pixel 7']`: `catalog-muscles`, só com `features/catalog-muscles.feature`, e `mobile`, com o restante, que depende do primeiro:

| Servidor | Endereço | Variável da porta | Observação |
|---|---|---|---|
| Build de produção do app web | `127.0.0.1:3100` | `E2E_PORT` | — |
| API, com `NODE_ENV=test` | `127.0.0.1:3101` | `E2E_API_PORT` | Banco novo a cada execução em `e2e/.data/heavy-duty.e2e.sqlite`, com as migrações e a semente aplicadas antes da subida |

A pasta `e2e/.data/` fica fora do Git. Os passos chamam a API com o fixture `request` do Playwright, sem o proxy do Compose. A suíte não depende de Docker.

Os cenários de catálogo dividem o mesmo banco e rodam em paralelo (`fullyParallel`). Por isso:

- O `test` com o estado do catálogo fica em `steps/catalog-fixtures.ts`, importado pelos arquivos de passos. A opção `steps` do `defineBddConfig` lista o arquivo, para o `bddgen` achar o `test`.
- Os cenários `@US-F01-01` esperam o catálogo sem músculos e cadastram "tríceps braquial" e "peitoral maior". Por isso rodam antes, no projeto `catalog-muscles`, e o projeto `mobile` só começa depois. Com `--grep @US-F01-02`, o Playwright roda também o projeto `catalog-muscles`, que é dependência.
- O `Background` de `catalog-exercises.feature` aceita o músculo já cadastrado (409 `muscle_already_exists`), porque os cenários `@US-F01-01` ou outro cenário do mesmo arquivo podem ter cadastrado o músculo antes.
- Cada cenário cadastra um exercício com nome próprio, para não colidir com outro cenário na recusa de exercício repetido.
- O passo de recusa confere o status 400 e a `message`. O `code` de cada recusa fica coberto nos testes de integração da API.
- O `.feature` usa o nome do músculo, e o passo troca o nome pelo slug que `GET /api/muscles` devolve.
