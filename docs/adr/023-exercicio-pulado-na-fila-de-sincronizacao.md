# ADR-023: Exercício pulado na fila de sincronização

| Campo | Valor |
|---|---|
| Status | Aceita |
| Data | 2026-11-21 |
| Decisor | PO, por delegação no plano do MVP |
| Requisitos relacionados | NFR06, F03, US-F03-05, ADR-014, ADR-021, ADR-022 |

Elaborada com apoio de IA. Sujeita a revisão humana.

## Contexto

O atleta pula um exercício na academia, às vezes sem sinal (`docs/prd.md`, Seção 9, F03, US-F03-05). O exercício que fica de fora precisa chegar à API para o histórico saber o que o treino não cobriu. A regra 4 de `apps/ui/CLAUDE.md` proíbe o envio direto da tela. A ADR-021 define a fila de séries e a ADR-022 acrescenta o fim do treino como segundo tipo de item. Nenhuma das duas trata o exercício pulado.

Fatos do projeto que a decisão usa:

- A tabela `pendingSets` tem `seq` autoincremental e índice único em `id` (ADR-021).
- A ADR-022 já distingue o tipo do item por `kind` e trata o 404 do fim como recusa, porque as séries vão antes (`docs/adr/022-fim-do-treino-na-fila-de-sincronizacao.md`).
- O pulo pode ser desfeito: o atleta pode voltar ao exercício e registrar uma série (spec da US-F03-05, FR-010). Só o que resta pulado no fim do treino vale para o servidor.

## Decisão

O app envia só o exercício que ficou de fora no fim do treino, como terceiro tipo de item da fila, entre as séries e o fim. A ADR-021 e a ADR-022 continuam valendo. Detalhes que o código segue:

- **Mesma tabela, sem versão nova do Dexie.** `pendingSets` ganha `kind: 'skip'`, com corpo `{ plannedExerciseId, skippedAt }`. Os índices não mudam.
- **Instante do último pulo.** O corpo leva o instante do pulo que valeu, o mais recente do exercício.
- **ID determinístico.** O item tem o ID `${workoutId}:skip:${plannedExerciseId}`. O efeito da tela que roda duas vezes não enfileira dois itens. O ID não colide com o UUID v7 de uma série nem com `${workoutId}:finish`.
- **Ordem por `seq`.** Entram as séries novas, os pulados e o fim, nessa ordem, então o envio em ordem entrega o pulado depois das séries e antes do fim.
- **Rota idempotente.** `POST /api/workouts/{workoutId}/skips` recebe `{ plannedExerciseId, skippedAt }`. Responde 201 na gravação e 200 no reenvio com o mesmo instante; outro instante responde 409.
- **Classificação da resposta** (`postWorkoutSkip`):

| Resposta | Desfecho | Efeito |
|---|---|---|
| 200, 201 | `confirmed` | O pulado sai da fila |
| 400, 404, 409, 422 | `rejected` | O pulado sai da fila, sem ir para `rejectedSets` e sem aviso ao atleta |
| Rede, tempo esgotado, 401, 403, 408, 429, 5xx e qualquer outro status | `retry` | O pulado fica; o envio da rodada para |

- **O 404 do pulado é recusa**, pela mesma razão do fim: as séries seguem antes; se o treino não existe depois delas, nenhuma série foi aceita.
- **Recusa silenciosa.** O atleta não tem como corrigir o pulado recusado. O planejador corrige pelo MCP (US-F06-02).
- **Indicador conta só séries.** O pulado pendente não entra no indicador "N séries aguardando envio".
- **Treino sem série.** Sem série registrada, o app não enfileira pulado nem fim: o treino não existe no servidor.

## Consequências

- O atleta termina o treino sem sinal e o pulado chega depois das séries, antes do fim, quando a conexão volta.
- A API passa a gravar `workout_skips`, com chave `(workout_id, exercise_id)`.
- O pulado recusado some sem aviso. Um pulado perdido deixa o histórico sem o registro até a correção pelo MCP.
- A API não recusa pulado de treino já terminado, porque a fila manda o pulado antes do fim [a confirmar com o PO se a API deve recusar].
- Quem lê `pendingSets` trata três valores de `kind`: `set`, `finish` e `skip`.

## Alternativas consideradas

| Alternativa | Motivo da recusa |
|---|---|
| Enviar o pulado no momento do pulo e remover se o atleta fizer o exercício depois | Exige remoção no servidor e perde o pulado sem sinal se a ordem de envio mudar |
| Levar os pulados dentro do corpo do fim | Mistura dois fatos no mesmo item; um fim recusado perderia os pulados |
| Tabela local nova `pendingSkips` | Perde a ordem entre tabelas; o pulado poderia chegar antes das séries |
| UUID v7 novo para o ID do pulado | O efeito que roda duas vezes enfileiraria dois itens |
| `PUT /api/workouts/{id}/skips/{plannedExerciseId}` | O 409 de instante diferente não cabe no `PUT`; o formato difere da rota das séries |
