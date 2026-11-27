# Contêiner: app web

| Campo | Valor |
|---|---|
| Nível C4 | 2, contêiner |
| Pasta | `apps/ui` (`@heavy-duty/ui`) |
| Onde roda | Processo Node.js no kasparov (servidor do Next.js) e navegador do celular ou do Mac (cliente) |
| ADRs | ADR-009, ADR-002, ADR-019, ADR-034, ADR-035, ADR-037, ADR-039, ADR-040; substituiu a ADR-003 |
| Ondas | 1 em diante |

## Responsabilidade

- Mostrar o treino do dia, guiar a série com um toque por passo, contar o descanso e o tempo de execução (F03, F04, F05).
- Funcionar sem sinal no fluxo da academia, com a fila do armazenamento local (NFR06).
- Instalar como PWA, com manifesto e service worker (NFR05).
- Mostrar o jogo: janelas, níveis, mapa do corpo, período, medalhas e ranking (ondas 5 a 7). O cálculo é da API (ADR-010). Pontos, barra de nível e recorde aparecem provisórios durante o treino, calculados no aparelho com as regras do pacote `@heavy-duty/game`, e o valor da API os substitui quando a fila de envio esvazia (ADR-034). Na onda 7b, os pontos do treino e a posição no ranking pessoal também aparecem provisórios no treino concluído (ADR-034, adendo da onda 7b), e a medalha nova aparece só quando a fila esvazia, sem provisório (ADR-040).
- Calcular no treino do dia a sugestão da letra pelas janelas e o nível geral com o grupo que limita, como valor final, com as regras do pacote `@heavy-duty/game`, as cópias da API e o relógio do aparelho (ADR-034, adendo da onda 6b).
- Ativar os avisos no app instalado e mostrar, pelo service worker, o aviso que chega por Web Push (onda 7a, ADR-035).
- Oferecer as telas de administração no Mac, depois do MVP (D22).

O app web não guarda regra de negócio própria. Validação de domínio, cálculo do jogo e gravação ficam na API. As exceções são duas, as duas com as regras puras do pacote `@heavy-duty/game` e sem nada do jogo na fila de envio (ADR-034):

- O provisório do jogo: o app web executa as mesmas regras da API com o estado congelado no início do treino, e o valor da API o substitui.
- A sugestão da letra e o nível geral: o app web calcula o valor final com as cópias da API e o relógio do aparelho. A API não calcula esses dois valores (adendo da onda 6b).

## Tecnologias

| Tecnologia | Uso | Licença | Estado |
|---|---|---|---|
| Next.js 16.4.6, App Router | Rotas, layouts, servidor das páginas; build de produção com `next build --webpack` | MIT | Aceita, ADR-009 |
| React 19 | Componentes | MIT | Aceita, ADR-009 |
| TypeScript, modo estrito | Linguagem | Apache-2.0 | Aceita, ADR-002 |
| Base UI (`@base-ui/react`) | Componentes sem estilo e acessíveis, base do Animate UI. A feature `workout` usa o `Progress` (barra de exercícios e pontos das séries). As folhas (sequência, encerrar, começar e correção) usam o `Drawer` pelo `Sheet` de `components/ui/` | MIT | Aceita, ADR-009 |
| Animate UI | Código copiado do repositório oficial, sem o pacote `@animate-ui/react`. Arquivo copiado: `src/components/ui/motion-button.tsx`, derivado do primitivo do botão (commit `9873c628`, 2026-11-22) | "MIT + Commons Clause" (`THIRD_PARTY_NOTICES.md`) | Aceita, ADR-024 e ADR-027 |
| Tailwind CSS 4 | Estilo, com os tokens do `DESIGN.md` no tema | MIT | Aceita, ADR-009 |
| Motion (`motion` 14.14.0) | Animação do estado pressionado do botão (`whileTap`). Licença conferida no `package.json` instalado | MIT | Aceita, ADR-009 |
| Serwist (`@serwist/next` 9.5.15) | Service worker: pré-carga, página sem conexão em `/~offline`, recebimento do Web Push | MIT | Aceita, ADR-009 |
| `@simplewebauthn/browser` 14.0.0 | Cerimônias da chave de acesso no navegador (`startAuthentication`, `startRegistration`) | MIT | Aceita, ADR-019 |
| TanStack Query | Cache e revalidação dos dados da API no cliente | MIT | Não adotado (ADR-021): uma leitura por abertura não pede cache em memória; a cópia local fica no Dexie |
| Dexie 4.4.7 | Acesso ao IndexedDB (contêiner de armazenamento local) | Apache-2.0 | Aceita, ADR-021 |
| Zod | Validação dos dados que chegam da API | MIT | Não adotado (ADR-021): o tipo da resposta continua espelhado em `today.types.ts` |
| Vitest, jsdom e Testing Library | Teste de componente | MIT | Aceita, `docs/convencoes/testes.md` |
| Lucide (`lucide-react` 1.70.0) | Conjunto de ícones. Instalado na US-F03-01, com os ícones `X` (fechar a folha) e `Timer` (duração estimada); a US-F03-02 acrescentou `CloudOff` (hoje, o indicador da fila) e a US-F03-03, `TriangleAlert` (aviso das séries recusadas); a EN-S1-01 acrescentou `Dumbbell`, `Lock`, `KeyRound`, `WifiOff` e `CircleAlert` (telas de entrada, de cadastro e sem conexão); a EN-S1-02 tirou `Timer` (a folha de começar mostra a duração com `Clock`) e acrescentou `ChevronRight`, `List`, `Check`, `Clock` e `Pencil` (fluxo da academia); a EN-S1-03 acrescentou `SkipForward` e `CircleAlert` na feature `workout` e tirou `X`, `Circle`, `CircleDot`, `CloudOff` e `TriangleAlert`. a US-F20-01 acrescentou `History` (entrada do histórico) e `ChevronLeft` (voltar). Em uso: `Check`, `ChevronDown`, `ChevronLeft`, `ChevronRight`, `CircleAlert`, `Clock`, `Dumbbell`, `History`, `KeyRound`, `List`, `Lock`, `Minus`, `Pencil`, `Plus`, `SkipForward`, `Volume2`, `VolumeX` e `WifiOff` | ISC | Aceita, ADR-016 |
| `uuid` 14.0.3 | ID do treino e da série em UUID v7, gerado no celular (`createClientId` em `src/features/workout/client-id.ts`), a mesma versão da API. Instalado na US-F03-02 | MIT | Aceita, ADR-014 |

## Interfaces

| Direção | Com quem | Protocolo | O que trafega |
|---|---|---|---|
| Recebe | Atleta e Planejador, pelo túnel | HTTPS | Páginas, arquivos estáticos, manifesto |
| Chama | API, no mesmo domínio | HTTPS, JSON em `/api/*` | Catálogo, programa, séries, estado do jogo |
| Lê e grava | Armazenamento local | IndexedDB, no navegador | Fila de séries, cache do treino do dia |
| Recebe | Serviço de push do navegador | Web Push, no service worker | Avisos de janela e de queda (onda 7a, ADR-035). O toque no aviso abre o treino do dia (D85) |

## Estrutura planejada

```text
apps/ui/src/
  app/                     rotas do App Router
    (treino)/              treino do dia, série, descanso, sequência: renderizados no cliente
    mapa/                  mapa do corpo: estado da janela e nível de cada grupo, com o detalhe do grupo (US-F08-01)
    periodo/               tela do período (onda 7b): semana do período, frase de intenção, metas O1 e O4, níveis, estante de medalhas, ranking pessoal e retratos (US-F11-01, US-F11-02, US-F19-01, US-F19-02)
    desligar-emails/       página do link de desligar dos e-mails, fora do AuthGate (US-F17-04, ADR-037)
    admin/                 telas de administração no Mac (proposta para a Q10)
    cadastro/              cadastro da chave de acesso pelo link de cadastro (US-F14-01)
    historico/             histórico no celular: lista dos treinos e detalhe só de leitura (US-F20-01)
    autorizar/             tela de autorização do cliente do MCP (US-F16-01)
    ~offline/              página sem conexão
    manifest.ts            manifesto do PWA
  components/tab-bar.tsx   barra de abas com Treino, Mapa e Período (US-F11-01, D108)
  components/ui/           componentes base sobre o Base UI, com os tokens do DESIGN.md: `MotionButton` (derivado do Animate UI), `Button`, `IconButton`, `IconLink` (link de ícone para navegação), `Sheet` e `Toast` (aviso flutuante, com o `ToastProvider` no layout raiz)
  features/<feature>/      componentes, hooks e serviços de uma feature (auth, workout, rest, game…)
  features/auth/           AuthGate, tela de entrada, tela de cadastro, aviso sem conexão, cliente de /api/auth/*
  features/workout/        treino do dia: cliente de /api/today, lista de letras, folha de confirmação, tela de treino, cronômetro do exercício por tempo (`timer-ring.tsx`, `timer-cues.ts`, `tone-player.ts`, `sound-preference.ts`; US-F03-07) e formatação de carga e duração (US-F03-01); fluxo da série (reducer), cliente de /api/workouts/{workoutId}/sets e descanso (US-F03-02); indicador da fila, aviso das séries recusadas e retomada do treino (US-F03-03); fim e pulo do descanso, anel, tela acesa e treino concluído (US-F05-01); componentes de apresentação do visual do protótipo, decorativos: círculo da letra (`letter-badge.tsx`), pontos das séries (`set-dots.tsx`), barra segmentada do controle do topo e da folha de encerrar (`exercise-bar.tsx`, com `size` `compact` ou `full`) e o hook `useFitScale` (`use-fit-scale.ts`), que reduz o valor da roda para caber na largura (EN-S1-02); pontos pequenos das séries (`set-pips.tsx`) e grupo dos avisos da fila (`queue-notices.tsx`), que põe o aviso de recusa antes da pílula nas três telas (EN-S1-03); selos da janela de atividade na linha de cada letra (US-F07-02): cliente de `/api/windows` (`windows-client.ts`), grupos da letra (`shared/muscle-groups-of-day.ts`), estado do selo pelos horários e pela hora do aparelho (`window-badges.ts`), texto do horário (`window-format.ts`) e componente (`window-badge-list.tsx`)
  features/body-map/       mapa do corpo (US-F08-01): grupos do mapa pelas cópias e pelo relógio (`body-map.ts`), desenho do corpo (`body-figure.tsx`), lista dos grupos (`group-list.tsx`), folha do detalhe (`group-sheet.tsx`) e tela (`body-map-screen.tsx`)
  features/history/        histórico no celular (US-F20-01): cliente de GET /api/workouts (`history-client.ts`), páginas de 92 dias (`history-range.ts`), datas e duração (`history-format.ts`), lista (`history-list.tsx`), detalhe (`workout-detail.tsx`) e tela (`history-screen.tsx`)
  features/notices/        avisos no celular (US-F09-01): suporte do aparelho (`push-support.ts`), cliente de /api/notifications (`push-client.ts`), APIs do navegador atrás de `PushDevice` (`push-device.ts`), estado da chave e reenvio da inscrição (`use-push-notices.ts`) e a folha "Avisos" (`notices-sheet.tsx`)
  features/period/         tela Período (`period-screen.tsx`), folha da frase de intenção (`intention-sheet.tsx`), semana e datas (`period-format.ts`) e cliente de /api/periods (`period-client.ts`), da US-F11-01; ranking (`ranking-list.tsx`) e retratos (`snapshot-list.tsx`, `snapshot-card.tsx`) planejados na onda 7b
  features/medals/         planejado na onda 7b: estante (`medal-shelf.tsx`), medalha que desce do topo (`medal-toast.tsx`) e cliente de /api/medals (`medals-client.ts`)
  features/mcp-auth/       tela de autorização do MCP e cliente de /api/oauth/authorization
  shared/                  utilitários usados por duas features ou mais: grupos principais de uma letra (`muscle-groups-of-day.ts`)
  sync/                    banco local (Dexie), fila de envio, gatilhos de envio, treino em andamento, cópia do treino do dia, das janelas (`windows-cache.ts`) e do período (`period-cache.ts`) e `SyncProvider` (ADR-021); na onda 7b, cópias do período (`period-cache.ts`) e das medalhas (`medals-cache.ts`)
  sw.ts                    service worker (Serwist): cache e, a partir da US-F09-01, os eventos `push` e `notificationclick` (ADR-035)
  sw-push.ts               texto da notificação a partir da mensagem e abertura do app no toque (US-F09-01)
  sw-runtime-caching.ts    regras de cache do service worker: /api/* só pela rede
  precache-entries.ts      páginas no precache: `/~offline`, `/`, `/mapa` e `/periodo`
  test/factories/          factories fishery
```

## Regras que o código segue

1. O fluxo da academia (`app/(treino)/`) é renderizado no cliente e funciona sem rede. Componente de servidor nessa rota quebra o uso sem sinal.
2. O app web chama a API só por `/api/*` no mesmo domínio. Ele não acessa o banco nem chama a API por outro endereço.
3. A série recebe o ID no cliente antes de entrar na fila; esse ID é a chave de idempotência (`armazenamento-local.md`).
4. Cor, espaço, raio, material e duração vêm dos tokens do `DESIGN.md`, declarados no tema do Tailwind. Componente do Animate UI que traz cor ou raio próprio é ajustado aos tokens.
5. Animação respeita `prefers-reduced-motion`, e vidro respeita `prefers-reduced-transparency` e `prefers-contrast: more` (`DESIGN.md`, Seções 12 e 15).
6. O comportamento sem rede é testado no build de produção, porque o `next.config.ts` só aplica o Serwist fora de `NODE_ENV=development`: o `next dev` com Turbopack recusa a configuração de webpack que o Serwist acrescenta (conferido no EN-S0). O cenário `@EN-S0` do e2e executa contra o build de produção.

7. O `AuthGate` do layout raiz consulta `GET /api/auth/session` e mostra a tela de entrada no lugar da tela pedida, na mesma URL, quando a resposta é 401; depois da entrada, mostra a tela pedida. Enquanto consulta, não mostra nada. Na falha de rede ou na API fora do ar, mostra "Sem conexão", salvo em `/`, em `/mapa` e em `/periodo` com a cópia do treino do dia no aparelho (`hasCachedToday`), que abrem a tela pedida sem conexão (ADR-021 e o adendo da onda 7a). `/cadastro` e `/~offline` passam direto (ADR-019). Fora de `/`, o aviso "Sem conexão" e a página `/~offline` oferecem "Voltar ao treino do dia", que abre `/`: o app instalado no iPhone não tem botão de voltar (US-F20-01). A API é a fronteira de segurança: a tela não traz dado no HTML.
8. O service worker não guarda resposta de `/api/*` do mesmo domínio: a primeira regra de `runtimeCaching` é `NetworkOnly` para essas rotas, antes do `defaultCache`. A saída (`signOut`) apaga todos os caches cujo nome não contém `precache` e a cópia do treino do dia (FR-019, FR-020). As páginas `/`, `/mapa` e `/periodo` ficam no precache, com a revisão do build, para abrir sem sinal; `reloadOnOnline` fica desligado, para a volta do sinal não recarregar a tela do treino (ADR-021).
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
4. `carriedValues` do exercício recebe só a carga corrigida, para a série seguinte partir dela. As repetições e o tempo da série seguinte vêm sempre do programa (#57).
5. O fechamento segue `closeSheet`: com o descanso vencido sob a folha, a série seguinte aparece e a guarda de 0,8 s começa nesse instante. `lastStep` vira `correct` em todos os casos que fecham, e `lastStepAtMs` só muda quando há passagem.
6. O efeito da `WorkoutScreen` guarda, por ID de série, os valores já enfileirados. Uma série com valores diferentes vira `enqueueCorrection` (ID `${workoutId}:correction:${setId}`), depois das séries novas e antes dos pulados e do fim. Na retomada, o mapa parte das séries restauradas, então nada é enfileirado de novo. A fila envia a correção para `PATCH /api/workouts/{workoutId}/sets/{setId}` (`workout-set-correction-client.ts`) com as regras da ADR-025.
7. `announcementOf` diz "Série corrigida: 42,5 quilos, 10 repetições" e acrescenta a posição ("Série 2 de 3") quando o fechamento passou à série seguinte. `restoreWorkoutFlow` fecha a folha, e a série volta com os valores corrigidos. Cada "Salvar" que fecha a folha mostra também o aviso flutuante "Série corrigida: 42,5 kg · 10 rep" (`formatSetShort`), com `show(message, { announce: false })`: o aviso é só visual, porque a região viva da tela já anuncia a correção (`DESIGN.md`, Seção 17; EN-S1-02).
8. A folha da sequência (US-F03-06) mostra a série corrigida quando o exercício está feito. A folha não oferece correção de série que não seja a última.

## Descarte do treino em andamento

A US-F03-09 acrescenta o descarte sobre o mesmo reducer (ADR-032):

1. A folha da sequência do treino em andamento mostra "Descartar" abaixo de "Encerrar". O treino concluído não mostra o botão.
2. O toque despacha `openSheet` com `'confirmDiscard'`. O reducer só abre a folha nas fases `set` e `rest`. A folha `DiscardSheet` (`discard-sheet.tsx`) tem o título "Descartar o treino", o número de séries que saem ("3 séries feitas saem do histórico" ou "Nenhuma série feita") e os botões "Continuar" e "Descartar". "Continuar" e Escape seguem `closeSheet`.
3. "Descartar" despacha `discard`, que muda a fase para `discarded`, para o descanso e fecha a folha. Fora da folha de descartar, a ação não muda nada.
4. O efeito da `WorkoutScreen` serializa as gravações: cada estado espera o anterior, então o descarte nunca passa à frente de uma série. Na fase `discarded`, com série registrada, o efeito chama `discardWorkout` da fila, que tira os itens do treino e põe o item `discard`; depois limpa o treino ativo e chama `onFinish`, e o app volta para a lista de letras.
5. A fila envia o descarte para `DELETE /api/workouts/{workoutId}` (`workout-discard-client.ts`); o 404 conta como sucesso.

## Tempo total do treino

A US-F03-08 acrescenta o tempo total:

1. `WorkoutClock` (`workout-clock.tsx`) mostra o tempo desde `session.startedAt`, o instante do toque em "Começar", com `formatElapsedClock` (`m:ss`, `h:mm:ss` a partir de 1 h). O componente tem intervalo próprio de `TICK_MS` e só muda o estado quando o segundo muda, então a `WorkoutScreen` não renderiza a cada segundo.
2. O relógio fica ao lado do controle do topo, fora do botão, com `role="timer"` e o nome "Tempo total". No treino concluído, recebe `finish.finishedAt` e fica parado.
3. O treino concluído mostra "Tempo total · N min" (`formatDurationMinutes` de `finishedAt − startedAt`) abaixo do título.
4. O treino encerrado antes, com `finish`, mostra o aviso "Treino encerrado · N min" pelo `Toast`, depois de enfileirar o fim e antes de voltar à lista de letras (D48). O histórico já mostra a duração do treino (US-F20-01).

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
2. O estado do fluxo ganha `draft` (valores ajustados da posição na tela, `null` sem ajuste) e `carriedValues` (por `plannedExerciseId`, a carga de que parte a série seguinte, `CarriedValues`). `shownValuesOf(state)` devolve `draft`, senão o alvo do programa com a carga de `carriedValues` do exercício ou, sem ela, a carga de `GET /api/today`. As repetições e o tempo nunca passam de uma série para a outra (#57, que revoga a decisão 29 da US-F04-01 nesse ponto).
3. A ação `adjust` (`field` e `steps` com sinal) vale só na fase `set`, sem folha aberta, e só para o campo que o exercício tem. Ela não muda a fase, as séries registradas, `lastStepAtMs` nem `lastStep`: só "Próximo" registra, e o ajuste não abre a guarda de 0,8 s.
4. `advance`, `goTo` e `skip` zeram `draft`; `recordSet` grava a carga exibida em `carriedValues` e zera `draft`. `cancel` mantém `draft`. O exercício por tempo encerrado antes registra o tempo feito, e a série seguinte parte do tempo do programa.
5. `ValueWheel` (`value-wheel.tsx`) é um `div` com papel `spinbutton`, vizinhos `aria-hidden` e os botões "−" e "+" do Base UI. O arrasto usa Pointer Events com captura e `touch-action: none`, a 22 px por passo (`DRAG_STEP_PX`). A âncora anda os passos inteiros, então o arrasto além do mínimo não acumula passos. A roda do mouse usa um listener não passivo, a 40 px por passo (`WHEEL_STEP_PX`), e as setas do teclado ajustam um passo. O componente não usa `NumberField`, porque o `input` abriria o teclado.
6. A retomada não precisa de migração do Dexie: `activeWorkout` guarda o estado inteiro. `restoreWorkoutFlow` trata `draft` ausente como `null` e `carriedValues` ausente como `{}`, e descarta valor salvo que não seja inteiro seguro maior ou igual ao mínimo do campo. De um estado salvo antes do #57, com repetições e tempo em `carriedValues`, fica só a carga.
7. A API, o contrato e o MCP não mudam: a série já leva os valores executados.

## Exercício por tempo

A US-F03-07 acrescenta o cronômetro sobre o mesmo reducer:

1. Num exercício do tipo `time`, `next` na fase `set` não registra a série: abre a fase `countdown` e grava `executionStartsAtMs`, o início da execução, 3 s depois do toque (`COUNTDOWN_MS` em `workout.config.ts`). Esse é o único instante salvo; o fim da execução é `executionStartsAtMs` mais o tempo exibido (`shownValuesOf`). `lastStep` vai a `countdown`, `begin`, `timerEnd` ou `cancel`.
2. A ação `timerReach` leva a contagem à fase `timing` no início da execução e, no fim dela, registra a série com o tempo exibido, `performedAt` no fim calculado, e segue as regras do descanso (descanso de 0 s, fim da letra). Um só `timerReach` resolve a cadeia inteira quando o relógio salta, como na tela apagada: o descanso conta do fim da execução, e a guarda de 0,8 s conta do tique.
3. Na fase `countdown`, `next` não tem efeito. Na fase `timing`, `next` registra a série com o tempo feito (tempo exibido menos o tempo restante no anel, mínimo de 1 s) no instante do toque. A ação `cancel` volta à fase `set` na mesma série, sem registro, com a guarda de 0,8 s. `openSheet`, `goTo`, `skip` e `end` não têm efeito nas duas fases, e o controle do topo fica desativado.
4. `deadlineOf` dá o prazo da fase na tela e `timerReadingOf` dá a leitura (número da contagem ou segundos restantes). `restoreWorkoutFlow` mantém `countdown` e `timing` como foram salvos e não registra série: a tela resolve na conferência imediata do prazo, para a série nascer no reducer e entrar na fila (regra 4 de `apps/ui/CLAUDE.md`).
5. Os sinais saem de `cueBetween` (`timer-cues.ts`), função pura sobre duas leituras: `count` a cada número da contagem, `start` no início da execução, `warning` em 3, 2 e 1 s e `end` no fim pelo relógio. A US-F05-02 acrescenta a leitura do descanso (`stage: 'rest'`, segundos que faltam) e o sinal `restWarning`, com tom próprio, em 3, 2 e 1 s do descanso; a entrada no descanso, a passagem para 0 s e o pulo não tocam. Leitura mais de 1 s mais nova que a anterior não toca (volta do segundo plano). O `tone-player.ts` toca os sinais pela Web Audio API; `unlock()` roda dentro do toque. Falha do áudio nunca interrompe o cronômetro. A `WorkoutScreen` aceita a prop `tonePlayer` para o teste.
6. A chave "Som" fica no `localStorage` do aparelho (`heavy-duty:sound`, `sound-preference.ts`), fora do Dexie e da fila, com o som ligado por padrão. A mesma chave aparece no cronômetro e no descanso (US-F05-02). `localStorage` bloqueado deixa o som ligado e a tela funcionando.
7. A chave "Som do jogo" fica no `localStorage` do aparelho (`heavy-duty:game-sound`, `sound-preference.ts`), separada da chave "Som", com o som ligado por padrão (D60). Ela aparece na folha da sequência do treino e liga o som dos pontos da série (US-F10-01) e o som e a vibração do recorde (US-F18-01).
8. O anel da execução usa o `TimerRing` do descanso, com os nomes "Execução restante" e "Tempo de execução", e `data-tone="warning"` com 3 s ou menos, na cor `--color-warning`. O anel do descanso usa o mesmo tom nos 3 últimos segundos (US-F05-02). A API, o contrato e o MCP não mudam: a série de tempo já leva `seconds`.

## Descanso acelerado

A US-F05-03 acrescenta a pressão no anel do descanso sobre o mesmo reducer:

1. O estado guarda o fim do descanso no ritmo normal (`restEndsAtMs`) e o instante da pressão (`restHoldStartedAtMs`). As ações `holdRest` e `releaseRest` abrem e fecham a pressão. `restMsLeftOf` dá o tempo que falta: `restEndsAtMs − agora` sem pressão e `(restEndsAtMs − início) − REST_FAST_FORWARD_FACTOR × (agora − início)` com pressão, nunca abaixo de 0.
2. `deadlineOf`, `timerReadingOf` e o fim do descanso usam `restMsLeftOf`. A soltura grava o novo `restEndsAtMs` (agora mais o tempo que falta), então a retomada e a fila não mudam. O pulo, o fim do descanso e o "Encerrar" limpam a pressão.
3. `restoreWorkoutFlow` solta a pressão aberta no instante em que começou, sem a aceleração: o app fechado não diz quando o dedo saiu.
4. O fator vale 3 (`workout.config.ts`). Um teste exige `1000 / fator > TICK_MS`, para cada segundo acelerado ter uma leitura do relógio de 250 ms e os sinais da US-F05-02 não falharem.
5. O `TimerRing` recebe a prop `hold`: captura do ponteiro no `pointerdown`; `pointerup`, `pointercancel` e `lostpointercapture` soltam; o `contextmenu` fica bloqueado. A `WorkoutScreen` solta a pressão quando a página vai para o segundo plano (`visibilitychange`).

## Pontos da série

A US-F10-01 acrescenta os pontos provisórios da série sobre o mesmo reducer (ADR-034):

1. No toque em "Começar", `today-screen.tsx` congela as janelas que a tela mostra (da API ou da cópia do aparelho) em `WorkoutSession.windows`, com `opensAt` e `closesAt` de cada grupo muscular (`frozenWindowsOf`). As séries do treino em andamento não abrem janela nova para ele mesmo (D56). O treino salvo antes da US-F10-01 volta sem janelas, e as séries dele rendem pontos comuns.
2. `lastSetPointsOf` calcula os pontos da última série com `setPointsOf` e `multiplierPercentOf` do pacote `@heavy-duty/game`: o feito contra o plano do exercício do treino do dia (`plannedLoadG`, `targetReps`, `targetSeconds`) e o ×2 quando o instante da série cai na janela congelada de algum grupo principal do exercício. Os pontos não ficam no estado nem na fila.
3. A `WorkoutScreen` mostra os pontos subindo do "Próximo" (`PointsFloat`, decorativo) enquanto `lastStep` é `record` ou `timerEnd`, toca o som dos pontos uma vez por série com a chave "Som do jogo" (com o som e a vibração do recorde depois dele, quando a série bate o recorde, US-F18-01) e anuncia os pontos na região viva com a série ("Série 1 de 3 registrada, 20 pontos em dobro").
4. A busca de novo dos dados do jogo quando a fila esvazia e a troca do provisório pelo valor da API entram com a barra de nível (US-F10-02), o primeiro valor do jogo que fica na tela.

## Nível e barra por grupo

A US-F10-02 acrescenta o nível de cada grupo muscular, provisório durante o treino (ADR-034):

1. O treino do dia lê `GET /api/levels` junto com `GET /api/windows` e guarda a cópia em `programCache`, na linha `levels` (`sync/levels-cache.ts`), com a mesma regra da cópia das janelas: 200 troca a cópia, 401 apaga, rede, tempo esgotado e 5xx usam a cópia. A saída da conta apaga a cópia. Cada selo de janela da letra ganha o selo da faixa e uma barra curta do nível do grupo, com ", nível N" no nome da linha (D61).
2. No "Começar", `today-screen.tsx` congela os níveis em `WorkoutSession.levels` (`frozenLevelsOf`). Sem nível conhecido, o descanso não mostra barra até a API responder.
3. `lastSetLevelsOf` recalcula, sobre a base, as séries que a base ainda não tem, com `groupGainOf` e `addGroupGain` do pacote: o grupo principal recebe o ganho da D54 com as séries planejadas do grupo na letra do treino do dia, o secundário (`secondaryMuscleGroups` do treino do dia) a metade dos pontos da série, cada um com o ×2 da própria janela congelada (D55). A base é a dos níveis congelados, ou a resposta da API com o número de séries que ela já tem.
4. No descanso, `LevelPanel` mostra a barra de cada grupo da última série, com o selo da faixa (`LevelBadge`), o ganho e o valor da barra na `progressbar` "Nível de peito" ("Nível 4, 15 de 49 pontos"). A subida entra na região viva ("Peito subiu para o nível 4"). A entrada numa faixa e o nível 20 mostram `LevelCelebration` em tela cheia por `LEVEL_CELEBRATION_MS` (1,7 s), decorativa e sem pegar o toque. O texto e a tela cheia vêm dos níveis congelados, para a resposta da API não repetir o anúncio.
5. Quando a fila de envio esvazia, a `WorkoutScreen` busca `GET /api/levels` e troca a base pela resposta, com o número de séries registradas naquele instante. A cópia do aparelho não troca a base, porque pode ser anterior às séries do treino.

As regras de produto e de interface do dia a dia estão em `apps/ui/CLAUDE.md` e em `DESIGN.md`.

## Esfriamento e queda de nível

A US-F10-03 acrescenta o esfriamento, calculado pela API (`GET /api/levels`, com `cooling` e `nextDropAt`):

1. No treino do dia, o grupo esfriando mostra o selo de nível sem a cor da faixa, na cor `--color-window-cooling`, e a barra curta em listras, ao lado do selo da janela, que já diz "esfriando".
2. O ×2 da volta (D53) entra no provisório pela janela congelada: o grupo cuja primeira série do treino veio depois do `closesAt` da janela rende em dobro, e os pontos mostrados da série também dobram. A janela que fecha no meio do treino deixa de dobrar (D56).
3. A perda não roda no aparelho durante o treino: os níveis congelados no "Começar" já trazem a perda até a leitura, e o treino interrompe o esfriamento.

## Memória muscular

A US-F10-04 acrescenta a memória muscular: o grupo abaixo do melhor nível rende ×2, sem somar com a janela nem com o bem-vindo de volta (D63 a D66):

1. `GET /api/levels` traz `muscleMemory` por grupo; os níveis congelados no "Começar" já trazem `bestLevel`.
2. `lastSetPointsOf` e `lastSetLevelsOf` saem de um replay só (`lastSetStepsOf`): a partir da base, cada série que ela não tem soma o ganho de cada grupo com os bônus do grupo antes da série, inclusive a memória muscular pelo nível antes da série. Os pontos da série partem dos níveis congelados; a barra parte da resposta da API, quando houver. Quando a base já tem a última série, a barra é a base, e o ganho e a marca vêm do replay dos níveis congelados.
3. `SetPointsView.bonus` diz o que dobrou a série (`window`, `muscleMemory` ou `welcomeBack`), uma marca só, nessa ordem (D65). `PointsFloat` e `LevelPanel` mostram a marca ↺ ×2 da memória muscular (`DoubleMark`), e a região viva diz "em dobro pela memória muscular".

## Nível geral e faixa de jogo

A US-F10-05 acrescenta o nível geral, calculado no aparelho como valor final (ADR-034, adendo da onda 6b; D29, D67, D68, D78):

1. `overallLevelViewOf` (`features/workout/overall-level.ts`) junta a cópia do treino do dia, os níveis e as janelas: `overallLevelOf` do pacote dá o menor nível entre os grupos principais das letras do programa ativo, com o grupo que limita (empate pelo menor saldo na barra, depois pela ordem do catálogo); o estado da janela do grupo sai de `windowBadgesOf`, pelo relógio do aparelho; e `letterForGroupOf` dá a letra com mais séries planejadas do grupo, com empate pela ordem do programa.
2. `GameStrip` mostra no topo do treino do dia o `OverallLevelButton`. Com o grupo em janela, esfriando ou sem janela, o toque abre a `StartSheet` da letra (D25). Com o grupo descansando, o toque mostra "<Grupo> abre <quando>" numa linha `role="status"`, sem folha.
3. Sem níveis conhecidos, a faixa não aparece. Sem sinal, o cálculo usa as cópias do aparelho; a API não devolve o nível geral.

## Meta semanal na faixa de jogo

A US-F15b-02 acrescenta à faixa de jogo o item da meta semanal (D74 a D78):

1. `weekStartOf` (`features/workout/week.ts`) dá a segunda-feira 00:00 do fuso do aparelho. `loadWeekWindows` (`sync/weekly-windows-cache.ts`) lê `GET /api/windows/week?from=<segunda em UTC>` junto com as janelas e os níveis, ao abrir o treino do dia e quando a fila de envio esvazia.
2. `WeeklyGoalItem` mostra um anel em `--color-window-open` sobre `--color-fill-strong`, "aproveitadas/meta" e a legenda "janelas", com o nome acessível "4 de 6 janelas aproveitadas na semana". O anel fica cheio ao alcançar a meta. O item não é botão.
3. Sem meta definida (`weeklyGoal` nulo), o item não aparece; sem nível conhecido e sem meta, a faixa não aparece.
4. Sem sinal, vale a cópia do aparelho só se for da semana atual, sem valor provisório (D77). `countOfThisWeek` também tira da tela a contagem da semana passada quando a tela fica aberta na virada da segunda.

## Mapa do corpo

A US-F08-01 acrescenta a rota `/mapa`, sem API nova (D92, D93):

1. A entrada do mapa é a aba "Mapa" da barra de abas (US-F11-01, D108). Na onda 7a, era o link de ícone no cabeçalho do treino do dia (D92).
2. A tela lê `loadWindows`, `loadLevels` e `loadToday` juntos: a resposta da API ou, sem sinal, a cópia do aparelho. Com 401 em qualquer leitura, mostra a tela de entrada; sem janelas e sem níveis, mostra "Sem conexão", com "Tentar de novo".
3. `bodyMapOf` (`body-map.ts`) lista os grupos na ordem do catálogo, como a API devolve, com o estado pelos horários da janela e pelo relógio do aparelho (`windowStateAt`, ADR-034). O grupo fora dos grupos principais das letras do programa ativo (D67) fica cinza, com o texto "Fora do programa"; sem a cópia do treino do dia, nenhum grupo fica fora. O relógio avança a cada 60 s, sem nova leitura.
4. O desenho do corpo (`BodyFigure`), frente e costas do protótipo v1, fica fora da árvore de acessibilidade (`aria-hidden`). O grupo em janela usa `--color-window-open`; o descansando, `--color-window-rest`; o esfriando, a hachura de `--color-window-cooling`; sem treino, fora do programa e partes sem grupo, `--color-fill-strong`. O toque numa parte abre o detalhe do grupo.
5. A lista dos grupos (`GroupList`) é o equivalente em texto do desenho: um botão por grupo, com o selo do nível, o nome, o indicador e o texto do estado ("Janela aberta · fecha qui 20h", "Descansando · abre amanhã 9h", "Esfriando há 2 dias", "Sem treino", "Fora do programa") e a barra curta do nível. O nome acessível junta o nome, o estado, o nível e a memória muscular.
6. A folha do detalhe (`GroupSheet`) mostra o estado, o selo, o nível, os pontos e a barra (`progressbar` "Nível de <grupo>"), a queda com o nível seguinte e o horário quando o grupo esfria e tem `nextDropAt`, o melhor nível com ↺ ×2, a janela e a data do último treino (`lastTrainedAt`). Com a cópia do período, mostra também o "Progresso no período": a taxa de janelas aproveitadas do grupo no período, ou "Nenhuma janela terminou" (US-F11-01, D100).
7. Sem sinal, `/mapa` abre com a cópia do treino do dia, como `/`, e fica no precache (ADR-021, adendo da onda 7a).

## Barra de abas, período e medalhas (onda 7b)

A onda 7b acrescenta a barra de abas e as telas do período e das medalhas (D98, D104, D105, D108; ADR-039, ADR-040):

1. A barra de abas (`TabBar`) tem as abas Treino (`/`), Mapa (`/mapa`) e Período (`/periodo`), conforme o `DESIGN.md`, Seções 9.1 e 9.2. O ícone "Mapa" sai do cabeçalho do treino do dia, e o mapa perde o voltar; o cabeçalho fica com "Avisos" e "Histórico". A barra não aparece na tela de treino em andamento nem no histórico. Os itens 1 das seções "Mapa do corpo" e "Histórico no celular" mudam com a US-F11-01.
2. A tela Período lê `GET /api/periods/current`, `GET /api/periods` e `GET /api/medals`. A frase de intenção se edita numa folha, só com conexão (D98).
3. A faixa de jogo ganha a sequência de semanas e os pontos da semana, da resposta do período (D101, D102). A meta semanal continua com a semana do fuso do aparelho (D74).
4. O treino concluído mostra os pontos do treino e a posição ("2º do período"), provisórios, com `shownSetPointsOf` e `rankOf` do pacote sobre o ranking congelado no início do treino, e troca pelos valores da API quando a fila de envio esvazia (ADR-034, adendo da onda 7b).
5. A medalha nova aparece quando a fila de envio esvazia e o app lê as medalhas de novo: a medalha desce do topo da tela e entra no treino concluído (D104). O celular não calcula medalha.
6. O detalhe do grupo do mapa ganha o progresso no período, a taxa de janelas aproveitadas do grupo no período (D100).

A US-F11-01 entregou a barra de abas, o progresso no período do item 6 e a parte da tela Período que lê `GET /api/periods/current`; os itens 3 a 5, a lista dos períodos e as medalhas seguem planejados:

1. A barra de abas (`components/tab-bar.tsx`) tem três links: "Treino" (`/`, ícone `Dumbbell`), "Mapa" (`/mapa`, ícone `PersonStanding`) e "Período" (`/periodo`, ícone `CalendarDays`), com `aria-current="page"` na seção atual. Ela flutua no rodapé, com vidro (`.glass`), fora do `main`, e deixa um espaço sob o conteúdo. Não tem `z-index`, para as folhas cobrirem a barra.
2. A tela Período lê `loadPeriod` (`sync/period-cache.ts`) e `loadLevels` juntos: a resposta da API ou, sem sinal, a cópia do aparelho, com a regra das outras cópias (200 troca, 401 apaga, rede, tempo esgotado e 5xx usam a cópia). Sem período, mostra "Sem conexão". Sem sinal, `/periodo` abre com a cópia do treino do dia, como `/` e `/mapa`, e fica no precache.
3. A tela mostra "Período N · 12 semanas", o anel e "Semana N de 12", contada pelo relógio do aparelho a partir de `startsAt`, o primeiro e o último dia ("De 23 de nov. a 14 de fev."), a frase entre aspas ou "Sem frase de intenção", as metas O1 e O4 com a meta do período e os níveis dos 11 grupos.
4. "Escrever a frase" ou "Editar a frase" abre a folha da frase (`intention-sheet.tsx`), com o campo de até 120 caracteres e o contador. "Salvar" chama `PUT /api/periods/current/intention` direto, sem a fila: a frase não é passo do treino. Sem sinal, a folha fica aberta com "Sem conexão. A frase não foi salva."; com sucesso, a tela troca a cópia pelo período devolvido.

## Histórico no celular

A US-F20-01 acrescenta a rota `/historico`, só de leitura (D50):

1. O treino do dia tem, no cabeçalho, o link de ícone "Histórico" (`IconLink`, ícone `History`), que leva a `/historico`. A barra de abas não entra (DESIGN.md 9.2, exceção).
2. A tela lê `GET /api/workouts` em páginas de 92 dias, o maior intervalo da rota. A primeira página termina em `agora + 1 dia`, para cobrir diferença de relógio entre o celular e o servidor; cada página seguinte termina onde a anterior começa (`historyRangeOf`). A API devolve do mais antigo ao mais recente, e a tela inverte cada página. "Treinos anteriores" busca a página seguinte; a página vazia vira a nota "Nenhum treino de <início> a <fim>.".
3. O detalhe fica na mesma página, em `/historico?treino=<id>`, com os treinos já carregados: a volta à lista não busca de novo. O ID fora das páginas carregadas mostra a lista. Ao abrir e fechar o detalhe, o foco vai para o título.
4. A lista das séries usa o `RecordedSetItem` da feature `workout`, o mesmo da folha da sequência. A data e a hora usam o fuso do aparelho; a duração sai de `finishedAt − startedAt`.
5. O celular não guarda cópia do histórico, e o service worker não guarda resposta de `/api/*` (ADR-021). Sem conexão, o `AuthGate` ou a `/~offline` mostram "Sem conexão", com "Voltar ao treino do dia"; a falha depois da entrada mostra "Sem conexão" dentro da tela, com o voltar.

A US-F20-02 acrescenta a remoção no detalhe (D50, ADR-032):

1. O detalhe tem o botão "Apagar treino" (variante destrutiva, ícone `Trash2`) abaixo do conteúdo. O botão não aparece para os treinos que ainda estão no aparelho: o treino ativo e os que têm item na fila de envio (`loadWorkoutsOnDevice`, `src/sync/workouts-on-device.ts`), porque a fila recriaria o treino. A saída do treino ativo é descartar (US-F03-09).
2. O botão abre a `DeleteWorkoutSheet` (`delete-workout-sheet.tsx`), uma `Sheet` com papel `alertdialog`, o título "Apagar treino", a letra e a data, o número de séries que saem e os botões "Cancelar" e "Apagar".
3. "Apagar" chama `deleteHistoryWorkout` (`history-client.ts`), direto, sem a fila: `DELETE /api/workouts/{workoutId}`. Durante a chamada, "Apagar" fica desabilitado. Com 200, 204 ou 404, a tela tira o treino das páginas, troca o endereço para `/historico` e mostra o aviso "Treino apagado". Com 401, mostra a tela de entrada. Com falha de rede ou outro status, a folha continua aberta com "Sem conexão. Tente de novo.".

## Avisos no celular

A onda 7a acrescenta a ativação dos avisos e o recebimento pelo service worker (US-F09-01, US-F09-02, ADR-035):

1. O treino do dia tem, no cabeçalho, o ícone "Avisos" (sino), ao lado de "Mapa" e "Histórico" (D87, D92). O toque abre uma folha com a chave "Avisos no celular". A chave fica indisponível, com o motivo em texto, quando o app não está instalado na tela inicial ("instale o app na tela inicial"), quando `GET /api/notifications/push-key` diz que o push não está configurado ("avisos não configurados no servidor") ou sem rede ("sem conexão").
2. O app está instalado quando `display-mode: standalone` ou `navigator.standalone` é verdadeiro, e o navegador aceita push quando tem `PushManager` e `Notification` (D44).
3. O app web pede a permissão só no toque na chave. Com a permissão, inscreve o aparelho com `userVisibleOnly: true` e a chave pública vinda da API, e grava a inscrição com `PUT /api/notifications/push-subscriptions`. A chave pública não entra no build (`NEXT_PUBLIC_*`), porque as imagens são genéricas (ADR-028).
4. A cada abertura com a permissão dada, o app web manda a inscrição de novo à API, porque o Safari não garante o `pushsubscriptionchange`. Desativar chama `unsubscribe()` e `DELETE /api/notifications/push-subscriptions`.
5. O evento `push` do service worker sempre mostra uma notificação, com `tag` por letra; uma mensagem sem notificação faz o Safari revogar a inscrição. O `notificationclick` abre `/`, o treino do dia (D85).
6. O service worker só existe no build de produção (regra 6). O e2e usa um `PushManager` falso; o teste com o serviço de push real só acontece no iPhone, depois do deploy.
