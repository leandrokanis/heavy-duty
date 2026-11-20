# Suíte ponta a ponta

Testes ponta a ponta com Playwright e playwright-bdd. Os cenários vêm dos cenários de aceite do PRD.

Estado: sem código. A suíte começa na onda 3, com o fluxo da academia (F03).

## Estrutura planejada

```text
e2e/
  features/<feature>.feature   cenários em inglês
  steps/<feature>.steps.ts     implementação dos passos
  playwright.config.ts
```

## Regras dos cenários

- Escreva o arquivo `.feature` em inglês. O cenário traduz o cenário em português do PRD.
- Marque cada cenário com a tag da story: `@US-F03-02`. A tag liga o teste ao PRD.
- Emule um celular (`devices['Pixel 7']` ou `devices['iPhone 15']`) no projeto padrão do Playwright.

## Comandos

```sh
pnpm e2e
pnpm e2e -- features/workout.feature
```

Os comandos passam a existir com o `package.json` da suíte.
