# ADR-009: UI em Next.js com Base UI e Animate UI

| Campo | Valor |
|---|---|
| Status | Aceita |
| Data | 2026-11-21 |
| Decisor | PO |
| Requisitos relacionados | NFR05, NFR06, F03, F09, D22, ADR-003 |

## Contexto

A ADR-003 escolheu React e Vite e recusou o Next.js porque a renderização no servidor não ajuda um app que precisa funcionar sem rede. Desde então, o produto ganhou telas de administração no Mac depois do MVP (PRD, D22), gamificação com muitas animações (`docs/gamificacao.md`) e um guia de interface próprio (`DESIGN.md`). O PO decidiu usar Next.js, Base UI e Animate UI.

- O Base UI é uma biblioteca de componentes sem estilo e acessíveis. O pacote estável é `@base-ui/react`, desde a versão 1.0, de dezembro de 2025 [a confirmar a versão no scaffold].
- O Animate UI distribui componentes animados com Tailwind CSS e Motion, copiados para o repositório pelo CLI do shadcn. Ele tem uma categoria de componentes sobre o Base UI. O repositório oficial declara licença MIT [a confirmar no arquivo LICENSE no scaffold].

## Decisão

A UI é um app Next.js com App Router, que continua sendo um PWA instalável. Os componentes vêm do Animate UI, na variante sobre o Base UI, e são copiados para `apps/ui/src/components/ui/`. Detalhes que o código segue:

- O fluxo da academia é renderizado no cliente (`"use client"`) e funciona sem rede. O servidor do Next.js entrega o esqueleto das páginas e as telas que não precisam funcionar sem rede, como a administração.
- O service worker é gerado pelo Serwist (`@serwist/next`), que pré-carrega as rotas do fluxo da academia e oferece uma página sem conexão.
- O estilo usa Tailwind CSS 4, exigido pelo Animate UI. Os tokens do `DESIGN.md` (Seção 18) viram variáveis CSS no tema do Tailwind; o código não usa valor solto que tem token.
- A animação usa Motion, exigido pelo Animate UI, e respeita `prefers-reduced-motion`.
- O componente copiado do Animate UI passa a ser código do projeto: segue o `DESIGN.md` e as convenções, e guarda a atribuição de licença no topo do arquivo.

Esta ADR substitui a ADR-003.

## Consequências

- Rotas, layouts e telas largas da administração ficam no mesmo app, com o mesmo sistema de componentes.
- O fluxo da academia precisa ficar no cliente; um componente de servidor nele quebra o uso sem rede. A revisão de código verifica isso.
- O Serwist não roda no modo de desenvolvimento com Turbopack, então o comportamento sem rede é testado no build de produção [a confirmar no scaffold].
- O Next.js roda como processo Node.js no kasparov, ao lado da API (`docs/arquitetura/app-web.md`).
- As dependências novas têm licença compatível com MIT: Next.js, React, Base UI, Tailwind CSS, Motion e Serwist (MIT); Animate UI (MIT, a confirmar).

## Alternativas consideradas

| Alternativa | Motivo da recusa |
|---|---|
| React com Vite (ADR-003) | O PO preferiu Next.js pelas rotas e layouts da administração e pelo ecossistema do Animate UI |
| Next.js com exportação estática (`output: "export"`) | Perde as rotas de servidor da administração; fica como alternativa se o processo Node.js no kasparov pesar |
| Radix UI como base dos componentes | O PO escolheu Base UI, que o Animate UI também atende |
