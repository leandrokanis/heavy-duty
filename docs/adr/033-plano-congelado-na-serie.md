# ADR-033: Plano congelado na série

| Campo | Valor |
|---|---|
| Status | Aceita |
| Data | 2026-11-24 |
| Decisor | PO |
| Requisitos relacionados | F10, US-F10-01, US-F10-02, D41, D54, D57, ADR-010 |

Elaborada com apoio de IA, a partir do plano da onda 6a aprovado pelo PO em 2026-11-24. Sujeita a revisão humana.

## Contexto

Os pontos da série são relativos ao plano: a série que bate o planejado vale 10 (D41), e a razão entre o feito e o planejado usa a carga com as repetições, as repetições sozinhas ou os segundos (D57). O ganho do grupo também depende das séries planejadas do grupo na letra (D54).

Hoje a série não guarda o plano do momento:

- `workout_sets` tem só `planned_exercise_id`, com `ON DELETE SET NULL` (`apps/api/src/db/schema.ts`; `docs/arquitetura/dados.md`).
- A ferramenta `update_planned_exercise` altera a linha de `planned_exercises` no lugar (`apps/api/src/modules/programs/program.repository.ts`).
- Pela ADR-010, a API recalcula o jogo do histórico a cada leitura. Sem o plano na série, o recálculo usaria o plano atual: mudar o alvo pelo MCP mudaria os pontos e os níveis passados, e remover o exercício da letra deixaria a série sem plano.

A letra treinada já segue a mesma lógica: fica no treino mesmo se sair do programa (`workouts.letter`).

## Decisão

A série guarda o plano do momento do registro em três colunas novas de `workout_sets`: `planned_load_g`, `target_reps` e `target_seconds`. Detalhes que o código segue:

- **Gravação no registro.** A API lê o plano pelo `plannedExerciseId` da série e grava as três colunas na mesma transação do registro. O corpo do `POST /api/workouts/{workoutId}/sets` não muda.
- **Fato, não fórmula.** O plano da série é um fato do momento, como a carga e as repetições feitas. A ADR-010 continua: a fórmula dos pontos e do nível segue recalculável, e só a entrada da fórmula fica congelada.
- **Medida do tipo.** `target_reps` fica preenchido no exercício de repetição e `target_seconds` no exercício por tempo, com a mesma regra de exclusão de `planned_exercises`. `planned_load_g` é inteiro em gramas, maior ou igual a 0 (regra 3 do `CLAUDE.md`).
- **Correção não muda o plano.** A correção da última série (US-F04-02) e a ferramenta `update_workout_set` trocam só os valores executados; o plano da série fica como no registro.
- **Séries antigas.** A migração preenche as séries já gravadas com o plano atual do exercício do programa. A série sem plano (exercício removido da letra, `planned_exercise_id` nulo) fica com as colunas nulas, e a regra do jogo trata a série sem plano como razão 1.
- **Migração.** As colunas entram na migração da US-F10-01 (`0010_workout_sets_plan.sql`, nome provisório), com o modelo em `docs/arquitetura/dados.md`.

## Consequências

- Editar o programa pelo MCP não muda pontos nem níveis passados.
- A regra do jogo recebe da série tudo o que precisa: o feito e o planejado.
- O preenchimento das séries antigas usa o plano atual, que pode ser diferente do plano do dia do registro. O erro fica só nas séries gravadas antes da migração.
- A série guarda dados repetidos do programa. O custo de espaço é pequeno com um usuário só.

## Alternativas consideradas

| Alternativa | Motivo da recusa |
|---|---|
| Usar o plano atual no recálculo | Mudar o alvo ou remover o exercício da letra mudaria os pontos e os níveis passados |
| Versionar `planned_exercises` (nova linha a cada mudança) | Mais tabelas e consultas para o mesmo efeito; a série já é o registro dos fatos |
| Guardar os pontos calculados na série | Contradiz a ADR-010: uma mudança de parâmetro exigiria migrar os pontos |
