# Contêiner: armazenamento local

| Campo | Valor |
|---|---|
| Nível C4 | 2, contêiner (armazenamento de dados) |
| Pasta | `apps/ui/src/sync/` |
| Onde roda | IndexedDB do navegador do celular |
| ADRs | ADR-009, ADR-021, ADR-022, ADR-023 |
| Ondas | 3 em diante |

## Responsabilidade

- Guardar a série registrada até a API confirmar o recebimento (US-F03-03).
- Guardar o fim do treino, depois das séries do mesmo treino, até a API confirmar ou recusar (US-F03-04).
- Guardar o treino do dia em andamento, para o fluxo continuar se o app fechar ou a rede cair.
- Guardar uma cópia da resposta de `GET /api/today` (programa e valores do último treino), de `GET /api/windows` (horários das janelas), de `GET /api/levels` (níveis) e de `GET /api/windows/week` (meta semanal e janelas aproveitadas da semana), para o treino abrir sem sinal.

O armazenamento local não é fonte da verdade. Quando a API confirma uma série, o registro local é apagado.

## Tecnologias

| Tecnologia | Uso | Licença | Estado |
|---|---|---|---|
| IndexedDB | Banco do navegador | Padrão da web | Aceita, ADR-009 |
| Dexie 4.4.7 | Acesso tipado ao IndexedDB | Apache-2.0 | Aceita, ADR-021 |
| fake-indexeddb 6.2.7 | IndexedDB em memória, só nos testes | Apache-2.0 | Aceita, ADR-021 |
| UUID gerado no cliente | ID da série e do treino e chave de idempotência, em UUID v7 com o pacote `uuid` 14.0.3 (`createClientId` em `apps/ui/src/features/workout/client-id.ts`, US-F03-02) | MIT | Aceita, ADR-014 |

## Dados guardados

Banco `heavy-duty`, versão 1, com quatro tabelas (`apps/ui/src/sync/local-db.ts`):

| Tabela local | Conteúdo | Quando sai |
|---|---|---|
| `pendingSets` | Item da fila: `kind` (`set`, `skip`, `finish`, `correction` ou `discard`), `seq` (ordem de registro), `id` único, treino, corpo do envio e horário da entrada. A linha sem `kind`, gravada antes da US-F03-04, é série. O exercício pulado tem o `id` `${workoutId}:skip:${plannedExerciseId}` o fim do treino tem o `id` `${workoutId}:finish` e a correção da série tem o `id` `${workoutId}:correction:${setId}`, com `setId` e corpo `{ loadG, reps }` ou `{ loadG, seconds }`. O descarte tem o `id` `${workoutId}:discard`, sem corpo | Quando a API confirma (200 ou 201; descarte: 200, 204 ou 404) ou recusa o item (série: 400, 409 ou 422; pulado, fim e correção: 400, 404, 409 ou 422; descarte: 400, 409 ou 422). O descarte do treino tira da fila todos os itens do treino |
| `rejectedSets` | Série que a API recusou por regra de domínio, com `code` e `message` | Quando o atleta toca em "Dispensar" |
| `activeWorkout` | Uma linha: o estado inteiro do treino em andamento (letra, posição, fase, fim do descanso, séries feitas, exercícios pulados em `skipped` com o instante do último pulo) e o instante da gravação | Quando o atleta toca em "Fechar", encerra ou descarta o treino, ou passadas 2 h desde a última gravação |
| `programCache` | Até quatro linhas, de tipos diferentes na mesma tabela: `today` (a última resposta 200 de `GET /api/today`), `windows` (a última resposta 200 de `GET /api/windows`, US-F07-02), `levels` (a última resposta 200 de `GET /api/levels`, US-F10-02) e `weekWindows` (a última resposta 200 de `GET /api/windows/week`, US-F15b-02). Sem sinal, a linha `weekWindows` só vale se o `from` dela for a segunda 00:00 da semana atual no fuso do aparelho; de outra semana, a tela fica sem a contagem, sem valor provisório (D77) | Quando a API devolve uma resposta 200 nova, em `signOut` e no 401 da rota da linha |

## Interfaces

| Direção | Com quem | O que trafega |
|---|---|---|
| Lê e grava | App web, no navegador | As tabelas acima |
| Envia, pelo app web | API, `POST /api/workouts/{id}/sets` | Séries da fila, em ordem, com o ID como chave de idempotência |
| Envia, pelo app web | API, `POST /api/workouts/{id}/skips` | O exercício que ficou de fora, depois das séries e antes do fim do mesmo treino, idempotente pelo par exercício do programa e instante (ADR-023) |
| Envia, pelo app web | API, `PATCH /api/workouts/{id}/sets/{setId}` | A correção de uma série, depois da série na fila, idempotente pelos valores absolutos (ADR-025) |
| Envia, pelo app web | API, `POST /api/workouts/{id}/finish` | O fim do treino, depois das séries e dos pulados do mesmo treino, idempotente pelo par instante e motivo (ADR-022) |
| Envia, pelo app web | API, `DELETE /api/workouts/{id}` | A remoção do treino descartado, depois do item do treino que estava em envio; o 404 conta como sucesso (ADR-032) |

## Regras que o código segue

1. A série entra na fila antes do envio, mesmo com rede. O envio direto sem fila perde a série se a requisição falhar.
2. O reenvio usa o mesmo ID. A API trata o ID repetido como a mesma série (US-F03-02).
3. A fila é enviada em ordem de registro, uma série por vez. Uma série que a API recusa por regra de domínio (400, 409 ou 422) sai da fila, vai para `rejectedSets` e aparece num aviso até o atleta dispensar. O app não reenvia a série recusada. As outras falhas (rede, tempo esgotado, 401, 403, 404, 408, 429 e 5xx) mantêm a série na fila e param a rodada.
4. A tela mostra quantas séries aguardam envio, sem bloquear o treino (`DESIGN.md`, princípio 4). O fim do treino, o pulado e a correção na fila não entram nessa conta.
5. Se o IndexedDB não abre ou uma gravação falha, a fila segue só em memória pelo resto da sessão, com o mesmo indicador.
6. O envio começa ao abrir o app, no evento `online`, na volta ao primeiro plano, depois de cada resposta 200 de `GET /api/today` e a cada 15 s enquanto houver série na fila. Não há Background Sync.
7. O fim do treino entra na fila depois das séries, no mesmo envio em ordem. A API que recusa o fim (400, 404, 409 ou 422) tira o fim da fila sem `rejectedSets` e sem aviso: o 404 é recusa porque as séries vão antes, e o fim preso travaria a fila (ADR-022). O encerrar sem série registrada não enfileira nada.
8. O exercício pulado que resta no fim do treino entra na fila entre as séries e o fim, um item por exercício, com o instante do último pulo. A API que recusa o pulado (400, 404, 409 ou 422) tira o pulado da fila sem `rejectedSets` e sem aviso, pela mesma razão do fim (ADR-023). O exercício pulado e feito depois não entra na fila. O encerrar sem série registrada não enfileira pulado.
9. A correção da última série entra na fila depois da série e nunca reescreve a série. Uma correção nova da mesma série substitui a pendente (`replace`) e vai para o fim da fila. Depois do envio, a fila só tira o item se o objeto enviado ainda é o do espelho; se uma correção nova o substituiu durante o envio, a nova segue na mesma rodada. A API que recusa a correção (400, 404, 409 ou 422) tira a correção da fila sem `rejectedSets` e sem aviso (ADR-025).
10. O descarte do treino em andamento tira da fila todos os itens do treino (série, pulado, correção e fim) e põe o item `discard` no fim, numa transação. O item que estava em envio termina, e o `discard` vem depois dele. A API que responde 200, 204 ou 404 tira o descarte da fila; a recusa (400, 409 ou 422) é silenciosa. O descarte sem série registrada não enfileira nada (ADR-032).
11. `signOut` apaga `programCache`, todas as linhas. A fila, as recusadas e o treino em andamento ficam, porque guardam séries que ainda precisam chegar à API (risco aceito, ADR-021).

A estratégia de sincronização e de conflito está na ADR-021: o servidor vence. A ADR-022 estende a fila com o fim do treino, e a ADR-023, com o exercício pulado. A ADR-032 acrescenta o descarte do treino em andamento.
