# ADR-015: Empacotamento de produção com Docker Compose e cloudflared

| Campo | Valor |
|---|---|
| Status | Aceita |
| Data | 2026-11-21 |
| Decisor | PO, por delegação no plano do MVP |
| Requisitos relacionados | NFR04, D02, ADR-011, EN-S0 (FR-035, FR-039, FR-040) |

## Contexto

A ADR-011 decidiu o ambiente de desenvolvimento com Docker Compose e deixou para o scaffold duas escolhas: a ferramenta do proxy de desenvolvimento e o empacotamento de produção no kasparov. Em produção, o túnel da Cloudflare publica o app sem abrir porta no roteador (NFR04) e roteia por caminho: `/api/*` e `/mcp` para a API, o resto para o app web (`docs/arquitetura/tunel.md`). O roteamento precisa ficar versionado, sem a credencial do túnel (`docs/arquitetura/tunel.md`, regra 2).

## Decisão

A produção no kasparov sobe com Docker Compose, a partir do mesmo `compose.yaml` do desenvolvimento e de um arquivo `compose.prod.yaml` que acrescenta o `cloudflared`. Detalhes que a configuração segue:

- O proxy de desenvolvimento é o Caddy (`caddy:2.11.7-alpine`, Apache-2.0), com a configuração em `infra/caddy/Caddyfile`. O Caddy roteia `/api/*` e `/mcp*` para `api:3001` e o resto para `web:3000`. Só o proxy publica porta no host, em `127.0.0.1:${PROXY_PORT:-8080}`.
- As imagens de produção ficam em `infra/docker/api.Dockerfile` e `infra/docker/web.Dockerfile`, em estágios: o estágio de build instala, compila e executa `pnpm deploy --prod --legacy`; o estágio final leva só as dependências de produção e o build. A base é `node:24.22.2-bookworm-slim`, e o processo roda com o usuário `node`.
- O `compose.prod.yaml` troca os comandos pelos de produção, retira os bind mounts de código, monta só `./data` na API e desliga o proxy de desenvolvimento pelo profile `development`.
- O túnel usa configuração local: `infra/cloudflared/config.yml` versiona as regras de entrada, com os marcadores `<TUNNEL_ID>` e `<HOSTNAME>`. O identificador vem de `CLOUDFLARE_TUNNEL_ID`, e o arquivo de credencial vem do host, pelo caminho em `CLOUDFLARE_TUNNEL_CREDENTIALS_FILE`. A imagem é `cloudflare/cloudflared:2026.10.7` (Apache-2.0).
- As imagens de desenvolvimento e de produção têm nomes diferentes (`heavy-duty-dev-api` e `heavy-duty-api`, por exemplo), para o build de uma não sobrescrever a outra.

## Consequências

- O desenvolvimento e a produção usam a mesma definição de serviços, e a produção só sobrepõe o que muda.
- A verificação do scaffold executa `docker compose -f compose.yaml -f compose.prod.yaml config` e o build das imagens `api` e `web`. O `cloudflared` não sobe no scaffold.
- A criação do túnel, o DNS, a credencial no kasparov e a publicação são tarefas manuais do PO.
- O `compose.prod.yaml` usa as marcações `!override` e `!reset` do Compose, que exigem o Docker Compose 2.24 ou mais novo [a confirmar: versão instalada no kasparov].

## Alternativas consideradas

| Alternativa | Motivo da recusa |
|---|---|
| Processos Node.js com systemd no kasparov | Duas formas de rodar o app, uma no desenvolvimento e outra na produção |
| Túnel com token do painel da Cloudflare | O roteamento ficaria no painel, fora do repositório |
| nginx ou Traefik como proxy de desenvolvimento | O Caddy faz o roteamento por caminho com um arquivo de 13 linhas e sem módulo extra |
| Next.js em `output: "standalone"` | O `next start` do e2e deixaria de valer para a imagem; fica como otimização de tamanho da imagem |
