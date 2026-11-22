# Glossário do domínio

Termos do Heavy Duty, com o nome que cada termo tem no código. Use sempre o termo da coluna "Termo" na documentação e o da coluna "Código" no código. A coluna "Não usar" lista os sinônimos que causam confusão.

Os nomes da coluna "Código" são propostas até o scaffold da onda 1. Quem mudar um nome no código atualiza esta tabela no mesmo PR.

## Catálogo

| Termo | Definição | Código | Não usar |
|---|---|---|---|
| Grupo muscular | Conjunto de músculos que soma volume e progresso. O catálogo inicial tem 11: peito, costas, lombar, ombros, bíceps, tríceps, abdômen, quadríceps, posteriores de coxa, glúteos e panturrilhas | `MuscleGroup` | área, região, braço, perna, core |
| Músculo | Músculo ativado por um exercício. Cada músculo pertence a um grupo muscular | `Muscle` | — |
| Exercício | Movimento cadastrado, do tipo repetição ou tempo, que ativa um ou mais músculos principais e, opcionalmente, músculos secundários | `Exercise` | atividade, movimento |
| Músculo secundário | Músculo que o exercício ativa de forma auxiliar, como o tríceps no supino. Conta metade do volume para o grupo (proposta da Q08) | `role: 'secondary'`; na entrada do cadastro, `secondaryMuscleSlugs` | sinergista |
| Tipo de exercício | `repetição` (medido em repetições) ou `tempo` (medido em segundos) | `ExerciseKind = 'reps' \| 'time'` | modalidade |

## Programa

| Termo | Definição | Código | Não usar |
|---|---|---|---|
| Programa | Plano de treino com um objetivo e uma ou mais letras. Só um programa é o ativo por vez, e o programa criado passa a ser o ativo | `Program`, com `isActive` | ficha, rotina, plano |
| Objetivo | Finalidade do programa: força, hipertrofia ou resistência. Define a janela-base | `Goal = 'strength' \| 'hypertrophy' \| 'endurance'` | meta |
| Letra | Divisão do programa (A, B, C…) com a lista de exercícios de um dia de treino e um nome livre opcional, como "Superior" | `ProgramDay`, com `letter` e `label` | treino A, split |
| Exercício do programa | Exercício dentro de uma letra, com séries, alvo, carga e descanso | `PlannedExercise` | — |
| Alvo | Repetições (exercício de repetição) ou segundos (exercício de tempo) por série | `targetReps`, `targetSeconds` | — |
| Carga | Peso usado na série. Guardada e trafegada como inteiro em gramas; a tela mostra em kg | `loadG` | peso |
| Descanso | Intervalo planejado entre séries, em segundos | `restSeconds` | pausa, intervalo |

## Execução

| Termo | Definição | Código | Não usar |
|---|---|---|---|
| Treino | Sessão realizada de uma letra, com data e séries registradas. Guarda a letra treinada, que continua no treino mesmo se a letra sair do programa | `Workout` | sessão, sessão de treino, sessão de acesso |
| Treino do dia | Tela inicial do atleta: as letras do programa ativo, com a letra sugerida para hoje (a seguinte à do último treino do programa) e os valores preenchidos de cada exercício (carga do último treino ou do programa, alvo do programa) | `Today`, `today` | treino de hoje, rotina do dia |
| Série | Execução registrada de um exercício, com carga e repetições ou tempo | `WorkoutSet` | set |
| Sequência do treino | Lista dos exercícios da letra em andamento, na ordem do programa, com o estado de cada um (feito, atual ou por fazer). O toque no controle do topo da tela de treino abre a lista, e o toque num exercício por fazer leva a ele | `SequenceSheet`, `sequenceOf` | roteiro, fila de exercícios |
| Encerrar | Ação do atleta que termina o treino antes da última série, pelo botão da sequência do treino e com confirmação. Grava o motivo "encerrado antes" | `endReason: 'ended_early'` | abandonar, sair do treino |
| Fim do treino | Instante e motivo com que o treino terminou: na última série (`completed`) ou encerrado antes (`ended_early`). Segue para a API pela fila local, depois das séries | `finish`, `finishedAt`, `endReason` | conclusão, término |
| Exercício pulado | Exercício que o atleta deixou para depois com a ação "Pular". Pode ser feito depois; o que resta pulado no fim do treino fica de fora | `skipped` (estado), `skip` (ação), `WorkoutSkip` e `workout_skips` (API) | ignorar, descartar |
| Ficaram de fora | Exercícios pulados e não feitos, listados na tela de treino terminado | `leftOutOf`, `LeftOutSummary` | não feitos, restantes |
| Passo | Ação do atleta no fluxo da academia que pede um toque: registrar a série, pular o descanso | — | etapa |
| Correção da última série | Troca da carga e da medida da última série registrada, pela folha que o botão da série abre no descanso e no treino concluído. A série mantém o número e o instante; a correção segue pela fila de envio, depois da série | `correctLastSet` (ação), `CorrectionSheet` (folha), `kind: 'correction'` (fila) | edição, desfazer |
| Ajuste por arrasto | Mudança de carga, repetições ou tempo por arrasto, em passos fixos, sem teclado | `dragAdjust` | slider |
| Histórico | Conjunto dos treinos registrados | `history` | log |
| Fila de envio | Séries registradas no celular que aguardam a confirmação da API, guardadas no aparelho e enviadas em ordem de registro. A série que a API recusa por regra de domínio sai da fila e vira aviso | `pendingSets` | buffer, cache |
| Volume | Soma de carga × repetições por grupo muscular num intervalo. A fórmula para exercício de tempo está em aberto (Q07) | `volume` | — |

## Acesso

| Termo | Definição | Código | Não usar |
|---|---|---|---|
| Chave de acesso | Credencial do atleta para entrar no app: uma passkey (WebAuthn) guardada no celular, confirmada com biometria ou senha do aparelho. O app aceita mais de uma | `AuthCredential` | senha, passkey, credencial |
| Sessão de acesso | Período em que o navegador fica autenticado depois da entrada, no cookie `hd_session`. Vence com 30 dias sem uso | `AuthSession` | sessão, login, token |
| Link de cadastro | Link de uso único, válido por 15 minutos, que o PO gera no servidor com `auth:enroll` para cadastrar uma chave de acesso | `EnrollmentToken` | convite, link mágico |

"Sessão" sozinha não é termo do domínio: o treino é `Workout`, e a autenticação é a sessão de acesso.

## Operação

| Termo | Definição | Código | Não usar |
|---|---|---|---|
| Execução de backup | Uma tentativa do backup diário ou sob demanda, com início, fim, situação (`succeeded` ou `failed`), tamanho da cópia em bytes e motivo da falha. Fica na tabela `backup_runs` | `BackupRun` | job, rodada |
| Situação do app | O que o planejador consulta sobre a operação do app: a execução de backup mais recente, a última bem-sucedida e as recentes | `SystemStatus` | saúde, health |

## Gamificação (ondas 5 a 7)

| Termo | Definição | Código | Não usar |
|---|---|---|---|
| Janela de atividade | Intervalo, por grupo muscular, em que treinar o grupo rende mais progresso. O app calcula a abertura e a duração | `ActivityWindow` | janela de treino |
| Estado da janela | Situação atual da janela de um grupo muscular, pelo último treino do grupo: descansando (`resting`, antes da abertura), em janela (`open`), esfriando (`cooling`, desde o fechamento) ou sem janela (`none`, grupo nunca treinado) | `WindowState` | fase, status |
| Relação com a janela anterior | Posição de um treino do grupo em relação à janela do treino anterior do mesmo grupo: `first` (sem treino anterior), `early` (antes de abrir), `in_window` (aberta) ou `late` (depois de fechar) | `WindowRelation` | — |
| Desfecho da janela | O que aconteceu com a janela de um treino: `used` (o próximo treino caiu nela), `replaced` (o próximo treino veio antes de abrir), `missed` (fechou sem treino), `open` (aberta agora) ou `pending` (abre depois de agora) | `WindowOutcome` | — |
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
| Cliente do MCP | Programa que se registra no servidor de autorização do app para chamar o `/mcp`, como o conector do Claude. Declara um nome, que não é confiável; o host do endereço de retorno é o dado que vale | `OAuthClient` | conector, app |
| Autorização do MCP | Acesso que o PO aprovou para um cliente do MCP, com a sessão de acesso. Renova a credencial do MCP sem nova aprovação até ser revogada | `OAuthGrant` | permissão, consentimento |
| Credencial do MCP | Valor que o cliente do MCP manda em `Authorization: Bearer` para chamar o `/mcp`. Vale 1 hora; o banco guarda só o hash | `accessToken` | token do MCP, chave do MCP |
| Prévia | Resultado de uma ferramenta do MCP que mostra a mudança antes de aplicá-la, com `applied: false`. Não altera o histórico | `applied: false` | simulação, dry run |
| Código de confirmação | Texto de 32 caracteres hexadecimais que a prévia devolve e que o planejador repete para aplicar a mudança. Só vale para o mesmo pedido sobre o mesmo estado do treino | `confirmationCode` | token de confirmação |
| Onda | Grupo de features entregue em sequência, conforme o roadmap do PRD | — | sprint, release |
