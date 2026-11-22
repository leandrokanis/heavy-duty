# ADR-025: Correção da série na fila de sincronização

| Campo | Valor |
|---|---|
| Status | Aceita |
| Data | 2026-11-21 |
| Decisor | PO, por delegação no plano do MVP |
| Requisitos relacionados | NFR06, F04, R06, US-F04-02, ADR-014, ADR-021, ADR-022, ADR-023 |

Elaborada com apoio de IA. Sujeita a revisão humana.

## Contexto

O arrasto impreciso grava carga ou medida errada na série registrada, e o atleta não tem como desfazer pelo celular (risco R06, `docs/prd.md`, Seção 9, F04, US-F04-02). A correção precisa valer no aparelho na hora e chegar à API, inclusive sem sinal. A regra 4 de `apps/ui/CLAUDE.md` proíbe o envio direto da tela. A ADR-021 define a fila de séries, a ADR-022 acrescenta o fim do treino e a ADR-023 acrescenta o exercício pulado. Nenhuma das três trata a troca de valores de uma série já registrada.

Fatos do projeto que a decisão usa:

- O `POST` da série é idempotente pelo ID da série. O reenvio com os mesmos valores responde 200, e o reenvio com valores diferentes responde 409 `workout_set_id_conflict` (`docs/arquitetura/contratos.md`, "Séries do treino").
- A tabela `pendingSets` tem `seq` autoincremental e índice único em `id` (ADR-021).
- A fila já trata o item que não é série como recusa silenciosa (ADR-022 e ADR-023).
- A série fica na fila até a API confirmar, então a correção pode nascer antes do envio da série.

## Decisão

O app envia a correção como quarto tipo de item da fila, depois do item da série, e nunca reescreve a série na fila. A ADR-021, a ADR-022 e a ADR-023 continuam valendo. Detalhes que o código segue:

- **Mesma tabela, sem versão nova do Dexie.** `pendingSets` ganha `kind: 'correction'`, com `setId` e corpo `{ loadG, reps }` ou `{ loadG, seconds }`. Os índices não mudam.
- **ID determinístico por série.** O item tem o ID `${workoutId}:correction:${setId}`. O ID não colide com o UUID v7 de uma série nem com `${workoutId}:finish` e `${workoutId}:skip:…`.
- **Item depois da série, série intacta.** A série sai da fila com os valores do registro e a correção vai logo depois, na ordem por `seq`. Reescrever a série na fila causaria 409 se uma resposta se perdesse depois de a API gravar.
- **Substituição.** Uma correção nova da mesma série troca a pendente e vai para o fim da fila (`replace` no `QueueStore`, numa transação no Dexie). A API recebe só os valores da última "Salvar".
- **Remoção por referência.** Depois do envio, a fila só tira o item se o objeto enviado ainda é o do espelho em memória. Se uma correção nova o substituiu durante o envio, a fila não chama `store.remove` e envia a nova na mesma rodada. A comparação por referência evita a colisão de `seq`, que recomeça quando a fila esvazia.
- **Rota idempotente.** `PATCH /api/workouts/{workoutId}/sets/{setId}` recebe `{ loadG, reps?, seconds? }` com valores absolutos e responde sempre 200 com a série. A rota mantém `id`, `workout_id`, `exercise_id`, `planned_exercise_id`, `set_number` e `performed_at`.
- **Treino terminado aceita a correção.** A correção da tela "Treino concluído" chega depois do fim, então a API não recusa série de treino já terminado.
- **Regras de valor do registro.** A rota usa os mesmos `code` do `POST` (`workout_set_load_invalid`, `workout_set_reps_invalid`, `workout_set_seconds_invalid` e `workout_set_measure_invalid`). A medida do tipo vem do exercício da série.
- **Classificação da resposta** (`patchWorkoutSet`):

| Resposta | Desfecho | Efeito |
|---|---|---|
| 200 | `confirmed` | A correção sai da fila |
| 400, 404, 409, 422 | `rejected` | A correção sai da fila, sem ir para `rejectedSets` e sem aviso ao atleta |
| Rede, tempo esgotado, 401, 403, 408, 429, 5xx e qualquer outro status | `retry` | A correção fica; o envio da rodada para |

- **Recusa silenciosa.** O 404 da correção é recusa, pela mesma razão do fim e do pulado: as séries seguem antes. O atleta não tem como corrigir a correção recusada, e o planejador corrige pelo MCP (US-F06-02).
- **Indicador conta só séries.** A correção pendente não entra no indicador "N séries aguardando envio".

## Consequências

- O atleta corrige a série sem sinal e a série chega com os valores do registro, seguida da correção.
- A API ganha uma rota `PATCH`, e `docs/arquitetura/openapi.json` passa a descrevê-la.
- A correção recusada some sem aviso. Uma correção perdida deixa a série com o valor errado na API até a correção pelo MCP.
- Quem lê `pendingSets` trata quatro valores de `kind`: `set`, `finish`, `skip` e `correction`.
- O `QueueStore` ganha o método `replace`. Quem implementa outro `QueueStore` implementa o método.

## Alternativas consideradas

| Alternativa | Motivo da recusa |
|---|---|
| Reescrever a série na fila com os valores corrigidos | O reenvio de uma série já gravada com valores diferentes recebe 409 |
| `PUT /api/workouts/{workoutId}/sets/{setId}` | O recurso inteiro (número, instante, exercício) não vai no corpo da correção |
| Tabela local nova `pendingCorrections` | Perde a ordem entre tabelas; a correção poderia chegar antes da série |
| UUID v7 novo para o ID da correção | O efeito da tela que roda duas vezes enfileiraria duas correções, e a correção nova não substituiria a pendente |
| Envio direto da tela, sem a fila | Falha sem sinal e viola a regra 4 de `apps/ui/CLAUDE.md` |
