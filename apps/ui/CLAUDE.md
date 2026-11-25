# Regras de apps/ui

PWA em Next.js, com Base UI e Animate UI, para a persona Atleta (P1). A arquitetura do contêiner está em `docs/arquitetura/app-web.md`. O contexto de uso é a academia: celular apoiado no banco, mãos ocupadas, intervalos de 1 a 2 minutos e talvez sem sinal.

## Estrutura planejada

```text
src/
  app/                    rotas do App Router; o fluxo da academia fica em app/(treino)/, renderizado no cliente
  components/ui/          componentes base: `MotionButton` (derivado do Animate UI, sob a licença do `THIRD_PARTY_NOTICES.md`), `Button`, `IconButton`, `Sheet` e `Toast` (código próprio; `show(message, { announce: false })` mostra um aviso só visual, fora da região `role="status"`, quando outra região viva já anuncia o fato)
  features/<feature>/     componentes, hooks e serviços de uma feature (workout, rest…)
  shared/                 utilitários usados por duas features ou mais
  sync/                   fila local (IndexedDB, com Dexie) e envio para a API
  sw.ts                   service worker (Serwist)
  test/factories/         factories fishery: exerciseFactory, mockExercise
```

Organize por feature, não por tipo de arquivo. Um componente usado só por uma feature fica dentro da feature.

## Interface

Siga `DESIGN.md` em toda tela e todo componente. Regras que mais erram:

- Área de toque de 44 × 44 px ou mais; 56 px nos controles da tela de treino.
- Vidro (`backdrop-filter`) só na camada de controles e navegação, com versão opaca para `prefers-reduced-transparency` e `prefers-contrast: more`.
- Cor, espaço, raio e duração vêm de tokens CSS (`--color-*`, `--space-*`, `--radius-*`).
- Não use fontes SF nem SF Symbols. Use a pilha `system-ui` e os ícones do Lucide (`lucide-react`, ADR-016).
- Use `Button` e `IconButton` de `components/ui/` em tela nova, no lugar de `<button>` com classe solta. `IconButton` exige `aria-label`.
- Ao copiar um componente do Animate UI, copie só do repositório oficial, em commit fixado, sem o pacote `@animate-ui/react` (ADR-027). Ponha no topo do arquivo o comentário de licença da ADR-024 e acrescente o arquivo à lista do `THIRD_PARTY_NOTICES.md`. Na primeira cópia, ponha nesse arquivo o texto integral do `LICENSE.md` do repositório oficial.
- Siga o visual da versão mais recente de `docs/prototipo/`. Token que o protótipo usa e o `DESIGN.md` não define entra primeiro no `DESIGN.md`.
- Meça alinhamento e espaçamento com `getBoundingClientRect()` antes de afirmar que estão corretos.

## Regras de produto que o código segue

1. Cada passo do fluxo da academia pede um toque (meta O5 do PRD). Num exercício por tempo, o toque em "Próximo" abre o cronômetro (contagem de 3 s e execução) e o fim da execução registra a série sem toque. Só começar, encerrar e descartar o treino pedem confirmação (D25, US-F03-09). A folha da sequência do treino, a folha de encerrar, a folha de descartar e a folha da correção seguram a passagem à série seguinte: com uma aberta, o descanso conta, mas a série seguinte só aparece quando a folha fecha.
2. O fluxo de treino não abre teclado. Carga, repetições e tempo mudam por arrasto, pelos botões − e +, pelas setas do teclado ou pela roda do mouse, em passos fixos de `src/features/workout/drag-adjust.ts` (F04). O ajuste vale só na fase da série e não registra: só "Próximo" registra.
3. Toque duplo em "Próximo" tem efeito uma vez só: o reducer de `src/features/workout/workout-flow.ts` ignora novo toque por `DOUBLE_TAP_GUARD_MS` (0,8 s, em `workout.config.ts`) depois de toda troca de tela, seja registro, fim do descanso, pulo do descanso, toque que abre a contagem, início da execução ou "Cancelar" (`lastStepAtMs`). Cada série e cada treino levam o ID gerado no cliente com `createClientId()` (`src/features/workout/client-id.ts`, UUID v7, ADR-014), que é a chave de idempotência.
4. O registro funciona sem rede. A série entra na fila local (`src/sync/`, Dexie) antes de qualquer envio e segue para a API, em ordem, quando a conexão volta (F03, H10, ADR-021). A API recusa por regra de domínio com 400, 409 ou 422: a série sai da fila e vira aviso, sem reenvio. O fim do treino (`completed` ou `ended_early`) também segue pela fila, depois das séries, e a recusa do fim é silenciosa (ADR-022). O exercício pulado que ficou de fora também segue pela fila, entre as séries e o fim, com recusa silenciosa (ADR-023). A correção da última série também segue pela fila, depois da série, e uma correção nova da mesma série substitui a pendente; a recusa da correção é silenciosa (ADR-025). O descarte do treino em andamento tira da fila os itens do treino e põe a remoção (`discard`) no fim; o 404 da remoção conta como sucesso (ADR-032). Não envie a série, o pulado, a correção, o fim nem o descarte direto da tela.
5. A carga não fica negativa, as repetições não ficam abaixo de 1 e o tempo não fica abaixo de 1 s (`MINIMUMS` em `drag-adjust.ts`).
6. O texto exibido ao usuário é em português do Brasil. Nome de componente, prop e identificador são em inglês.
7. O `AuthGate` (`src/features/auth/auth-gate.tsx`) envolve toda tela no layout raiz e mostra a tela de entrada quando não há sessão de acesso. Só `/cadastro`, `/~offline` e `/desligar-emails` (o link de desligar dos e-mails, ADR-037) passam direto; não acrescente caminho sem ADR (ADR-019). Fora de `/`, o aviso "Sem conexão" oferece "Voltar ao treino do dia", porque o app instalado não tem botão de voltar. Sem conexão, `/` e `/mapa` abrem se o aparelho tem a cópia do treino do dia (ADR-021). A tela de autorização do MCP, `/autorizar`, fica atrás do `AuthGate` (ADR-020).
8. O service worker não guarda resposta de `/api/*` (`src/sw-runtime-caching.ts`). Não acrescente regra de cache para a API: a cópia local do treino do dia fica no Dexie (`programCache`), não no service worker (ADR-021). As páginas `/` e `/mapa` estão no precache (`src/precache-entries.ts`).

## Testes

- Consulte elementos por papel e nome acessível (`getByRole`), não por classe ou `data-testid`.
- Use `vi.useFakeTimers()` em teste do descanso. O teste não espera o relógio real.
- Siga `docs/convencoes/testes.md`.

## Comandos

```sh
pnpm --filter @heavy-duty/ui dev
pnpm --filter @heavy-duty/ui test
pnpm --filter @heavy-duty/ui lint
pnpm --filter @heavy-duty/ui typecheck
pnpm --filter @heavy-duty/ui build    # build de produção com webpack, gera o service worker
```
