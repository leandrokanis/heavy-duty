# ADR-005: SQLite como banco de dados

| Campo | Valor |
|---|---|
| Status | Aceita |
| Data | 2026-11-20 |
| Decisor | PO |
| Requisitos relacionados | NFR01, NFR03, US-F14-02 |

## Contexto

Os dados ficam no servidor do PO, sem serviço de terceiros (NFR01). O backup é diário e fica fora do disco principal (NFR03). O app tem um usuário e um processo de API.

## Decisão

A API grava os dados num arquivo SQLite no servidor, em modo WAL. O backup copia o banco com a API online, pela API de backup do SQLite ou por `VACUUM INTO`.

## Consequências

- Não há servidor de banco para instalar, atualizar ou monitorar.
- O teste de integração usa SQLite em memória, com o mesmo esquema.
- Um processo só escreve no banco. Mais de uma instância da API exige rever esta ADR.
- A biblioteca de acesso e a ferramenta de migração são escolhidas no scaffold da onda 1 [a confirmar].

## Alternativas consideradas

| Alternativa | Motivo da recusa |
|---|---|
| PostgreSQL | Um servidor a mais para operar, sem ganho para um usuário |
| Arquivos JSON | Sem transação nem consulta por intervalo (US-F06-01) |
