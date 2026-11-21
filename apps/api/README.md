# API do Heavy Duty

Serviço que guarda exercícios, programas e treinos em SQLite. A API atende a UI por HTTP e o Claude por MCP.

Estado: sem código. O scaffold faz parte da onda 1 do PRD.

## Stack

- Node.js 24 e Hono, conforme a ADR-004
- SQLite, conforme a ADR-005
- SDK oficial do MCP em TypeScript, conforme a ADR-006 (proposta)
- Vitest para teste unitário e de integração

## Comandos

```sh
pnpm --filter @heavy-duty/api dev
pnpm --filter @heavy-duty/api test
pnpm --filter @heavy-duty/api build
```

Os comandos passam a existir com o `package.json` do scaffold.

## Variáveis de ambiente

As variáveis ficam em `.env`, fora do Git. O `.env.example` lista cada variável com um marcador no lugar do valor, como `<TOKEN>`.
