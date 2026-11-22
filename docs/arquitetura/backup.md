# Contêiner: backup

| Campo | Valor |
|---|---|
| Nível C4 | 2, contêiner |
| Pasta | `apps/api/src/modules/system/backup/`, com a configuração em `apps/api/src/config/backup-env.ts` |
| Onde roda | Serviço `backup` do Docker Compose no kasparov, processo Node de longa duração separado da API |
| ADRs | ADR-005, ADR-018, ADR-028 |
| Ondas | 1 |

## Responsabilidade

- Copiar o banco uma vez por dia, sem parar a API (NFR03, US-F14-02).
- Levar a cópia, cifrada, para fora do disco principal.
- Registrar o resultado de cada execução em `backup_runs`, com início, fim, tamanho e motivo da falha, para o MCP (`get_system_status`) e, depois do MVP, para a tela Sistema.

## Tecnologias

| Tecnologia | Uso | Licença | Estado |
|---|---|---|---|
| Node.js 24 e better-sqlite3 | Cópia consistente com `VACUUM INTO` e registro em `backup_runs` | MIT | Aceita, ADR-005 e ADR-018 |
| restic 0.18.1 | Envio da cópia ao repositório cifrado, com deduplicação | BSD-2-Clause (arquivo `LICENSE` da tag `v0.18.1` de `restic/restic`) | Aceita, ADR-018 |
| Docker Compose e Coolify | Agendador sempre ativo no serviço `backup` da pilha `compose.coolify.yaml` | Apache-2.0 | Aceita, ADR-028 |

O backup roda como processo separado, e não dentro da API, para funcionar mesmo com a API parada. O binário do restic vem da imagem oficial `restic/restic:0.18.1`, em `/usr/bin/restic`, conferida no build de 2026-11-21.

## Interfaces

| Direção | Com quem | Como |
|---|---|---|
| Lê | Banco de dados | `VACUUM INTO` para um arquivo numa pasta temporária |
| Grava | Banco de dados, tabela `backup_runs` | Uma linha por execução, no fim, com sucesso ou falha |
| Envia | Destino do backup | `restic backup --stdin`, com a cópia na entrada padrão |

## Execução

1. O agendador confere a cada 60 segundos se a execução do dia está pendente. A execução fica pendente quando a hora local passou de `BACKUP_DAILY_AT` e nenhuma execução começou depois desse horário, no mesmo dia local de `BACKUP_TIME_ZONE`.
2. O job copia o banco com `VACUUM INTO` para `heavy-duty.sqlite`, numa pasta temporária nova.
3. O job envia a cópia ao restic com `restic backup --stdin --stdin-filename heavy-duty.sqlite --host heavy-duty --tag <scheduled|manual> --json`.
4. O job grava a execução em `backup_runs` e apaga a pasta temporária, com sucesso ou falha.

Uma falha conta como a execução do dia: o agendador não tenta de novo no mesmo dia. O PO vê a falha pelo MCP e executa o backup sob demanda. A execução sob demanda depois do horário também conta como a do dia.

## Comandos

```sh
pnpm --filter @heavy-duty/api backup:run                 # executa o backup uma vez; código 0 no sucesso, 1 na falha
pnpm --filter @heavy-duty/api backup:scheduler           # inicia o agendador diário; encerra no SIGTERM
pnpm --filter @heavy-duty/api backup:verify <arquivo>    # confere um banco restaurado; código 0 ou 1
```

No ambiente de desenvolvimento, o serviço `backup` fica no profile `backup`:

```sh
docker compose --profile backup up -d backup                                        # sobe o agendador e cria o repositório local
docker compose exec backup pnpm --filter @heavy-duty/api backup:run                 # executa o backup sob demanda
docker compose --profile backup run --rm backup pnpm --filter @heavy-duty/api exec vitest run src/modules/system/backup/restic-store.integration.spec.ts
docker compose --profile backup down                                                # encerra os serviços
```

## Variáveis de ambiente

| Variável | Uso | Padrão |
|---|---|---|
| `DATABASE_PATH` | Arquivo do banco. Obrigatória em produção, com a mesma regra da API | `data/heavy-duty.dev.sqlite` fora de produção |
| `RESTIC_REPOSITORY` | Repositório do restic. Exemplo: `<RESTIC_REPOSITORY>` | `/backup/restic` no `compose.coolify.yaml` |
| `RESTIC_PASSWORD_FILE` | Arquivo com a senha do repositório, montado só leitura. Use na produção | — |
| `RESTIC_PASSWORD` | Senha do repositório em texto. Use só no desenvolvimento. Exemplo: `<RESTIC_PASSWORD>` | — |
| `RESTIC_BINARY` | Executável do restic | `restic` |
| `BACKUP_TIME_ZONE` | Fuso do horário diário, no formato IANA | `America/Sao_Paulo` [a confirmar: fuso do PO] |
| `BACKUP_DAILY_AT` | Horário local da execução diária, em `HH:mm` | `03:00` |
| `HEAVY_DUTY_BACKUP_DIR` | Pasta do host montada em `/backup` na produção | `/srv/heavy-duty/backup` |
| `HEAVY_DUTY_RESTIC_PASSWORD_FILE` | Arquivo da senha no host, montado em `/run/secrets/restic-password` na produção | `/srv/heavy-duty/secrets/restic-password` |

O processo exige `RESTIC_REPOSITORY` e exatamente uma entre `RESTIC_PASSWORD_FILE` e `RESTIC_PASSWORD`. A mensagem de erro da configuração cita o nome da variável e nunca o valor. A API não lê as variáveis do restic. O restic recebe só `PATH`, `HOME`, `TMPDIR` e as variáveis `RESTIC_*`.

No desenvolvimento, o `compose.yaml` usa um repositório no volume `backup-dev-repo` e uma senha fixa, marcada como insegura e só para desenvolvimento. O `.env.example` ainda não lista as variáveis do backup: a inclusão é uma tarefa manual.

## Inicialização do repositório na produção

O backup não cria o repositório na produção. Um repositório inexistente vira uma falha registrada. O PO executa os passos uma vez, no kasparov, dentro da configuração inicial de `implantacao.md`. Os comandos usam os caminhos padrão das variáveis; troque se o recurso no Coolify usar outros.

1. Monte o destino fora do disco principal na pasta de `HEAVY_DUTY_BACKUP_DIR`, com dono UID 1000, o usuário `node` da imagem.
2. Crie o arquivo da senha em `HEAVY_DUTY_RESTIC_PASSWORD_FILE`, com dono UID 1000 e permissão `600`. Guarde uma cópia da senha fora do kasparov: sem a senha, as cópias ficam irrecuperáveis.
3. Crie o repositório com a imagem do backup:

   ```sh
   docker run --rm \
     -v /srv/heavy-duty/backup:/backup \
     -v /srv/heavy-duty/secrets/restic-password:/run/secrets/restic-password:ro \
     -e RESTIC_REPOSITORY=/backup/restic -e RESTIC_PASSWORD_FILE=/run/secrets/restic-password \
     ghcr.io/leandrokanis/heavy-duty-backup:main restic init
   ```

4. Faça o deploy do recurso no Coolify, que sobe o serviço `backup`.
5. No terminal do contêiner `backup`, execute `node dist/modules/system/backup/run.js` e confira `get_system_status` pelo Claude.

## Restauração

O PO restaura o banco com a API parada:

1. Pare o recurso no Coolify.
2. Crie a pasta `/tmp/heavy-duty-restore` no host, com dono UID 1000. Restaure a cópia mais recente nessa pasta:

   ```sh
   docker run --rm \
     -v /srv/heavy-duty/backup:/backup \
     -v /srv/heavy-duty/secrets/restic-password:/run/secrets/restic-password:ro \
     -v /tmp/heavy-duty-restore:/restore \
     -e RESTIC_REPOSITORY=/backup/restic -e RESTIC_PASSWORD_FILE=/run/secrets/restic-password \
     ghcr.io/leandrokanis/heavy-duty-backup:main restic restore latest --target /restore
   ```

3. Confira o arquivo restaurado:

   ```sh
   docker run --rm -v /tmp/heavy-duty-restore:/restore \
     ghcr.io/leandrokanis/heavy-duty-backup:main node dist/modules/system/backup/verify.js /restore/heavy-duty.sqlite
   ```

4. Com o código 0, guarde o banco atual com outro nome e copie `heavy-duty.sqlite` restaurado para a pasta de `HEAVY_DUTY_DATA_DIR`. Apague os arquivos `-wal` e `-shm` do banco antigo.
5. Inicie o recurso no Coolify.

O teste automatizado `restic-store.integration.spec.ts` faz o mesmo caminho com o restic real, dentro do contêiner de desenvolvimento. O primeiro teste de restauração real no kasparov é uma tarefa manual do PO.

## Regras que o código segue

1. A cópia usa `VACUUM INTO`, com o caminho como parâmetro ligado, nunca a cópia do arquivo com o banco aberto (ADR-005, ADR-018).
2. Toda execução grava o resultado, inclusive a falha, com o motivo (cenário "falha no backup" da F14). Sem a tabela `backup_runs` ou sem o arquivo do banco, o motivo vai para o log e o processo termina com código 1. O backup não executa migrações.
3. A cópia que sai do kasparov vai cifrada pelo restic, para o destino não ler os dados (NFR01).
4. A restauração segue o roteiro desta página, testado pelo teste de integração antes do fim da onda 1.
5. O motivo da falha começa pela etapa em inglês (`snapshot failed`, `offsite copy failed`) e traz a última linha da saída de erro. O texto não tem caractere de controle, troca a senha conhecida e a credencial em URL (`://usuário:senha@`) por `***` e tem no máximo 500 caracteres.
6. O processo chama o restic com `spawn` e lista de argumentos, sem shell, e com limite de 30 minutos. No limite, o processo encerra o restic e registra `offsite copy failed: backup tool timed out`.

## Limites conhecidos

- O backup não apaga cópias antigas. A política de retenção fica pendente.
- O restic trava o repositório durante o envio. Uma execução sob demanda no mesmo minuto da agendada falha com o motivo da trava, e a falha fica registrada.
- O destino físico fora do disco principal ainda não está escolhido nem montado.
