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
| Animate UI, variante Base UI | Componentes animados copiados para `src/components/ui/` | "MIT + Commons Clause" no `LICENSE.md` oficial (2026-11-21) | Pendente: decisão do PO sobre a licença (ADR-016); nenhum componente copiado |
| Tailwind CSS 4 | Estilo, com os tokens do `DESIGN.md` no tema | MIT | Aceita, ADR-009 |
| Motion | Animação, exigida pelo Animate UI | MIT | Aceita, ADR-009 |
| Serwist (`@serwist/next` 9.5.15) | Service worker: pré-carga, página sem conexão em `/~offline`, recebimento do Web Push | MIT | Aceita, ADR-009 |
| `@simplewebauthn/browser` 14.0.0 | Cerimônias da chave de acesso no navegador (`startAuthentication`, `startRegistration`) | MIT | Aceita, ADR-019 |
| TanStack Query | Cache e revalidação dos dados da API no cliente | MIT | Adiado: a US-F03-01 lê `/api/today` com `fetch` simples, uma vez por abertura; a US-F03-03 decide com o cache local |
| Dexie | Acesso ao IndexedDB (contêiner de armazenamento local) | Apache-2.0 | Adiado para a onda 3 (US-F03-03) |
| Zod | Validação dos dados que chegam da API | MIT | Adiado: a US-F03-01 espelha o schema da API em `today.types.ts`; a US-F03-03 decide junto com o TanStack Query |
| Vitest, jsdom e Testing Library | Teste de componente | MIT | Aceita, `docs/convencoes/testes.md` |
| Lucide (`lucide-react` 1.70.0) | Conjunto de ícones. Instalado na US-F03-01, com os ícones `X` (fechar a folha) e `Timer` (duração estimada); a US-F03-02 acrescentou `CloudOff` (série não enviada) | ISC | Aceita, ADR-016 |
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
  components/ui/           componentes do Animate UI, sobre o Base UI, adaptados ao DESIGN.md
  features/<feature>/      componentes, hooks e serviços de uma feature (auth, workout, rest, game…)
  features/auth/           AuthGate, tela de entrada, tela de cadastro, aviso sem conexão, cliente de /api/auth/*
  features/workout/        treino do dia: cliente de /api/today, lista de letras, folha de confirmação, tela de treino e formatação de carga e duração (US-F03-01); fluxo da série (reducer), cliente de /api/workouts/{workoutId}/sets, descanso e aviso de série não enviada (US-F03-02); fim e pulo do descanso, anel, tela acesa e treino concluído (US-F05-01)
  features/mcp-auth/       tela de autorização do MCP e cliente de /api/oauth/authorization
  shared/                  utilitários usados por duas features ou mais
  sync/                    fila do armazenamento local e envio para a API
  sw.ts                    service worker (Serwist)
  sw-runtime-caching.ts    regras de cache do service worker: /api/* só pela rede
  test/factories/          factories fishery
```

## Regras que o código segue

1. O fluxo da academia (`app/(treino)/`) é renderizado no cliente e funciona sem rede. Componente de servidor nessa rota quebra o uso sem sinal.
2. O app web chama a API só por `/api/*` no mesmo domínio. Ele não acessa o banco nem chama a API por outro endereço.
3. A série recebe o ID no cliente antes de entrar na fila; esse ID é a chave de idempotência (`armazenamento-local.md`).
4. Cor, espaço, raio, material e duração vêm dos tokens do `DESIGN.md`, declarados no tema do Tailwind. Componente do Animate UI que traz cor ou raio próprio é ajustado aos tokens.
5. Animação respeita `prefers-reduced-motion`, e vidro respeita `prefers-reduced-transparency` e `prefers-contrast: more` (`DESIGN.md`, Seções 12 e 15).
6. O comportamento sem rede é testado no build de produção, porque o `next.config.ts` só aplica o Serwist fora de `NODE_ENV=development`: o `next dev` com Turbopack recusa a configuração de webpack que o Serwist acrescenta (conferido no EN-S0). O cenário `@EN-S0` do e2e executa contra o build de produção.

7. O `AuthGate` do layout raiz consulta `GET /api/auth/session` e mostra a tela de entrada no lugar da tela pedida, na mesma URL, quando a resposta é 401; depois da entrada, mostra a tela pedida. Enquanto consulta, não mostra nada; na falha de rede ou na API fora do ar, mostra "Sem conexão". `/cadastro` e `/~offline` passam direto (ADR-019). A API é a fronteira de segurança: a tela não traz dado no HTML.
8. O service worker não guarda resposta de `/api/*` do mesmo domínio: a primeira regra de `runtimeCaching` é `NetworkOnly` para essas rotas, antes do `defaultCache`. A saída (`signOut`) apaga todos os caches cujo nome não contém `precache` (FR-019, FR-020).
9. A tela `/autorizar` é o `authorization_endpoint` do servidor de autorização do MCP (ADR-020) e fica atrás do `AuthGate`: sem sessão de acesso, a tela de entrada aparece na mesma URL. A tela chama `GET /api/oauth/authorization` com a query do pedido e mostra o host do `redirect_uri` em destaque e o nome declarado pelo cliente como dado secundário, com os botões "Recusar" e "Permitir". O toque duplo manda uma decisão só, e o navegador segue para o `redirectTo` com `window.location.assign`. A prévia 400 mostra a mensagem sem redirecionar; a prévia `error_redirect` redireciona direto; a falha de rede mostra "Sem conexão". O `next.config.ts` manda em `/autorizar` os cabeçalhos `Content-Security-Policy: frame-ancestors 'none'`, `X-Frame-Options: DENY` e `Referrer-Policy: no-referrer`, contra clickjacking e vazamento da query.
10. O manifesto declara ícones PNG de 192 e 512 px e um de 512 px `maskable`; o layout declara o `apple-touch-icon` de 180 px. Os PNG são versionados e renderizados dos SVG com o Chromium (`apps/ui/README.md`).

## Fluxo da série com um toque

A US-F03-02 liga o botão "Próximo" da tela de treino, e a US-F05-01 completa o descanso:

1. O toque em "Começar" gera o `id` do treino (UUID v7) e o início (`startedAt`, ISO 8601 em UTC) e abre a tela de treino com o programa e a letra. Nada é gravado ainda.
2. O fluxo da tela fica num reducer puro (`workout-flow.ts`), com as fases `set`, `rest` e `finished`. Na fase `set`, o toque em "Próximo" despacha a ação `next` com o instante do toque. O reducer monta a série com a carga e o alvo exibidos, um `id` novo (UUID v7 do instante) e `performedAt`. Depois do registro, o reducer escolhe a fase seguinte:
   - última série da letra: fase `finished`, sem descanso;
   - descanso de 0 s: a série seguinte, na fase `set`;
   - nos outros casos: fase `rest`, com o fim em `restEndsAtMs` pelo `restSeconds` do exercício da série registrada.
3. O descanso começa na hora, sem esperar a API. O hook `useRestClock` relê o relógio a cada 250 ms e despacha `restEnd` com o instante lido quando o tempo acaba; o reducer ignora `restEnd` fora da fase `rest` ou antes de `restEndsAtMs`. A série seguinte vem de `nextPositionOf`: a próxima série do mesmo exercício ou a 1ª série do exercício seguinte. A volta do segundo plano termina o descanso no primeiro tique. Na fase `rest`, o toque em "Próximo" pula o resto do descanso e abre a série seguinte sem registrar.
4. A tela de descanso mostra o anel (`rest-ring.tsx`, `Progress.Root` do Base UI com um `circle` SVG) e o tempo em `m:ss` (`role="timer"`, nome "Descanso"), fora do `progressbar`. `upcomingExercise` dá o exercício de "A seguir", só quando muda o exercício. `useScreenWakeLock` pede a tela acesa durante o descanso e refaz o pedido quando a página volta a ficar visível; sem suporte, o descanso segue igual.
5. Novos toques ficam ignorados por 0,8 s depois de toda troca de tela: registro, fim do descanso ou pulo (`lastStepAtMs` no estado, `DOUBLE_TAP_GUARD_MS` em `workout.config.ts`). A região `aria-live="polite"`, montada desde a abertura da tela, anuncia o texto de `announcementOf`: "Série 1 de 3 registrada", "Série 2 de 3", "Tríceps na polia, série 1 de 3" ou "Série 3 de 3 registrada. Treino concluído". Depois do fim ou do pulo, a área da série recebe `data-cue="rest-end"` e a animação `rest-end` de `globals.css`, só de opacidade com `prefers-reduced-motion: reduce`. Na fase `finished`, a tela mostra "Treino concluído" e "Fechar"; o botão fica desativado enquanto houver série enviando ou com falha, e o toque chama `onFinish`, que volta às letras e pede `/api/today` de novo.
6. Cada série segue na hora para `POST /api/workouts/{workoutId}/sets` (`workout-set-client.ts`), com limite de 10 s (`SEND_TIMEOUT_MS`, estimativa). 200 e 201 contam como enviada; rede, tempo esgotado, 401, 4xx e 5xx contam como falha.
7. A série que falhou aparece numa linha discreta com o ícone `CloudOff`, "Série não enviada" e o botão "Reenviar", que manda de novo cada série com falha, com o mesmo `id` e o mesmo corpo. A série não enviada vive só na memória da tela até a fila da US-F03-03; o 401 não troca de tela.

As regras de produto e de interface do dia a dia estão em `apps/ui/CLAUDE.md` e em `DESIGN.md`.
