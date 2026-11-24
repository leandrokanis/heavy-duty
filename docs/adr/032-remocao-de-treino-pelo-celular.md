# ADR-032: Remoção de treino pelo celular

| Campo | Valor |
|---|---|
| Status | Aceita |
| Data | 2026-11-23 |
| Decisor | PO, no plano da onda 4b (Seção 7, "ADR nova") |
| Requisitos relacionados | NFR06, F03, F20, US-F03-09, US-F20-02, D50, ADR-019, ADR-021, ADR-022, ADR-023, ADR-025, ADR-026 |

Elaborada com apoio de IA. Sujeita a revisão humana.

## Contexto

A onda 4b dá ao atleta duas formas de tirar um treino do histórico pelo celular: descartar o treino em andamento (US-F03-09) e apagar um treino do histórico (US-F20-02). Até aqui, só o planejador remove treino, pela ferramenta `remove_workout` do MCP (US-F06-02), com a confirmação em duas chamadas da ADR-026.

Fatos do projeto que a decisão usa:

- A API cria o treino na primeira série que chega (`docs/arquitetura/contratos.md`, "Séries do treino"). O treino em andamento pode existir só no aparelho, só na API ou nos dois, conforme o que a fila já enviou.
- A fila de envio manda um item por vez, em ordem de `seq`, e guarda séries, pulados, correções e o fim no mesmo `pendingSets` (ADR-021, ADR-022, ADR-023 e ADR-025).
- Uma série que estava em envio no momento do descarte chega à API depois e recria o treino, se nada vier depois dela.
- A ADR-026 existe porque o servidor do MCP não vê a conversa entre o PO e o Claude. No celular, a confirmação é uma folha da própria tela, que o atleta vê e toca.
- `deleteWorkout` (`apps/api/src/modules/workouts/workout.repository.ts`) já apaga o treino com as séries e os pulados, por `ON DELETE CASCADE`.

## Decisão

A API ganha a rota `DELETE /api/workouts/{workoutId}` para a sessão de acesso, sem o código de confirmação da ADR-026, e o descarte do treino em andamento segue pela fila de envio como quinto tipo de item, `discard`. A ADR-021, a ADR-022, a ADR-023 e a ADR-025 continuam valendo. Detalhes que o código segue:

- **Rota.** `DELETE /api/workouts/{workoutId}` apaga o treino com as séries e os pulados e responde 204 sem corpo. O treino que não existe responde 404 `workout_not_found`. A rota exige a sessão de acesso e a guarda de origem, como as outras rotas de escrita (ADR-019). A credencial do MCP não abre a rota.
- **Sem código de confirmação.** A confirmação é da tela: a folha de descartar e a folha de apagar pedem o toque explícito do atleta antes da chamada. A ADR-026 continua valendo só para o MCP.
- **Mesmo service para as duas stories.** A rota chama o service que confere a existência e apaga numa transação. O `remove_workout` do MCP continua com a prévia e o código.
- **Item `discard` na fila.** O descarte tem o ID `${workoutId}:discard` e não tem corpo. O ID não colide com o UUID v7 de uma série nem com os IDs do fim, do pulado e da correção.
- **Descarte tira o treino da fila.** Na confirmação, a fila tira todo item do `workoutId` (série, pulado, correção e fim) e põe o `discard` no fim, numa transação no Dexie. Depois, o app limpa o treino ativo do aparelho.
- **Item em envio.** O item do treino que estava em envio no momento do descarte termina o envio, e a fila não o tira de novo (a comparação por referência da ADR-025). O `discard` vem depois dele na ordem, então a API apaga o treino que esse item recriou.
- **Treino sem série.** Sem série registrada, o app não enfileira `discard`: o treino não existe no servidor. O app só limpa o treino ativo.
- **Classificação da resposta** (`deleteWorkout` do cliente):

| Resposta | Desfecho | Efeito |
|---|---|---|
| 200, 204, 404 | `confirmed` | O descarte sai da fila |
| 400, 409, 422 | `rejected` | O descarte sai da fila, sem ir para `rejectedSets` e sem aviso ao atleta |
| Rede, tempo esgotado, 401, 403, 408, 429, 5xx e qualquer outro status | `retry` | O descarte fica; o envio da rodada para |

- **O 404 do descarte é sucesso.** O treino talvez nunca tenha chegado ao servidor, e o efeito pedido (nenhum treino com esse ID) já vale.
- **Indicador conta só séries.** O descarte pendente não entra no indicador "N séries aguardando envio".
- **Apagar do histórico chama a rota direto.** O treino do histórico já está no servidor, e a tela só abre com conexão; a chamada não passa pela fila. A tela não oferece "Apagar treino" para o treino ativo do aparelho, cuja saída é o descarte: a fila recriaria o treino com a série seguinte.

## Consequências

- O atleta descarta o treino sem sinal, e a remoção chega à API depois do que já estava em envio.
- A API ganha uma rota `DELETE`, e `docs/arquitetura/openapi.json` passa a descrevê-la.
- Uma chamada com a sessão de acesso apaga um treino sem passo extra no servidor. O backup diário recupera um treino apagado por engano (ADR-018).
- Quem lê `pendingSets` trata cinco valores de `kind`: `set`, `finish`, `skip`, `correction` e `discard`.
- O `QueueStore` ganha o método `discardWorkout`. Quem implementa outro `QueueStore` implementa o método.

## Alternativas consideradas

| Alternativa | Motivo da recusa |
|---|---|
| Código de confirmação da ADR-026 também na rota HTTP | O código protege a conversa que o servidor do MCP não vê; no celular, a folha de confirmação já é o passo explícito, e a prévia pediria uma chamada a mais sem sinal |
| Enviar o descarte direto da tela, sem a fila | Falha sem sinal e corre com a série em envio, que recriaria o treino depois da remoção |
| Só tirar os itens da fila, sem item `discard` | O que a fila já enviou continua no servidor |
| Tabela local nova para os descartes | Perde a ordem entre tabelas; o descarte poderia chegar antes da série em envio |
| 404 do descarte como recusa | O desfecho é o mesmo, mas a recusa sugere falha; o efeito pedido já vale |
