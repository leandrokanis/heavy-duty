# ADR-026: Confirmação em duas chamadas nas ferramentas do MCP que alteram o histórico

| Campo | Valor |
|---|---|
| Status | Aceita |
| Data | 2026-11-22 |
| Decisor | PO, por delegação no plano do MVP |
| Requisitos relacionados | F06, US-F06-02, ADR-006, ADR-020 |

Elaborada com apoio de IA. Sujeita a revisão humana.

## Contexto

A US-F06-02 pede ao planejador editar ou remover um treino pelo Claude (`docs/prd.md`, Seção 9, F06). A remoção só vale depois de uma confirmação explícita. A regra 3 de `apps/api/CLAUDE.md` já pede essa confirmação em ferramenta destrutiva.

Fatos do projeto que a decisão usa:

- O transporte do MCP não guarda estado e responde em JSON. Cada requisição cria um servidor e um transporte novos (ADR-006, `docs/arquitetura/mcp.md`).
- O servidor não vê a conversa entre o PO e o Claude.
- O `/mcp` exige a credencial do MCP em toda chamada (ADR-020).
- O backup diário recupera um treino removido (ADR-018).

## Decisão

A ferramenta que altera o histórico age em duas chamadas, e o código de confirmação vem do pedido e do estado do treino. Detalhes que o código segue:

- **Primeira chamada.** Sem `confirmationCode` (ausente, vazio ou só com espaços), o service confere o pedido e devolve a prévia com `applied: false` e um `confirmationCode`. Nada muda no banco.
- **Segunda chamada.** Com `confirmationCode`, o service recalcula o código sobre o estado atual do treino, dentro da mesma transação da gravação. Se o código confere, o service aplica e devolve `applied: true` e `confirmationCode: null`. Se não confere, o service recusa com `workout_confirmation_stale`.
- **Código.** É o SHA-256, em 32 caracteres hexadecimais, de um JSON canônico com a ação, o pedido e o estado do treino (início, fim, motivo do fim, séries com valores e `correctedAt`, e exercícios pulados). Renomear o programa ou a letra não invalida o código.
- **Sem segredo e sem tabela.** O código não é credencial e não fica no banco. Quem chama já tem a credencial do MCP.
- **Validação antes da prévia.** Treino inexistente, série inexistente e valor inválido são recusados com ou sem código, sem prévia.
- **Anotações.** As ferramentas declaram `readOnlyHint: false` e `destructiveHint: true`. A descrição manda mostrar a prévia ao PO, esperar a confirmação dele na conversa e só então repetir o pedido com o código.

## Consequências

- O cliente repete o pedido com o código. A prévia mostra ao PO o que muda antes de a mudança valer.
- A mudança do treino entre as duas chamadas (série corrigida, treino terminado, pulo novo) invalida o código, e o planejador pede nova prévia.
- A confirmação do PO na conversa depende do Claude seguir a descrição da ferramenta e do cliente tratar o `destructiveHint`. O servidor não prova que o PO confirmou. Não há verificação, neste ciclo, de como o conector do Claude trata o `destructiveHint`; a decisão não depende dele, porque a descrição da ferramenta e a prévia já impõem a confirmação.
- O código não protege contra um cliente malicioso com credencial válida, porque ele consegue pedir a prévia e repetir o pedido. O backup diário limita o dano.
- Toda ferramenta destrutiva nova sobre o histórico segue este protocolo.

## Alternativas consideradas

| Alternativa | Motivo da recusa |
|---|---|
| Parâmetro `confirm: true` na chamada única | O cliente envia `true` sem o PO ver a prévia |
| Elicitação do MCP | Exige transporte com estado, que a ADR-006 não usa |
| Código aleatório guardado no banco, com validade | Pede tabela nova e limpeza do que vence, sem ganho de segurança |
| HMAC com segredo do servidor | Pede variável sensível nova, e quem chama já tem a credencial do MCP |
| Só o `destructiveHint` | Depende do cliente e não confere o estado do treino |
