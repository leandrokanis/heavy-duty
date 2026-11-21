# Regras de apps/ui

PWA em Next.js, com Base UI e Animate UI, para a persona Atleta (P1). A arquitetura do contêiner está em `docs/arquitetura/app-web.md`. O contexto de uso é a academia: celular apoiado no banco, mãos ocupadas, intervalos de 1 a 2 minutos e talvez sem sinal.

## Estrutura planejada

```text
src/
  app/                    rotas do App Router; o fluxo da academia fica em app/(treino)/, renderizado no cliente
  components/ui/          componentes do Animate UI, sobre o Base UI, adaptados ao DESIGN.md
  features/<feature>/     componentes, hooks e serviços de uma feature (workout, rest…)
  shared/                 utilitários usados por duas features ou mais
  sync/                   fila local (IndexedDB, com Dexie) e envio para a API
  sw.ts                   service worker (Serwist)
  test/factories/         factories fishery: exerciseFactory, mockExercise
```

Organize por feature, não por tipo de arquivo. Um componente usado só por uma feature fica dentro da feature.

## Interface

Siga `DESIGN.md` em toda tela e todo componente. Regras que mais erram:

- Área de toque de 44 × 44 px ou mais; 56 px nos controles da tela de treino.
- Vidro (`backdrop-filter`) só na camada de controles e navegação, com versão opaca para `prefers-reduced-transparency` e `prefers-contrast: more`.
- Cor, espaço, raio e duração vêm de tokens CSS (`--color-*`, `--space-*`, `--radius-*`).
- Não use fontes SF nem SF Symbols. Use a pilha `system-ui` e os ícones do Lucide (`lucide-react`, ADR-016).
- Não copie componente do Animate UI enquanto o PO não decidir sobre a licença "MIT + Commons Clause" (ADR-016). Até lá, use o Base UI com os tokens.
- Meça alinhamento e espaçamento com `getBoundingClientRect()` antes de afirmar que estão corretos.

## Regras de produto que o código segue

1. Cada passo do fluxo da academia pede um toque (meta O5 do PRD). Só começar e encerrar o treino pedem confirmação (D25).
2. O fluxo de treino não abre teclado. Carga, repetições e tempo mudam por arrasto, em passos fixos (F04).
3. Toque duplo em "Próximo" registra uma série só. Cada série leva uma chave de idempotência gerada no cliente.
4. O registro funciona sem rede. A série vai para a fila local e segue para a API quando a conexão volta (F03, H10).
5. A carga não fica negativa.
6. O texto exibido ao usuário é em português do Brasil. Nome de componente, prop e identificador são em inglês.

## Testes

- Consulte elementos por papel e nome acessível (`getByRole`), não por classe ou `data-testid`.
- Use `vi.useFakeTimers()` em teste do descanso. O teste não espera o relógio real.
- Siga `docs/convencoes/testes.md`.

## Comandos

```sh
pnpm --filter @heavy-duty/ui dev
pnpm --filter @heavy-duty/ui test
pnpm --filter @heavy-duty/ui lint
pnpm --filter @heavy-duty/ui typecheck
pnpm --filter @heavy-duty/ui build    # build de produção com webpack, gera o service worker
```
