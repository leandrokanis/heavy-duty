# Ferramentas do servidor MCP

Este documento lista as ferramentas do servidor MCP da API: nome, descrição, parâmetros, se a ferramenta é destrutiva e o service que ela chama. O servidor MCP roda no processo da API, em `/mcp` (ADR-006).

## Transporte e acesso

- O servidor usa o `WebStandardStreamableHTTPServerTransport` do `@modelcontextprotocol/sdk` 1.32.2, sem estado e com resposta JSON. Cada requisição cria um servidor MCP e um transporte (`apps/api/src/mcp/server.ts`).
- O cliente envia `POST /mcp` com o cabeçalho `Accept: application/json, text/event-stream`.
- Fora de `NODE_ENV=production`, o `/mcp` fica disponível sem autenticação, só no ambiente de desenvolvimento. Em produção, o `/mcp` responde 404 até a US-F16-01 trazer a autenticação (ADR-017).
- O servidor se apresenta como `heavy-duty` e declara a capacidade `tools`.

## Regras das ferramentas

- O nome da ferramenta é em `snake_case`, com verbo primeiro (`apps/api/CLAUDE.md`, regra 4).
- A ferramenta chama o mesmo service da rota HTTP (ADR-006).
- A ferramenta que apaga ou altera histórico declara `destructiveHint: true` e só age depois de confirmação explícita (US-F06-02).
- O registro das ferramentas fica em `apps/api/src/mcp/tools/index.ts`. Ferramenta nova, alterada ou removida atualiza este arquivo no mesmo commit.

## Lista de ferramentas

O EN-S0 não registra ferramenta: `tools/list` devolve uma lista vazia. A primeira ferramenta entra na US-F01-01.

| Ferramenta | Descrição | Parâmetros | Destrutiva | Service |
|---|---|---|---|---|
| — | — | — | — | — |
