# Contêiner: backup

| Campo | Valor |
|---|---|
| Nível C4 | 2, contêiner |
| Pasta | Script em `apps/api/src/modules/system/backup/` [a confirmar na US-F14-02] |
| Onde roda | Processo de curta duração no kasparov, disparado uma vez por dia por um timer do systemd |
| ADRs | ADR-005; destino e ferramenta da cópia pendentes |
| Ondas | 1 |

## Responsabilidade

- Copiar o banco uma vez por dia, sem parar a API (NFR03, US-F14-02).
- Levar a cópia para fora do disco principal.
- Registrar o resultado de cada execução em `backup_runs`, com data, tamanho e motivo da falha, para a tela Sistema e para o MCP.

## Tecnologias

| Tecnologia | Uso | Licença | Estado |
|---|---|---|---|
| Node.js 24 e better-sqlite3 | Cópia consistente pela API de backup do SQLite | MIT | Proposta, ADR-005 |
| Timer do systemd | Agendamento diário | LGPL-2.1, software do sistema | Proposta: depende da decisão de empacotamento |
| Ferramenta da cópia externa | Envio para o destino fora do disco principal | — | Pendente [a confirmar: por exemplo, restic com cópia cifrada] |

O backup roda como processo separado, e não dentro da API, para funcionar mesmo se a API estiver parada.

## Interfaces

| Direção | Com quem | Como |
|---|---|---|
| Lê | Banco de dados | API de backup do SQLite |
| Grava | Banco de dados, tabela `backup_runs` | Uma linha por execução |
| Envia | Destino do backup | Ferramenta da cópia externa [a confirmar] |

## Regras que o código segue

1. A cópia usa a API de backup do SQLite ou `VACUUM INTO`, nunca a cópia do arquivo com o banco aberto (ADR-005).
2. Toda execução grava o resultado, inclusive a falha, com o motivo (cenário "falha no backup" da F14).
3. A cópia que sai do kasparov vai cifrada, para o destino não ler os dados (NFR01) [a confirmar com a escolha do destino].
4. A restauração tem roteiro escrito e testado antes do fim da onda 1 [a confirmar: documento de operação].
