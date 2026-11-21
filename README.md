# Heavy Duty

O Heavy Duty é um app web pessoal de musculação, hospedado no próprio servidor. No celular, o app acompanha o treino na academia com um toque por passo. Pelo Claude, via MCP, o app recebe a administração: exercícios, programas e histórico. Depois do MVP, a administração também vai ter telas no Mac.

Estado: documentação inicial. Os apps ainda não têm código. O plano de entrega está no roadmap de `docs/prd.md`, Seção 8.

## Estrutura do repositório

```text
apps/
  ui/        PWA em React e Vite
  api/       API em Node e Hono, servidor MCP e SQLite
e2e/         testes ponta a ponta com Playwright
docs/        PRD, arquitetura, ADRs, convenções e qualidade
```

## Requisitos para desenvolver

- Node.js 24 (versão em `.nvmrc`)
- pnpm 10 [a confirmar no scaffold da onda 1]

```sh
pnpm install
pnpm test
```

## Documentação

O índice está em `docs/README.md`. Para contribuir, leia `CONTRIBUTING.md`.

## Licença

MIT. O texto está em `LICENSE`.

## Apoio de IA

A documentação inicial foi elaborada com apoio de IA (Claude) e revisada pelo PO.
