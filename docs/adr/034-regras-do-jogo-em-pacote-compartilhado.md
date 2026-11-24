# ADR-034: Regras do jogo em pacote compartilhado

| Campo | Valor |
|---|---|
| Status | Aceita |
| Data | 2026-11-24 |
| Decisor | PO |
| Requisitos relacionados | F10, F18, NFR06, H10, Q09, D41, D56, ADR-001, ADR-008, ADR-010, ADR-021 |

Elaborada com apoio de IA, a partir do plano da onda 6a aprovado pelo PO em 2026-11-24. Sujeita a revisão humana.

## Contexto

Na onda 6a, os pontos aparecem no toque em "Próximo", a barra de nível cresce no descanso e a série que passa do recorde é marcada na hora (`docs/prd.md`, Seção 9, F10 e F18). O registro funciona sem sinal: a série entra na fila de envio e chega à API depois (ADR-021, H10). A Q09 (sinal na academia) segue em aberto.

Dois fatos do projeto entram em conflito com isso:

- O app web não guarda regra de negócio: validação de domínio, cálculo do jogo e gravação ficam na API (`docs/arquitetura/app-web.md`, "Responsabilidade").
- O estado do jogo é derivado do histórico, em funções puras do módulo `windows` da API (ADR-010).

Sem decisão nova, o atleta sem sinal fica sem pontos, sem barra e sem recorde até a fila esvaziar. A ADR-001 e a ADR-008 dizem que um pacote compartilhado só entra quando dois apps importarem o mesmo código, por meio de uma ADR nova.

## Decisão

As regras puras do jogo (pontos, nível, perda e recorde) e os parâmetros delas ficam no pacote `@heavy-duty/game`, em `packages/game`, usado pela API e pelo app web. A API continua a fonte da verdade, e o app web mostra um valor provisório até a fila esvaziar. Detalhes que o código segue:

- **Pacote novo.** A tabela de pacotes da ADR-008 ganha a linha `packages/game` → `@heavy-duty/game`. O pacote é privado, só tem funções puras e tipos, sem acesso a banco, rede, DOM ou relógio: recebe séries, catálogo, parâmetros e o instante, e devolve o resultado.
- **Parâmetros.** Ficam em `packages/game/src/game.config.ts`: pontos por série, teto da razão, multiplicador da janela, `outsideWindowPercent` (D52), custo do nível, nível máximo, faixas e perda por dia (D41, D43). A regra da janela não muda de lugar: segue em `apps/api/src/modules/windows/` (ADR-031).
- **API como fonte da verdade.** A API recalcula pontos, nível, perda e recorde do histórico a cada leitura, com as funções do pacote. O que a API devolve vale sobre o que o app web calculou. Esta ADR substitui a ADR-010 só no lugar dessas funções e dos parâmetros delas, que saem do módulo `windows`; o estado derivado do histórico continua.
- **Provisório no app web.** No início do treino, o app web congela o que a conta precisa: janelas, níveis, recordes e o plano de cada exercício (D56). Com esse estado e as séries do treino em andamento, calcula os pontos, a barra e o recorde na hora, inclusive sem sinal.
- **Troca pelo valor da API.** Quando a fila de envio esvazia, o app web busca de novo os dados do jogo na API e troca o provisório pelo valor dela.
- **Fila sem jogo.** Nada do jogo entra na fila de envio: a fila continua só com série, fim, pulo, correção e descarte (ADR-021, ADR-022, ADR-023, ADR-025, ADR-032).
- **Build.** O app web e os testes usam o código-fonte TypeScript do pacote (`transpilePackages` no Next). A imagem de produção da API compila o pacote para JavaScript antes de compilar a API, porque o Node não executa TypeScript dentro de `node_modules`.

## Adendo da onda 6b: sugestão da letra e nível geral

Decidido pelo PO em 2026-11-24, no plano da onda 6b; a decisão continua Aceita. A sugestão pelas janelas (US-F12-01) e o nível geral (US-F10-05) dependem do estado da janela de cada grupo, que muda com o relógio. O treino do dia precisa acompanhar a abertura das janelas sem nova leitura e sem sinal (Q09).

- **Regras no pacote.** O pacote ganha a sugestão da letra pelas janelas (D39, D69 a D71) e o nível geral com o grupo que limita (D29, D67, D68), em funções puras. Os pesos da sugestão ficam em `game.config.ts`.
- **Valor final no app web.** O app web calcula a sugestão e o nível geral no treino do dia, com as cópias da API (treino do dia, janelas e níveis) e o relógio do aparelho. O resultado é o valor final, não provisório: nenhum valor da API o substitui.
- **A API não calcula.** A API não devolve a sugestão pelas janelas nem o nível geral. O `suggestedLetter` de `GET /api/today` continua com a rotação da US-F03-01, e a regra do pacote usa essa letra como último desempate (D70) e como sugestão sem histórico.
- **Sem estado novo.** A sugestão e o nível geral não entram na fila de envio nem no banco.

Consequências do adendo:

- A sugestão e o nível geral acompanham a abertura das janelas pelo relógio do aparelho, inclusive sem sinal.
- A sugestão do celular e o `suggestedLetter` da API divergem por desenho: a letra da API passa a ser só a rotação.
- Uma cópia velha dos níveis muda só o desempate da sugestão e o nível geral, até a próxima leitura.
- A frase "o app web não guarda regra de negócio" ganha uma segunda exceção, em `docs/arquitetura/app-web.md`.

## Consequências

- Pontos, barra e recorde aparecem na academia sem sinal, com a mesma regra da API.
- A API e o app web não divergem na fórmula, porque usam o mesmo código. Podem divergir no estado: o provisório usa o que foi congelado no início do treino, e a API usa o histórico inteiro. A troca quando a fila esvazia fecha a diferença.
- A frase "o app web não guarda regra de negócio" passa a ter uma exceção: o app web executa as regras puras do jogo do pacote, só para o provisório. Validação de domínio e gravação continuam na API.
- O pacote mexe no build do Next, nas imagens Docker de `infra/` e no CI.
- Mudar um parâmetro em `game.config.ts` exige publicar as duas imagens, a da API e a do app web, para o provisório seguir a regra nova.

## Alternativas consideradas

| Alternativa | Motivo da recusa |
|---|---|
| O app web só mostra o jogo depois do envio | Apaga o retorno na academia sem sinal (Q09 em aberto), justo no toque em "Próximo" que a F10 pede |
| Regras duplicadas na API e no app web | Duas fórmulas para manter iguais à mão; a calibração da ADR-010 mudaria uma e esqueceria a outra |
| O app web calcula e envia os pontos pela fila | Contradiz a ADR-010: os pontos guardados não mudariam com a fórmula, e a API teria de confiar no cliente |
| Regras no módulo `windows` da API, importadas pelo app web | O app web passaria a depender do código da API, com banco e servidor no mesmo pacote |
