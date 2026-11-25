# ADR-036: Agendador dos avisos no processo da API

| Campo | Valor |
|---|---|
| Status | Aceita |
| Data | 2026-11-25 |
| Decisor | PO |
| Requisitos relacionados | F09, F17, US-F09-02, US-F17-01, US-F17-02, D31, D32, D74, D79 a D86, ADR-006, ADR-010, ADR-018, ADR-031 |

Elaborada com apoio de IA, a partir do plano da onda 7a aprovado pelo PO em 2026-11-25. Sujeita a revisão humana.

## Contexto

A US-F09-02 pede um aviso perto de a janela abrir, um perto de fechar, um por letra (D31), e um aviso antes de um grupo cair de nível. Todo aviso vai pelos dois canais, celular e e-mail (D32). Alguém precisa acordar na hora de cada aviso e decidir o que enviar.

Fatos do código que pesam na decisão (plano da onda 7a, Seção 1):

- O estado da janela e o instante da próxima queda já são derivados do histórico (ADR-010): `listActivityWindows` dá abertura e fechamento por grupo, e `listMuscleGroupLevels` dá o nível e `nextDropAt`. As letras do programa ativo, com os grupos principais, já existem em `today.repository.ts`.
- O agendador do backup (`system/backup/scheduler.ts`, ADR-018) é um molde pronto: `setInterval` de 60 s, estado derivado do banco a cada ciclo, fuso por `Intl` e `stop()` no `SIGTERM`. O `api.md` listava o `croner` como Proposta, sem uso.
- A API não tem fuso (D74), mas o texto "amanhã às 9h" e o horário de silêncio precisam de um. O precedente é o `BACKUP_TIME_ZONE`.
- A API roda num processo só (ADR-006), e o deploy recria o contêiner.

## Decisão

Um agendador dentro do processo da API calcula, a cada 60 s, os avisos devidos a partir do banco e envia cada aviso no máximo uma vez por canal. Detalhes que o código segue:

- **Ciclo sem estado na memória.** A cada 60 s, o agendador lê as janelas, os níveis e as letras do programa ativo e chama uma regra pura que devolve os avisos devidos no instante. Nenhuma fila nem temporizador por aviso fica na memória: o que sobrevive a um reinício está no banco.
- **Regras puras e parâmetros.** As regras dos avisos ficam em `modules/notifications/notices.rules.ts`, sem acesso a banco, rede ou relógio. As antecedências (D79) e o horário de silêncio (D80) ficam em `notices.config.ts`, como parâmetros versionados (ADR-010). O agrupamento por letra segue as decisões D82 a D84.
- **Chave única por aviso e canal.** A tabela `notifications` tem uma linha por aviso e canal, com uma chave única que identifica o aviso (tipo, letra ou grupo, e o instante do evento). O agendador grava a linha antes de enviar e registra o resultado depois (`sent`, `failed` ou `skipped`), com o motivo seguro da falha. A chave única impede o segundo envio do mesmo aviso.
- **No máximo um envio.** Não há nova tentativa. Se o processo parar entre a gravação e o envio, o aviso se perde. Na volta do servidor, o agendador envia só o aviso cujo evento ainda não chegou, fora do horário de silêncio, e descarta o resto (D86).
- **Canais independentes.** A falha de um canal não bloqueia o outro e fica registrada em `notifications` (D32, ADR-007).
- **Partida condicionada.** O agendador só parte se algum canal estiver configurado (ADR-035, ADR-037). O `server.ts` chama `stop()` no `SIGTERM`, como o backup.
- **Fuso.** O horário de silêncio e o texto dos avisos usam o fuso `NOTICE_TIME_ZONE`, padrão `America/Sao_Paulo` (D81). O resto da API continua em UTC, e a semana continua sem fuso até a onda 7b (D74).
- **Sem dependência nova.** O ciclo usa `setInterval`, como o agendador do backup; o `croner` sai da lista de tecnologias propostas.

## Consequências

- O aviso acompanha o histórico sem regra de cancelamento: o treino na janela muda o estado do grupo, e o aviso deixa de ser devido no ciclo seguinte.
- O agendador sobrevive a um redeploy, porque cada ciclo recalcula tudo do banco.
- O aviso pode chegar até 60 s depois do instante calculado [estimativa: o intervalo do ciclo].
- Uma queda do processo no meio de um envio perde aquele aviso; a tabela mostra a linha sem `sent`.
- O ciclo lê o banco a cada 60 s. Com um usuário e 11 grupos, o custo é baixo [estimativa: poucas consultas pequenas por ciclo].
- O CI não muda: o teste de fumaça não precisa de imagem nova, e os testes usam relógio e canais falsos.

## Alternativas consideradas

| Alternativa | Motivo da recusa |
|---|---|
| Contêiner próprio, como o do backup | Mais uma imagem e a mesma configuração dos canais em dois serviços; o agendador precisa das regras e dos repositórios da API |
| `croner` com um temporizador por aviso | Estado na memória, que se perde no redeploy e exige reconstrução e cancelamento a cada treino |
| Fila com novas tentativas | Aviso velho é ruído; a ADR-018 também não repete a execução que falhou |
| Envio pelo app web | O app web fechado não recebe evento; o aviso precisa sair do servidor |
