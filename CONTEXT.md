# Glossário do domínio

Termos do Heavy Duty, com o nome que cada termo tem no código. Use sempre o termo da coluna "Termo" na documentação e o da coluna "Código" no código. A coluna "Não usar" lista os sinônimos que causam confusão.

Os nomes da coluna "Código" são propostas até o scaffold da onda 1. Quem mudar um nome no código atualiza esta tabela no mesmo PR.

## Catálogo

| Termo | Definição | Código | Não usar |
|---|---|---|---|
| Grupo muscular | Conjunto de músculos que soma volume e progresso. O catálogo inicial tem 11: peito, costas, lombar, ombros, bíceps, tríceps, abdômen, quadríceps, posteriores de coxa, glúteos e panturrilhas | `MuscleGroup` | área, região, braço, perna, core |
| Músculo | Músculo ativado por um exercício. Cada músculo pertence a um grupo muscular | `Muscle` | — |
| Exercício | Movimento cadastrado, do tipo repetição ou tempo, que ativa um ou mais músculos principais e, opcionalmente, músculos secundários | `Exercise` | atividade, movimento |
| Músculo secundário | Músculo que o exercício ativa de forma auxiliar, como o tríceps no supino. Conta metade do volume para o grupo (proposta da Q08) | `secondaryMuscles` | sinergista |
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
| Esfriar | Estado do grupo muscular quando a janela passa sem treino. Enquanto esfria, o grupo perde nível aos poucos | `cooling` | zerar |
| Progresso | Barra por grupo muscular que cresce com o treino, mais dentro da janela, e esvazia enquanto o grupo esfria. Cheia, sobe o nível do grupo; vazia, o grupo cai um nível | `progress` | — |
| Volume ajustado | Volume corrigido pela base do objetivo do programa. Entra só no cálculo da janela | `adjustedVolume` | intensidade |
| Pontos | O que cada série rende, relativo ao plano: a série que bate o planejado vale 10; em dobro dentro da janela | `points` | XP, moedas |
| Nível | Degrau de 1 a 20 de cada grupo muscular, que mede a forma atual: sobe quando a barra de progresso enche e cai aos poucos quando o grupo esfria | `level` | rank |
| Nível geral | Nível do grupo mais fraco entre os que o programa treina | `overallLevel` | nível do atleta, média |
| Faixa | Grupo de níveis que define a forma e a cor do selo: círculo de bronze (1 a 4), escudo de prata (5 a 10), hexágono de ouro (11 a 16) e estrela violeta (17 a 20) | `tier` | liga, divisão |
| Melhor nível | Maior nível que um grupo já teve. Nunca se perde | `bestLevel` | recorde de nível |
| Memória muscular | Pontos em dobro para um grupo que está abaixo do melhor nível, até alcançá-lo de novo | `muscleMemory` | — |
| Aviso de queda | Aviso antes de um grupo esfriando cair de nível | `levelDropNotice` | — |
| Recorde | Maior carga de um exercício para um número de repetições | `personalRecord` | PR, marca |
| Medalha | Conquista por um marco; algumas ficam ocultas até a conquista | `medal` | troféu, badge, conquista |
| Ranking pessoal | Ordem dos treinos do PO por pontos, só contra o próprio histórico | `personalRanking` | placar, leaderboard |
| Sequência de semanas | Semanas seguidas com a meta semanal de janelas cumprida | `weekStreak` | streak, ofensiva |
| Meta semanal | Número de janelas a aproveitar na semana | `weeklyGoal` | — |
| Período | Ciclo de 12 semanas que termina com um retrato congelado | `Period` | temporada, ciclo |
| Retrato | Registro congelado do progresso ao fim de um período | `PeriodSnapshot` | relatório |
| Mapa do corpo | Visualização do estado das janelas por grupo muscular | `BodyMap` | — |
| Aviso | Notificação perto de a janela abrir ou fechar, ou antes de uma queda de nível. Vai pelos dois canais, celular e e-mail | `notification` | alerta, lembrete |
| Resumo semanal | E-mail semanal com janelas aproveitadas, níveis, recordes e medalhas | `weeklyDigest` | newsletter, relatório |

## Pessoas e canais

| Termo | Definição | Código | Não usar |
|---|---|---|---|
| PO | Dono do produto e único usuário | — | cliente |
| Atleta (P1) | Persona do PO na academia, usando o celular | — | usuário |
| Planejador (P2) | Persona do PO administrando o app pelo Claude e, depois do MVP, pelas telas de administração no Mac | — | admin |
| MCP | Model Context Protocol. Canal de administração do app pelo Claude | `mcp` | — |
| Onda | Grupo de features entregue em sequência, conforme o roadmap do PRD | — | sprint, release |
