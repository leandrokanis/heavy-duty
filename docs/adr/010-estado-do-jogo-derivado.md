# ADR-010: Estado do jogo derivado do histórico de treinos

| Campo | Valor |
|---|---|
| Status | Substituída por ADR-034 no lugar das regras de pontos, nível, perda e recorde |
| Data | 2026-11-21 |
| Decisor | PO |
| Requisitos relacionados | F07, F10, F11, D24, D28, D29, Q11, Q13, EN01 |

## Contexto

A gamificação calcula janela, pontos, progresso, nível, perda de nível, memória muscular, recorde, nível geral e ranking (`docs/gamificacao.md`). Os parâmetros dessas regras ainda vão mudar: a fórmula dos pontos e o tamanho do nível (Q11), o ritmo da perda (Q13) e o cálculo da janela (EN01) são calibrados com os dados reais do PO.

Há duas formas de guardar esse estado: recalcular tudo a partir do histórico de treinos, ou guardar contadores (nível, pontos) que cada série atualiza.

## Decisão

O estado do jogo é derivado do histórico: a API recalcula janela, pontos, progresso, nível, recorde e ranking a partir das séries registradas, do catálogo e dos parâmetros. Detalhes que o código segue:

- O cálculo fica em funções puras do módulo `windows` da API, sem acesso ao banco: recebem séries, catálogo, parâmetros e o instante atual, e devolvem o estado.
- A perda de nível é calculada na leitura, a partir do tempo desde o fim da janela. Não existe tarefa agendada que desconte pontos.
- Os parâmetros (pontos por série, custo do nível, perda por dia) ficam num arquivo de configuração versionado do módulo.
- Só fica guardado o que não pode mudar quando a fórmula muda: o retrato do período (`period_snapshots`) e a medalha conquistada (`medal_awards`). O modelo está em `docs/arquitetura/dados.md`.
- Se o recálculo ficar lento, a API guarda um cache descartável, que pode ser apagado e refeito a qualquer momento [a confirmar: necessidade medida com dados reais].

## Consequências

- Mudar um parâmetro na calibração não exige migração de dados: o próximo cálculo já usa a regra nova.
- Corrigir ou remover uma série (US-F04-02, US-F06-02) corrige o jogo sem ajuste manual.
- As regras ficam fáceis de testar, com entrada e saída fixas.
- O cálculo percorre o histórico a cada leitura. Com um usuário só e alguns treinos por semana, o custo é pequeno [a confirmar com dados reais].
- Uma mudança de fórmula muda níveis passados. O retrato do período e as medalhas protegem o que precisa ficar congelado.

## Alternativas consideradas

| Alternativa | Motivo da recusa |
|---|---|
| Contadores guardados, atualizados a cada série | Toda mudança de parâmetro exigiria migrar e recalcular os contadores; uma correção de série deixaria o contador errado |
| Registro de eventos do jogo (event sourcing) | Mais complexo que o necessário: o histórico de séries já é o registro dos fatos |
