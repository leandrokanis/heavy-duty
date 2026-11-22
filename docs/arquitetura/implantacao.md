# Implantação no kasparov

Este documento descreve como uma mudança chega à produção: o CI no GitHub, as imagens no GHCR e a pilha no Coolify do kasparov (ADR-028).

## Caminho de uma mudança

1. O push da branch da tarefa roda o workflow `.github/workflows/ci.yml`: lint, tipos, testes, contrato da API, e2e, auditoria de dependências, build das quatro imagens e teste de fumaça da pilha. Com os checks verdes, a tarefa entra na `dev` por merge fast-forward (`docs/convencoes/git.md`, Seção 5).
2. O PR da `dev` para a `main` roda o mesmo workflow. O merge na `main` roda de novo. Com tudo verde, o job `images` publica as imagens no GHCR com as tags `sha-<commit>` e `main`.
3. O job `deploy` chama o webhook de deploy do Coolify. O Coolify baixa as imagens da tag `main` e recria os contêineres.

O push na `dev` e em qualquer outra branch roda as verificações e o build, mas não publica nem faz deploy.

## Imagens

| Imagem | Dockerfile | Conteúdo |
|---|---|---|
| `ghcr.io/leandrokanis/heavy-duty-api` | `infra/docker/api.Dockerfile`, target `api` | API, servidor MCP e migrações, executadas na partida |
| `ghcr.io/leandrokanis/heavy-duty-backup` | `infra/docker/api.Dockerfile`, target `backup` | Agendador do backup com o restic (ADR-018) |
| `ghcr.io/leandrokanis/heavy-duty-web` | `infra/docker/web.Dockerfile` | App web (Next.js) |
| `ghcr.io/leandrokanis/heavy-duty-proxy` | `infra/docker/proxy.Dockerfile` | Caddy com o `infra/caddy/Caddyfile`, o mesmo do desenvolvimento |

## Pilha no Coolify

O recurso do Coolify é do tipo Docker Compose e usa o arquivo `compose.coolify.yaml`. O túnel da Cloudflare liga o hostname público ao serviço `proxy`, que roteia por caminho (`tunel.md`). Nenhum serviço publica porta no host.

| Serviço | Papel |
|---|---|
| `api` | API na porta 3001, com o banco em `HEAVY_DUTY_DATA_DIR` |
| `backup` | Backup diário para `HEAVY_DUTY_BACKUP_DIR`, com a senha do arquivo `HEAVY_DUTY_RESTIC_PASSWORD_FILE` |
| `web` | App web na porta 3000 |
| `proxy` | Roteamento por caminho na porta 80 |
| `cloudflared` | Túnel de saída até a Cloudflare |

## Variáveis do recurso no Coolify

| Variável | Uso | Padrão |
|---|---|---|
| `APP_ORIGIN` | Origem pública do app, em `https`. Obrigatória (ADR-019). Exemplo: `https://<HOSTNAME>` | — |
| `CLOUDFLARE_TUNNEL_TOKEN` | Token do túnel criado no painel da Cloudflare. Segredo. Exemplo: `<CLOUDFLARE_TUNNEL_TOKEN>` | — |
| `IMAGE_TAG` | Tag das imagens. Troque por `sha-<commit>` para voltar a uma versão anterior | `main` |
| `HEAVY_DUTY_DATA_DIR` | Pasta do banco no host, com dono UID 1000 | `/srv/heavy-duty/data` |
| `HEAVY_DUTY_BACKUP_DIR` | Pasta do repositório do restic no host, fora do disco principal, com dono UID 1000 | `/srv/heavy-duty/backup` |
| `HEAVY_DUTY_RESTIC_PASSWORD_FILE` | Arquivo da senha do restic no host, com dono UID 1000 e permissão `600` | `/srv/heavy-duty/secrets/restic-password` |
| `BACKUP_TIME_ZONE` | Fuso do horário diário do backup | `America/Sao_Paulo` |
| `BACKUP_DAILY_AT` | Horário local do backup, em `HH:mm` | `03:00` |

O `.env.example` ainda não lista estas variáveis: a inclusão é tarefa manual do PO.

## Segredos e configurações do GitHub

| Item | Onde | Uso |
|---|---|---|
| `COOLIFY_WEBHOOK` | Segredo do repositório | URL do webhook de deploy do recurso no Coolify |
| `COOLIFY_TOKEN` | Segredo do repositório | Token de API do Coolify, com permissão de deploy |
| Ambiente `production` | Environments do repositório | Agrupa o job `deploy`; aceita regra de aprovação, se o PO quiser |
| Branch padrão | Configurações gerais | `dev` |
| Proteção da `dev` | Branches do repositório | Exige os checks `Lint, types, tests and API contract`, `End-to-end tests` e `Production images` no commit enviado e histórico linear; bloqueia push forçado e remoção |
| Proteção da `main` | Branches do repositório | Exige PR e os checks `Lint, types, tests and API contract`, `End-to-end tests` e `Production images` antes do merge |
| Tipos de merge | Configurações gerais | Só merge commit; squash e rebase desligados |

## Configuração inicial

A configuração inicial é tarefa manual do PO, feita uma vez:

1. No kasparov, crie as pastas de `HEAVY_DUTY_DATA_DIR` e `HEAVY_DUTY_BACKUP_DIR` com dono UID 1000 e o arquivo da senha do restic com dono UID 1000 e permissão `600`. Guarde uma cópia da senha fora do kasparov.
2. No painel da Cloudflare, crie um túnel gerenciado pelo painel, com o hostname público apontando para `http://proxy:80`, e copie o token.
3. No Coolify, crie o recurso Docker Compose com o `compose.coolify.yaml`, preencha as variáveis da tabela acima e desligue o deploy automático. Copie a URL do webhook de deploy e crie um token de API.
4. No GitHub, cadastre os segredos `COOLIFY_WEBHOOK` e `COOLIFY_TOKEN`. Depois do primeiro push na `main`, deixe os pacotes do GHCR públicos ou faça login no GHCR no kasparov com um token só de leitura.
5. Crie o repositório do restic, como descreve `backup.md`, seção "Inicialização do repositório na produção".

## Operação

Os comandos abaixo rodam no terminal do contêiner, pelo Coolify, ou com `docker exec` no kasparov:

| Contêiner | Comando | Efeito |
|---|---|---|
| `api` | `node dist/modules/auth/enroll.js` | Imprime um link de cadastro de chave de acesso, válido por 15 minutos (ADR-019) |
| `api` | `node dist/modules/auth/revoke-mcp.js` | Revoga todas as autorizações do MCP (ADR-020) |
| `backup` | `node dist/modules/system/backup/run.js` | Executa o backup sob demanda |

## Verificação

- `GET https://<HOSTNAME>/api/health` responde 200 com `{"status":"ok","database":"up"}`.
- `GET https://<HOSTNAME>/` mostra a tela de entrada.
- O job `deploy` do workflow termina verde, e o Coolify mostra o deploy com a tag do commit.
- O `get_system_status`, pelo Claude, mostra a última execução do backup com situação `succeeded`.
