# Convenção de Git

## Resumo

Este documento define a branch principal, o nome das branches, o formato das mensagens de commit e as regras de pull request.

## 1. Linguagem de requisitos

As palavras-chave seguem o BCP 14 [RFC2119] [RFC8174], com a tabela de `docs/convencoes/comentarios.md`, Seção 2. Elas têm esse sentido só quando aparecem em caixa alta.

## 2. Branch principal

A branch principal é `main`. O código entra em `main` só por pull request.

## 3. Nome de branch

A branch DEVE seguir o formato `<tipo>/<id-da-story>-<slug>`, com o slug em inglês e em kebab-case.

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

## 5. Pull request

- O PR DEVE usar o modelo de `.github/pull_request_template.md`.
- O PR DEVERIA cobrir uma issue só e caber numa revisão de até 400 linhas alteradas, sem contar o lockfile.
- O PR DEVE passar nas verificações de `docs/qualidade.md` antes do merge.
- O merge DEVE ser por squash. A mensagem do squash segue a Seção 4.

## 6. Referências

- [RFC2119] Bradner, S., "Key words for use in RFCs to Indicate Requirement Levels", BCP 14, RFC 2119, março de 1997, https://www.rfc-editor.org/info/rfc2119.
- [RFC8174] Leiba, B., "Ambiguity of Uppercase vs Lowercase in RFC 2119 Key Words", BCP 14, RFC 8174, maio de 2017, https://www.rfc-editor.org/info/rfc8174.
- [CONVENTIONAL] "Conventional Commits 1.0.0", https://www.conventionalcommits.org/en/v1.0.0/.
