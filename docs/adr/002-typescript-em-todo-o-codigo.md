# ADR-002: TypeScript em todo o código

| Campo | Valor |
|---|---|
| Status | Aceita |
| Data | 2026-11-20 |
| Decisor | PO |
| Requisitos relacionados | F16 |

## Contexto

A UI roda no navegador e precisa de JavaScript. A API precisa de um SDK de servidor MCP. O MCP tem SDK oficial em TypeScript. O projeto tem um mantenedor, e uma linguagem só reduz o custo de troca de contexto.

## Decisão

Todo o código do repositório é TypeScript, com `strict: true`. A UI, a API, os scripts e a suíte ponta a ponta usam a mesma linguagem.

## Consequências

- Os tipos do domínio podem ser compartilhados entre UI e API.
- Uma ferramenta de teste (Vitest) serve aos dois apps.
- O servidor exige Node.js 24, a versão de `.nvmrc`.

## Alternativas consideradas

| Alternativa | Motivo da recusa |
|---|---|
| Ruby on Rails na API | Duas linguagens no repositório e SDK MCP não oficial |
| Python com FastAPI na API | Duas linguagens no repositório |
