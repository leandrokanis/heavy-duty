# ADR-024: Componentes do Animate UI com a licença MIT + Commons Clause

| Campo | Valor |
|---|---|
| Status | Aceita |
| Data | 2026-11-21 |
| Decisor | PO |
| Requisitos relacionados | ADR-009, ADR-016, EN-S0 (FR-024) |

## Contexto

A ADR-009 escolheu o Animate UI, na variante sobre o Base UI, e marcou a licença como MIT a confirmar. No scaffold, o `LICENSE.md` do repositório oficial do Animate UI declarava "MIT + Commons Clause" (`specs/EN-S0-scaffold/decisoes.md`, decisão 55, arquivo local). A Commons Clause proíbe vender o software ou um serviço cujo valor venha substancialmente dele [a confirmar: leitura jurídica do texto]. Por isso o scaffold não copiou nenhum componente, e a ADR-016 escolheu os ícones do Lucide.

O Heavy Duty é open source com licença MIT (`LICENSE`) e não é vendido. O PO decidiu aceitar a licença do Animate UI e adaptar o projeto a ela.

## Decisão

O projeto copia componentes do Animate UI para `apps/ui/src/components/ui/` e mantém neles a licença MIT + Commons Clause, separada da licença MIT do resto do código. Detalhes que o código segue:

- Cada arquivo copiado do Animate UI, ou derivado dele, guarda no topo um comentário de licença com a origem e o nome da licença, como `Adapted from Animate UI, licensed under MIT + Commons Clause, see THIRD_PARTY_NOTICES.md`.
- O arquivo `THIRD_PARTY_NOTICES.md`, na raiz, lista o Animate UI com o texto integral da licença, copiado do `LICENSE.md` do repositório oficial no dia da primeira cópia de componente, e a lista dos arquivos sob essa licença.
- O `README.md` avisa que o projeto é MIT, exceto os arquivos listados no `THIRD_PARTY_NOTICES.md`.
- Os ícones continuam do Lucide (ADR-016). Um ícone animado do Animate UI pode entrar quando a tela pedir animação de ícone, com as mesmas regras de atribuição.
- Antes de qualquer uso comercial do Heavy Duty, ou de algum derivado dele, a licença é reavaliada.

## Consequências

- O layout do protótipo (`docs/prototipo/`) pode usar os componentes animados do Animate UI, como a ADR-009 previa.
- O repositório passa a ter duas licenças. Quem reaproveita o código precisa ler o `THIRD_PARTY_NOTICES.md` antes de reaproveitar um componente de `apps/ui/src/components/ui/`.
- A Commons Clause não é uma licença aprovada pela Open Source Initiative. Os arquivos do Animate UI não são open source no sentido estrito, embora o código fique visível.
- A licença do Animate UI pode mudar. A cópia de componente novo confere o `LICENSE.md` do dia e atualiza o `THIRD_PARTY_NOTICES.md` se o texto mudou.

## Alternativas consideradas

| Alternativa | Motivo da recusa |
|---|---|
| Recusar o Animate UI e fazer as animações direto com Motion (MIT) | O PO preferiu aceitar a licença e aproveitar os componentes prontos |
| Trocar a licença do projeto inteiro para MIT + Commons Clause | Restringiria o código próprio do projeto sem necessidade; só os arquivos copiados precisam da cláusula |

Esta ADR foi redigida com apoio de IA. A leitura da licença é sugestão sujeita à revisão de pessoa qualificada.
