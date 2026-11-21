# ADR-014: ID de entidade em UUID v7

| Campo | Valor |
|---|---|
| Status | Aceita |
| Data | 2026-11-21 |
| Decisor | PO, por delegação no plano do MVP |
| Requisitos relacionados | F03, US-F03-02, US-F03-03, EN-S0 (FR-015) |

## Contexto

O ID de entidade é uma string UUID, com a versão a confirmar antes da onda 3 (`docs/convencoes/codigo.md`, Seção 7). A série registrada no celular leva um ID gerado no cliente, que também é a chave de idempotência da fila sem sinal (`apps/ui/CLAUDE.md`, regra 3; plano do MVP, onda 3). Um ID ordenável no tempo mantém o índice da chave primária em ordem de inserção.

## Decisão

O ID de entidade é um UUID versão 7 (RFC 9562, Seção 5.7), em texto. Detalhes que o código segue:

- A API gera o ID com `createId()` de `apps/api/src/db/id.ts`, sobre o pacote `uuid` 14.0.3 (MIT).
- `createId()` aceita o instante em milissegundos, para o teste não depender do relógio real.
- O app web ganha o próprio gerador na US-F03-02. Um pacote compartilhado só entra com ADR nova (ADR-001).

## Consequências

- Os 48 bits iniciais do ID guardam o instante de criação, então a ordem do texto segue a ordem do tempo.
- O ID revela o instante de criação da entidade. Para um app de um usuário, sem ID exposto a terceiros, o risco foi aceito.
- O teste do gerador lê o instante gravado no ID, e não só a ordem, porque o UUID v7 é monótono no mesmo processo.

## Alternativas consideradas

| Alternativa | Motivo da recusa |
|---|---|
| UUID v4 | Aleatório; espalha as inserções pelo índice e não ordena pelo tempo |
| ULID | Formato fora do padrão UUID; a coluna e os validadores teriam de aceitar outro formato |
| Inteiro autoincremento | Não pode ser gerado no celular sem sinal, o que quebra a idempotência da fila |
