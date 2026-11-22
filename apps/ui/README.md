# UI do Heavy Duty

PWA que o atleta usa no celular, na academia: mostra o treino do dia, registra cada série com um toque e conta o descanso. No MVP, a administração não passa pela UI; passa pelo MCP da API. As telas de administração no Mac entram depois do MVP (PRD, D22).

Estado: o app tem a página inicial, a página sem conexão, a tela de entrada com chave de acesso, a tela de cadastro (`/cadastro`), o manifesto do PWA com ícones PNG, o service worker do Serwist e os tokens do `DESIGN.md` (EN-S0 e US-F14-01). A EN-S1-01 trouxe os tokens do protótipo v1 e os componentes base (`Button`, `IconButton`, `Sheet` e `Toast`). A EN-S1-02 aplicou o visual do protótipo ao fluxo da academia: treino do dia, folha de começar, série com as rodas, descanso com o anel, exercício por tempo, folha da correção e aviso flutuante da correção. O único arquivo copiado do Animate UI é `src/components/ui/motion-button.tsx` (ADR-024 e ADR-027).

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

## Ícones

Os ícones PNG de `public/icons/` são renderizados a partir de `icon.svg` e `icon-maskable.svg` com o Chromium do Playwright. O `icon-maskable.svg` tem fundo sem cantos e o desenho dentro dos 80 % centrais. Depois de mudar um SVG, gere os PNG de novo e versione os arquivos:

```sh
cd e2e && node support/render-icons.ts
```

O comando grava `icon-192.png`, `icon-512.png`, `icon-maskable-512.png` e `apple-touch-icon.png` (180 × 180 px). O `manifest.spec.ts` e o `layout.spec.ts` conferem o tamanho real de cada arquivo.
