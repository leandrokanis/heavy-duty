# Projeto de gamificação do Heavy Duty (Octalysis)

**Versão:** 0.6 · **Data:** 2026-11-27 · **Status:** rascunho, sujeito a revisão do PO · Elaborado com apoio de IA

Neste documento, **Decisão** marca o que o PO decidiu e **Proposta** marca o que foi sugerido e ainda não foi validado. O resumo do projeto e os IDs de questões (Q), riscos (R), hipóteses (H) e decisões (D) estão em `prd.md`, Seção 3. A gamificação entra nas ondas 5 a 7 do roadmap.

O protótipo navegável mostra as mecânicas deste documento com valores ilustrativos. Ele fica fora do repositório.

## Problema que a gamificação resolve

A academia caiu para uma vez por semana ou menos porque nada puxa o PO de volta. A gamificação existe para criar esse gatilho fora da academia, sustentar a regularidade ao longo do tempo e dar sensação de progresso durante o treino.

Ela usa pontos, níveis, recordes, medalhas e ranking pessoal, sem elementos sociais (**Decisão**, PRD D23). A versão 0.1 deste documento excluía pontos, medalhas e ranking. O PO retirou essa exclusão porque a gamificação ficou discreta demais no dia a dia. Na versão 0.3, o grupo passou a perder nível quando a janela passa (PRD, D24). Na versão 0.4, o nível passou a ir de 1 a 20 e a medir a forma atual do grupo (PRD, D28). Na versão 0.5, o PO aceitou as propostas da Q06, da Q08, da Q11, da Q12 e da Q13 (PRD, D39 a D43): a sugestão pelas janelas, o músculo secundário pela metade, os pontos e o nível, a proteção da sequência de semanas e o ritmo da perda passam de **Proposta** a **Decisão**, com os números como parâmetros de partida, recalculáveis com os dados reais (ADR-010). Na versão 0.6, entram as decisões da onda 7b (PRD, D94 a D108): os períodos sem realinhar ao ciclo trimestral (Q01), o catálogo de medalhas (Q17) e a medalha que aparece quando a fila de envio esvazia. As stories estão no PRD, Seção 9.

## Regra de desenho: black hat e white hat

No Octalysis, os núcleos "black hat" (escassez, imprevisibilidade, perda) criam urgência, mas cansam e geram ressentimento com o tempo. Os núcleos "white hat" (significado, realização, criatividade) dão prazer e sentido, mas não criam urgência.

> **O black hat traz de volta; o white hat faz ficar.**

Poucos núcleos com intensidade alta funcionam melhor do que os oito mornos.

## Termos da gamificação

Os nomes no código estão em `../CONTEXT.md`, Seção "Gamificação".

- **Janela de atividade:** o intervalo, calculado pelo app, em que treinar um grupo muscular rende o progresso cheio.
- **Período:** um bloco de 12 semanas com começo e fim. Não usar "temporada".
- **Volume ajustado:** o volume registrado (séries × repetições × carga), vezes o fator do objetivo do programa (força 130%, hipertrofia 100%, resistência 75%). Entra só no cálculo da janela; os pontos não usam esse ajuste (**Decisão**).
- **Progresso:** a barra de cada grupo muscular. Cresce com o treino e esvazia enquanto o grupo esfria.
- **Esfriar:** o estado de um grupo cuja janela passou sem treino. Enquanto esfria, o grupo perde nível aos poucos.
- **Pontos:** o que cada série rende, relativo ao plano: a série que bate o planejado vale 10. Valem em dobro dentro da janela.
- **Nível:** o degrau de cada grupo muscular, de 1 a 20. Mede a forma atual do grupo: sobe com treinos regulares e cai quando o grupo esfria. A barra de progresso enche com os pontos e, cheia, sobe o nível; vazia por esfriamento, o grupo cai um nível.
- **Nível geral:** o nível do grupo mais fraco entre os que o programa treina.
- **Faixa:** o grupo de níveis que define a forma e a cor do selo: círculo de bronze (1 a 4), escudo de prata (5 a 10), hexágono de ouro (11 a 16) e estrela violeta (17 a 20).
- **Melhor nível:** o maior nível que um grupo já teve. Nunca se perde.
- **Memória muscular:** pontos em dobro para um grupo abaixo do melhor nível, até alcançá-lo de novo.
- **Recorde:** a maior carga de um exercício para um número de repetições.
- **Medalha:** conquista por um marco. Algumas ficam ocultas até a conquista.
- **Ranking pessoal:** a ordem dos treinos do PO por pontos. Compara só com o próprio histórico.
- **Sequência de semanas:** quantas semanas seguidas o PO cumpriu a meta semanal de janelas.

## Regras do jogo decididas pelo PO

1. **Janela por grupo muscular.** O app calcula quando ela abre e quanto tempo fica aberta, a partir do último treino daquele grupo. O PO não define isso previamente.
2. **Cálculo da janela.** A janela abre 24 h depois do treino, mais 1 hora a cada 60 kg de volume ajustado, com teto de 72 h, e fecha 120 h depois do treino. O músculo secundário também abre a janela, com metade do volume (ADR-031).
3. **O que conta.** Só musculação, em qualquer divisão (corpo inteiro, ABC, superior/inferior). O BJJ fica fora.
4. **Sem frequência-alvo fixa.** A frequência é consequência das janelas, não uma meta pressuposta.
5. **Progresso.** Uma barra por grupo muscular. Treinar dentro da janela faz a barra crescer mais; fora dela, cresce menos.
6. **Janela perdida.** Assim que a janela passa sem treino, o grupo esfria e a barra de progresso começa a esvaziar. Quando a barra chega a zero, o grupo cai um nível, e a perda continua enquanto o grupo não for treinado (PRD, D24). Quatro proteções acompanham a perda:
   - **Aviso antes da queda:** o app avisa antes de o grupo cair de nível.
   - **Memória muscular:** os níveis perdidos voltam com pontos em dobro até o melhor nível do grupo.
   - **O que nunca se perde:** medalhas, recordes, retratos e o melhor nível de cada grupo.
   - **Ritmo lento:** a perda é gradual, com ritmo calibrado pelos dados reais (PRD, Q13).
7. **Avisos.** Um perto de a janela abrir e outro perto de fechar. O aviso é um por letra, com os grupos que ela treina, e não um por grupo (PRD, D31). Todo aviso vai pelos dois canais, celular e e-mail (PRD, D32).
8. **Períodos.** Duram 12 semanas, em blocos seguidos a partir do período 1, que começa na segunda-feira da semana do deploy da onda 7b, sem realinhar ao ciclo trimestral (PRD, D94 e D95). No fim, o mapa do corpo é congelado num retrato, e o período seguinte recomeça do zero na barra do período, nas metas e no ranking. O nível de cada grupo atravessa os períodos (PRD, D24).
9. **Pontos e conquistas.** Cada série rende pontos, que sobem o nível dos grupos treinados. Recordes, medalhas e ranking pessoal marcam o progresso. Não há compartilhamento nem comparação com outras pessoas (PRD, D23).
10. **Nível de 1 a 20.** O nível mede a forma atual do grupo e premia a regularidade. Aproveitando todas as janelas, o grupo chega ao 20 em cerca de 4 semanas, período em que o corpo já mostra diferença perceptível. As 4 semanas são um parâmetro, calibrado com os dados reais (PRD, D28 e Q11). No 20, os pontos continuam contando para o ranking e as medalhas, e a perda continua valendo: o jogo passa a ser manter o 20.

## Os oito núcleos do Octalysis

As intensidades (0 a 10) são **Proposta** e servem de referência para calibrar o desenho.

| Núcleo | Chapéu | Intensidade | Mecânica no app | Origem |
|---|---|---|---|---|
| 1. Significado épico e chamado | White | 2 | Frase de intenção escrita ao abrir o período (ex.: "costas fortes para o tatame"), exibida no retrato final | Proposta |
| 2. Desenvolvimento e realização | White | 9 | Pontos por série, nível por grupo, recordes, barra de progresso e mapa do corpo. É o núcleo principal | Decisão |
| 3. Criatividade e feedback | White | 5 | Divisão, objetivo e cargas livres; ao registrar, o app mostra na hora os pontos ganhos e quando cada grupo reabre | Decisão (liberdade) e Proposta (feedback) |
| 4. Propriedade e posse | — | 7 | Estante de medalhas e coleção de retratos congelados, um por período | Decisão |
| 5. Influência social | — | 0 | Excluído | Decisão |
| 6. Escassez e impaciência | Black | 7 | A janela tem dois lados: impaciência antes de abrir e prazo depois de aberta, com pontos em dobro enquanto aberta. Os avisos levam essa mecânica para fora do app | Decisão |
| 7. Imprevisibilidade e curiosidade | Black | 5 | A variação natural da janela, que muda conforme o volume do treino, e as medalhas ocultas | Proposta |
| 8. Perda e evitação | Black | 7 | O grupo esfria e perde nível com o tempo; o aviso antes da queda dá a chance de reagir | Decisão |

## Equilíbrio entre os núcleos

**White hat (1, 2, 3) contra black hat (6, 7, 8): 16 contra 19.** Com a perda de nível, o desenho pende para a pressão. Para quem está recomeçando, pressão demais vira cobrança. Por isso a perda vem com as quatro proteções da regra 6, e a memória muscular é o principal contrapeso: ela transforma a volta num ganho acelerado.

**Lado esquerdo (2, 4, 6) contra lado direito (3, 5, 7): 23 contra 10.** Esse é o ponto fraco, e pontos e medalhas o reforçam. O lado esquerdo é motivação extrínseca (ter, conquistar, não perder o prazo), e o direito é intrínseca (o prazer da atividade em si). O desenho leva o PO à academia pela barra, pelos pontos e pelo prazo, não pelo gosto de treinar. Quando a novidade passar, por volta da quinta à oitava semana do período, o jogo pode perder força (PRD, R04).

**Contrapesos:**

- O núcleo 3. Quanto mais o app deixar ver o efeito das próprias escolhas (um treino mais pesado empurra a reabertura, uma divisão nova muda o mapa), mais intrínseco o jogo fica.
- O recorde. Ele marca progresso real de carga, ligado à meta O4, e não só acúmulo de pontos.

Cada mecânica premia uma coisa: o nível premia a regularidade (O1), o recorde premia a força (O4), e medalhas, ranking e retratos guardam o histórico de longo prazo (núcleo 4).
- As medalhas ocultas, que sobem o núcleo 7, do lado direito.
- A memória muscular, que recompensa o retorno em vez de castigá-lo.

## Mecânicas de pontos, níveis e medalhas

As mecânicas desta seção são **Proposta**. Os números servem ao protótipo e são parâmetros da Q11 e da Q13 do PRD.

| Mecânica | Regra | Onde aparece |
|---|---|---|
| Pontos por série | Relativos ao plano: 10 × (volume feito ÷ volume planejado da série), até o dobro do plano, e em dobro se algum grupo do exercício está em janela. Pernas e braços rendem o mesmo pelo mesmo esforço relativo | Ao tocar em "Próximo", os pontos sobem do botão ("+21 ×2") |
| Nível por grupo | Cada grupo recebe o mesmo total por treino completo, não importa quantas séries tenha na letra: cerca de 60 pontos, ou 120 na janela. O nível vai de 1 a 20; o nível *n* custa 40 + 3 × (*n* − 1) pontos. O primeiro treino na janela leva o grupo do 1 ao 3, e cerca de 10 treinos na janela levam ao 20 | Barra de nível no descanso, no mapa e no detalhe do grupo |
| Faixas | Círculo de bronze (1 a 4), escudo de prata (5 a 10), hexágono de ouro (11 a 16) e estrela violeta (17 a 20). O selo muda de forma e de cor a cada faixa, para a faixa não depender só da cor | Todos os selos de nível |
| Nível geral | O nível do grupo mais fraco entre os que o programa treina, de 1 a 20. O app mostra qual grupo limita o nível geral, e um toque leva à letra que mais treina esse grupo (PRD, D29). Nível geral 20 é forma completa: todos os grupos no topo ao mesmo tempo | Topo do treino do dia |
| Subida de nível | Nível comum sobe na própria barra do descanso, com animação e som curtos. A tela cheia, por cerca de 1,7 s e sem pedir toque, fica para a entrada numa faixa (5, 11 e 17) e para o 20 | Descanso |
| Recorde | Maior carga com as mesmas repetições, ou mais repetições com a mesma carga. A marca do recorde aparece ao lado da carga e acende quando o valor passa dela | Série e descanso |
| Medalha | Marco de volume, de janelas, de sequência, de nível ou de recorde, conquistado uma vez. O catálogo inicial tem 10 medalhas, 2 delas ocultas até a conquista (PRD, D103). A API calcula e grava a conquista, que nunca sai (ADR-040) | Aviso no topo da tela quando a fila de envio esvazia, fim do treino e estante na tela Período (PRD, D104) |
| Ranking pessoal | Treinos ordenados por pontos dentro do período | Fim do treino ("2º do período") e tela Período |
| Meta semanal de janelas | Janelas aproveitadas na semana contra uma meta | Faixa de jogo no treino do dia |
| Sequência de semanas | Semanas seguidas com a meta semanal cumprida, com uma proteção por período (Q12) | Faixa de jogo no treino do dia |
| Reabertura das janelas | Depois do treino, o app mostra quando cada grupo trabalhado reabre | Fim do treino |
| Perda de nível | Assim que a janela passa, a barra do grupo esvazia cerca de 40 pontos por dia. Parado, o grupo vai do 20 ao 1 em 4 a 5 semanas; uma semana sem treino custa uns 4 ou 5 níveis (Q13) | Mapa, detalhe do grupo e treino do dia |
| Aviso de queda | O app avisa antes de o grupo cair de nível, com a letra que treina o grupo | Treino do dia, aviso no celular e e-mail |
| Resumo semanal | Um e-mail por semana com janelas aproveitadas, níveis, recordes e medalhas (PRD, US-F17-03) | E-mail |
| Memória muscular | Grupo abaixo do melhor nível rende pontos em dobro (↺ ×2) até alcançá-lo; voltar do zero ao melhor nível leva umas 2 semanas. Não soma com o ×2 da janela | Série, descanso, mapa e detalhe do grupo |

O período passa a medir manutenção: com o 20 ao alcance na semana 4, as outras semanas são de segurar o nível, e o retrato registra quanto tempo cada grupo ficou no topo.

O fim do treino reúne a recompensa: pontos do treino, posição no ranking pessoal, recordes, níveis ganhos, medalhas novas e reabertura das janelas.

## Retorno ao jogador: som, animação, cor e ícone

As regras desta seção são **Proposta** e valem só para os elementos de gamificação. O resto da interface segue `../DESIGN.md` sem mudança.

- **Som.** Sons curtos e distintos para pontos, pontos em dobro, recorde, subida de nível, medalha e fim do treino. O app tem uma chave para desligar o som, e o som desligado não tira nenhuma informação da tela.
- **Vibração.** Acompanha recorde, subida de nível e medalha onde o navegador aceita. Nenhuma informação depende dela, porque o Safari do iOS não aceita a Vibration API.
- **Animação.** Pontos que sobem do botão, barra que enche, contagem dos pontos, explosão de partículas no recorde e na subida de nível, e medalha que desce do topo com brilho. Com `prefers-reduced-motion: reduce`, as animações saem e os estados finais aparecem direto.
- **Cor.** Uma família de cores só para o jogo, separada da cor de destaque dos elementos interativos: violeta para pontos e nível, dourado para medalha e ranking, rosa para recorde, laranja para a sequência de semanas e a cor da janela aberta para o ×2. O grupo esfriando usa a cor de esfriamento: o selo de nível perde a cor, e a barra mostra o esvaziamento com listras em movimento.
- **Aviso de queda.** Um som curto e descendente acompanha o aviso de queda, distinto dos sons de ganho.
- **Ícone.** Ícones preenchidos com gradiente para os elementos de jogo: raio (pontos), escudo (nível), medalha, troféu (ranking), chama (sequência), brilho (recorde) e alvo (meta semanal). Eles se distinguem dos ícones de traço da interface.

## Jornada do jogador

### Primeiro treino do período

O mapa começa neutro, e o primeiro treino já acende os grupos trabalhados. A primeira vitória vem no primeiro dia.

A janela estreia calibrada com o histórico registrado antes da gamificação (o MVP de registro vem primeiro), e não com valores genéricos (PRD, EN01).

### Dentro do treino

Cada "Próximo" rende pontos na hora. No descanso, a barra de nível dos grupos cresce, e um recorde ou uma subida de nível aparecem assim que acontecem. A medalha nova aparece quando a fila de envio esvazia e a API confirma a conquista, porque só a API calcula as janelas e a sequência (PRD, D104); com sinal, isso leva segundos. O descanso é o momento ocioso do treino e por isso concentra o retorno.

### Ciclo do meio do período

Treino → o grupo descansa → aviso perto de abrir → janela aberta → aviso perto de fechar → o atleta treina e ganha o progresso cheio, ou o grupo esfria → a barra esvazia → aviso antes da queda → o atleta volta e recupera com a memória muscular, ou o grupo cai de nível.

Esse ciclo é o jogo inteiro e precisa ser legível em poucos segundos de olhar.

### Fim do período

A frase de intenção e o mapa final são congelados num retrato, exibido ao lado do retrato do período anterior. O período seguinte recomeça do zero.

## Tensões e questões em aberto

- **Retorno depois de esfriamento (PRD, Q04).** O PO volta após semanas parado, encontra o mapa todo esfriado, e o primeiro treino rende menos. O jogo castiga o retorno, o momento mais frágil para quem tem dificuldade de recomeçar. Com a perda de nível (D24), esse risco cresce. A memória muscular responde em parte: quem volta recupera os níveis perdidos com pontos em dobro. O primeiro treino do grupo depois de um esfriamento também rende o progresso cheio, ×2, sem somar com a memória muscular ("bem-vindo de volta", PRD D53).
- **Ritmo da perda de nível (PRD, Q13).** O protótipo esvazia cerca de 40 pontos por dia: do 20 ao 1 em 4 a 5 semanas.
- **Parâmetros dos pontos e do nível (PRD, Q11).** O protótipo usa 10 pontos por série no plano, 60 por grupo num treino completo e o 20 em cerca de 4 semanas. Os números saem dos dados reais.
- **Sequência de semanas (PRD, Q12).** Uma sequência que zera castiga o retorno, como no esfriamento. A **Proposta** é uma proteção por período; a alternativa é tirar a sequência do desenho.
- **Quanto rende um treino fora da janela?** Ainda não há proporção definida (metade, um terço).
- **Recalibração da janela (PRD, H03 e EN01).** A regra da ADR-031 saiu da literatura, sem fórmula consagrada; os dados reais do PO podem trocar os números pela simulação.
- **Ativação secundária (PRD, Q08).** Um músculo ativado de forma secundária conta o volume inteiro para o grupo, ou só uma parte? Com 11 grupos, a resposta pesa mais: o supino ativa peito, tríceps e ombros. A **Proposta** é metade (PRD, D30).
- **Janela contra plano (PRD, Q06).** Quando as janelas abertas sugerem uma letra do programa e a ordem do plano sugere outra, qual vale? **Proposta:** a recuperação decide quais letras podem ser feitas, porque treinar um grupo antes de ele se recuperar rende menos e aumenta o risco de lesão. Sai da sugestão a letra cujos grupos estão na maioria descansando. Entre as outras, o grupo esfriando vem primeiro (recuperado e perdendo nível), depois o grupo em janela, e o grupo mais fraco desempata. O atalho do nível geral segue a mesma regra.
- **Perda de nível e biologia.** Do 20 ao 1 em 4 a 5 semanas é mais rápido que a perda real de força, que costuma se manter por algumas semanas sem treino [a confirmar]. É uma escolha de jogo, para dar peso à regularidade.
- **Antecedência dos avisos.** Quantas horas antes de abrir e de fechar.
- **Visual.** Como o mapa, as barras e o esfriamento aparecem na tela. O protótipo descartável é o lugar para resolver essa questão.

## Riscos da gamificação

- **Perda de força no meio do período (semanas 5 a 8)**, por causa do peso extrínseco do desenho, maior com pontos e medalhas. Aceito; os contrapesos são o núcleo 3, o recorde e as medalhas ocultas (PRD, R04).
- **Perda de nível desanima o retorno (PRD, R08).** Ver os níveis caírem depois de semanas parado pode levar o PO a desistir. Mitigado pelas quatro proteções da regra 6.
- **Pontos sem lastro.** Se os pontos crescerem sem relação com o esforço, perdem valor. Os pontos vêm do volume feito em relação ao plano para manter essa relação.
- **Nível geral duro demais.** Como o nível geral é o do grupo mais fraco, um grupo esfriando derruba o geral inteiro. Mitigado por contar só os grupos do programa e por mostrar o grupo que limita, com atalho para a letra que o treina (PRD, D29 e R08).
- **Teto cedo demais.** Com o 20 em 4 semanas, a subida acaba cedo no período. Mitigado pela perda de nível, que torna o 20 um estado a manter, e pelo recorde e pelas medalhas, que seguem como progressão de longo prazo.
- **Recorde e lesão.** Um recorde mal desenhado empurra para carga máxima. O recorde vale por número de repetições, e o app não sugere aumento de carga.
- **Excesso de estímulo.** Som e animação a cada série podem incomodar na academia. A chave de som e a redução de movimento resolvem o caso.
- **Ruído dos avisos.** Com 11 grupos, aviso por grupo passaria de vinte por semana. O aviso por letra (PRD, D31) reduz para dois por treino da semana. Se ainda virar ruído, o PO silencia, e o gatilho morre. Com os dois canais sempre juntos (D32), cada aviso chega duas vezes; o link de desligar e-mail (US-F17-04) é a válvula se o ruído crescer.
- **Aviso no iPhone.** O aviso pelo navegador só funciona com o app instalado na tela inicial (iOS 16.4 ou posterior) (PRD, R01).
- **Janela mal calibrada.** Se a janela parecer errada, a gamificação perde credibilidade logo no primeiro dia.
