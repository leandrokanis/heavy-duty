# ADR-041: Resumo semanal por e-mail

| Campo | Valor |
|---|---|
| Status | Aceita |
| Data | 2026-11-27 |
| Decisor | PO |
| Requisitos relacionados | F17, US-F17-03, D32, D80, D86, D88 a D91, D96, D106, D107, R09, ADR-007, ADR-036, ADR-037, ADR-039, ADR-040 |

Elaborada com apoio de IA, a partir do plano da onda 7b aprovado pelo PO em 2026-11-27. Sujeita a revisão humana.

## Contexto

A US-F17-03 pede um resumo semanal por e-mail, com as janelas aproveitadas, os níveis, os recordes e as medalhas da semana, "quando termina a semana" (`docs/prd.md`, Seção 9). O remetente segue a D88, e o horário e o conteúdo seguem a D106 e a D107.

Fatos do código e dos documentos que pesam na decisão (plano da onda 7b, Seção 1):

- O agendador dos avisos (ADR-036) já calcula o devido a cada 60 s, grava uma linha por aviso e canal em `notifications`, com chave única, e envia no máximo uma vez, sem nova tentativa.
- O canal de e-mail (ADR-037) já monta o e-mail atrás de `MailSender`, com o link de desligar e o token por e-mail. Com `email_enabled = false`, o canal registra `skipped`.
- `notifications.kind` tem `CHECK` com três valores, e `muscle_group_slugs` é `NOT NULL` (migração `0014_notifications`). O SQLite não altera `CHECK`: o resumo exige migração que recria a tabela.
- A semana do servidor nasce na onda 7b, no fuso `NOTICE_TIME_ZONE` (ADR-039, D96).
- O e-mail está desligado em produção até a configuração do SMTP (R09).

## Decisão

O agendador dos avisos manda, pelo canal de e-mail, um resumo da semana do período que terminou, na segunda-feira às 7h, registrado em `notifications` como mais um tipo de aviso. Detalhes que o código segue:

- **Tipo novo.** `notifications.kind` passa a aceitar `weekly_digest`, com a chave única `weekly_digest:<início da semana>` e só o canal `email`. A migração recria a tabela, preserva as linhas da onda 7a e deixa `muscle_group_slugs` opcional para o resumo.
- **Horário.** O resumo fica devido na segunda-feira às 7h, no fuso `NOTICE_TIME_ZONE`, com a semana do período que terminou (D96, D106). O horário fica fora do horário de silêncio (D80), sem adiantamento. Dia e hora ficam em `notices.config.ts`.
- **Recuperação de 24 h.** Com o servidor parado às 7h, o resumo sai na volta, até 24 h depois; depois disso, o ciclo descarta o resumo, sem nova tentativa (D86, ADR-036).
- **Só e-mail.** O resumo não sai por push: o PRD pede e-mail, e a tela Período mostra o mesmo conteúdo no app.
- **Conteúdo mínimo.** `weekly-digest.rules.ts`, puro, monta o conteúdo da semana com o mesmo recálculo do período e das medalhas (ADR-039, ADR-040): janelas aproveitadas e meta, janelas perdidas, pontos da semana, sequência de semanas, níveis que mudaram na semana, recordes só pelo nome do exercício e medalhas da semana, sem carga (D107, ADR-007). O e-mail tem assunto, texto e HTML, o botão "Abrir o app" e o link de desligar, com os cabeçalhos da ADR-037.
- **Canal desligado.** Sem `SMTP_HOST`, `MAIL_FROM` ou `MAIL_TO`, o canal de e-mail fica desligado e nenhuma linha do resumo é gravada; sem canal nenhum, o agendador nem parte (ADR-036). Com `email_enabled = false`, a linha fica `skipped`.
- **Prévia pelo Claude.** A ferramenta `get_weekly_digest`, só de leitura, mostra o conteúdo do resumo de uma semana sem enviar, para conferir o resumo sem o SMTP configurado.
- **Situação do app.** `get_system_status` e `GET /api/system/status` já contam o canal de e-mail; a falha do resumo aparece em `recentFailures`, com o `kind` `weekly_digest`.

## Consequências

- O resumo reusa o agendador, a tabela, o canal e o link de desligar da onda 7a, sem agendador novo.
- O código do resumo fica pronto com o canal desligado; a entrega real depende só da configuração do SMTP (R09).
- O conteúdo do resumo se confere por `get_weekly_digest`, sem servidor SMTP.
- O resumo de uma semana sai uma vez só, pela chave única. Uma queda do processo no meio do envio perde o resumo daquela semana (ADR-036).
- O treino de domingo à noite entra no resumo, porque a semana já terminou na segunda-feira.
- A migração recria `notifications`, e o teste da migração confere que as linhas da onda 7a ficam iguais.

## Alternativas consideradas

| Alternativa | Motivo da recusa |
|---|---|
| Domingo às 20h, como no protótipo v1 | O resumo sai antes do fim da semana e perde o treino de domingo à noite |
| Segunda-feira às 00:00 | Cai no horário de silêncio, e a D80 adiantaria o resumo para domingo às 21h, antes do fim da semana |
| Resumo também por push | O PRD pede o resumo por e-mail, e a tela Período já mostra o mesmo conteúdo no app |
| Agendador próprio para o resumo | Duplica o ciclo, o registro e o canal do agendador dos avisos (ADR-036) |
| Recordes com a carga | Contra o conteúdo mínimo do e-mail (ADR-007) |
| Tabela própria para o resumo | Duplica o registro por canal, a chave única e a situação do app, que `notifications` já tem |
