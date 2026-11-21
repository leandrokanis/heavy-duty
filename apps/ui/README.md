# UI do Heavy Duty

PWA que o atleta usa no celular, na academia: mostra o treino do dia, registra cada série com um toque e conta o descanso. No MVP, a administração não passa pela UI; passa pelo MCP da API. As telas de administração no Mac entram depois do MVP (PRD, D22).

Estado: sem código. O scaffold faz parte da onda 1 do PRD.

## Stack

- Next.js com App Router, Base UI e Animate UI, conforme a ADR-009, que substituiu a ADR-003
- TypeScript em modo estrito, conforme a ADR-002
- Vitest e Testing Library para teste de componente

## Comandos

```sh
pnpm --filter @heavy-duty/ui dev
pnpm --filter @heavy-duty/ui test
pnpm --filter @heavy-duty/ui build
```

Os comandos passam a existir com o `package.json` do scaffold.
