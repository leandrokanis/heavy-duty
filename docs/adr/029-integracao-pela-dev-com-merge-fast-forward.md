# ADR-029: Integração pela branch dev com merge fast-forward

| Campo | Valor |
|---|---|
| Status | Substituída por ADR-030 na parte da produção |
| Data | 2026-11-22 |
| Decisor | PO |
| Requisitos relacionados | ADR-028, `docs/convencoes/git.md`, `docs/qualidade.md` |

## Contexto

No MVP, cada story tinha uma branch a partir da `mvp`, integrada por squash merge, e a `mvp` ia para a `main` por PR ao fim de cada onda (plano local do MVP, Seção 4). O CI da ADR-028 rodava em todo PR e todo push para `main` e `mvp`.

O PR #1, da `mvp` para a `main`, foi integrado em 2026-11-22 por rebase pelo GitHub. O rebase pelo GitHub reescreve os commits mesmo quando o fast-forward seria possível. A `main` ficou com cópias dos 27 commits da `mvp`, com outros hashes, e sem os dois commits de CI e deploy, que vieram depois do PR. As duas branches divergiram com o mesmo conteúdo.

Em 2026-11-22, o PO decidiu que `dev` é a branch de desenvolvimento padrão do projeto e que cada tarefa é desenvolvida numa branch própria e integrada na `dev` por merge fast-forward.

## Decisão

- **Branches principais.** A `dev` é a branch de desenvolvimento e a branch padrão do repositório no GitHub. A `main` é a produção, como na ADR-028. A `mvp` sai, porque a `dev` a substitui.
- **Tarefa.** Cada tarefa tem uma branch própria a partir da `dev`, com o nome de `docs/convencoes/git.md`, Seção 3. Ao terminar, a branch é rebaseada na `dev`, de preferência com um commit só, e integrada com `git merge --ff-only`. A `dev` tem histórico linear.
- **CI.** O workflow roda no push de qualquer branch, exceto as do Dependabot, que rodam pelo PR, e em todo PR para a `dev` ou a `main`. A proteção da `dev` exige os checks no commit enviado, sem exigir PR: a tarefa só entra na `dev` depois de o CI passar no próprio commit, e o commit integrado é o mesmo que o CI testou.
- **Produção.** A `dev` vai para a `main` por PR, na entrega de uma onda ou de uma correção. O merge é por merge commit; squash e rebase ficam desligados no repositório. O merge na `main` publica e faz o deploy (ADR-028).
- **Revisão.** A branch da tarefa passa pela revisão automática antes da `dev`. A revisão humana, exigida pela política do Instituto, acontece no PR da `dev` para a `main` (`docs/qualidade.md`).
- **Dependabot.** Os PRs do Dependabot apontam para a `dev` e entram pelo mesmo caminho: rebase, CI verde e merge fast-forward feito pelo mantenedor.

## Consequências

- A `dev` guarda a sequência das tarefas, um commit por tarefa, cada um com o CI verde.
- A `main` tem um merge commit por entrega. A `dev` não precisa receber esses merge commits, porque toda mudança passa antes pela `dev`.
- Uma tarefa espera o CI da própria branch antes de entrar na `dev` [estimativa: de 10 a 20 minutos por push]. Se a `dev` andar nesse tempo, a branch é rebaseada e o CI roda de novo.
- O código fica na `dev` sem revisão humana até o PR para a `main`. A `dev` não vai para a produção.
- Correção urgente da produção também passa pela `dev`: tarefa, fast-forward na `dev` e PR para a `main`.
- A integração da `dev` com a `mvp` pede uma ação única: a `dev` nasce da `main` atual com os dois commits de CI e deploy, e a `mvp` é apagada.

## Alternativas consideradas

| Alternativa | Motivo da recusa |
|---|---|
| Squash merge da tarefa pelo PR do GitHub, como no MVP | O commit integrado não é o que o CI testou, e cada tarefa exige um PR |
| Rebase pelo GitHub | Reescreve os commits mesmo quando o fast-forward é possível, como aconteceu no PR #1 |
| Fast-forward também da `dev` para a `main`, por push direto | Tira o PR da `main`, que é o ponto da revisão humana |
| Desenvolvimento direto na `main`, sem `dev` | Cada integração faria deploy, sem um ponto de revisão por onda |

Esta ADR foi redigida com apoio de IA e decidida pelo PO. O comportamento do GitHub citado aqui (checks exigidos no push sem PR, PR marcado como integrado quando o commit chega à base e o destino dos PRs de atualização de segurança do Dependabot) deve ser conferido nas configurações do repositório [a confirmar].
