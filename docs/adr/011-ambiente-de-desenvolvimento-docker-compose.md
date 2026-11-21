# ADR-011: Ambiente de desenvolvimento com Docker Compose

| Campo | Valor |
|---|---|
| Status | Aceita |
| Data | 2026-11-21 |
| Decisor | PO |
| Requisitos relacionados | F14, ADR-001, ADR-009 |

## Contexto

O Heavy Duty tem dois processos de longa duração em desenvolvimento, o app web (Next.js) e a API (Hono), que em produção ficam atrás do túnel no mesmo domínio: `/api` e `/mcp` vão para a API, e o resto vai para o app web (`docs/arquitetura/tunel.md`). O PO decidiu que o ambiente de desenvolvimento sobe com Docker Compose.

## Decisão

O ambiente de desenvolvimento sobe com um comando, `docker compose up`, a partir do arquivo `compose.yaml` na raiz do repositório. Detalhes que o código e a configuração seguem:

| Serviço | Papel | Porta no host |
|---|---|---|
| `web` | App web com `next dev` e recarga automática | interna |
| `api` | API com recarga automática, servidor MCP e Swagger em `/api/docs` | interna |
| `proxy` | Roteia por caminho como o túnel: `/api` e `/mcp` para a API, o resto para o app web | 8080 [a confirmar no scaffold] |

- O código-fonte entra nos contêineres por bind mount, para a recarga automática funcionar. As dependências ficam em volumes nomeados, fora do bind mount.
- A imagem base é Node.js 24, com pnpm ativado pelo Corepack.
- O banco SQLite de desenvolvimento fica em `./data/`, que já está no `.gitignore`, e recebe as migrações e a semente do catálogo na subida.
- O `proxy` reproduz o roteamento do túnel no mesmo domínio, para o cookie de sessão e as chamadas `/api` se comportarem como em produção. A ferramenta do proxy é escolhida no scaffold [a confirmar: por exemplo, Caddy (Apache-2.0)].
- A configuração vem do `.env`, fora do Git; o `.env.example` lista cada variável com marcador.
- Os comandos de teste e de lint rodam tanto no host quanto dentro dos contêineres (`docker compose exec api pnpm test`).

O empacotamento de produção no kasparov é outra decisão, tomada no scaffold da onda 1.

## Consequências

- Quem clona o repositório sobe o ambiente sem instalar Node.js nem pnpm na máquina.
- O desenvolvimento usa o mesmo roteamento por caminho da produção, o que evita erro de CORS e de cookie que só apareceria depois da publicação.
- O bind mount pode deixar a recarga lenta em alguns sistemas; se acontecer, o serviço usa observação por polling [a confirmar no scaffold].
- O scaffold atualiza o `README.md` e o `CLAUDE.md` com os comandos do Compose.

## Alternativas consideradas

| Alternativa | Motivo da recusa |
|---|---|
| Processos direto no host com `pnpm dev` | O PO decidiu pelo Compose; o `pnpm dev` continua possível, mas não é o caminho principal |
| Dev Containers | Amarra o ambiente a um editor; o Compose funciona com qualquer editor |
| Sem proxy, com as rotas `/api` reescritas pelo Next.js | O roteamento ficaria diferente do túnel de produção |
