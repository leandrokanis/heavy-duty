# Contêiner: app web

| Campo | Valor |
|---|---|
| Nível C4 | 2, contêiner |
| Pasta | `apps/ui` (`@heavy-duty/ui`) |
| Onde roda | Processo Node.js no kasparov (servidor do Next.js) e navegador do celular ou do Mac (cliente) |
| ADRs | ADR-009, ADR-002, ADR-019; substituiu a ADR-003 |
| Ondas | 1 em diante |

## Responsabilidade

- Mostrar o treino do dia, guiar a série com um toque por passo, contar o descanso e o tempo de execução (F03, F04, F05).
- Funcionar sem sinal no fluxo da academia, com a fila do armazenamento local (NFR06).
- Instalar como PWA, com manifesto e service worker (NFR05).
- Mostrar o jogo: janelas, níveis, mapa do corpo, período, medalhas e ranking (ondas 5 a 7). O cálculo é da API (ADR-010); o app web só exibe.
- Oferecer as telas de administração no Mac, depois do MVP (D22).

O app web não guarda regra de negócio. Validação de domínio, cálculo do jogo e gravação ficam na API.

## Tecnologias

| Tecnologia | Uso | Licença | Estado |
|---|---|---|---|
| Next.js 16.4.6, App Router | Rotas, layouts, servidor das páginas; build de produção com `next build --webpack` | MIT | Aceita, ADR-009 |
| React 19 | Componentes | MIT | Aceita, ADR-009 |
| TypeScript, modo estrito | Linguagem | Apache-2.0 | Aceita, ADR-002 |
| Base UI (`@base-ui/react`) | Componentes sem estilo e acessíveis, base do Animate UI. A feature `workout` usa o `Drawer` (folha de confirmação) e o `Progress` (barra de exercícios e pontos das séries) | MIT | Aceita, ADR-009 |
| Animate UI | Código copiado do repositório oficial, sem o pacote `@animate-ui/react`. Arquivo copiado: `src/components/ui/motion-button.tsx`, derivado do primitivo do botão (commit `9873c628`, 2026-11-22) | "MIT + Commons Clause" (`THIRD_PARTY_NOTICES.md`) | Aceita, ADR-024 e ADR-027 |
| Tailwind CSS 4 | Estilo, com os tokens do `DESIGN.md` no tema | MIT | Aceita, ADR-009 |
| Motion (`motion` 14.14.0) | Animação do estado pressionado do botão (`whileTap`). Licença conferida no `package.json` instalado | MIT | Aceita, ADR-009 |
| Serwist (`@serwist/next` 9.5.15) | Service worker: pré-carga, página sem conexão em `/~offline`, recebimento do Web Push | MIT | Aceita, ADR-009 |
| `@simplewebauthn/browser` 14.0.0 | Cerimônias da chave de acesso no navegador (`startAuthentication`, `startRegistration`) | MIT | Aceita, ADR-019 |
| TanStack Query | Cache e revalidação dos dados da API no cliente | MIT | Não adotado (ADR-021): uma leitura por abertura não pede cache em memória; a cópia local fica no Dexie |
| Dexie 4.4.7 | Acesso ao IndexedDB (contêiner de armazenamento local) | Apache-2.0 | Aceita, ADR-021 |
| Zod | Validação dos dados que chegam da API | MIT | Não adotado (ADR-021): o tipo da resposta continua espelhado em `today.types.ts` |
| Vitest, jsdom e Testing Library | Teste de componente | MIT | Aceita, `docs/convencoes/testes.md` |
| Lucide (`lucide-react` 1.70.0) | Conjunto de ícones. Instalado na US-F03-01, com os ícones `X` (fechar a folha) e `Timer` (duração estimada); a US-F03-02 acrescentou `CloudOff` (hoje, o indicador da fila) e a US-F03-03, `TriangleAlert` (aviso das séries recusadas); a EN-S1-01 acrescentou `Dumbbell`, `Lock`, `KeyRound`, `WifiOff` e `CircleAlert` (telas de entrada, de cadastro e sem conexão); a EN-S1-02 tirou `Timer` (a folha de começar mostra a duração com `Clock`) e acrescentou `ChevronRight`, `List`, `Check`, `Clock` e `Pencil` (fluxo da academia) | ISC | Aceita, ADR-016 |
| `uuid` 14.0.3 | ID do treino e da série em UUID v7, gerado no celular (`createClientId` em `src/features/workout/client-id.ts`), a mesma versão da API. Instalado na US-F03-02 | MIT | Aceita, ADR-014 |

## Interfaces

| Direção | Com quem | Protocolo | O que trafega |
|---|---|---|---|
| Recebe | Atleta e Planejador, pelo túnel | HTTPS | Páginas, arquivos estáticos, manifesto |
| Chama | API, no mesmo domínio | HTTPS, JSON em `/api/*` | Catálogo, programa, séries, estado do jogo |
| Lê e grava | Armazenamento local | IndexedDB, no navegador | Fila de séries, cache do treino do dia |
| Recebe | Serviço de push do navegador | Web Push, no service worker | Avisos de janela e de queda (onda 7) |

## Estrutura planejada

```text
apps/ui/src/
  app/                     rotas do App Router
    (treino)/              treino do dia, série, descanso, sequência: renderizados no cliente
    mapa/  periodo/        telas do jogo (ondas 5 a 7)
    admin/                 telas de administração no Mac (proposta para a Q10)
    cadastro/              cadastro da chave de acesso pelo link de cadastro (US-F14-01)
    autorizar/             tela de autorização do cliente do MCP (US-F16-01)
    ~offline/              página sem conexão
    manifest.ts            manifesto do PWA
  components/ui/           componentes base sobre o Base UI, com os tokens do DESIGN.md: `MotionButton` (derivado do Animate UI), `Button`, `IconButton`, `Sheet` e `Toast` (aviso flutuante, com o `ToastProvider` no layout raiz)
  features/<feature>/      componentes, hooks e serviços de uma feature (auth, workout, rest, game…)
  features/auth/           AuthGate, tela de entrada, tela de cadastro, aviso sem conexão, cliente de /api/auth/*
  features/workout/        treino do dia: cliente de /api/today, lista de letras, folha de confirmação, tela de treino, cronômetro do exercício por tempo (`timer-ring.tsx`, `timer-cues.ts`, `tone-player.ts`, `sound-preference.ts`; US-F03-07) e formatação de carga e duração (US-F03-01); fluxo da série (reducer), cliente de /api/workouts/{workoutId}/sets e descanso (US-F03-02); indicador da fila, aviso das séries recusadas e retomada do treino (US-F03-03); fim e pulo do descanso, anel, tela acesa e treino concluído (US-F05-01); componentes de apresentação do visual do protótipo, decorativos: círculo da letra (`letter-badge.tsx`), pontos das séries (`set-dots.tsx`), barra segmentada do controle do topo (`exercise-bar.tsx`) e o hook `useFitScale` (`use-fit-scale.ts`), que reduz o valor da roda para caber na largura (EN-S1-02)
  features/mcp-auth/       tela de autorização do MCP e cliente de /api/oauth/authorization
  shared/                  utilitários usados por duas features ou mais
  sync/                    banco local (Dexie), fila de envio, gatilhos de envio, treino em andamento, cópia do treino do dia e `SyncProvider` (ADR-021)
  sw.ts                    service worker (Serwist)
  sw-runtime-caching.ts    regras de cache do service worker: /api/* só pela rede
  precache-entries.ts      páginas no precache: `/~offline` e `/`
  test/factories/          factories fishery
```

## Regras que o código segue

1. O fluxo da academia (`app/(treino)/`) é renderizado no cliente e funciona sem rede. Componente de servidor nessa rota quebra o uso sem sinal.
2. O app web chama a API só por `/api/*` no mesmo domínio. Ele não acessa o banco nem chama a API por outro endereço.
3. A série recebe o ID no cliente antes de entrar na fila; esse ID é a chave de idempotência (`armazenamento-local.md`).
4. Cor, espaço, raio, material e duração vêm dos tokens do `DESIGN.md`, declarados no tema do Tailwind. Componente do Animate UI que traz cor ou raio próprio é ajustado aos tokens.
5. Animação respeita `prefers-reduced-motion`, e vidro respeita `prefers-reduced-transparency` e `prefers-contrast: more` (`DESIGN.md`, Seções 12 e 15).
6. O comportamento sem rede é testado no build de produção, porque o `next.config.ts` só aplica o Serwist fora de `NODE_ENV=development`: o `next dev` com Turbopack recusa a configuração de webpack que o Serwist acrescenta (conferido no EN-S0). O cenário `@EN-S0` do e2e executa contra o build de produção.

7. O `AuthGate` do layout raiz consulta `GET /api/auth/session` e mostra a tela de entrada no lugar da tela pedida, na mesma URL, quando a resposta é 401; depois da entrada, mostra a tela pedida. Enquanto consulta, não mostra nada. Na falha de rede ou na API fora do ar, mostra "Sem conexão", salvo em `/` com a cópia do treino do dia no aparelho (`hasCachedToday`), que abre a tela do treino sem conexão (ADR-021). `/cadastro` e `/~offline` passam direto (ADR-019). A API é a fronteira de segurança: a tela não traz dado no HTML.
8. O service worker não guarda resposta de `/api/*` do mesmo domínio: a primeira regra de `runtimeCaching` é `NetworkOnly` para essas rotas, antes do `defaultCache`. A saída (`signOut`) apaga todos os caches cujo nome não contém `precache` e a cópia do treino do dia (FR-019, FR-020). A página `/` fica no precache, com a revisão do build, para abrir sem sinal; `reloadOnOnline` fica desligado, para a volta do sinal não recarregar a tela do treino (ADR-021).
9. A tela `/autorizar` é o `authorization_endpoint` do servidor de autorização do MCP (ADR-020) e fica atrás do `AuthGate`: sem sessão de acesso, a tela de entrada aparece na mesma URL. A tela chama `GET /api/oauth/authorization` com a query do pedido e mostra o host do `redirect_uri` em destaque e o nome declarado pelo cliente como dado secundário, com os botões "Recusar" e "Permitir". O toque duplo manda uma decisão só, e o navegador segue para o `redirectTo` com `window.location.assign`. A prévia 400 mostra a mensagem sem redirecionar; a prévia `error_redirect` redireciona direto; a falha de rede mostra "Sem conexão". O `next.config.ts` manda em `/autorizar` os cabeçalhos `Content-Security-Policy: frame-ancestors 'none'`, `X-Frame-Options: DENY` e `Referrer-Policy: no-referrer`, contra clickjacking e vazamento da query.
10. O manifesto declara ícones PNG de 192 e 512 px e um de 512 px `maskable`; o layout declara o `apple-touch-icon` de 180 px. Os PNG são versionados e renderizados dos SVG com o Chromium (`apps/ui/README.md`).

## Sequência do treino e fim do treino

A US-F03-04 liga o controle do topo e o encerrar, sobre o mesmo reducer:

1. O controle do topo da tela de treino é um botão (`Button` do Base UI) com a letra e a barra "Exercícios". O nome acessível diz a letra e a posição, como "Sequência do treino, letra A, exercício 2 de 3". O toque abre a folha da sequência (`sequence-sheet.tsx`, `Drawer` do Base UI), que lista os exercícios na ordem do programa com o estado (feito, atual, pulado ou por fazer) em ícone e em texto, mais as séries feitas do total. `sequenceOf` calcula a lista e `exerciseProgressOf` calcula o valor da barra: exercícios feitos mais o atual, até o total. Só o exercício feito traz `recordedSets`: as séries de `state.recorded` daquele exercício, por número da série, com a carga em gramas e as repetições ou os segundos registrados; nos outros estados, o campo fica vazio. A folha desenha a lista como `ul` "Séries de <exercício>", só de leitura, sem mudar API, banco nem fila (US-F03-06). O popup da folha tem altura máxima de `100dvh` menos a área segura do topo, e só a lista de exercícios rola, com o título, "Fechar" e "Encerrar" fixos.
2. A série seguinte vem de `nextPositionOf`, que lê as séries registradas por exercício do programa: o exercício escolhido na folha durante o descanso, senão a próxima série do mesmo exercício, senão o primeiro exercício da letra, na ordem do programa, que ainda tem série por fazer. Sem série por fazer, o treino termina.
3. O toque num exercício por fazer despacha `goTo`. Fora do descanso, o reducer abre a série do exercício (número igual às séries registradas mais 1), anuncia "Tríceps na polia, série 1 de 3" e começa a guarda de 0,8 s. Durante o descanso, o reducer grava a escolha em `nextExerciseIndex`, sem mexer em `restEndsAtMs`, e "A seguir" mostra o exercício escolhido. Escolher de novo o exercício que a ordem traz grava `null`. Exercício feito e exercício atual não levam a outro.
4. O reducer guarda a folha aberta em `sheet` (`none`, `sequence` ou `confirmEnd`). Com folha aberta, o descanso continua contando, mas `restEnd` e `next` não fazem a passagem. A ação `closeSheet` faz a passagem se o descanso acabou, e a guarda de 0,8 s começa nela.
5. "Encerrar" na folha da sequência troca para a folha de confirmação (`end-sheet.tsx`), com as séries feitas, as séries que faltam, "Encerrar" e "Continuar". A ação `end` leva à fase `ended` com `finish` `ended_early` e o instante do toque; sem série registrada, `finish` fica `null`. A última série que falta leva à fase `finished` com `finish` `completed` e o `performedAt` da série, sem confirmação. Na fase `finished`, a folha abre sem "Encerrar" e sem ida a exercício.
6. O efeito da `WorkoutScreen` enfileira as séries novas e, depois, o fim (`enqueueFinish`, ID `${workoutId}:finish`). Na fase `ended`, apaga `activeWorkout` e chama `onFinish`, nessa ordem, e a tela das letras recarrega `/api/today`. A fila envia o fim para `POST /api/workouts/{workoutId}/finish` (`workout-finish-client.ts`) com as regras da ADR-022.
7. `restoreWorkoutFlow` preenche `nextExerciseIndex`, `sheet`, `finish` e `skipped` do estado salvo pela versão anterior e fecha as folhas. A escolha feita no descanso e as marcas de pulado voltam como estavam.

## Exercício pulado

A US-F03-05 acrescenta a ação "Pular" sobre o mesmo reducer:

1. A linha do exercício atual na folha da sequência tem o botão "Pular" (`aria-label` "Pular <exercício>", 56 px ou mais de altura). `canSkipOf` decide se o botão existe: precisa haver outro exercício com série por fazer que não esteja pulado, e a fase não pode ser `finished`.
2. A ação `skip` marca o exercício em `skipped` (`plannedExerciseId` e `skippedAt`). Pular de novo o mesmo exercício troca o instante. Fora do descanso, o reducer mostra a primeira série do exercício seguinte, grava `lastStep` `skip` com a guarda de 0,8 s e anuncia "Tríceps na polia, série 1 de 3". No descanso, marca o exercício que apareceria no fim dele, desfaz a escolha feita na folha, mantém `restEndsAtMs` e `lastStepAtMs`, e anuncia "A seguir: Tríceps na polia".
3. `nextPositionOf` ignora os exercícios pulados, salvo a escolha feita na folha durante o descanso. O exercício pulado sai da lista de pulados quando o atleta registra uma série dele (`recordSet`). Ir até ele pela folha (`goTo`) não tira a marca.
4. Na folha, o exercício pulado aparece como botão com o ícone `SkipForward`, o rótulo "Pulado" e "N de M", e leva ao exercício. O exercício atual vence o pulado.
5. Quando só restam exercícios pulados, a última série registrada leva à fase `finished`. A tela mostra "Treino concluído" e a seção "Ficaram de fora" (`left-out-summary.tsx`) com o nome e "N de M" de cada exercício de `leftOutOf`. A barra "Exercícios" conta só os feitos.
6. O efeito da `WorkoutScreen` enfileira as séries novas, depois um item `skip` por exercício de `leftOutOf` (`enqueueSkip`, ID `${workoutId}:skip:${plannedExerciseId}`) e, por fim, o fim do treino. Sem `finish`, nada é enfileirado. A fila envia o pulado para `POST /api/workouts/{workoutId}/skips` (`workout-skip-client.ts`) com as regras da ADR-023.

## Correção da última série

A US-F04-02 acrescenta a folha "Corrigir última série" sobre o mesmo reducer:

1. `lastSetOf(state)` devolve a última série registrada, o nome e o tipo do exercício e o total de séries, só no descanso e no treino concluído. Nas outras fases devolve `null`. O botão `LastSetButton` (`last-set-button.tsx`) mostra "45 kg · 10 rep" ou "0 kg · 45 s" e tem o nome acessível "Corrigir última série: 45 quilos, 10 repetições". O botão fica abaixo do anel do descanso e abaixo de "Ficaram de fora" no treino concluído. O foco volta a ele quando a folha fecha.
2. O toque despacha `openSheet` com `'correction'`. O reducer só abre a folha com série registrada, no descanso ou no treino concluído, e sem outra folha aberta. A folha `CorrectionSheet` (`correction-sheet.tsx`, componente `Sheet`, sobre o `Drawer` do Base UI) tem o título "Corrigir última série", o texto "Supino reto · série 1", duas `ValueWheel` (carga e repetições ou tempo) e os botões "Cancelar" e "Salvar". O ajuste fica em estado local de `CorrectionForm`, montado com o popup, então cada abertura parte dos valores registrados e "Cancelar" não deixa rascunho.
3. "Salvar" despacha `correctLastSet` com os valores finais. Valores iguais aos registrados só fecham a folha. Valores diferentes trocam `loadG` e `reps` ou `seconds` de `recorded.at(-1)` e mantêm `id`, `setNumber`, `plannedExerciseId`, `exerciseId`, `workout` e `performedAt`. Valores fora do mínimo, não inteiros ou com a medida do outro tipo deixam o estado como estava. A segunda "Salvar" encontra a folha fechada e não faz nada.
4. `carriedValues` do exercício recebe a carga e as repetições corrigidas, para a série seguinte partir delas. O tempo corrigido só vai à série seguinte quando o tempo registrado era igual ao tempo levado; a série de tempo encerrada antes registrou menos que o exibido, e o tempo exibido continua.
5. O fechamento segue `closeSheet`: com o descanso vencido sob a folha, a série seguinte aparece e a guarda de 0,8 s começa nesse instante. `lastStep` vira `correct` em todos os casos que fecham, e `lastStepAtMs` só muda quando há passagem.
6. O efeito da `WorkoutScreen` guarda, por ID de série, os valores já enfileirados. Uma série com valores diferentes vira `enqueueCorrection` (ID `${workoutId}:correction:${setId}`), depois das séries novas e antes dos pulados e do fim. Na retomada, o mapa parte das séries restauradas, então nada é enfileirado de novo. A fila envia a correção para `PATCH /api/workouts/{workoutId}/sets/{setId}` (`workout-set-correction-client.ts`) com as regras da ADR-025.
7. `announcementOf` diz "Série corrigida: 42,5 quilos, 10 repetições" e acrescenta a posição ("Série 2 de 3") quando o fechamento passou à série seguinte. `restoreWorkoutFlow` fecha a folha, e a série volta com os valores corrigidos. Cada "Salvar" que fecha a folha mostra também o aviso flutuante "Série corrigida: 42,5 kg · 10 rep" (`formatSetShort`), com `show(message, { announce: false })`: o aviso é só visual, porque a região viva da tela já anuncia a correção (`DESIGN.md`, Seção 17; EN-S1-02).
8. A folha da sequência (US-F03-06) mostra a série corrigida quando o exercício está feito. A folha não oferece correção de série que não seja a última.

## Fluxo da série com um toque

A US-F03-02 liga o botão "Próximo" da tela de treino, e a US-F05-01 completa o descanso:

1. O toque em "Começar" gera o `id` do treino (UUID v7) e o início (`startedAt`, ISO 8601 em UTC), grava o treino em andamento no aparelho e abre a tela de treino com o programa e a letra. A API só cria o treino com a primeira série.
2. O fluxo da tela fica num reducer puro (`workout-flow.ts`), com as fases `set`, `countdown`, `timing`, `rest`, `finished` e `ended`. Na fase `set`, o toque em "Próximo" despacha a ação `next` com o instante do toque. O reducer monta a série com os valores exibidos (`shownValuesOf`: carga e repetições ou tempo, ajustados ou preenchidos), um `id` novo (UUID v7 do instante) e `performedAt`. Depois do registro, o reducer escolhe a fase seguinte:
   - última série da letra: fase `finished`, sem descanso;
   - descanso de 0 s: a série seguinte, na fase `set`;
   - nos outros casos: fase `rest`, com o fim em `restEndsAtMs` pelo `restSeconds` do exercício da série registrada.
3. O descanso começa na hora, sem esperar a API. O hook `usePhaseClock` relê o relógio a cada 250 ms, confere o prazo na hora em que ele chega e despacha `restEnd` (descanso) ou `timerReach` (contagem e execução) com o instante lido quando o tempo acaba; o reducer ignora `restEnd` fora da fase `rest` ou antes de `restEndsAtMs`. A série seguinte vem de `nextPositionOf`, pelas séries registradas de cada exercício (seção "Sequência do treino e fim do treino"). A volta do segundo plano termina o descanso no primeiro tique. Na fase `rest`, o toque em "Próximo" pula o resto do descanso e abre a série seguinte sem registrar.
4. A tela de descanso mostra o anel de 240 px (`timer-ring.tsx`: `TimerRing`, `Progress.Root` do Base UI, e `RingSvg`, o desenho decorativo que a contagem de 3 s usa só com o trilho) e o tempo em `m:ss` (`role="timer"`, nome "Descanso"), fora do `progressbar`. `upcomingExercise` dá o exercício de "A seguir", só quando muda o exercício. `useScreenWakeLock` pede a tela acesa durante a contagem, a execução e o descanso e refaz o pedido quando a página volta a ficar visível; sem suporte, o descanso segue igual.
5. Novos toques ficam ignorados por 0,8 s depois de toda troca de tela: registro, fim do descanso ou pulo (`lastStepAtMs` no estado, `DOUBLE_TAP_GUARD_MS` em `workout.config.ts`). A região `aria-live="polite"`, montada desde a abertura da tela, anuncia o texto de `announcementOf`: "Série 1 de 3 registrada", "Série 2 de 3", "Tríceps na polia, série 1 de 3" ou "Série 3 de 3 registrada. Treino concluído". Depois do fim ou do pulo, a área da série recebe `data-cue="rest-end"` e a animação `rest-end` de `globals.css`, só de opacidade com `prefers-reduced-motion: reduce`. Na fase `finished`, a tela mostra "Treino concluído" e "Fechar"; o botão fica sempre ativo, porque as séries já estão na fila, e o toque apaga o treino em andamento e chama `onFinish`, que volta às letras e pede `/api/today` de novo.
6. Cada série nova entra na fila de envio (`src/sync/`) e, logo depois, o estado do treino é gravado em `activeWorkout`, nessa ordem, pelo efeito da `WorkoutScreen`. A fila envia a série para `POST /api/workouts/{workoutId}/sets` (`workout-set-client.ts`), em ordem, uma por vez, com limite de 10 s por envio (`SEND_TIMEOUT_MS`, estimativa). O descanso começa na hora, sem esperar a API.
7. O indicador discreto (`pending-sets-indicator.tsx`, ícone `CloudOff`, `role="status"`) mostra "N séries aguardando envio" enquanto a fila tem série, na tela de treino e na das letras, sem botão: o envio é automático. A série que a API recusa por regra de domínio aparece no aviso `rejected-sets-notice.tsx`, com as mensagens da API e o botão "Dispensar". O 401 no envio não troca de tela: a série fica na fila.
8. Ao abrir o app, a `TodayScreen` lê `activeWorkout`: se há treino em andamento com menos de 2 h (`RESUME_LIMIT_MS`, estimativa), abre a tela de treino na mesma posição, e `restoreWorkoutFlow` termina o descanso que acabou com o app fechado. `GET /api/today` passa por `loadToday()`, que guarda a resposta 200 em `programCache` e a devolve na falha de rede, no tempo esgotado e no 5xx; o 401 apaga a cópia.

## Ajuste por arrasto

A US-F04-01 troca a carga e o alvo, antes só de leitura, por rodas ajustáveis na fase `set`:

1. `drag-adjust.ts` guarda a regra do passo em inteiros na menor unidade: `DRAG_STEPS` (2.500 g, 1 e 5 s), `MINIMUMS` (0 g, 1 e 1 s), `adjustValue` (soma o passo, para no mínimo e em `Number.MAX_SAFE_INTEGER`), `stepsFromDrag` (distância em passos, arredondada para longe do zero a meio passo), `formatFieldValue` e `valueTextOf`.
2. O estado do fluxo ganha `draft` (valores ajustados da posição na tela, `null` sem ajuste) e `carriedValues` (por `plannedExerciseId`, os valores de que parte a série seguinte). `shownValuesOf(state)` devolve `draft`, senão `carriedValues` do exercício, senão a carga de `GET /api/today` e o alvo do programa.
3. A ação `adjust` (`field` e `steps` com sinal) vale só na fase `set`, sem folha aberta, e só para o campo que o exercício tem. Ela não muda a fase, as séries registradas, `lastStepAtMs` nem `lastStep`: só "Próximo" registra, e o ajuste não abre a guarda de 0,8 s.
4. `advance`, `goTo` e `skip` zeram `draft`; `recordSet` grava `carriedValues` e zera `draft`. `cancel` mantém `draft`. O exercício por tempo encerrado antes registra o tempo feito, e a série seguinte parte do tempo exibido antes da execução.
5. `ValueWheel` (`value-wheel.tsx`) é um `div` com papel `spinbutton`, vizinhos `aria-hidden` e os botões "−" e "+" do Base UI. O arrasto usa Pointer Events com captura e `touch-action: none`, a 22 px por passo (`DRAG_STEP_PX`). A âncora anda os passos inteiros, então o arrasto além do mínimo não acumula passos. A roda do mouse usa um listener não passivo, a 40 px por passo (`WHEEL_STEP_PX`), e as setas do teclado ajustam um passo. O componente não usa `NumberField`, porque o `input` abriria o teclado.
6. A retomada não precisa de migração do Dexie: `activeWorkout` guarda o estado inteiro. `restoreWorkoutFlow` trata `draft` ausente como `null` e `carriedValues` ausente como `{}`, e descarta valor salvo que não seja inteiro seguro maior ou igual ao mínimo do campo.
7. A API, o contrato e o MCP não mudam: a série já leva os valores executados.

## Exercício por tempo

A US-F03-07 acrescenta o cronômetro sobre o mesmo reducer:

1. Num exercício do tipo `time`, `next` na fase `set` não registra a série: abre a fase `countdown` e grava `executionStartsAtMs`, o início da execução, 3 s depois do toque (`COUNTDOWN_MS` em `workout.config.ts`). Esse é o único instante salvo; o fim da execução é `executionStartsAtMs` mais o tempo exibido (`shownValuesOf`). `lastStep` vai a `countdown`, `begin`, `timerEnd` ou `cancel`.
2. A ação `timerReach` leva a contagem à fase `timing` no início da execução e, no fim dela, registra a série com o tempo exibido, `performedAt` no fim calculado, e segue as regras do descanso (descanso de 0 s, fim da letra). Um só `timerReach` resolve a cadeia inteira quando o relógio salta, como na tela apagada: o descanso conta do fim da execução, e a guarda de 0,8 s conta do tique.
3. Na fase `countdown`, `next` não tem efeito. Na fase `timing`, `next` registra a série com o tempo feito (tempo exibido menos o tempo restante no anel, mínimo de 1 s) no instante do toque. A ação `cancel` volta à fase `set` na mesma série, sem registro, com a guarda de 0,8 s. `openSheet`, `goTo`, `skip` e `end` não têm efeito nas duas fases, e o controle do topo fica desativado.
4. `deadlineOf` dá o prazo da fase na tela e `timerReadingOf` dá a leitura (número da contagem ou segundos restantes). `restoreWorkoutFlow` mantém `countdown` e `timing` como foram salvos e não registra série: a tela resolve na conferência imediata do prazo, para a série nascer no reducer e entrar na fila (regra 4 de `apps/ui/CLAUDE.md`).
5. Os sinais saem de `cueBetween` (`timer-cues.ts`), função pura sobre duas leituras: `count` a cada número da contagem, `start` no início da execução, `warning` em 3, 2 e 1 s e `end` no fim pelo relógio. Leitura mais de 1 s mais nova que a anterior não toca (volta do segundo plano). O `tone-player.ts` toca os sinais pela Web Audio API; `unlock()` roda dentro do toque. Falha do áudio nunca interrompe o cronômetro. A `WorkoutScreen` aceita a prop `tonePlayer` para o teste.
6. A chave "Som" fica no `localStorage` do aparelho (`heavy-duty:sound`, `sound-preference.ts`), fora do Dexie e da fila, com o som ligado por padrão. `localStorage` bloqueado deixa o som ligado e a tela funcionando.
7. O anel da execução usa o `TimerRing` do descanso, com os nomes "Execução restante" e "Tempo de execução", e `data-tone="warning"` com 3 s ou menos, na cor `--color-warning`. A API, o contrato e o MCP não mudam: a série de tempo já leva `seconds`.

As regras de produto e de interface do dia a dia estão em `apps/ui/CLAUDE.md` e em `DESIGN.md`.
