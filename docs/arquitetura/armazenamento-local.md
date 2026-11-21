# Contêiner: armazenamento local

| Campo | Valor |
|---|---|
| Nível C4 | 2, contêiner (armazenamento de dados) |
| Pasta | `apps/ui/src/sync/` |
| Onde roda | IndexedDB do navegador do celular |
| ADRs | ADR-009; ADR de sincronização pendente (H10) |
| Ondas | 3 em diante |

## Responsabilidade

- Guardar a série registrada até a API confirmar o recebimento (US-F03-03).
- Guardar o treino do dia em andamento, para o fluxo continuar se o app fechar ou a rede cair.
- Guardar uma cópia do programa e dos valores do último treino, para o treino abrir sem sinal.

O armazenamento local não é fonte da verdade. Quando a API confirma uma série, o registro local é apagado.

## Tecnologias

| Tecnologia | Uso | Licença | Estado |
|---|---|---|---|
| IndexedDB | Banco do navegador | Padrão da web | Aceita, ADR-009 |
| Dexie | Acesso tipado ao IndexedDB | Apache-2.0 | Proposta [a confirmar na US-F03-03] |
| UUID gerado no cliente | ID da série e chave de idempotência | — | Pendente: versão do UUID (`docs/convencoes/codigo.md`, Seção 7) |

## Dados guardados

| Tabela local | Conteúdo | Quando sai |
|---|---|---|
| `pendingSets` | Série com ID, treino, exercício, carga, repetições ou tempo e horário | Quando a API confirma o recebimento |
| `activeWorkout` | Letra, exercício atual, séries feitas, exercícios pulados, fim do descanso | Quando o treino termina ou é encerrado |
| `programCache` | Programa ativo e valores do último treino de cada exercício | Quando a API devolve uma versão nova |

## Interfaces

| Direção | Com quem | O que trafega |
|---|---|---|
| Lê e grava | App web, no navegador | As tabelas acima |
| Envia, pelo app web | API, `POST /api/workouts/{id}/sets` | Séries da fila, em ordem, com o ID como chave de idempotência |

## Regras que o código segue

1. A série entra na fila antes do envio, mesmo com rede. O envio direto sem fila perde a série se a requisição falhar.
2. O reenvio usa o mesmo ID. A API trata o ID repetido como a mesma série (US-F03-02).
3. A fila é enviada em ordem de registro. Uma série que a API recusa por regra de domínio sai da fila e aparece para o atleta corrigir.
4. A tela mostra quantas séries aguardam envio, sem bloquear o treino (`DESIGN.md`, princípio 4).

A estratégia de conflito (por exemplo, série corrigida no Mac enquanto outra está na fila do celular) é decidida na ADR de sincronização, antes da onda 3.
