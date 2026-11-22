# Heavy Duty

O Heavy Duty é um app web pessoal de musculação, hospedado no próprio servidor. No celular, o app acompanha o treino na academia com um toque por passo. Pelo Claude, via MCP, o app recebe a administração: exercícios, programas e histórico. Depois do MVP, a administração também vai ter telas no Mac.

Estado: as ondas 1 a 4 e a EN-S1 (visual do protótipo v1) estão concluídas. O início da onda 5 e da EN01 depende de decisão do PO. O plano de entrega está no roadmap de `docs/prd.md`, Seção 8.

## Estrutura do repositório

```text
apps/
  ui/        @heavy-duty/ui: PWA em Next.js, com Base UI
  api/       @heavy-duty/api: API em Node e Hono, servidor MCP e SQLite
e2e/         @heavy-duty/e2e: testes ponta a ponta com Playwright e playwright-bdd
infra/       imagens Docker e roteamento por caminho (Caddy)
.github/     CI no GitHub Actions e Dependabot
docs/        PRD, arquitetura, ADRs, convenções e qualidade
```

## Requisitos para desenvolver

O caminho principal é o Docker Compose, com o plugin Compose instalado. O ambiente sobe sem arquivo `.env`:

```sh
docker compose up -d          # web, api e proxy; o app abre em http://localhost:8080
docker compose exec api pnpm --filter @heavy-duty/api test
docker compose down           # encerra os serviços e mantém o banco em ./data/
```

Abra o app em http://localhost:8080, não em http://127.0.0.1:8080: a chave de acesso (WebAuthn) não aceita endereço IP como domínio (ADR-019). Se a porta 8080 estiver ocupada, execute `PROXY_PORT=8081 docker compose up -d`; a origem da API acompanha a porta.

O app pede a chave de acesso antes de qualquer tela. Para cadastrar a primeira chave de acesso no desenvolvimento, gere um link de cadastro e abra o link no navegador em até 15 minutos:

```sh
docker compose exec api pnpm --filter @heavy-duty/api auth:enroll   # imprime http://localhost:8080/cadastro#token=…
```

Com a sessão de acesso, a API serve a documentação em http://localhost:8080/api/docs.

O MCP fica em http://localhost:8080/mcp e exige a credencial do MCP em todos os ambientes (ADR-020). O cliente MCP descobre a autorização pela resposta 401, e o PO aprova o acesso na tela `/autorizar`, com a sessão de acesso. Para cortar todas as autorizações do MCP:

```sh
docker compose exec api pnpm --filter @heavy-duty/api auth:revoke-mcp   # revoga as autorizações e imprime as contagens
```

O backup diário fica no profile `backup`, com um repositório local do restic e uma senha só para desenvolvimento. O roteiro de produção e de restauração está em `docs/arquitetura/backup.md`:

```sh
docker compose --profile backup up -d backup                          # sobe o agendador do backup
docker compose exec backup pnpm --filter @heavy-duty/api backup:run   # executa o backup sob demanda
docker compose --profile backup down                                  # encerra os serviços, inclusive o backup
```

No host, os comandos pedem Node.js 24 (versão em `.nvmrc`) e o pnpm 10.34.9, fixado em `packageManager`:

```sh
pnpm install
pnpm lint
pnpm typecheck
pnpm test
pnpm e2e
```

## Produção

A produção roda no Coolify do servidor kasparov, com a pilha `compose.coolify.yaml` (ADR-028). Toda branch passa pelo CI no GitHub Actions, e cada tarefa entra na `dev` por merge fast-forward. O merge da `dev` na `main`, por PR e com o CI verde, publica as imagens no GitHub Container Registry e dispara o deploy no Coolify. A configuração, as variáveis e a operação estão em `docs/arquitetura/implantacao.md`.

## Documentação

O índice está em `docs/README.md`. Para contribuir, leia `CONTRIBUTING.md`.

## Licença

MIT, exceto os componentes copiados do Animate UI, que mantêm a licença MIT + Commons Clause (ADR-024). O texto da licença MIT está em `LICENSE`, e a lista dos arquivos de terceiros, com a licença de cada um, está em `THIRD_PARTY_NOTICES.md`.

## Apoio de IA

A documentação inicial foi elaborada com apoio de IA (Claude) e revisada pelo PO.
