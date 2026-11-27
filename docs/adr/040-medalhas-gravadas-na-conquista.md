# ADR-040: Medalhas gravadas na conquista

| Campo | Valor |
|---|---|
| Status | Aceita |
| Data | 2026-11-27 |
| Decisor | PO |
| Requisitos relacionados | F19, US-F19-01, D23, D24, D59, D97, D103, D104, ADR-010, ADR-031, ADR-034, ADR-039 |

Elaborada com apoio de IA, a partir do plano da onda 7b aprovado pelo PO em 2026-11-27. Sujeita a revisão humana.

## Contexto

A US-F19-01 pede medalhas por marcos, algumas ocultas até a conquista. A medalha desce do topo da tela na conquista, fica na estante e nunca se perde, nem quando o nível do grupo cai (`docs/prd.md`, Seção 9; D24). O catálogo inicial tem 10 medalhas, de volume, janelas, sequência, nível e recorde (D103).

Fatos do código e dos documentos que pesam na decisão (plano da onda 7b, Seção 1):

- O estado do jogo é derivado do histórico (ADR-010). A medalha conquistada é a outra exceção que a ADR-010 já prevê: fica guardada, porque não pode mudar quando a fórmula muda.
- Várias medalhas dependem das janelas, que só a API calcula (ADR-031), e da sequência de semanas, que a API calcula no período (ADR-039). O celular só tem o provisório de pontos, nível e recorde do treino em andamento (ADR-034).
- Os recordes por série só existem no celular hoje; a API usa `personalRecordsOf` só no treino do dia. As medalhas precisam do recálculo com a marca de recorde de cada série.
- O nível geral só existe no celular (ADR-034, adendo da onda 6b).
- O `dados.md` já desenha `medal_awards`, com `medal_code` único.

## Decisão

O catálogo das medalhas fica no código da API, as regras de conquista são funções puras sobre o histórico, e a API grava cada conquista uma vez, com o instante do evento, sem provisório no celular. Detalhes que o código segue:

- **Módulo próprio.** As medalhas ficam no módulo `medals` da API, fora do módulo `windows`.
- **Catálogo no código.** `medals.catalog.ts` define cada medalha: código, nome, ícone, se é oculta e os limiares (D103). Mudar um limiar vale só para quem ainda não conquistou a medalha.
- **Regras puras.** `medals.rules.ts` recebe as séries, os recordes, os níveis, as janelas, as semanas e os períodos, e devolve, para cada medalha alcançada, o instante e o treino da conquista. A regra não acessa banco, rede nem relógio.
- **Só do período 1 em diante.** O histórico anterior ao período 1 não rende medalha (D97).
- **Detecção na leitura e no agendador.** A API compara o resultado das regras com as conquistas guardadas na leitura das medalhas e no agendador do jogo (ADR-039), e grava a conquista nova. A gravação é idempotente pelo código da medalha.
- **Conquista guardada.** `medal_awards` guarda uma linha por medalha conquistada: `medal_code` único, `subject` opcional (o grupo muscular da medalha de nível, como o "nível 10 em peito"), `workout_id` opcional com `ON DELETE SET NULL` e `awarded_at`, o instante do evento, e não o da detecção.
- **Nunca removida.** Nenhuma correção, remoção de treino ou mudança de fórmula tira a medalha. A remoção do treino que rendeu a medalha só zera `workout_id`.
- **Sem provisório no celular.** O celular mostra a medalha nova quando a fila de envio esvazia e o app lê as medalhas de novo: a medalha desce do topo da tela e aparece no treino concluído (D104).
- **Oculta sem nome.** A leitura das medalhas devolve o catálogo inteiro, e a medalha oculta ainda não conquistada vem sem nome e sem critério.

## Consequências

- A medalha fica estável, como pede a D24, e a calibração do jogo não tira o que o atleta conquistou.
- A regra de medalha usa os mesmos dados derivados da API (janelas, sequência, recordes), sem duplicar regra no celular.
- Sem sinal, a medalha aparece só quando a fila esvazia. Com sinal, a fila esvazia em segundos [estimativa: o envio da série].
- Uma medalha rendida por um treino que depois foi corrigido ou removido continua na estante, mesmo que o histórico atual não a renda mais.
- Os limiares do catálogo saem sem dado real e podem precisar de calibração; a mudança não alcança quem já conquistou.
- O `dados.md` ganha as colunas `subject` e a regra `ON DELETE SET NULL` em `medal_awards`.

## Alternativas consideradas

| Alternativa | Motivo da recusa |
|---|---|
| Medalha derivada a cada leitura, sem gravar | A medalha sumiria com a correção de um treino ou com a calibração, contra o cenário "medalha nunca se perde" e a ADR-010 |
| Regra também no celular, como provisório | As regras usam as janelas e a sequência, que só a API calcula (ADR-031, ADR-039); o pacote `@heavy-duty/game` só leva o que os dois apps usam (ADR-034) |
| Medalhas retroativas, com o histórico anterior ao período 1 | Várias medalhas de uma vez no deploy; a estante estrearia cheia (D97) |
| Catálogo em tabela do banco | O catálogo muda com o código das regras; uma tabela pediria migração a cada medalha nova |
| Medalha de nível geral | O nível geral só existe no celular (ADR-034, adendo da onda 6b) |
