# ADR-008: Escopo @heavy-duty nos pacotes do workspace

| Campo | Valor |
|---|---|
| Status | Proposta |
| Data | 2026-11-21 |
| Decisor | PO |
| Requisitos relacionados | D33, ADR-001 |

## Contexto

O produto passou a se chamar Heavy Duty (PRD, D33). A ADR-001 definiu os pacotes do workspace com o escopo `@tap` e diz que a tabela de pacotes só muda por meio de uma ADR nova. O PO pediu que os pacotes também usem o nome novo.

## Decisão

Os pacotes do workspace usam o escopo `@heavy-duty`, e o pacote da raiz se chama `heavy-duty`. Esta tabela substitui a tabela de pacotes da ADR-001; o resto da ADR-001 continua valendo.

| Pasta | Pacote |
|---|---|
| `.` (raiz) | `heavy-duty` |
| `apps/ui` | `@heavy-duty/ui` |
| `apps/api` | `@heavy-duty/api` |
| `e2e` | `@heavy-duty/e2e` |

## Consequências

- Os comandos com filtro passam a usar o escopo novo, como `pnpm --filter @heavy-duty/api test`.
- Os pacotes são privados (`"private": true`), então o escopo não precisa existir num registro público.
- A pasta do repositório não muda de nome por esta decisão.

## Alternativas consideradas

| Alternativa | Motivo da recusa |
|---|---|
| Manter `@tap` | O nome interno deixaria de corresponder ao produto |
| Escopo curto, como `@hd` | Menos claro para quem chega ao repositório |
