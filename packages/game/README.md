# @heavy-duty/game

Regras puras do jogo (pontos, nível, perda e recorde) e os parâmetros delas, usadas pela API e pelo app web (ADR-034). A API é a fonte da verdade; o app web usa as mesmas funções para o valor provisório durante o treino. A sugestão da letra do treino do dia pelas janelas (US-F12-01) também fica aqui, mas só o app web a usa, como valor final, calculado com as cópias da API e o relógio.

## Regras do pacote

1. Escreva só funções puras e tipos. Não acesse banco, rede, DOM nem relógio: a função recebe séries, catálogo, parâmetros e o instante, e devolve o resultado.
2. Guarde os parâmetros em `src/game.config.ts`, com a decisão do PRD de cada um. A regra da janela continua na API (`apps/api/src/modules/windows/`, ADR-031). O pacote só lê o estado da janela pelos instantes de abertura e fechamento que a API calcula (`windowStateAt`).
3. Importe os arquivos do pacote com a extensão `.ts`, como `./game.config.ts`. O `tsc` troca para `.js` no build, e o webpack e o Turbopack do Next resolvem o arquivo sem configuração extra.
4. Escreva o teste `.spec.ts` ao lado da regra, conforme `docs/convencoes/testes.md`.

## Como os apps carregam o pacote

| Quem | O que carrega | Como |
|---|---|---|
| App web (`next dev`, `next build`, Vitest) | `src/` | `transpilePackages` em `apps/ui/next.config.ts` |
| API em desenvolvimento e nos testes (`tsx`, Vitest, `tsc --noEmit`) | `src/` | Exportação `default` do `package.json` |
| Build da API (`tsconfig.build.json`) | `dist/` | `customConditions: ["heavy-duty-dist"]` |
| Imagens `api` e `backup` | `dist/` | `NODE_OPTIONS=--conditions=heavy-duty-dist` em `infra/docker/api.Dockerfile` |

O Node não executa TypeScript dentro de `node_modules`, e o `pnpm deploy` da imagem da API copia o pacote para lá. Por isso a imagem compila o pacote (`pnpm --filter "@heavy-duty/api..." build`) e leva só o `dist/`.

## Comandos

```sh
pnpm --filter @heavy-duty/game test       # executa os testes do pacote
pnpm --filter @heavy-duty/game typecheck  # verifica os tipos
pnpm --filter @heavy-duty/game build      # compila para dist/
```
