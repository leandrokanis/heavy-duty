# ADR-004: API em Node.js com Hono

| Campo | Valor |
|---|---|
| Status | Aceita |
| Data | 2026-11-20 |
| Decisor | PO |
| Requisitos relacionados | NFR01, NFR04, F14, F16 |

## Contexto

A API roda no servidor do PO, atrás do Cloudflare Tunnel (PRD, D02). A API atende a UI por HTTP e o Claude por MCP. A carga é de um usuário só.

## Decisão

A API usa Node.js 24 e o framework Hono. As rotas HTTP trocam JSON. A validação de entrada usa um esquema declarado por rota [a confirmar: biblioteca de validação no scaffold].

## Consequências

- O servidor MCP pode montar o endpoint no mesmo app Hono (ADR-006).
- As rotas seguem a estrutura por módulo de `apps/api/CLAUDE.md`.

## Alternativas consideradas

| Alternativa | Motivo da recusa |
|---|---|
| Express | API mais antiga, sem tipos nativos nem suporte a Web Standards |
| Fastify | Atende, mas tem mais conceitos (plugins, decorators) do que o app precisa |
| NestJS | Estrutura pesada para um app de um usuário |
