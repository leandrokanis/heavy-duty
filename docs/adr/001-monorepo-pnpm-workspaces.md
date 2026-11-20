# ADR-001: Monorepo com pnpm workspaces

| Campo | Valor |
|---|---|
| Status | Aceita |
| Data | 2026-11-20 |
| Decisor | PO |
| Requisitos relacionados | F01, F14 |

## Contexto

O projeto tem uma UI, uma API e uma suíte ponta a ponta, mantidas por uma pessoa só (PRD, D07). A UI e a API compartilham os tipos do domínio, como `Exercise` e `WorkoutSet`. O agente de código (Claude Code) trabalha melhor com o contexto inteiro num repositório só.

## Decisão

O repositório é um monorepo com pnpm workspaces. Os pacotes são:

| Pasta | Pacote |
|---|---|
| `apps/ui` | `@tap/ui` |
| `apps/api` | `@tap/api` |
| `e2e` | `@tap/e2e` |

Um pacote compartilhado, como `packages/domain`, só entra quando dois apps importarem o mesmo código. A entrada do pacote exige atualizar esta tabela por meio de uma ADR nova.

## Consequências

- Um PR muda UI, API e teste ponta a ponta juntos quando a story pede.
- Os scripts da raiz (`pnpm test`, `pnpm lint`) executam em todos os pacotes.
- Todos os pacotes usam a mesma versão de Node.js e de pnpm.

## Alternativas consideradas

| Alternativa | Motivo da recusa |
|---|---|
| Um repositório por app | Duplica configuração e separa mudanças que andam juntas |
| Turborepo ou Nx | Cache e orquestração não pagam o custo com 3 pacotes |
| npm workspaces | pnpm instala mais rápido e isola as dependências de cada pacote |
