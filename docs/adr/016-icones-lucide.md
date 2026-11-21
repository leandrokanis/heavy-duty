# ADR-016: Ícones do Lucide

| Campo | Valor |
|---|---|
| Status | Aceita |
| Data | 2026-11-21 |
| Decisor | PO, por delegação no plano do MVP |
| Requisitos relacionados | ADR-009, EN-S0 (FR-025) |

## Contexto

O app usa um conjunto de ícones só, com licença compatível com MIT, e não usa SF Symbols (`DESIGN.md`, Seção 14). O plano do MVP recomendava os ícones animados do Animate UI, feitos a partir do Lucide (`specs/plano-mvp.md`, Seção 5, arquivo local). A ADR-009 marcava a licença do Animate UI como MIT, a confirmar no arquivo LICENSE.

Em 2026-11-21, o `LICENSE.md` do repositório oficial do Animate UI declarava "MIT + Commons Clause". A Commons Clause proíbe vender o software ou serviços cujo valor venha substancialmente dele, o que inclui redistribuir os componentes na forma original [a confirmar: leitura jurídica do texto]. O Heavy Duty é open source com licença MIT (`LICENSE`), e o PO ainda não decidiu se aceita essa cláusula.

## Decisão

O conjunto de ícones do app é o Lucide (`lucide-react`, licença ISC), sem animação. Detalhes que o código segue:

- O pacote `lucide-react` entra no `package.json` do app web com a primeira tela que usar ícone; o scaffold não usa ícone.
- Ícone sem rótulo visível tem `aria-label` (`DESIGN.md`, Seção 14).
- Os ícones animados do Animate UI ficam como alternativa, se o PO aceitar a licença "MIT + Commons Clause".

## Consequências

- O FR-024 fica parcial no scaffold: o Base UI entrou (botão da página sem conexão), e nenhum componente do Animate UI foi copiado. A decisão do PO sobre a licença é tarefa manual da onda 1.
- A ADR-009 continua aceita no restante. Se o PO recusar a licença, uma ADR nova substitui a parte do Animate UI na ADR-009.
- Com o Lucide, o ícone não anima sozinho. Animação de ícone, se o produto pedir, usa Motion sobre o SVG do Lucide.

## Alternativas consideradas

| Alternativa | Motivo da recusa |
|---|---|
| Ícones animados do Animate UI | Licença "MIT + Commons Clause", pendente de decisão do PO |
| Heroicons (MIT) | Conjunto menor que o Lucide, e a recomendação do plano já partia do Lucide |
| SF Symbols | A licença da Apple restringe os símbolos a apps para plataformas Apple (`DESIGN.md`, Seção 14) |
