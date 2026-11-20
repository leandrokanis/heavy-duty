# Regras de apps/ui

PWA em React e Vite para a persona Atleta (P1). O contexto de uso é a academia: celular apoiado no banco, mãos ocupadas, intervalos de 1 a 2 minutos e talvez sem sinal.

## Estrutura planejada

```text
src/
  features/<feature>/     componentes, hooks e serviços de uma feature (workout, rest…)
  shared/                 componentes e utilitários usados por duas features ou mais
  sync/                   fila local (IndexedDB) e envio para a API
  test/factories/         factories fishery: exerciseFactory, mockExercise
```

Organize por feature, não por tipo de arquivo. Um componente usado só por uma feature fica dentro da feature.

## Interface

Siga `DESIGN.md` em toda tela e todo componente. Regras que mais erram:

- Área de toque de 44 × 44 px ou mais; 56 px nos controles da tela de treino.
- Vidro (`backdrop-filter`) só na camada de controles e navegação, com versão opaca para `prefers-reduced-transparency` e `prefers-contrast: more`.
- Cor, espaço, raio e duração vêm de tokens CSS (`--color-*`, `--space-*`, `--radius-*`).
- Não use fontes SF nem SF Symbols. Use a pilha `system-ui` e o conjunto de ícones único do projeto.
- Meça alinhamento e espaçamento com `getBoundingClientRect()` antes de afirmar que estão corretos.

## Regras de produto que o código segue

1. Cada passo do fluxo da academia pede um toque (meta O5 do PRD). Não peça confirmação extra no fluxo de treino.
2. O fluxo de treino não abre teclado. Carga, repetições e tempo mudam por arrasto, em passos fixos (F04).
3. Toque duplo em "feito" registra uma série só. Cada série leva uma chave de idempotência gerada no cliente.
4. O registro funciona sem rede. A série vai para a fila local e segue para a API quando a conexão volta (F03, H10).
5. A carga não fica negativa.
6. O texto exibido ao usuário é em português do Brasil. Nome de componente, prop e identificador são em inglês.

## Testes

- Consulte elementos por papel e nome acessível (`getByRole`), não por classe ou `data-testid`.
- Use `vi.useFakeTimers()` em teste do descanso. O teste não espera o relógio real.
- Siga `docs/convencoes/testes.md`.

## Comandos

```sh
pnpm --filter @tap/ui dev
pnpm --filter @tap/ui test
pnpm --filter @tap/ui lint
pnpm --filter @tap/ui typecheck
```
