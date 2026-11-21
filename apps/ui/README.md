# UI do Heavy Duty

PWA que o atleta usa no celular, na academia: mostra o treino do dia, registra cada série com um toque e conta o descanso. No MVP, a administração não passa pela UI; passa pelo MCP da API. As telas de administração no Mac entram depois do MVP (PRD, D22).

Estado: scaffold (EN-S0). O app tem a página inicial, a página sem conexão, o manifesto do PWA, o service worker do Serwist e os tokens do `DESIGN.md`. Nenhum componente do Animate UI foi copiado: a licença está pendente de decisão do PO (ADR-016).

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

O `build` usa `next build --webpack`, porque o Serwist gera o service worker só com o webpack. O `next dev` não registra o service worker; o comportamento sem rede é testado pelo e2e no build de produção.
