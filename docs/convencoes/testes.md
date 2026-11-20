# Testes

## Resumo

Este documento define as ferramentas de teste, a estrutura Given/When/Then, as factories e as regras de teste do app de treino.

## 1. Introdução

O nome do teste no formato Given/When/Then se lê como o cenário de aceite. Quem lê a saída de uma suíte vermelha sabe o que quebrou sem abrir o arquivo.

## 2. Linguagem de requisitos

As palavras-chave seguem o BCP 14 [RFC2119] [RFC8174], com a tabela de `docs/convencoes/comentarios.md`, Seção 2. Elas têm esse sentido só quando aparecem em caixa alta.

## 3. Ferramentas

| Ferramenta | Uso |
|---|---|
| Vitest | Teste unitário e de integração da UI e da API |
| Testing Library | Teste de componente da UI |
| Fishery e Faker | Factories de dado de teste |
| Playwright e playwright-bdd | Testes ponta a ponta em `e2e/` |

## 4. Níveis de teste

| Nível | Onde | O que verifica |
|---|---|---|
| Unitário | `apps/*/src/**/*.spec.ts` | Uma função ou um service, com as dependências externas simuladas |
| Integração da API | `apps/api/src/**/*.spec.ts` | Rota ou ferramenta MCP até o SQLite em memória |
| Componente | `apps/ui/src/**/*.spec.tsx` | Um componente renderizado, consultado por papel acessível |
| Ponta a ponta | `e2e/features/` | Um cenário de aceite do PRD, no navegador emulando um celular |

## 5. Estrutura Given/When/Then

O teste DEVERIA usar blocos `describe` aninhados no padrão Given/When/Then:

```ts
describe('Given a WorkoutService', () => {
  describe('When logSet is called', () => {
    it('Then should store the set with the displayed values', async () => {
      // ...
    })

    describe('and the same idempotency key arrives twice', () => {
      it('Then should store only one set', async () => {
        // ...
      })
    })
  })
})
```

O nome do teste segue a Seção 9 de `docs/convencoes/comentarios.md`.

## 6. Factories

- As factories DEVEM ficar em `src/test/factories/` de cada app.
- A factory DEVE usar o padrão `Factory` do fishery.
- A factory DEVE se chamar `entityFactory`, e o helper, `mockEntity`.

```ts
export const exerciseFactory = Factory.define<Exercise>(() => ({
  id: faker.string.uuid(),
  name: faker.lorem.words(2),
  kind: 'reps',
}))

export const mockExercise = (params?: Partial<Exercise>): Exercise =>
  exerciseFactory.build(params)
```

## 7. Regras gerais

- O teste DEVERIA sobrescrever campos da factory em vez de montar o objeto à mão.
- O teste DEVE fixar o campo que a expectativa lê de volta, em vez de deixar o valor para a factory. Uma factory que sorteia o valor transforma a asserção num cara ou coroa.
- Cada bloco `it` DEVERIA verificar um conceito só.
- A suíte DEVERIA testar o caminho feliz e os cenários de erro.
- O teste NÃO DEVE depender do relógio real, da rede nem de serviço externo. O teste do descanso usa `vi.useFakeTimers()`.
- O teste DEVERIA verificar comportamento pela interface pública, não detalhe de implementação.

## 8. Regras do Vitest

- O teste DEVERIA simular a dependência externa com `vi.mock()`.
- O teste DEVERIA chamar `vi.clearAllMocks()` no `beforeEach`.
- O arquivo de teste DEVE ficar ao lado do código: `exercise.service.spec.ts` ao lado de `exercise.service.ts`.
- O teste de integração da API DEVE usar SQLite em memória, com as migrações aplicadas.

## 9. Testes ponta a ponta

- O cenário DEVE estar num arquivo `.feature` em inglês, traduzido do cenário de aceite do PRD.
- O cenário DEVE ter a tag da story de origem, como `@US-F03-02`.
- A suíte DEVE emular um celular.

O guia da suíte é `e2e/README.md`. Ele diz como executar a suíte inteira e um cenário só.

## 10. Referências

### 10.1. Referências normativas

- [RFC2119] Bradner, S., "Key words for use in RFCs to Indicate Requirement Levels", BCP 14, RFC 2119, março de 1997, https://www.rfc-editor.org/info/rfc2119.
- [RFC8174] Leiba, B., "Ambiguity of Uppercase vs Lowercase in RFC 2119 Key Words", BCP 14, RFC 8174, maio de 2017, https://www.rfc-editor.org/info/rfc8174.

### 10.2. Referências informativas

- [RFC7322] Flanagan, H. e S. Ginoza, "RFC Style Guide", RFC 7322, setembro de 2014, https://www.rfc-editor.org/info/rfc7322. Estrutura deste documento.
