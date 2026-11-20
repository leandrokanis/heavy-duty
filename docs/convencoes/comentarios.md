# Comentários no código

## Resumo

Este documento define quando um comentário é permitido no código do app de treino, que tamanho ele pode ter, como se escreve e o que ele não pode conter. Também traz as regras para outros textos em linguagem natural dentro do código, como nome de teste e descrição de API. O revisor confere cada regra lendo o diff.

## Sumário

1. Introdução
2. Linguagem de requisitos
3. Escopo
4. Tipos de comentário permitidos
5. Tamanho
6. Regras de redação
7. Conteúdo proibido
8. Comentários de documentação
9. Texto em linguagem natural fora de comentários
10. Roteiro de revisão
11. Referências

## 1. Introdução

Teste e compilador conferem o código. Ninguém confere o comentário. Quando o código muda e o comentário fica, o comentário passa informação errada a quem lê depois [CLEAN-CODE] [SAMPICA] [BAELDUNG]. Comentário que só repete o código ainda ensina o leitor a pular todos os comentários, inclusive os que importam [BAELDUNG].

Por isso o código é a explicação principal. Um nome, uma função menor ou uma constante com nome vêm primeiro. O comentário é a exceção, e só entra quando o código não consegue dizer a mesma coisa [CLEAN-CODE] [OUSTERHOUT] [TPOP].

## 2. Linguagem de requisitos

As palavras-chave da tabela seguem o BCP 14 [RFC2119] [RFC8174]. Elas têm esse sentido só quando aparecem em caixa alta, como na tabela. O plural (DEVEM, NÃO DEVEM, DEVERIAM, NÃO DEVERIAM, PODEM) tem o mesmo sentido.

| Termo neste documento | Termo do BCP 14 |
|---|---|
| DEVE, OBRIGATÓRIO | MUST, REQUIRED, SHALL |
| NÃO DEVE | MUST NOT, SHALL NOT |
| DEVERIA, RECOMENDADO | SHOULD, RECOMMENDED |
| NÃO DEVERIA, NÃO RECOMENDADO | SHOULD NOT, NOT RECOMMENDED |
| PODE, OPCIONAL | MAY, OPTIONAL |

## 3. Escopo

As regras valem para todo arquivo de `apps/` e `e2e/` que aceite comentário: TypeScript, JavaScript, script shell, Dockerfile, YAML, CSS e arquivo Gherkin `.feature`.

As regras não valem para Markdown (`README.md`, `CLAUDE.md`, `CONTEXT.md` e os documentos de `docs/`). Esses arquivos são documentação, não comentário.

## 4. Tipos de comentário permitidos

Todo comentário DEVE pertencer a um dos tipos desta seção. Comentário que não pertence a nenhum DEVE ser removido. Se o comentário explica um código pouco claro, o código DEVERIA ser reescrito no lugar do comentário [CLEAN-CODE] [BAELDUNG].

Os exemplos estão em inglês porque o comentário é escrito em inglês (Seção 6).

### 4.1. Intenção

Diz por que o código é assim quando o código não mostra o motivo. Em geral, o motivo é uma escolha entre alternativas.

```ts
// Retry once only: a second retry can record the same set twice.
```

### 4.2. Alerta

Diz a consequência de uma mudança que parece segura.

```ts
// Do not regenerate this key on retry. The API dedupes sets by this key.
```

### 4.3. Restrição externa

Diz uma regra que vem de fora do código: uma norma, uma plataforma ou um serviço externo. O comentário DEVE identificar a fonte.

```ts
// iOS 16.4+: Web Push works only for a PWA on the home screen.
```

### 4.4. Contorno

Diz por que o código desvia de um defeito numa dependência. O comentário DEVE trazer o link da issue pública dessa dependência, para que alguém remova o contorno quando a issue fechar [SAMPICA].

```ts
// Vite drops the worker on reload: https://github.com/vitejs/vite/issues/NNNNN
```

### 4.5. Referência

Aponta para uma ADR ou para um documento de `docs/` que explica a decisão.

```ts
// SQLite runs in WAL mode so the backup can copy a live database, see ADR-005.
```

### 4.6. Formato

Diz uma unidade, a referência de uma medida, o sentido de uma expressão regular ou um layout de bits [BAELDUNG].

Se o identificador comporta a informação, o identificador DEVE levá-la e o comentário NÃO DEVE ser escrito. Por exemplo, `loadKg` ou `restSeconds`, e não um comentário que diz "in kg".

```ts
// Matches a story ID such as US-F03-02.
```

### 4.7. Contrato público

Documenta uma interface para quem não lê a implementação. Por exemplo, um módulo que outro app importa ou a descrição de uma ferramenta MCP. É o único tipo que PODE passar do limite da Seção 5.

### 4.8. Diretiva de ferramenta

Uma diretiva que uma ferramenta lê, como `eslint-disable`, `@ts-expect-error` ou `prettier-ignore`. A diretiva que desliga uma verificação DEVE dizer o motivo na mesma linha ou na linha de cima.

```ts
// eslint-disable-next-line react-hooks/exhaustive-deps -- runs once on mount
```

O comentário mágico que a linguagem ou a ferramenta lê, como shebang ou `// @vitest-environment jsdom`, não precisa de motivo.

### 4.9. Aviso legal

Um aviso que uma licença ou um contrato exige [BAELDUNG].

## 5. Tamanho

Um comentário, ou um bloco de linhas de comentário vizinhas, NÃO DEVE passar de 3 linhas. Só contam as linhas com texto. A linha que só tem um delimitador, como `/**` ou `*/`, não conta.

O contrato público (Seção 4.7) é a única exceção.

Se o motivo não cabe em 3 linhas, ele é uma decisão de projeto. Ele vai para uma ADR em `docs/adr/` ou para um documento de `docs/`, e o código aponta para lá com um comentário de referência (Seção 4.5).

## 6. Regras de redação

O comentário DEVE ser escrito em inglês.

O comentário DEVE seguir estas regras de redação do ASD-STE100 [STE]:

- A frase NÃO DEVE passar de 20 palavras.
- A frase DEVE ter uma ideia só.
- A frase DEVE estar na voz ativa.
- A frase DEVE usar um tempo verbal simples: simple present, simple past ou simple future.
- A frase NÃO DEVE omitir artigos ("the", "a", "an") para ficar mais curta.

O dicionário de palavras aprovadas do STE não é OBRIGATÓRIO. Identificadores, unidades e termos do domínio de treino (`CONTEXT.md`) são nomes técnicos no sentido do [STE], e o comentário PODE usá-los como são.

## 7. Conteúdo proibido

O comentário NÃO DEVE conter:

- ID de ticket ou de story, como `US-F03-02` ou `#42`.
- Hash de commit.
- Número de pull request, como `PR #42`.
- Histórico de mudança, como "since the refactor", "was X, now Y" ou "added in".
- Nome de autor ou data [CLEAN-CODE] [BAELDUNG].
- Recado para uma pessoa [SAMPICA].
- `TODO`, `FIXME`, `XXX` ou `HACK`. Trabalho por fazer vai para o rastreador de issues [SAMPICA].
- Código comentado. O controle de versão guarda o código antigo [CLEAN-CODE] [SAMPICA] [BAELDUNG].
- Marcador de seção ou de fim de bloco, como `// ---- helpers ----` [CLEAN-CODE].
- Texto que repete o que o código diz [CLEAN-CODE] [BAELDUNG].

O comentário PODE citar uma ADR, como `ADR-005`. A ADR registra uma decisão que continua valendo. O ticket só registra um trabalho que já terminou.

A tag de story num cenário Gherkin (`@US-F03-02`) não é comentário e é permitida (`docs/convencoes/testes.md`, Seção 9).

## 8. Comentários de documentação

Comentário de documentação (TSDoc, JSDoc e afins) é comentário. As Seções 4 a 7 valem para ele.

O comentário de documentação não é OBRIGATÓRIO em nenhum símbolo. Se o nome da função, do tipo ou do teste já diz o que ele faz, ele NÃO DEVE ter comentário de documentação.

## 9. Texto em linguagem natural fora de comentários

Nome de teste (`describe`, `it`), passo de cenário Gherkin (`Given`, `When`, `Then`), descrição de rota HTTP, descrição de ferramenta MCP e o campo `description` das fixtures de teste são texto em linguagem natural dentro do código.

Para esse texto:

- As Seções 6 e 7 valem.
- As Seções 4 e 5 não valem. Esse texto é sempre permitido, e a forma dele vem da ferramenta que o lê.

O texto exibido ao usuário na UI e a mensagem de erro de domínio são em português do Brasil e não seguem a Seção 6 (`docs/convencoes/codigo.md`, Seção 3).

## 10. Roteiro de revisão

Para cada comentário do diff, o revisor pergunta:

1. De que tipo da Seção 4 ele é? Se não é de nenhum, sai.
2. Um nome, uma constante ou uma função menor o substitui? Se sim, muda o código.
3. Passa de 3 linhas sem ser contrato público? Se sim, encurta ou vai para uma ADR ou para `docs/`.
4. Segue as regras de redação da Seção 6?
5. Contém algum item da Seção 7?

Para cada nome de teste, passo de cenário ou descrição de API do diff, o revisor faz as perguntas 4 e 5.

## 11. Referências

### 11.1. Referências normativas

- [RFC2119] Bradner, S., "Key words for use in RFCs to Indicate Requirement Levels", BCP 14, RFC 2119, março de 1997, https://www.rfc-editor.org/info/rfc2119.
- [RFC8174] Leiba, B., "Ambiguity of Uppercase vs Lowercase in RFC 2119 Key Words", BCP 14, RFC 8174, maio de 2017, https://www.rfc-editor.org/info/rfc8174.
- [STE] ASD, "ASD-STE100 Simplified Technical English", https://www.asd-ste100.org/.

### 11.2. Referências informativas

- [RFC7322] Flanagan, H. e S. Ginoza, "RFC Style Guide", RFC 7322, setembro de 2014, https://www.rfc-editor.org/info/rfc7322. Estrutura deste documento.
- [CLEAN-CODE] Martin, R. C., "Clean Code: A Handbook of Agile Software Craftsmanship", Prentice Hall, 2008, capítulo 4, "Comments".
- [TPOP] Kernighan, B. W. e R. Pike, "The Practice of Programming", Addison-Wesley, 1999, seção 1.6, "Comments".
- [OUSTERHOUT] Ousterhout, J., "A Philosophy of Software Design", Yaknyam Press, 2018, capítulo 13, "Comments Should Describe Things that Aren't Obvious from the Code".
- [SAMPICA] Sampica, B., "Clean Code - Part III: Comments", 2021, https://www.bensampica.com/blog/cleancode3/.
- [BAELDUNG] Baeldung, "Clean Code: Comments", 2020, https://www.baeldung.com/cs/clean-code-comments.
