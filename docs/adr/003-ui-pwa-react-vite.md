# ADR-003: UI como PWA em React e Vite

| Campo | Valor |
|---|---|
| Status | Substituída por ADR-009 |
| Data | 2026-11-20 |
| Decisor | PO |
| Requisitos relacionados | NFR05, NFR06, F03, F09, R01, Q02 |

## Contexto

O app se instala no celular e abre em tela cheia (NFR05). O registro funciona sem sinal (NFR06, hipótese H10). Na onda 7, o app manda avisos (F09); no iPhone, o aviso só funciona com o app instalado na tela inicial, no iOS 16.4 ou posterior (R01). O tipo de celular ainda está em aberto (Q02). A administração não tem tela: passa pelo MCP (D15).

## Decisão

A UI é um Progressive Web App feito com React e Vite. O app tem manifesto e service worker para instalação, cache dos arquivos e fila local de séries em IndexedDB.

## Consequências

- Um código só atende iPhone e Android, sem loja de aplicativos.
- O aviso no iPhone depende da instalação na tela inicial (R01).
- A biblioteca de PWA (por exemplo, `vite-plugin-pwa`) e a de IndexedDB são escolhidas no scaffold [a confirmar].

## Alternativas consideradas

| Alternativa | Motivo da recusa |
|---|---|
| App nativo ou React Native | Exige loja de aplicativos ou build por plataforma para um usuário só |
| Next.js | Renderização no servidor não ajuda um app que precisa funcionar sem rede |
