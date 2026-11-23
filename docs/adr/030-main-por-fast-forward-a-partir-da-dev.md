# ADR-030: Main por fast-forward a partir da dev

| Campo | Valor |
|---|---|
| Status | Aceita |
| Data | 2026-11-22 |
| Decisor | PO |
| Requisitos relacionados | ADR-028, ADR-029, `docs/convencoes/git.md`, `docs/qualidade.md` |

## Contexto

A ADR-029 manda a `dev` para a `main` por PR, com merge commit. O PR #3 entrou assim, e a `main` ficou com o merge commit `95bce27`, que a `dev` não tem. Com isso, a `main` deixou de avançar por fast-forward até a `dev`.

Em 2026-11-22, o PO decidiu não ter merge commit em nenhuma branch. O repositório não permite rebase pelo GitHub, e o rebase reescreveria os commits (ADR-029, Alternativas).

Na mesma data, com a autorização do PO, a `main` foi realinhada à `dev` (`4962f6c`) por um push forçado único, com o force push ligado e desligado em seguida na proteção da `main`. O `95bce27` tinha a mesma árvore do `1f2286d`, já na `dev`, e nenhum conteúdo se perdeu. O GitHub marcou o PR #45 como integrado.

## Decisão

- **Produção.** A `main` avança só por fast-forward até um commit da `dev`, com `git push origin dev:main`. Nenhuma branch recebe merge commit.
- **Revisão.** O PR da `dev` para a `main` continua: é o ponto da revisão humana e da lista das stories entregues. Ele não é integrado pelo botão do GitHub; o push fast-forward o marca como integrado.
- **Proteção da `main`.** Continua a exigir PR e os checks, com o force push desligado. O push fast-forward do mantenedor passa pela isenção de administrador da proteção.
- **Issues.** O "Closes" do PR não fecha a issue quando a base não é a branch padrão. O mantenedor fecha as issues entregues depois do push.

## Consequências

- A `main` e a `dev` têm os mesmos commits, e a `main` sempre aponta para um commit da `dev` que passou no CI.
- A entrega depende da isenção de administrador. Se a proteção passar a valer também para administradores, o push fast-forward é recusado.
- A `main` não registra o instante de cada entrega num commit próprio; o registro fica no PR e no run de deploy.
- `docs/convencoes/git.md`, Seção 6, muda junto com a aceitação desta ADR.

## Alternativas consideradas

| Alternativa | Motivo da recusa |
|---|---|
| Merge commit pelo PR (ADR-029) | O PO não quer merge commit |
| Rebase pelo GitHub | Desligado no repositório e reescreve os commits |
| Squash pelo GitHub | Reescreve os commits, e a `main` diverge da `dev` |

Esta ADR foi redigida com apoio de IA e decidida pelo PO. O comportamento do GitHub citado aqui (isenção de administrador no push e PR marcado como integrado pelo push) foi observado em 2026-11-22.
