# ADR-022: Fim do treino na fila de sincronização

| Campo | Valor |
|---|---|
| Status | Aceita |
| Data | 2026-11-21 |
| Decisor | PO, por delegação no plano do MVP |
| Requisitos relacionados | NFR06, H10, F03, US-F03-04, ADR-014, ADR-021 |

## Contexto

O atleta encerra o treino na academia, às vezes sem sinal (H10, Q09; `docs/prd.md`, Seções 4 e 9). A US-F03-04 acrescenta dois fins de treino: o último registro grava `completed` e a ação "Encerrar" grava `ended_early`. A regra 4 de `apps/ui/CLAUDE.md` proíbe o envio direto da tela. A ADR-021 define a fila de séries e classifica a resposta da API, mas só trata a série.

Fatos do projeto que a decisão usa:

- A tabela `pendingSets` tem `seq` autoincremental (ordem de registro) e índice único em `id` (ADR-021).
- A API cria o treino na primeira série (`docs/arquitetura/contratos.md`, "Séries do treino"). O fim só pode chegar depois de ao menos uma série gravada.
- As colunas `finished_at` e `end_reason` já existem em `workouts` (`docs/arquitetura/dados.md`) e esta story passa a gravá-las.
- A ADR-021 trata o 404 da série como reenvio, porque o treino pode ainda não existir no servidor.

## Decisão

O app guarda o fim do treino na mesma fila das séries, como outro tipo de item, e o envia depois das séries do mesmo treino. A ADR-021 continua valendo para as séries. Detalhes que o código segue:

- **Mesma tabela, sem versão nova do Dexie.** `pendingSets` ganha o discriminante `kind` (`set` ou `finish`). Os índices não mudam. A linha gravada pela versão anterior, sem `kind`, é lida como série.
- **ID determinístico.** O item de fim tem o ID `${workoutId}:finish`. O efeito da tela que roda duas vezes não enfileira dois fins, porque o índice único em `id` torna o segundo `add` inócuo. O ID não colide com o UUID v7 de uma série.
- **Ordem por `seq`.** O fim entra depois das séries do treino, então o envio em ordem entrega o fim depois delas.
- **Rota idempotente.** `POST /api/workouts/{workoutId}/finish` recebe `{ finishedAt, endReason }`. O reenvio com o mesmo instante e o mesmo motivo responde 200 sem mudar a linha. Outro par responde 409.
- **Classificação da resposta** (`postWorkoutFinish`):

| Resposta | Desfecho | Efeito |
|---|---|---|
| 200, 201 | `confirmed` | O fim sai da fila |
| 400, 404, 409, 422 | `rejected` | O fim sai da fila, sem ir para `rejectedSets` e sem aviso ao atleta |
| Rede, tempo esgotado, 401, 403, 408, 429, 5xx e qualquer outro status | `retry` | O fim fica; o envio da rodada para |

- **O 404 do fim é recusa.** Esta é a diferença em relação à ADR-021. As séries seguem antes do fim; se o treino ainda não existe depois delas, nenhuma série foi aceita. O reenvio nunca resolveria, e o fim preso travaria a fila.
- **Recusa silenciosa.** O atleta não tem como corrigir o fim recusado. O planejador corrige pelo MCP (US-F06-02).
- **Indicador conta só séries.** O fim pendente não aparece no indicador "N séries aguardando envio". Os gatilhos de envio olham a fila inteira, para o fim pendente ser reenviado.
- **Treino encerrado sem série.** Sem série registrada, o app não enfileira fim: o treino não existe no servidor.

## Consequências

- O atleta encerra o treino sem sinal, e o fim chega à API depois das séries quando a conexão volta.
- A API passa a gravar `finished_at` e `end_reason`. A leitura do treino terminado pelo MCP é das stories US-F06-01 e US-F06-02.
- O fim recusado some sem aviso. Um fim perdido deixa o treino sem `finished_at` no servidor até a correção pelo MCP.
- O fim com `finishedAt` no futuro distante é aceito, porque a regra recusa só o instante anterior ao início [a confirmar com o PO se a API deve limitar o futuro].
- A API não recusa série nova para treino já terminado (fora de escopo desta story).
- Quem lê `pendingSets` precisa tratar a ausência de `kind` como `set`.

## Alternativas consideradas

| Alternativa | Motivo da recusa |
|---|---|
| Enviar o fim direto da tela | Quebra a regra 4 de `apps/ui/CLAUDE.md` e perde o fim sem sinal |
| Tabela nova `pendingFinishes` | Perde a ordem entre tabelas; o fim poderia chegar antes das séries |
| Versão 2 do Dexie com tabela `pendingItems` | Exige migração sem ganho: os índices atuais bastam |
| UUID v7 novo para o ID do fim | O efeito que roda duas vezes enfileiraria dois fins |
| 404 do fim como reenvio, como na ADR-021 | Trava a fila quando todas as séries foram recusadas |
| `PUT` ou `PATCH` para gravar o fim | O 409 de fim diferente não cabe no `PUT`; o `PATCH` abriria a edição de outros campos |
