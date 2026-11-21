# ADR-021: Sincronização da fila de séries sem sinal

| Campo | Valor |
|---|---|
| Status | Aceita |
| Data | 2026-11-21 |
| Decisor | PO, por delegação no plano do MVP |
| Requisitos relacionados | NFR06, H10, F03, US-F03-03, ADR-009, ADR-014, ADR-019 |

## Contexto

O atleta treina no celular, na academia, e o sinal pode cair no meio do treino (NFR06, H10; `docs/prd.md`, Seções 4 e 10). Até esta decisão, a série ia direto à API e, se o envio falhava, vivia só na memória da tela, com o aviso "Série não enviada" e o botão "Reenviar" (US-F03-02). O PRD pede que a série fique salva no aparelho e siga para a API quando a conexão volta, sem toque do atleta (`docs/prd.md`, Seção 9, F03, cenário "sem sinal").

Fatos do projeto que a decisão usa:

- A API aceita o mesmo ID de série duas vezes e responde 200 com a série já gravada (US-F03-02; `docs/arquitetura/contratos.md`). O ID é um UUID v7 gerado no cliente (ADR-014).
- A API recusa a série por regra de domínio com 400, 409 ou 422 e um corpo `{ code, message }` (`apps/api/src/http/errors.ts`).
- A sessão de acesso vence e a API responde 401 (ADR-019).
- O service worker do Serwist não guarda resposta de `/api/*` (`apps/ui/src/sw-runtime-caching.ts`).
- `docs/arquitetura/armazenamento-local.md` já previa o Dexie, as tabelas `pendingSets`, `activeWorkout` e `programCache` e deixava a estratégia de conflito para esta ADR.

Fatos externos que não foram conferidos neste ambiente:

- O Background Sync da web não existe no Safari do iPhone [a confirmar: tabela de compatibilidade do MDN em 2026-11-21]. O tipo do celular do PO ainda está em aberto (Q02).
- O Safari pode apagar o IndexedDB de um site sem uso por um tempo, e `navigator.storage.persist()` pede que o navegador mantenha os dados, sem garantia [a confirmar: política de retenção do WebKit para PWA instalada].

## Decisão

O app guarda cada série numa fila de envio no IndexedDB antes de qualquer envio e a manda à API em ordem, uma por vez, com o mesmo ID. Em conflito, o servidor vence. Detalhes que o código segue:

- **Fila em ordem.** `createSyncQueue({ store, send })` (`apps/ui/src/sync/sync-queue.ts`) não depende de React. A tabela `pendingSets` guarda a série com `seq` autoincremental (ordem de registro) e índice único em `id`. Gravar um ID que já está na fila não faz nada.
- **Gravar antes de enviar.** `enqueue` grava a série no armazenamento e só depois dispara o envio.
- **Idempotência pelo ID.** O reenvio leva o mesmo ID e o mesmo corpo. Se a resposta se perdeu depois de a API gravar, o reenvio recebe 200 e a série sai da fila.
- **Classificação da resposta** (`postWorkoutSet`, `apps/ui/src/features/workout/workout-set-client.ts`):

| Resposta | Desfecho | Efeito |
|---|---|---|
| 200, 201 | `confirmed` | A série sai da fila |
| 400, 409, 422 | `rejected`, com `code` e `message` do corpo | A série sai da fila, vai para `rejectedSets` e aparece num aviso; não é reenviada com outro ID nem com outros valores |
| Rede, tempo esgotado, 401, 403, 404, 408, 429, 5xx e qualquer outro status | `retry` | A série fica; o envio da rodada para e a próxima tentativa recomeça da primeira série |

- **Servidor vence.** O app nunca altera uma série recusada para reenviar. A correção é das stories US-F04-02 e US-F06-02.
- **Um envio por vez.** Uma promessa de envio em andamento por processo (single-flight). Não há trava entre abas; o mesmo ID é idempotente na API.
- **Gatilhos.** O envio começa ao montar o app, no evento `online`, na volta da aba ao primeiro plano (`visibilitychange`), depois de cada resposta 200 de `GET /api/today`, depois da entrada e, enquanto houver série na fila, a cada 15 s (`SYNC_RETRY_INTERVAL_MS`, estimativa: curto o bastante para o indicador sumir logo depois da volta do sinal, longo o bastante para poupar bateria). `navigator.onLine` só dispara a tentativa; a resposta da API é o que tira a série da fila. O `reloadOnOnline` do Serwist fica desligado, para a volta do sinal não recarregar a tela do treino.
- **Espelho em memória com gravação a cada mudança.** A tela lê o estado síncrono da fila (`useSyncExternalStore`). Se o IndexedDB não abre ou uma gravação falha, a fila segue só em memória pelo resto da sessão, com o mesmo indicador.
- **Cópias locais.** A tabela `activeWorkout` guarda o estado inteiro do treino em andamento, e `programCache` guarda a última resposta 200 de `GET /api/today`. O treino em andamento volta na mesma posição depois de recarregar; o descanso que acabou com o app fechado termina na volta. Passadas 2 h desde o último passo (`RESUME_LIMIT_MS`, estimativa: um treino dura cerca de 1 h), o app abre nas letras e descarta o treino em andamento, sem tocar na fila.
- **Abertura sem conexão.** A página `/` entra no precache do Serwist com a revisão do build (`apps/ui/src/precache-entries.ts`). Quando `GET /api/auth/session` falha por rede, o `AuthGate` abre `/` se o aparelho tem a cópia do treino do dia; sem cópia, ou em outro caminho, mostra "Sem conexão". O 401 continua a mostrar a tela de entrada.
- **Sessão vencida.** O 401 no envio mantém a série na fila e não troca de tela. A fila envia de novo depois da entrada.
- **Dado no aparelho depois da saída.** `signOut` e o 401 de `GET /api/today` apagam `programCache`. A fila, as recusadas e o treino em andamento ficam, porque guardam séries que ainda precisam chegar à API. Risco aceito: quem tem o aparelho desbloqueado lê essas séries.
- **Sem Background Sync.** O envio só acontece com o app aberto.
- **Dexie 4.4.7**, licença Apache-2.0, compatível com a MIT do projeto. `fake-indexeddb` 6.2.7 (Apache-2.0) só entra nos testes.
- **TanStack Query e Zod não entram agora.** A cópia local fica no Dexie, e o tipo da resposta continua espelhado em `today.types.ts`.

Risco registrado: a série e o treino em andamento são duas gravações separadas. Se o app morrer entre elas, a série fica na fila e o treino volta uma série antes; o novo toque gera 409 `workout_set_duplicated`, que vira recusa e aviso. A tela grava a fila primeiro, porque é o dado que importa.

## Consequências

- O atleta registra o treino inteiro sem sinal, e as séries chegam à API sozinhas, na ordem, quando a conexão volta.
- O app abre sem conexão depois de uma abertura com sessão e conexão, e o treino continua depois de recarregar.
- O envio só acontece com o app aberto: uma série registrada e fechada sem sinal espera a próxima abertura.
- O `signOut` deixa séries e treino no aparelho; quem desbloqueia o aparelho as lê.
- O app depende do `navigator.storage.persist()` e da retenção do navegador [a confirmar no celular do PO, tarefa manual].
- O cálculo dos valores preenchidos não considera as séries ainda na fila (pressuposto 6 da spec).
- A série recusada exige correção em outra story; até lá, o aviso dura até o atleta dispensar.

## Alternativas consideradas

| Alternativa | Motivo da recusa |
|---|---|
| Background Sync no service worker | Não existe no Safari do iPhone [a confirmar] e o celular do PO está em aberto (Q02) |
| Guardar a fila só em memória | Perde a série ao recarregar ou fechar o app |
| Ler a fila direto do IndexedDB a cada consulta | O indicador pede estado síncrono; o espelho em memória resolve |
| Reenviar a série recusada com ID novo | A recusa é de regra de domínio; outro ID duplicaria o dado errado |
| Trava entre abas (Web Locks) | O ID idempotente já torna o envio duplicado inofensivo; uma aba só é o uso previsto |
| TanStack Query com persistência | Uma leitura por abertura não pede cache em memória; adiciona dependência |
| Confiar no cache `others` do `defaultCache` para abrir `/` | NetworkFirst com expiração de 24 h não garante a página na primeira falha |
