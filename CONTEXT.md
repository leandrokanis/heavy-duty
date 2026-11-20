# Glossário do domínio

Termos do app de treino, com o nome que cada termo tem no código. Use sempre o termo da coluna "Termo" na documentação e o da coluna "Código" no código. A coluna "Não usar" lista os sinônimos que causam confusão.

Os nomes da coluna "Código" são propostas até o scaffold da onda 1. Quem mudar um nome no código atualiza esta tabela no mesmo PR.

## Catálogo

| Termo | Definição | Código | Não usar |
|---|---|---|---|
| Grupo muscular | Conjunto de músculos que soma volume e progresso. Exemplos: peito, braços, core | `MuscleGroup` | área, região |
| Músculo | Músculo ativado por um exercício. Cada músculo pertence a um grupo muscular | `Muscle` | — |
| Exercício | Movimento cadastrado, do tipo repetição ou tempo, que ativa um ou mais músculos | `Exercise` | atividade, movimento |
| Tipo de exercício | `repetição` (medido em repetições) ou `tempo` (medido em segundos) | `ExerciseKind = 'reps' \| 'time'` | modalidade |

## Programa

| Termo | Definição | Código | Não usar |
|---|---|---|---|
| Programa | Plano de treino com um objetivo e uma ou mais letras | `Program` | ficha, rotina, plano |
| Objetivo | Finalidade do programa, como hipertrofia. Define a janela-base | `Goal` | meta |
| Letra | Divisão do programa (A, B, C…) com a lista de exercícios de um dia de treino | `ProgramDay` | treino A, split |
| Exercício do programa | Exercício dentro de uma letra, com séries, alvo, carga e descanso | `PlannedExercise` | — |
| Alvo | Repetições (exercício de repetição) ou segundos (exercício de tempo) por série | `targetReps`, `targetSeconds` | — |
| Carga | Peso usado na série, em kg | `loadKg` | peso |
| Descanso | Intervalo planejado entre séries, em segundos | `restSeconds` | pausa, intervalo |

## Execução

| Termo | Definição | Código | Não usar |
|---|---|---|---|
| Treino | Sessão realizada de uma letra, com data e séries registradas | `Workout` | sessão, sessão de treino |
| Série | Execução registrada de um exercício, com carga e repetições ou tempo | `WorkoutSet` | set |
| Passo | Ação do atleta no fluxo da academia que pede um toque: registrar a série, pular o descanso | — | etapa |
| Ajuste por arrasto | Mudança de carga, repetições ou tempo por arrasto, em passos fixos, sem teclado | `dragAdjust` | slider |
| Histórico | Conjunto dos treinos registrados | `history` | log |
| Volume | Soma de carga × repetições por grupo muscular num intervalo. A fórmula para exercício de tempo está em aberto (Q07) | `volume` | — |

## Gamificação (ondas 5 a 7)

| Termo | Definição | Código | Não usar |
|---|---|---|---|
| Janela de atividade | Intervalo, por grupo muscular, em que treinar o grupo rende mais progresso. O app calcula a abertura e a duração | `ActivityWindow` | janela de treino |
| Esfriar | Estado do grupo muscular quando a janela passa sem treino. O grupo não perde progresso | `cooling` | perder, zerar |
| Progresso | Barra por grupo muscular que cresce com o treino, mais dentro da janela | `progress` | pontos, XP |
| Período | Ciclo de 12 semanas que termina com um retrato congelado | `Period` | temporada, ciclo |
| Retrato | Registro congelado do progresso ao fim de um período | `PeriodSnapshot` | relatório |
| Mapa do corpo | Visualização do estado das janelas por grupo muscular | `BodyMap` | — |
| Aviso | Notificação perto de a janela abrir ou fechar | `notification` | alerta, lembrete |

## Pessoas e canais

| Termo | Definição | Código | Não usar |
|---|---|---|---|
| PO | Dono do produto e único usuário | — | cliente |
| Atleta (P1) | Persona do PO na academia, usando o celular | — | usuário |
| Planejador (P2) | Persona do PO administrando o app pelo Claude e, depois do MVP, pelas telas de administração no Mac | — | admin |
| MCP | Model Context Protocol. Canal de administração do app pelo Claude | `mcp` | — |
| Onda | Grupo de features entregue em sequência, conforme o roadmap do PRD | — | sprint, release |
