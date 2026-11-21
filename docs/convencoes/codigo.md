# Convenção de código

## Resumo

Este documento define o idioma, os nomes, a estrutura de pastas, os formatos de dado e as regras de dependência do código do Heavy Duty. As regras de comentário estão em `comentarios.md`, e as de teste, em `testes.md`.

## 1. Linguagem de requisitos

As palavras-chave seguem o BCP 14 [RFC2119] [RFC8174], com a tabela de `docs/convencoes/comentarios.md`, Seção 2. Elas têm esse sentido só quando aparecem em caixa alta.

## 2. Escopo

As regras valem para `apps/` e `e2e/`.

## 3. Idioma

- Identificadores, nomes de arquivo, comentários, nomes de teste, descrições de rota e de ferramenta MCP DEVEM estar em inglês.
- O texto exibido ao usuário na UI DEVE estar em português do Brasil.
- A mensagem de erro de domínio DEVE ter um `code` em inglês, em `snake_case`, e uma `message` em português. Quando o PRD dá o texto, a `message` DEVE ser o texto do PRD.

```ts
throw new DomainError('muscle_group_required', 'informe o grupo muscular')
```

- O nome no código DEVE seguir a coluna "Código" de `CONTEXT.md`.

## 4. TypeScript

- O `tsconfig` DEVE ter `strict: true` e `noUncheckedIndexedAccess: true`.
- O código NÃO DEVE usar `any`. Use `unknown` e estreite o tipo.
- O módulo DEVERIA usar export nomeado, não `export default`. Exceção: arquivo que a ferramenta exige com export padrão, como configuração do Vite.
- Um conjunto fechado de valores DEVERIA ser uma união de literais (`'reps' | 'time'`), não `enum`.
- O tipo NÃO DEVERIA ter prefixo `I` nem sufixo `Type`.

## 5. Nomes

| Elemento | Forma | Exemplo |
|---|---|---|
| Arquivo | kebab-case, com o papel como sufixo | `exercise.service.ts`, `rest-timer.tsx` |
| Teste | nome do arquivo testado + `.spec` | `exercise.service.spec.ts` |
| Tipo e componente | PascalCase | `WorkoutSet`, `RestTimer` |
| Função e variável | camelCase | `logSet`, `nextExercise` |
| Constante de módulo | UPPER_SNAKE_CASE | `DEFAULT_LOAD_STEP_KG` |
| Booleano | prefixo `is`, `has` ou `can` | `isOnline`, `hasPendingSets` |
| Ferramenta MCP | snake_case, verbo primeiro | `list_programs`, `remove_workout` |

- O identificador que guarda uma medida DEVE ter a unidade no fim: `loadKg`, `restSeconds`, `durationSeconds`.
- O identificador NÃO DEVERIA ter abreviação fora das unidades e das siglas de `CONTEXT.md`.

## 6. Estrutura de pastas

- O código DEVE ser organizado por módulo de domínio ou por feature, não por tipo técnico. A pasta `src/modules/workouts/` junta rota, service, repositório e testes de treino.
- O código usado por um módulo só DEVE ficar dentro do módulo.
- A estrutura de cada app está em `apps/ui/CLAUDE.md` e `apps/api/CLAUDE.md`.

## 7. Formatos de dado

| Dado | Formato |
|---|---|
| Data e hora na API e no banco | ISO 8601 em UTC (`2026-11-20T14:30:00Z`) |
| Data e hora na tela | fuso e formato do celular, convertidos pela UI |
| Carga | número em kg, com casa decimal (`42.5`) |
| Tempo e descanso | inteiro em segundos |
| ID de entidade | string UUID [a confirmar: versão do UUID antes da onda 3] |

## 8. Erros

- O service DEVE lançar erro de domínio com `code` e `message` (Seção 3). A rota e a ferramenta MCP convertem o erro na resposta do canal.
- O código NÃO DEVE engolir exceção sem registrar o motivo.
- O log NÃO DEVE conter credencial, token ou corpo de requisição com dado de autenticação.

## 9. Formatação e lint

- O código DEVE passar no lint e no formatador configurados no scaffold. As ferramentas são definidas por ADR na onda 1 [a confirmar: ESLint com typescript-eslint e Prettier, ou Biome].
- A configuração DEVERIA ficar na raiz do monorepo, compartilhada pelos pacotes.

## 10. Dependências

- A dependência nova DEVE ter licença compatível com MIT. Verifique antes do PR.
- A dependência nova DEVERIA ter manutenção ativa e NÃO DEVERIA duplicar uma dependência existente.
- O `pnpm-lock.yaml` DEVE estar no commit.
- A dependência que muda a arquitetura (framework, banco, autenticação) DEVE ter ADR.

## 11. Segredos e configuração

- A configuração sensível DEVE vir de variável de ambiente.
- O arquivo `.env` NÃO DEVE entrar no Git. O `.env.example` DEVE listar cada variável com um marcador no valor, como `<TOKEN>`.
- O código, o teste e a fixture NÃO DEVEM conter credencial real.

## 12. Referências

- [RFC2119] Bradner, S., "Key words for use in RFCs to Indicate Requirement Levels", BCP 14, RFC 2119, março de 1997, https://www.rfc-editor.org/info/rfc2119.
- [RFC8174] Leiba, B., "Ambiguity of Uppercase vs Lowercase in RFC 2119 Key Words", BCP 14, RFC 8174, maio de 2017, https://www.rfc-editor.org/info/rfc8174.
