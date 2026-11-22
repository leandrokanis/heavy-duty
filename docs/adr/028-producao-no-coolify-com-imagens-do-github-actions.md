# ADR-028: Produção no Coolify com imagens do GitHub Actions

| Campo | Valor |
|---|---|
| Status | Aceita |
| Data | 2026-11-22 |
| Decisor | PO |
| Requisitos relacionados | NFR02, NFR03, NFR04, D02, ADR-011, ADR-015, ADR-018, ADR-019, ADR-020 |

## Contexto

A ADR-015 decidiu a produção no kasparov com `compose.yaml` mais `compose.prod.yaml`, executados pelo PO no shell do servidor, e o túnel da Cloudflare com credencial em arquivo e o hostname como marcador num arquivo versionado (`infra/cloudflared/config.yml`). O repositório passou a ter remote no GitHub em 2026-11-22, e a integração contínua, que esperava o remote (`docs/qualidade.md`), passou a ser possível. As imagens de produção não tinham sido verificadas desde o scaffold.

Em 2026-11-22, o PO decidiu publicar o app no kasparov com o Coolify e verificar cada mudança no GitHub antes do deploy. Restrições que continuam: nenhuma porta do roteador aberta (NFR04); um domínio só, com roteamento por caminho (`docs/arquitetura/tunel.md`); o banco fora da pasta do código (`docs/arquitetura/banco-de-dados.md`, regra 7); a senha do restic em arquivo (ADR-018); HTTPS e `APP_ORIGIN` para a chave de acesso (ADR-019).

## Decisão

A produção no kasparov roda no Coolify, a partir de imagens que o GitHub Actions compila, testa e publica no GitHub Container Registry (GHCR), e o deploy só acontece depois do CI verde na `main`. Detalhes que a configuração segue:

- **CI.** O workflow `.github/workflows/ci.yml` roda em todo PR e todo push para `main` e `mvp`: `pnpm lint`, `pnpm typecheck`, `pnpm test`, `openapi:check`, `pnpm e2e`, a auditoria de dependências (`pnpm audit --prod --audit-level high`, que não bloqueia o deploy), o build das quatro imagens e um teste de fumaça da pilha de produção sem o túnel: `/api/health`, o manifesto do app web e o 401 do `/mcp`, pelo proxy, e o `restic` na imagem do backup.
- **Publicação e deploy.** Só o push na `main`, com o CI verde, publica as imagens `ghcr.io/leandrokanis/heavy-duty-api`, `-backup`, `-web` e `-proxy`, com as tags `sha-<commit>` e `main`. Depois, o job `deploy` chama o webhook de deploy do Coolify com um token de API, guardados nos segredos `COOLIFY_WEBHOOK` e `COOLIFY_TOKEN` do GitHub. O deploy automático do próprio Coolify fica desligado.
- **Pilha.** O arquivo `compose.coolify.yaml` descreve a pilha de produção num arquivo só, só com imagens, sem build no servidor: `api`, `backup`, `web`, `proxy` e `cloudflared`. Os serviços usam `pull_policy: always` e a tag `${IMAGE_TAG:-main}`. O rollback troca `IMAGE_TAG` por uma tag `sha-<commit>` publicada e refaz o deploy.
- **Roteamento.** A imagem `heavy-duty-proxy` leva o Caddy com o mesmo `infra/caddy/Caddyfile` do desenvolvimento, que roteia `/api/*`, `/mcp*` e `/.well-known/oauth-*` para a API e o resto para o app web.
- **Túnel.** O `cloudflared` roda dentro da pilha, com o token de um túnel gerenciado no painel da Cloudflare (`CLOUDFLARE_TUNNEL_TOKEN`). O hostname público do túnel aponta para `http://proxy:80`; os caminhos ficam versionados no `Caddyfile`. O app não usa domínio nem o proxy do Coolify.
- **Dados.** O banco, o repositório do restic e o arquivo da senha ficam em pastas do host, montadas por caminho absoluto (`HEAVY_DUTY_DATA_DIR`, `HEAVY_DUTY_BACKUP_DIR` e `HEAVY_DUTY_RESTIC_PASSWORD_FILE`), com dono UID 1000, fora da pasta do Coolify. Um redeploy não apaga os dados.
- **Segredos.** O token do túnel fica nas variáveis do recurso no Coolify; a senha do restic, num arquivo do host; o webhook e o token do Coolify, nos segredos do GitHub. Nenhum segredo entra no Git nem nas imagens.
- **Dependências do CI.** As actions ficam fixadas por commit, com a versão em comentário. O Dependabot propõe toda semana a atualização das dependências npm, das actions e das imagens base dos Dockerfiles.
- **O que sai.** O `compose.prod.yaml` e o `infra/cloudflared/config.yml` saem do repositório. Continuam como a ADR-015 decidiu: o Caddy como proxy do desenvolvimento, os Dockerfiles em estágios com a base `node:24.22.2-bookworm-slim` e o usuário `node`, e os nomes de imagem diferentes para desenvolvimento e produção.

## Consequências

- O deploy deixa de ser feito no shell: o PO faz o merge na `main`, e o pipeline publica. A imagem que roda no kasparov é a mesma que o CI testou.
- O GitHub precisa alcançar a API do Coolify por HTTPS para chamar o webhook [a confirmar: como o painel do Coolify do kasparov fica exposto, por exemplo por um hostname próprio no túnel].
- O kasparov precisa baixar as imagens do GHCR: os pacotes ficam públicos, como o repositório, ou o servidor faz login no GHCR com um token só de leitura. As imagens não guardam segredo.
- A tag `main` muda a cada deploy; a tag `sha-<commit>` fica para o rollback.
- O CI leva mais tempo com o e2e e o build das imagens [estimativa: de 15 a 25 minutos por push].
- Os comandos de operação (link de cadastro, revogação do MCP, backup sob demanda) rodam no terminal do contêiner no Coolify ou com `docker exec` no kasparov (`docs/arquitetura/implantacao.md`).
- A configuração inicial é tarefa manual do PO: criar as pastas do host, criar o túnel no painel da Cloudflare, criar o recurso no Coolify e cadastrar os segredos no GitHub (`docs/arquitetura/implantacao.md`).

## Alternativas consideradas

| Alternativa | Motivo da recusa |
|---|---|
| O Coolify compila as imagens no kasparov a partir do repositório | O build do Next.js pesa no servidor, e a imagem chega à produção sem o teste de fumaça do CI |
| Deploy automático do Coolify a cada push, pelo GitHub App | Publica mesmo com o CI vermelho |
| Roteamento por caminho com labels do Traefik do Coolify | Depende do formato de labels do Coolify e duplica o roteamento do `Caddyfile` |
| Túnel com arquivo de credencial e `config.yml` versionado (ADR-015) | O hostname ficaria como marcador num arquivo versionado, editado no servidor. Com o Caddy roteando os caminhos, o painel guarda só o hostname e o destino `http://proxy:80` |
| Publicar as portas 80 e 443 com o Traefik do Coolify e certificado do Let's Encrypt | Abre porta do roteador, contra o NFR04 |
| Manter o `compose.prod.yaml` ao lado do Coolify | Dois caminhos de produção para manter |

Esta ADR foi redigida com apoio de IA e decidida pelo PO. O comportamento do Coolify citado aqui (webhook de deploy, variáveis obrigatórias com `:?` e montagem por caminho absoluto) deve ser conferido na versão instalada no kasparov.
