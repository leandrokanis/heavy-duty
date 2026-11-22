# Suíte ponta a ponta

Testes ponta a ponta com Playwright e playwright-bdd. Os cenários vêm dos cenários de aceite do PRD.

Estado: o scaffold (EN-S0) criou a suíte com os cenários `@EN-S0` em `features/app-shell.feature`. A US-F01-01 acrescentou os cenários `@US-F01-01` em `features/catalog-muscles.feature`, e a US-F01-02, os cenários `@US-F01-02` em `features/catalog-exercises.feature`, os dois contra a API por HTTP e pelo `/mcp`. A US-F14-02 acrescentou o cenário `@US-F14-02` "falha no backup" em `features/system-backup.feature`. A US-F14-01 acrescentou os cenários `@US-F14-01` em `features/auth.feature` e passou a exigir a sessão de acesso nos outros cenários. A US-F02-01 acrescentou os cenários `@US-F02-01` em `features/programs.feature`, contra a API por HTTP e pelo `/mcp`. A US-F02-02 acrescentou os cenários `@US-F02-02` em `features/programs-edit.feature`, que editam o programa por HTTP e pelo `/mcp` e conferem um treino de fixture gravado direto no banco. A US-F03-01 acrescentou os cenários `@US-F03-01` em `features/today-workout.feature`, os primeiros do fluxo da academia na tela. A US-F03-02 acrescentou os cenários `@US-F03-02` em `features/one-tap-set.feature`, que gravam a série pelo botão "Próximo". A US-F05-01 acrescentou os cenários `@US-F05-01` em `features/rest-timer.feature`, que deixam o descanso terminar sozinho, pulam o descanso e encerram o treino na última série. A US-F03-03 acrescentou os cenários `@US-F03-03` em `features/offline-sets.feature`, que registram séries sem conexão, recarregam a página e conferem o envio quando a conexão volta. A US-F03-04 acrescentou os cenários `@US-F03-04` em `features/workout-sequence.feature`, que abrem a folha da sequência, escolhem um exercício fora da ordem e no descanso, encerram o treino e conferem `finished_at` e `end_reason` no banco, inclusive sem conexão. A US-F03-05 acrescentou os cenários `@US-F03-05` em `features/skip-exercise.feature`, que pulam um exercício pela folha da sequência, no descanso e sem conexão, e conferem `workout_skips` no banco e a ordem de chegada na API (séries, pulado, fim). A US-F03-06 acrescentou os cenários `@US-F03-06` em `features/review-done-exercise.feature`, que conferem a lista das séries do exercício feito na folha da sequência, depois de recarregar a página, e a rolagem da folha numa tela de 480 px. A US-F03-07 acrescentou os cenários `@US-F03-07` em `features/timed-exercise.feature`, que abrem a contagem da Prancha, deixam a execução terminar pelo relógio, encerram antes, cancelam e saltam o relógio (tela apagada), e conferem `seconds` no banco. A US-F04-01 acrescentou os cenários `@US-F04-01` em `features/drag-adjust.feature`, que arrastam as rodas de carga, repetições e tempo com o mouse e conferem `load_g`, `reps` e `seconds` no banco. A US-F04-02 acrescentou os cenários `@US-F04-02` em `features/correct-last-set.feature`, que corrigem a última série pela folha, sem conexão (com a ordem de chegada na API: série, depois correção), no treino concluído e no exercício por tempo, e conferem `load_g` e `seconds` no banco. A US-F06-01 acrescentou o cenário `@US-F06-01` em `features/list-workouts.feature`, que grava treinos numa semana fixa de 2025 e confere a resposta de `list_workouts` pelo `/mcp`. A US-F06-02 acrescentou os cenários `@US-F06-02` em `features/edit-remove-workout.feature`, que pedem a remoção de um treino pelo `/mcp` (prévia, depois confirmação) e a edição de um treino que não existe.

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
pnpm --filter @heavy-duty/e2e run test --grep @US-F02-02         # executa os cenários da edição do programa
pnpm --filter @heavy-duty/e2e run test --grep @US-F03-01         # executa os cenários do treino do dia
pnpm --filter @heavy-duty/e2e run test --grep @US-F03-02         # executa os cenários da série com um toque
pnpm --filter @heavy-duty/e2e run test --grep @US-F05-01         # executa os cenários do descanso
pnpm --filter @heavy-duty/e2e run test --grep @US-F03-03         # executa os cenários da fila sem sinal
pnpm --filter @heavy-duty/e2e run test --grep @US-F03-04         # executa os cenários da sequência e do fim do treino
pnpm --filter @heavy-duty/e2e run test --grep @US-F03-05         # executa os cenários do exercício pulado
pnpm --filter @heavy-duty/e2e run test --grep @US-F03-06         # executa os cenários da lista de séries do exercício feito
pnpm --filter @heavy-duty/e2e run test --grep @US-F03-07         # executa os cenários do exercício por tempo
pnpm --filter @heavy-duty/e2e run test --grep @US-F04-01         # executa os cenários do ajuste por arrasto
pnpm --filter @heavy-duty/e2e run test --grep @US-F04-02         # executa os cenários da correção da última série
pnpm --filter @heavy-duty/e2e run test --grep @US-F06-01         # executa o cenário da consulta dos treinos pelo MCP
```

A suíte sobe três servidores (`webServer` em `playwright.config.ts`). Os cenários rodam em dezesseis projetos, todos com `devices['Pixel 7']` (Chromium): `catalog-muscles`, só com `features/catalog-muscles.feature`; `mobile`, com o restante menos o programa e o treino do dia, que depende do primeiro; `programs`, só com `features/programs.feature`, que depende do `mobile`; `programs-edit`, só com `features/programs-edit.feature`, que depende do `programs`; `today-workout`, só com `features/today-workout.feature`, que depende do `programs-edit`; `one-tap-set`, só com `features/one-tap-set.feature`, que depende do `today-workout`; `rest-timer`, só com `features/rest-timer.feature`, que depende do `one-tap-set`; `offline-sets`, só com `features/offline-sets.feature`, que depende do `rest-timer`; `workout-sequence`, só com `features/workout-sequence.feature`, que depende do `offline-sets`; `skip-exercise`, só com `features/skip-exercise.feature`, que depende do `workout-sequence`; `review-done-exercise`, só com `features/review-done-exercise.feature`, que depende do `skip-exercise`; `timed-exercise`, só com `features/timed-exercise.feature`, que depende do `review-done-exercise`; `drag-adjust`, só com `features/drag-adjust.feature`, que depende do `timed-exercise`; `correct-last-set`, só com `features/correct-last-set.feature`, que depende do `drag-adjust`; `list-workouts`, só com `features/list-workouts.feature`, que depende do `correct-last-set`; e `edit-remove-workout`, só com `features/edit-remove-workout.feature`, que depende do `list-workouts`:

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

Os cenários `@US-F02-02` também mudam o programa ativo. Por isso:

- O projeto `programs-edit` roda em série e depois do `programs`. Um projeto só para as duas features não basta: com `fullyParallel: false`, o Playwright ainda roda dois arquivos ao mesmo tempo, em workers diferentes.
- Com `--grep @US-F02-02`, o Playwright roda também os projetos `catalog-muscles`, `mobile` e `programs`, que são dependências.
- O treino ainda não tem rota (US-F03-02). O passo grava e lê o treino de fixture direto no banco da API do e2e com `node:sqlite` (`steps/workout-fixtures.ts`), abrindo e fechando a conexão a cada chamada. O caminho do banco vem de `steps/api-server.ts`. O Node imprime `ExperimentalWarning: SQLite is an experimental feature` em cada worker; o aviso não muda o resultado.
- O `Background` acrescenta o músculo "vasto lateral" (`quadriceps`) e o exercício "Agachamento" (`reps`) e aceita o 409 do item já cadastrado.
- Os passos reaproveitam o fixture `program` e os helpers de `steps/program-helpers.ts` (conversão de carga e alvo, criação de programa e de letra), que `programs.steps.ts` também usa.
- O passo "the next workout should suggest" confere o programa ativo de `GET /api/programs`, de onde o treino do dia (US-F03-01) vai tirar os valores.

Os cenários `@US-F03-01` abrem o treino do dia na tela e mudam o histórico e o programa ativo. Por isso:

- O projeto `today-workout` roda em série (`fullyParallel: false`), depois do `programs-edit`. Com `--grep @US-F03-01`, o Playwright roda também os quatro projetos anteriores, que são dependências.
- O `Background` apaga os treinos de fixture do banco do e2e com `clearWorkouts()` de `steps/workout-fixtures.ts`; as séries saem por `ON DELETE CASCADE`. Sem a limpeza, o "Supino reto" dos cenários `@US-F02-02` preencheria a carga do exemplo "primeira vez". O banco do e2e é descartável e nasce de novo a cada execução.
- O cenário "sem programa ativo" desativa os programas direto no banco com `deactivatePrograms()`. A tela mostra "Nenhum programa cadastrado. Monte um programa pelo Claude." mesmo com programas inativos guardados.
- O `recordWorkout` aceita `startedAt` opcional, com o valor fixo de antes como padrão, para os cenários que dependem da ordem dos treinos.
- O programa nasce pela API, e o atleta entra com o cookie do worker (`the athlete signed in with a passkey`).
- O cenário da folha de confirmação mede a altura de "Começar" e "Fechar" com `boundingBox()`: pelo menos 56 px (`DESIGN.md`, Seção 7).
- O cenário "desistir na folha" confere que a página só mandou `GET` para `/api/*`, sem contar linhas no banco.
- Uma story da onda 3 que vier depois e precisar do histórico ou do programa ativo DEVE rodar num projeto depois do `today-workout`, ou refazer o estado no próprio `Background`.

Os cenários `@US-F03-02` gravam séries pela tela e pela rota `POST /api/workouts/{workoutId}/sets`. Por isso:

- O projeto `one-tap-set` roda por último e em série (`fullyParallel: false`), depois do `today-workout`, que desativa os programas ao fim. Com `--grep @US-F03-02`, o Playwright roda também os cinco projetos anteriores, que são dependências.
- O `Background` apaga os treinos com `clearWorkouts()` e cria o próprio programa ativo, com a letra "A" e o "Supino reto" (3 × 10, 40 kg, 90 s).
- O relógio do navegador fica fixo com `page.clock.setFixedTime`: o passo "the athlete started the day" fixa o instante do "Começar", e o passo do toque fixa o instante do "Próximo". O descanso mostra `1:30` no toque e `1:29` depois que o passo avança o relógio fixo em 1 s.
- O passo do toque espera o `POST` da série e guarda o ID do treino tirado da URL. As afirmações leem as séries desse treino com `readWorkoutSets()` de `steps/workout-fixtures.ts`, sem contar linhas do banco inteiro.
- O cenário "toque duplo acidental" usa `dblclick()` e confere um `POST` só e uma série no treino.
- O cenário "falha no envio" aborta o envio com `page.route`, confere o descanso e o indicador "1 série aguardando envio", libera a rota e dispara o evento `online`: a fila envia de novo com o mesmo corpo, e o treino fica com uma série, com o ID do primeiro envio.
- O cenário "reenvio com o mesmo ID" chama a rota pelo `request`, sem a tela: 201 no primeiro envio, 200 no segundo, com o `performedAt` original, e uma série no treino.
- O cenário "série com um toque" mede o botão "Próximo" com `boundingBox()`: pelo menos 56 px de altura e o topo na metade de baixo da tela (`DESIGN.md`, Seções 5.4 e 7).
- Uma story que vier depois e precisar do histórico ou do programa ativo DEVE rodar num projeto depois do `one-tap-set`, ou refazer o estado no próprio `Background`.

Os cenários `@US-F05-01` também gravam séries pela tela e mudam o programa ativo. Por isso:

- O projeto `rest-timer` roda em série (`fullyParallel: false`), depois do `one-tap-set`. Com `--grep @US-F05-01`, o Playwright roda também os seis projetos anteriores, que são dependências.
- O `Background` acrescenta o músculo "tríceps braquial" (`triceps`) e o exercício "Tríceps na polia" (`reps`), aceita o 409 do item já cadastrado, apaga os treinos com `clearWorkouts()` e cria o programa ativo com a letra "A": "Supino reto" (3 × 10, 40 kg, 90 s) e "Tríceps na polia" (3 × 12, 20 kg, 60 s). O cenário "última série da letra encerra o treino" cria um programa novo, com o "Tríceps na polia" de 1 série; o programa mais novo fica ativo.
- O tempo anda por `page.clock.setFixedTime`. O passo "the clock reaches" fixa o relógio no fim do descanso, e o intervalo de 250 ms da tela relê o instante fixado e termina o descanso.
- O passo "the athlete skips the rest" não espera envio: ele confere o descanso na tela, fixa o instante do toque e espera o descanso sumir. Cada toque fica pelo menos 1 s depois da troca anterior, porque a guarda de 0,8 s vale depois de toda troca de tela.
- Os passos de toque, de envio e de leitura das séries vêm de `steps/one-tap-set.steps.ts`. O passo "the workout should hold the set numbers" lê as séries do treino com `readWorkoutSets()`, sem contar linhas do banco inteiro.
- Uma story que vier depois e precisar do histórico ou do programa ativo DEVE rodar num projeto depois do `offline-sets`, ou refazer o estado no próprio `Background`.

Os cenários `@US-F03-03` registram séries sem conexão e leem o único treino do banco. Por isso:

- O projeto `offline-sets` roda em série (`fullyParallel: false`), depois do `rest-timer`. Com `--grep @US-F03-03`, o Playwright roda também os sete projetos anteriores, que são dependências.
- O `Background` apaga os treinos com `clearWorkouts()` e cria o programa ativo com a letra "A" e o "Supino reto" (3 × 10, 40 kg, 90 s). Como só há um treino no banco, os passos leem o treino com `readOnlyWorkoutId()` de `steps/workout-fixtures.ts` e conferem os valores e o `performedAt` com `readWorkoutSets()` e `readWorkoutSetInstants()`.
- Os passos de toque do arquivo `steps/offline-sets.steps.ts` não esperam o `POST`, porque sem conexão ele falha. Os passos "the connection drops" e "the connection returns" usam `context.setOffline()`, e a volta dispara também o evento `online`, para o teste não esperar os 15 s da tentativa periódica.
- O cenário "sem sinal" recarrega a página sem conexão: a página `/` vem do precache do service worker, e a cópia do treino do dia e o treino em andamento vêm do IndexedDB. O passo "the page is reloaded at" fixa o relógio antes de recarregar.
- Os cenários "reenvio de série já gravada" e "sessão vencida" usam `context.route`: o primeiro deixa a API gravar (`route.fetch()`) e aborta a resposta; o segundo responde 401 aos envios. Os dois esperam a primeira resposta antes de disparar o `online`, porque a fila envia uma série por vez.
- O cenário "série recusada pela API" remove o exercício do programa pelo `request` enquanto o navegador está sem conexão. O aviso é achado pelo texto "recusada", porque o Next.js mantém um `role="alert"` vazio no anunciador de rotas.
- Uma story que vier depois DEVE rodar num projeto depois do `offline-sets`.

Os cenários `@US-F04-01` arrastam as rodas da tela da série e leem o banco compartilhado. Por isso:

- O projeto `drag-adjust` roda em série (`fullyParallel: false`), depois do `timed-exercise`. Com `--grep @US-F04-01`, o Playwright roda também os doze projetos anteriores, que são dependências.
- O `Background` apaga os treinos e cria o programa ativo com a letra "A": "Supino reto" (3 × 10, 40 kg, 90 s) e "Prancha" (3 × 45 s, 0 kg, 60 s). O passo "the athlete is on the exercise" abre a Prancha pela folha da sequência.
- O passo de arrasto de `steps/drag-adjust.steps.ts` usa `page.mouse` sobre o centro do `spinbutton`, em 22 px por passo, valor que repete `DRAG_STEP_PX` de `apps/ui/src/features/workout/workout.config.ts`. O Chromium gera Pointer Events a partir do mouse, o mesmo caminho do toque no código. O arrasto com o dedo não roda aqui: é tarefa manual do PO no celular.
- Os passos leem a roda pelo `aria-valuenow` do `spinbutton`, com o helper `expectWheel()` de `steps/workout-helpers.ts`.
- Uma story que vier depois DEVE rodar num projeto depois do `drag-adjust`.

Os cenários `@US-F04-02` corrigem a última série pela folha e leem o banco compartilhado. Por isso:

- O projeto `correct-last-set` roda em série (`fullyParallel: false`), depois do `drag-adjust`. Com `--grep @US-F04-02`, o Playwright roda também os treze projetos anteriores, que são dependências.
- O `Background` apaga os treinos e cria o programa ativo com a letra "A": "Supino reto" (3 × 10, 45 kg, 90 s) e "Prancha" (1 × 45 s, 0 kg, 60 s). O cenário do exercício por tempo abre a Prancha primeiro, pela folha da sequência, para ela ter descanso depois da série.
- O passo "the page follows the writes of the API to the sets" registra, em ordem, cada `POST` de série e cada `PATCH` de correção que a API aceitou (`page.on('response')`), no formato `POST 45000` e `PATCH 42500`. O cenário "correction without signal" confere a ordem série, depois correção.
- O passo da correção toca no botão "Corrigir última série", baixa a roda um passo (2,5 kg na carga, 5 s no tempo) e toca em "Salvar".
- Os cenários "cancelar a correção" e "descanso termina com a folha aberta" ficam nos testes de tela de `workout-screen.spec.tsx`, onde o relógio é controlado.
- Uma story que vier depois DEVE rodar num projeto depois do `edit-remove-workout`.

O cenário `@US-F06-01` consulta o histórico pelo `/mcp` e lê só a resposta da API. Por isso:

- O projeto `list-workouts` roda em série (`fullyParallel: false`), depois do `correct-last-set`. Com `--grep @US-F06-01`, o Playwright roda também os catorze projetos anteriores, que são dependências.
- O `Background` apaga os treinos. O cenário cria o programa ativo com as letras "A", "B" e "C", cada uma com "Supino reto", e grava seis treinos direto no banco, três na semana de `2025-03-03T03:00:00.000Z` a `2025-03-10T03:00:00.000Z`, um na semana anterior, um que começa em `2025-03-10T03:00:00.000Z` (o fim exclusivo) e um na semana seguinte. A data fixa de 2025 não colide com os treinos de 2026 dos outros cenários e não depende do relógio.
- O passo "the planner lists the workouts from ... through MCP" chama `list_workouts` com `callMcpTool`, e o passo de conferência lê `structuredContent.workouts` e compara letra, exercício, número de séries e `loadG`, do treino mais antigo para o mais novo.
- O fixture `listedWorkouts` de `steps/list-workouts-fixtures.ts` guarda a resposta do `/mcp` entre os passos e estende o `test` de `program-fixtures.ts`.

Os cenários `@US-F06-02` removem um treino e recusam uma edição pelo `/mcp`. Por isso:

- O projeto `edit-remove-workout` roda em série (`fullyParallel: false`), depois do `list-workouts`. Com `--grep @US-F06-02`, o Playwright roda também os quinze projetos anteriores, que são dependências.
- O `Background` apaga os treinos. O primeiro cenário grava um treino em `2025-04-08T12:00:00.000Z`, pede a remoção sem código, confere `applied: false` e que a semana de `2025-04-07T03:00:00.000Z` ainda traz o treino, confirma com o código da prévia e confere que a semana fica vazia. O segundo cenário chama `update_workout_set` com um treino que não existe e confere a mensagem "treino não encontrado".
- O fixture `editRemove` de `steps/edit-remove-workout-fixtures.ts` guarda as respostas do `/mcp` entre os passos e estende o `test` de `list-workouts-fixtures.ts`.
