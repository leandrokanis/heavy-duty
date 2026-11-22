# Convenção de Git

## Resumo

Este documento define as branches principais, o nome das branches, a integração de uma tarefa na `dev`, o formato das mensagens de commit e as regras de pull request (ADR-029).

## 1. Linguagem de requisitos

As palavras-chave seguem o BCP 14 [RFC2119] [RFC8174], com a tabela de `docs/convencoes/comentarios.md`, Seção 2. Elas têm esse sentido só quando aparecem em caixa alta.

## 2. Branches principais

| Branch | Papel |
|---|---|
| `dev` | Branch de desenvolvimento e branch padrão do repositório. Recebe cada tarefa por merge fast-forward (Seção 5) |
| `main` | Produção. Recebe a `dev` por pull request (Seção 6), e cada merge publica as imagens e faz o deploy (ADR-028) |

- A `dev` DEVE ter histórico linear. Ela NÃO DEVE receber merge commit, squash ou rebase feito pelo GitHub, nem push forçado.
- A `main` DEVE receber código só por pull request da `dev`.

## 3. Nome de branch

Cada tarefa DEVE ter uma branch própria, criada a partir da `dev`. A branch DEVE seguir o formato `<tipo>/<id-da-story>-<slug>`, com o tipo da Seção 4.2 e o slug em inglês e em kebab-case.

```text
feat/US-F03-02-one-tap-set
fix/US-F04-01-negative-load
docs/architecture-auth
```

O ID da story PODE faltar quando o trabalho não vem de uma story.

## 4. Mensagem de commit

A mensagem DEVE seguir o Conventional Commits 1.0.0 [CONVENTIONAL] e DEVE estar em inglês.

### 4.1. Formato

```text
<tipo>(<escopo>)!: <assunto>

<corpo>

<rodapé>
```

| Parte | Regra |
|---|---|
| Tipo | OBRIGATÓRIO. Um dos tipos da Seção 4.2 |
| Escopo | DEVERIA estar presente. Um dos escopos da Seção 4.3 |
| `!` | DEVE estar presente quando o commit quebra compatibilidade |
| Assunto | OBRIGATÓRIO. Imperativo, em minúscula, até 72 caracteres na linha inteira, sem ponto final |
| Corpo | PODE estar presente. Diz o motivo da mudança, não o que o diff já mostra. Separado do assunto por uma linha em branco |
| Rodapé | `Refs: <id-da-story>` quando há story. `BREAKING CHANGE: <descrição>` quando há `!` |

### 4.2. Tipos

| Tipo | Uso |
|---|---|
| `feat` | Comportamento novo para o usuário ou para o cliente MCP |
| `fix` | Correção de defeito |
| `docs` | Só documentação |
| `test` | Só testes, sem mudança de comportamento |
| `refactor` | Mudança de código sem mudança de comportamento |
| `perf` | Mudança que reduz tempo ou consumo, sem mudança de comportamento |
| `build` | Sistema de build, dependências e configuração de pacote |
| `ci` | Configuração da integração contínua |
| `chore` | Manutenção que não cabe nos outros tipos |
| `revert` | Reversão de um commit. O corpo DEVE trazer o hash do commit revertido |

### 4.3. Escopos

| Escopo | Área |
|---|---|
| `ui` | `apps/ui` |
| `api` | `apps/api`, exceto o servidor MCP |
| `mcp` | Servidor e ferramentas MCP |
| `e2e` | `e2e/` |
| `docs` | `docs/` e arquivos Markdown da raiz |
| `deps` | Atualização de dependência |
| `repo` | Configuração da raiz do monorepo |

Um commit DEVERIA tocar um escopo só. Se o commit precisa de dois escopos, o escopo PODE ficar de fora.

### 4.4. Exemplos

```text
feat(api): dedupe sets by idempotency key

A double tap on "done" sent two requests with the same key.

Refs: US-F03-02
```

```text
fix(ui): keep load at zero on downward drag

Refs: US-F04-01
```

```text
feat(mcp)!: rename list_history to list_workouts

BREAKING CHANGE: clients that call list_history must call list_workouts.
```

### 4.5. Apoio de IA

O commit feito com apoio de IA DEVERIA ter o rodapé `Co-Authored-By` da ferramenta.

### 4.6. Verificação automática

A mensagem de commit ainda não tem verificação automática. A verificação entra no scaffold da onda 1 [a confirmar: commitlint com `@commitlint/config-conventional`, no hook `commit-msg` e na CI].

## 5. Integração de uma tarefa na dev

1. Crie a branch da tarefa a partir da `dev` atualizada.
2. Ao terminar, rebaseie a branch na `dev` atualizada. A tarefa DEVERIA chegar à `dev` com um commit só; junte os commits da tarefa antes do rebase.
3. Envie a branch ao GitHub. O workflow de CI roda no push de qualquer branch (`docs/qualidade.md`).
4. Com os checks verdes no último commit da branch, integre com `git merge --ff-only` na `dev` e envie a `dev`. O commit que chega à `dev` é o mesmo que o CI testou.
5. Apague a branch da tarefa, local e remota.

```sh
git switch dev && git pull --ff-only
git switch -c feat/US-F07-01-group-window
# ... commits da tarefa ...
git fetch origin && git rebase origin/dev
git push -u origin feat/US-F07-01-group-window
# com os checks verdes:
git switch dev && git merge --ff-only feat/US-F07-01-group-window && git push origin dev
git branch -d feat/US-F07-01-group-window && git push origin --delete feat/US-F07-01-group-window
```

Se a `dev` andou depois do push da branch, repita o rebase e espere o CI do novo commit. O merge fast-forward falha quando a branch não está rebaseada, e esse é o aviso para repetir o passo 2.

O pull request de contribuição externa e o do Dependabot apontam para a `dev`. O mantenedor integra pelo mesmo caminho: rebase, CI verde e merge fast-forward. O GitHub marca o pull request como integrado quando o commit dele chega à `dev`.

## 6. Pull request para a main

- O pull request da `dev` para a `main` é a entrega de uma onda ou de uma correção para a produção, e é o ponto da revisão humana de código (`docs/qualidade.md`).
- O pull request DEVE usar o modelo de `.github/pull_request_template.md` e listar as stories que entrega.
- O pull request DEVE passar nas verificações de `docs/qualidade.md` antes do merge.
- O merge DEVE ser por merge commit. Squash e rebase pelo GitHub reescrevem os commits, e a `main` deixa de ter os commits da `dev`.

## 7. Referências

- [RFC2119] Bradner, S., "Key words for use in RFCs to Indicate Requirement Levels", BCP 14, RFC 2119, março de 1997, https://www.rfc-editor.org/info/rfc2119.
- [RFC8174] Leiba, B., "Ambiguity of Uppercase vs Lowercase in RFC 2119 Key Words", BCP 14, RFC 8174, maio de 2017, https://www.rfc-editor.org/info/rfc8174.
- [CONVENTIONAL] "Conventional Commits 1.0.0", https://www.conventionalcommits.org/en/v1.0.0/.
