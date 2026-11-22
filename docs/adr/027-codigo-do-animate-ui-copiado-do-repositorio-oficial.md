# ADR-027: Código do Animate UI copiado do repositório oficial

| Campo | Valor |
|---|---|
| Status | Aceita |
| Data | 2026-11-22 |
| Decisor | PO, por delegação no plano do MVP |
| Requisitos relacionados | ADR-009, ADR-016, ADR-024, EN-S1 (FR-024) |

## Contexto

A ADR-009 previa copiar os componentes do Animate UI para `apps/ui/src/components/ui/` pelo CLI do shadcn. A ADR-024 aceitou a licença MIT + Commons Clause para os arquivos copiados.

Na consulta de 2026-11-22, a versão 2 do Animate UI entrega os primitivos pelo pacote `@animate-ui/react` (`https://animate-ui.com/docs/react.md` e `https://animate-ui.com/docs/installation.md`). A FR-024 da EN-S1 não deixa o pacote entrar, porque a ADR-024 cobre arquivos copiados, não dependência npm.

O repositório oficial `https://github.com/imskyleen/animate-ui` guarda o código em `packages/react/src/`. O primitivo do botão tem 56 linhas e depende de `utils/motion`, de 357 linhas. Os componentes `drawer` e `toast` dependem de mais de 3.700 linhas internas no total (`specs/EN-S1-01-design-foundation/decisoes.md`, decisão 45, arquivo local).

## Decisão

O projeto copia código do Animate UI só do repositório oficial, em commit fixado, e não usa o pacote `@animate-ui/react`. Detalhes que o código segue:

1. O código vem de `packages/react/src/` do repositório oficial. O commit do dia sai de `git ls-remote https://github.com/imskyleen/animate-ui refs/heads/main`, e o arquivo baixa de `https://raw.githubusercontent.com/imskyleen/animate-ui/<commit>/<caminho>`.
2. O projeto não usa o pacote `@animate-ui/react`, o CLI do shadcn, o `@animate-ui/cli` nem o arquivo `components.json`.
3. O arquivo derivado fica em `apps/ui/src/components/ui/`, com o comentário da ADR-024 no topo. Os valores que o arquivo usa de módulos internos do Animate UI são copiados para dentro do próprio arquivo.
4. Componente que exigiria copiar módulos internos grandes é código próprio, com Base UI, CSS e Motion, sem atribuição.
5. Esta ADR troca o detalhe "copiados para o repositório pelo CLI do shadcn" da ADR-009. A ADR-009 continua aceita no restante.

O primeiro arquivo derivado é `apps/ui/src/components/ui/motion-button.tsx`, do primitivo `packages/react/src/primitives/buttons/button/index.tsx` no commit `9873c628afdcdb030e74dc2930774a2aa473bd39`, obtido em 2026-11-22.

## Consequências

- O código do Animate UI no projeto tem origem, commit e data rastreáveis no `THIRD_PARTY_NOTICES.md`.
- O projeto não recebe atualizações do Animate UI sozinho. Quem quiser uma correção do repositório oficial copia o arquivo de novo e atualiza o commit na lista.
- A folha e o aviso flutuante são código do projeto, sem a licença do Animate UI.
- A licença do texto copiado precisa ser conferida de novo a cada cópia (ADR-024).

## Alternativas consideradas

| Alternativa | Motivo da recusa |
|---|---|
| Instalar `@animate-ui/react` | A FR-024 não permite dependência npm; a licença do pacote não foi conferida |
| Copiar pelo CLI do shadcn, como a ADR-009 previa | O CLI gera `components.json` e puxa módulos internos grandes para componentes simples |
| Copiar `drawer` e `toast` do repositório oficial | Dependem de mais de 3.700 linhas internas no total, sem ganho de comportamento para esta parte |

Esta ADR foi redigida com apoio de IA e está sujeita à revisão do PO.
