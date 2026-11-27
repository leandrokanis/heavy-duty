# ADR-039: Períodos e retrato congelado

| Campo | Valor |
|---|---|
| Status | Aceita |
| Data | 2026-11-27 |
| Decisor | PO |
| Requisitos relacionados | F11, US-F11-01, US-F11-02, US-F11-03, D24, D36, D42, D74, D81, D94 a D101, ADR-006, ADR-010, ADR-031, ADR-036 |

Elaborada com apoio de IA, a partir do plano da onda 7b aprovado pelo PO em 2026-11-27. Sujeita a revisão humana.

## Contexto

A F11 organiza o progresso em períodos de 12 semanas, com uma frase de intenção, e congela o mapa do corpo num retrato no fim de cada período (`docs/prd.md`, Seção 9). O retrato não muda depois, nem quando o planejador edita um treino daquele período pelo Claude. A sequência de semanas conta semanas com a meta semanal cumprida, com uma proteção por período (D42).

Fatos do código e dos documentos que pesam na decisão (plano da onda 7b, Seção 1):

- O estado do jogo é derivado do histórico a cada leitura (ADR-010). A própria ADR-010 já prevê a exceção: o retrato do período fica guardado, porque não pode mudar quando a fórmula muda.
- A semana da API é um bloco de 7 × 24 h a partir do início que o celular manda (D74). Período, sequência e resumo semanal precisam da semana no servidor, sem pedido do celular. O único fuso do servidor é `NOTICE_TIME_ZONE` (D81).
- O agendador dos avisos só parte com um canal configurado (ADR-036), e nenhum canal está configurado em produção. O congelamento do retrato não pode depender dele.
- O `dados.md` já desenha `periods` e `period_snapshots`, mas nada existe no código.
- A produção só recebe a onda inteira, pelo PR da `dev` para a `main` (ADR-030). O primeiro período nasce na primeira partida da API com a migração da onda 7b.

## Decisão

A API guarda só o início do período 1 e a frase de cada período, calcula os outros limites pela aritmética e grava o retrato uma vez, no fim do período, por um agendador do jogo sempre ligado no processo da API. Detalhes que o código segue:

- **Início guardado, o resto pela conta.** Na partida, com `periods` vazia, a API grava o período 1, que começa na segunda-feira 00:00 da semana, no fuso, e termina 84 dias depois (D95). O período *n* começa no início do período 1 + (*n* − 1) × 84 dias, sem realinhar ao ciclo trimestral (D94). A linha de cada período seguinte nasce na primeira leitura ou no agendador do jogo.
- **Fuso e semana do servidor.** O fuso `NOTICE_TIME_ZONE` vale para o período, a semana do servidor, a sequência e o resumo semanal (D96). O período guarda `starts_at` e `ends_at` em UTC, e as semanas do período são blocos de 7 × 24 h a partir de `starts_at`. A D74 continua no celular: a meta semanal da faixa de jogo usa a semana do fuso do aparelho.
- **Frase de intenção.** A frase fica na linha do período, opcional, com até 120 caracteres, e muda até o fim do período (D98). A rota da tela Período e a ferramenta `set_period_intention` gravam direto, sem prévia nem código de confirmação, porque a frase não altera o histórico (ADR-026 não se aplica).
- **Derivado a cada leitura.** A semana atual do período, as metas do período (O1 e O4), o progresso no período de cada grupo (D100), a sequência de semanas e a proteção (D101), os pontos da semana (D102) e o ranking pessoal (D105) são recalculados do histórico, como manda a ADR-010. O histórico anterior ao período 1 fica fora do ranking, da sequência, das medalhas e do retrato, e continua no nível, no melhor nível, no recorde e nas janelas (D97).
- **Retrato gravado uma vez.** O retrato congela, por grupo, o nível, os pontos da barra, o melhor nível, o estado da janela e as janelas aproveitadas e perdidas no período, e, no período, a frase, as janelas, os pontos, os pontos do melhor treino e a sequência no fim (D99). A conta usa só as séries anteriores ao fim do período, com o fim como instante de corte. O retrato fica em `period_snapshots` e nunca muda, mesmo se a fórmula do jogo mudar ou se o planejador editar um treino do período (ADR-010).
- **Agendador do jogo.** Um agendador próprio, `game-scheduler.ts`, roda no processo da API (ADR-006) com ciclo de 60 s e parte sempre, com ou sem canal de aviso configurado. A cada ciclo, abre o período novo e congela o período que terminou; na onda 7b, também sincroniza as medalhas (ADR-040). O `server.ts` chama `stop()` no `SIGTERM`, como os outros agendadores.
- **Congelamento também na leitura.** A leitura do período congela o período terminado ainda sem retrato, para o servidor parado no fim do período não deixar o retrato faltando. O congelamento é idempotente: o retrato de um período só é gravado uma vez.

## Consequências

- A tela Período aparece no deploy da onda 7b, e o período 1 inclui os treinos da semana do deploy.
- O retrato e a coleção de retratos ficam estáveis para sempre, e a calibração do jogo não muda o passado congelado.
- O retrato calculado com atraso, depois de uma edição feita entre o fim do período e o congelamento, já sai com a edição. A janela de atraso é de até 60 s, ou o tempo do servidor parado [estimativa: o intervalo do ciclo].
- A semana do servidor e a semana do aparelho divergem quando o fuso do aparelho difere de `NOTICE_TIME_ZONE`. Com o PO no Brasil, as duas coincidem [estimativa: fuso do aparelho igual ao padrão].
- A API passa a ter dois agendadores do domínio no mesmo processo: o dos avisos, que depende dos canais, e o do jogo, sempre ligado.
- A `main` não pode receber a onda 7b em partes: o deploy grava o início do período 1. Correção urgente da onda 7a durante a onda sai por branch da `main`, sem a onda 7b.

## Alternativas consideradas

| Alternativa | Motivo da recusa |
|---|---|
| Congelar o retrato no agendador dos avisos | O agendador dos avisos só parte com canal configurado (ADR-036), e nenhum canal está configurado em produção |
| Realinhar os períodos ao trimestre, com períodos de 13 semanas ou o primeiro mais curto | Contradiz as 12 semanas do PRD e da D36 (D94) |
| Uma linha por período gravada antes, com as datas | Mais estado guardado sem necessidade: os limites saem da conta a partir do início do período 1 |
| Variável nova `APP_TIME_ZONE` para o período | Dois fusos no servidor, que podem divergir; `NOTICE_TIME_ZONE` já existe (D96) |
| Retrato derivado na leitura, sem gravar | O retrato mudaria com a calibração e com a edição de treino, contra o cenário "retrato congelado" e a ADR-010 |
| Período 1 no instante do deploy | As semanas do período não começariam na segunda-feira e divergiriam da semana da meta semanal (D95) |
