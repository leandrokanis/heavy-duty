# Protótipo do Heavy Duty

O protótipo é a referência visual do app: layout, cor, tipografia, animação e som das telas. Ele é um arquivo HTML só, sem dependência externa, que abre direto no navegador. Cada versão fica numa pasta própria e não muda depois de publicada; uma alteração vira uma versão nova.

## Versões

| Versão | Data | Pasta | Conteúdo |
|---|---|---|---|
| v1 | 2026-11-21 | `v1/` | Fluxo da academia (treino do dia, série, descanso, sequência, exercício por tempo, confirmações de início e fim), gamificação (pontos, níveis por grupo muscular, faixas, medalhas, aviso de queda, mapa do corpo com 11 grupos), avisos por e-mail e notas de design ao lado de cada tela |

## Como abrir

Abra `v1/index.html` no navegador. A tela do celular fica no centro, com as notas de design e os controles de simulação ao lado.

## Como o protótipo se relaciona com os outros documentos

- O PRD (`docs/prd.md`) define o que o app faz. O protótipo mostra como fica na tela. Em contradição de comportamento, vale o PRD, e a divergência vira uma decisão registrada.
- O `DESIGN.md` define as regras de interface. Os tokens que o protótipo usa e o `DESIGN.md` ainda não define entram no `DESIGN.md` (Seção 18) antes de virar código.
- O protótipo mostra telas fora das ondas 1 a 4, como a gamificação e os avisos. Elas só entram no código na onda do roadmap.

## Limites

- O protótipo é uma simulação: os dados, os níveis e os e-mails são fictícios.
- O protótipo foi feito com apoio de IA e é sugestão de design, sujeita à revisão do PO.
