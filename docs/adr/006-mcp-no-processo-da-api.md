# ADR-006: Servidor MCP no processo da API

| Campo | Valor |
|---|---|
| Status | Proposta |
| Data | 2026-11-20 |
| Decisor | PO |
| Requisitos relacionados | NFR02, F16, US-F16-01, D15, R07 |

## Contexto

O MCP substitui as telas de administração (D15). O Claude administra o app pelo MCP, com autenticação (US-F16-01). Um MCP sem autenticação forte exporia ou apagaria os dados (R07). A API e o MCP aplicam as mesmas regras de negócio.

## Decisão

O servidor MCP usa o SDK oficial em TypeScript, com transporte Streamable HTTP. O endpoint MCP fica no mesmo app Hono da API, em `/mcp`. Cada ferramenta MCP chama o service do módulo, igual à rota HTTP.

## Consequências

- Uma regra de negócio tem um lugar só, o service.
- A API e o MCP compartilham a conexão com o SQLite, o que respeita a ADR-005 (um processo escreve no banco).
- O método de autenticação do MCP precisa funcionar com conector remoto do Claude [a confirmar: OAuth ou outro método aceito pelo cliente].

## Alternativas consideradas

| Alternativa | Motivo da recusa |
|---|---|
| Servidor MCP em processo separado, chamando a API por HTTP | Duplica autenticação e acrescenta um serviço a operar |
| MCP local por stdio | Não atende o Claude fora do servidor. Fica como corte de escopo previsto no PRD (Seção 6, Pivotar) |
