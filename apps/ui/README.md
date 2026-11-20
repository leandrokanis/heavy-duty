# UI do app de treino

PWA que o atleta usa no celular, na academia: mostra o treino do dia, registra cada série com um toque e conta o descanso. A administração não passa pela UI; passa pelo MCP da API.

Estado: sem código. O scaffold faz parte da onda 1 do PRD.

## Stack

- React e Vite, conforme a ADR-003
- TypeScript em modo estrito, conforme a ADR-002
- Vitest e Testing Library para teste de componente

## Comandos

```sh
pnpm --filter @tap/ui dev
pnpm --filter @tap/ui test
pnpm --filter @tap/ui build
```

Os comandos passam a existir com o `package.json` do scaffold.
