# Contêiner: armazenamento local

| Campo | Valor |
|---|---|
| Nível C4 | 2, contêiner (armazenamento de dados) |
| Pasta | `apps/ui/src/sync/` |
| Onde roda | IndexedDB do navegador do celular |
| ADRs | ADR-009, ADR-021, ADR-022 |
| Ondas | 3 em diante |

## Responsabilidade

- Guardar a série registrada até a API confirmar o recebimento (US-F03-03).
- Guardar o fim do treino, depois das séries do mesmo treino, até a API confirmar ou recusar (US-F03-04).
- Guardar o treino do dia em andamento, para o fluxo continuar se o app fechar ou a rede cair.
- Guardar uma cópia da resposta de `GET /api/today` (programa e valores do último treino), para o treino abrir sem sinal.

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
| `pendingSets` | Item da fila: `kind` (`set` ou `finish`), `seq` (ordem de registro), `id` único, treino, corpo do envio e horário da entrada. A linha sem `kind`, gravada antes da US-F03-04, é série. O fim do treino tem o `id` `${workoutId}:finish` | Quando a API confirma (200 ou 201) ou recusa o item (série: 400, 409 ou 422; fim: 400, 404, 409 ou 422) |
| `rejectedSets` | Série que a API recusou por regra de domínio, com `code` e `message` | Quando o atleta toca em "Dispensar" |
| `activeWorkout` | Uma linha: o estado inteiro do treino em andamento (letra, posição, fase, fim do descanso, séries feitas) e o instante da gravação | Quando o atleta toca em "Fechar" ou passadas 2 h desde a última gravação |
| `programCache` | Uma linha: a última resposta 200 de `GET /api/today` | Quando a API devolve uma resposta 200 nova, em `signOut` e no 401 de `GET /api/today` |

## Interfaces

| Direção | Com quem | O que trafega |
|---|---|---|
| Lê e grava | App web, no navegador | As tabelas acima |
| Envia, pelo app web | API, `POST /api/workouts/{id}/sets` | Séries da fila, em ordem, com o ID como chave de idempotência |
| Envia, pelo app web | API, `POST /api/workouts/{id}/finish` | O fim do treino, depois das séries do mesmo treino, idempotente pelo par instante e motivo (ADR-022) |

## Regras que o código segue

1. A série entra na fila antes do envio, mesmo com rede. O envio direto sem fila perde a série se a requisição falhar.
2. O reenvio usa o mesmo ID. A API trata o ID repetido como a mesma série (US-F03-02).
3. A fila é enviada em ordem de registro, uma série por vez. Uma série que a API recusa por regra de domínio (400, 409 ou 422) sai da fila, vai para `rejectedSets` e aparece num aviso até o atleta dispensar. O app não reenvia a série recusada. As outras falhas (rede, tempo esgotado, 401, 403, 404, 408, 429 e 5xx) mantêm a série na fila e param a rodada.
4. A tela mostra quantas séries aguardam envio, sem bloquear o treino (`DESIGN.md`, princípio 4). O fim do treino na fila não entra nessa conta.
5. Se o IndexedDB não abre ou uma gravação falha, a fila segue só em memória pelo resto da sessão, com o mesmo indicador.
6. O envio começa ao abrir o app, no evento `online`, na volta ao primeiro plano, depois de cada resposta 200 de `GET /api/today` e a cada 15 s enquanto houver série na fila. Não há Background Sync.
7. O fim do treino entra na fila depois das séries, no mesmo envio em ordem. A API que recusa o fim (400, 404, 409 ou 422) tira o fim da fila sem `rejectedSets` e sem aviso: o 404 é recusa porque as séries vão antes, e o fim preso travaria a fila (ADR-022). O encerrar sem série registrada não enfileira nada.
8. `signOut` apaga `programCache`. A fila, as recusadas e o treino em andamento ficam, porque guardam séries que ainda precisam chegar à API (risco aceito, ADR-021).

A estratégia de sincronização e de conflito está na ADR-021: o servidor vence. A ADR-022 estende a fila com o fim do treino.
