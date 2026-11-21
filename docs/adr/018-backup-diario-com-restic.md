# ADR-018: Backup diário com restic

| Campo | Valor |
|---|---|
| Status | Aceita |
| Data | 2026-11-21 |
| Decisor | PO, por delegação no plano do MVP |
| Requisitos relacionados | NFR01, NFR03, US-F14-02, ADR-005, ADR-015 |

## Contexto

O PRD pede backup automático e diário, fora do disco principal (NFR03, `docs/prd.md`, Seção 4). Os dados ficam no kasparov, sem serviço de terceiros (NFR01). O banco é um arquivo SQLite em modo WAL, e a cópia não pode copiar o arquivo com o banco aberto (ADR-005; `docs/arquitetura/backup.md`, regra 1). A cópia que sai do kasparov vai cifrada (`backup.md`, regra 3). O backup precisa funcionar com a API parada (`backup.md`, "Tecnologias"). A ADR-015 decidiu a produção com Docker Compose e recusou uma segunda forma de rodar o app. O `backup.md` anterior a esta ADR citava um timer do systemd, proposto antes da ADR-015. O destino físico fora do disco principal ainda não existe.

## Decisão

Um processo Node separado da API copia o banco com `VACUUM INTO` e envia a cópia, cifrada, a um repositório do restic, uma vez por dia. Detalhes que o código segue:

- A cópia usa `VACUUM INTO` para um arquivo novo numa pasta temporária. A instrução lê o banco numa transação só e, no modo WAL, não bloqueia a gravação da API.
- O envio executa `restic backup --stdin --stdin-filename heavy-duty.sqlite --host heavy-duty --tag <scheduled|manual> --json`, com a cópia na entrada padrão. O processo usa `spawn` com lista de argumentos, sem shell, e passa ao restic só `PATH`, `HOME`, `TMPDIR` e as variáveis `RESTIC_*`. O envio tem limite de 30 minutos.
- O repositório do restic é cifrado por senha. Na produção, a senha vem de arquivo (`RESTIC_PASSWORD_FILE`), montado só leitura a partir do host. No desenvolvimento, a senha vem de `RESTIC_PASSWORD`, com um valor marcado como inseguro.
- Um agendador em Node, no serviço `backup` do Compose, confere a cada 60 segundos se a execução do dia está pendente. O horário padrão é 03:00 de `BACKUP_TIME_ZONE` (padrão `America/Sao_Paulo` [a confirmar: fuso do PO]). Uma falha conta como a execução do dia, sem nova tentativa automática.
- O comando `pnpm --filter @heavy-duty/api backup:run` executa o backup sob demanda, com o mesmo registro.
- Cada execução grava uma linha em `backup_runs`, com sucesso ou falha. O processo do backup não executa migrações.
- A imagem do serviço sai do estágio `backup` de `infra/docker/api.Dockerfile`. O binário do restic vem da imagem oficial `restic/restic:0.18.1`, com o binário em `/usr/bin/restic` (conferido no build de 2026-11-21: `restic 0.18.1 compiled with go1.25.1`).
- O PO cria o repositório do restic à mão (`restic init`). O serviço de desenvolvimento cria o repositório local quando ele não existe.
- O backup não apaga cópias antigas. A política de retenção fica pendente.

## Consequências

- O backup roda com a API parada e usa a mesma definição de serviços da produção (ADR-015).
- O restic deduplica e cifra no destino. Um disco externo ou um servidor de terceiros não lê os dados (NFR01).
- Senha perdida torna as cópias irrecuperáveis. O PO guarda uma cópia da senha fora do kasparov.
- A escolha e a montagem do destino físico, o arquivo da senha e o `restic init` na produção são tarefas manuais do PO.
- O `docs/arquitetura/backup.md` deixa o timer do systemd e passa a descrever o serviço `backup` do Compose.
- O restic entra nas imagens como binário. Licença: BSD-2-Clause (arquivo `LICENSE` da tag `v0.18.1` do repositório `restic/restic`, lido em 2026-11-21), compatível com MIT.
- Sem retenção, o repositório cresce com o tempo [estimativa: poucos MB por dia antes da deduplicação, para um banco de um usuário].

## Alternativas consideradas

| Alternativa | Motivo da recusa |
|---|---|
| `db.backup()` do better-sqlite3 | API assíncrona, que reinicia a cópia quando outra conexão grava; `VACUUM INTO` faz a cópia numa instrução só |
| Cópia do arquivo do banco | Com o banco aberto em modo WAL, a cópia pode sair inconsistente (ADR-005) |
| Borg | Exige o Borg também no destino remoto; o restic aceita pasta local e vários destinos sem servidor próprio |
| rsync sem cifra | O destino leria os dados (`backup.md`, regra 3) |
| supercronic no contêiner | Mais um binário para uma regra que cabe numa função testável |
| cron ou timer do systemd no host | Segunda forma de rodar o app, recusada pela ADR-015 |
| ofelia | Contêiner extra com acesso ao socket do Docker |
| Criação automática do repositório na produção | Esconderia um destino errado ou não montado |
