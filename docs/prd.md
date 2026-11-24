# PRD — Heavy Duty

## 1. Controle

| Campo | Valor |
|---|---|
| Versão | 0.6 |
| Data | 24/11/2026 |
| Status | Rascunho — sujeito a revisão humana |
| Classificação | Público |
| Elaboração | Elaborado com apoio de IA (Lean Inception solo, método de Paulo Caroli, traduzido para SAFe) |
| PO, revisor e aprovador | Leandro Alves |

Todas as estimativas (esforço, valor, incerteza, WSJF e prazo) são preliminares e devem ser revisadas a cada onda.

---

## 2. Resumo executivo

A frequência de musculação do Leandro caiu para uma vez por semana ou menos porque nada o puxa de volta, e o app que ele usa hoje guarda o histórico em dados presos ou pagos. O produto é um app web pessoal, hospedado no próprio servidor (kasparov), com duas frentes: no celular, o acompanhamento do treino na academia, com um toque por passo; pelo Claude, via MCP, toda a administração. A diferença-chave são os dados sob controle dele, sem assinatura. O benefício principal é uma gamificação desenhada com o Octalysis: janelas de atividade por grupo muscular, calculadas pelo app, que o avisam perto de abrir e de fechar, com pontos, níveis e medalhas, em períodos de 12 semanas. O MVP (ondas 1 a 4) entrega o núcleo: registro e administração. A gamificação vem nas ondas 5 a 7, calibrada com os dados reais do MVP. O principal risco é o MVP nunca ficar pronto, porque não há prazo fixo; a mitigação é acompanhar a data de cada onda na revisão semanal.

---

## 3. Problema e visão

### Problema
Sua frequência na academia caiu para uma vez por semana ou menos porque nada te puxa de volta, e o app atual guarda o treino em dados presos ou pagos, sem gatilho para o próximo treino.

- **Fato** (relato do PO): frequência de musculação de uma vez por semana ou menos nas últimas quatro a seis semanas.
- **Fato** (relato do PO): a causa é a falta de gatilho ("nada me puxa"), e não agenda, dor ou o BJJ.
- **Fato** (relato do PO): hoje ele usa um app pronto, com dados presos ou pagos.
- **Hipótese** (H01): o app atual também não o puxa de volta. Validar com: o PO, comparando duas semanas de uso.
- **Premissa:** o uso é pessoal, então a LGPD não pesa enquanto houver um único usuário.

### Visão
> Para o Leandro, que voltou a treinar pouco e não quer o histórico de treino preso em um app pago, o Heavy Duty é um registro de musculação hospedado no próprio servidor, que acompanha o treino no celular e o puxa de volta com janelas de atividade por grupo muscular. Diferentemente dos apps prontos de registro, nosso produto mantém todos os dados sob controle dele, sem assinatura.

### Projeto de gamificação (Octalysis)
A gamificação usa pontos, níveis por grupo muscular, recordes, medalhas e ranking pessoal, sem elementos sociais (D23). A regra de desenho é que o black hat (escassez, perda) traz de volta e o white hat (realização, criatividade) faz ficar. O projeto completo está em `gamificacao.md`.

| Núcleo | Intensidade proposta (0–10) | Mecânica |
|---|---|---|
| 1. Significado | 2 | Frase de intenção do período, exibida no retrato final (proposta) |
| 2. Realização | 9 | Pontos por série, nível por grupo muscular, recordes e mapa do corpo |
| 3. Criatividade e feedback | 5 | Divisão, objetivo e cargas livres; o mapa reage na hora ao registro |
| 4. Posse | 7 | Estante de medalhas e coleção de retratos congelados dos períodos |
| 5. Social | 0 | Excluído |
| 6. Escassez | 7 | Janela que abre depois do descanso e fecha, com pontos em dobro enquanto aberta; avisos perto de abrir e de fechar |
| 7. Imprevisibilidade | 5 | A janela varia conforme o volume do treino; medalhas ocultas até a conquista |
| 8. Perda | 7 | O grupo esfria quando a janela passa e perde nível com o tempo; medalhas, recordes e o melhor nível ficam, e a memória muscular devolve os níveis perdidos com pontos em dobro (D24) |

Equilíbrio: white hat 16 contra black hat 19. Ponto fraco: o lado esquerdo do octógono (2, 4, 6, motivação extrínseca) soma 23, contra 10 do lado direito (3, 5, 7, intrínseca). O risco de perda de força entre a quinta e a oitava semana está registrado como R04.

**Regras de jogo decididas pelo PO:**
- A janela é por grupo muscular, e o próprio app calcula quando ela abre e quanto tempo fica aberta, a partir do último treino. O volume registrado, corrigido pelo objetivo do programa, define quando a janela abre (D47).
- Só musculação conta, em qualquer divisão.
- O progresso é uma barra por grupo, que cresce mais quando o grupo é treinado dentro da janela.
- Quando a janela passa sem treino, o grupo esfria e começa a perder nível no mesmo instante, aos poucos, com o tempo. O app avisa antes de cada queda, os níveis perdidos voltam com pontos em dobro até o melhor nível do grupo, e medalhas, recordes, retratos e o melhor nível nunca se perdem (D24).
- Os períodos duram 12 semanas e terminam com um retrato congelado; o período seguinte recomeça do zero.
- O app avisa perto de a janela abrir e perto de fechar.
- Cada série rende pontos relativos ao plano, em dobro dentro da janela. Os pontos sobem o nível de cada grupo treinado, de 1 a 20 (D23, D28).
- Medalhas, recordes e o ranking pessoal comparam o PO só com o próprio histórico (D23).

---

## 4. Épico

**Hipótese do épico:** se o Leandro tiver um registro de musculação no próprio servidor, com um toque por passo na academia, administração via Claude e janelas de atividade por grupo muscular, ele deixa o app pago e volta a treinar com regularidade e progressão de carga.

### Resultados de negócio

| Objetivo | Linha de base | Meta (fim do primeiro período de 12 semanas) |
|---|---|---|
| O1. Regularidade | **Fato:** uma vez por semana ou menos. Em janelas: perto de 0% (**Hipótese** H04) | 70% ou mais das janelas aproveitadas |
| O4. Progressão de carga | Volume da primeira semana do período (**Premissa**) | +20% no volume semanal por grupo |
| O5. Um toque por passo | Toques por série no app atual (**Hipótese** H05) | Um toque em todo passo; ajuste por arrasto, sem teclado |
| Dados próprios (antigo O2) | Dados no app pago | App pago cancelado; histórico só no kasparov |

### Indicadores antecedentes
- Parcela dos treinos registrada no app próprio (meta: 100% a partir da segunda semana de uso).
- Toques por série.
- Data de entrega de cada onda contra a estimativa.
- Treinos por semana durante o MVP (linha de base, sem meta).

### Requisitos não funcionais
- **NFR01, dados:** todos no kasparov, sem serviço de terceiros.
- **NFR02, segurança:** o MCP público e o app web exigem autenticação forte (R07, H12).
- **NFR03, backup:** automático e diário, fora do disco principal.
- **NFR04, HTTPS:** pelo Cloudflare Tunnel, no domínio leandroalves.org.
- **NFR05, instalação:** o app se instala no celular e abre em tela cheia (R01, para o caso do iPhone).
- **NFR06, sem sinal:** o registro funciona sem internet e sincroniza depois (**Hipótese** H10).

---

## 5. Escopo, personas e jornada

### Escopo

| É | Não é |
|---|---|
| Um app web pessoal: no celular, voltado para a academia; a administração passa pelo Claude, via MCP, e depois do MVP também por telas no Mac (D22) | Uma rede social ou comunidade de treino |
| Um registro de musculação com gamificação: pontos, níveis e medalhas | Um personal trainer que monta treino ou prescreve carga |
| Uma ferramenta própria, rodando no kasparov | Um app de saúde geral (sono, dieta, cardio, BJJ) |

| Faz | Não faz |
|---|---|
| Guia e registra o treino com um toque por passo e ajuste por arrasto | Ranking contra outras pessoas ou compartilhamento |
| Calcula a janela de cada grupo e avisa perto de abrir e de fechar | Sincronizar com relógio, Apple Saúde ou Google Fit |
| Mostra o progresso por grupo e congela o retrato de cada período | Sugerir mudanças no treino a partir dos dados (**Hipótese**) |

Fora do produto por decisão do PO: importar o histórico do app atual (D14).

### Personas (fictícias; dois contextos da mesma pessoa, que usa, paga e aprova)

**P1. O atleta em retomada (primária).** Está na academia, com o celular apoiado no banco, mãos ocupadas e intervalos de um a dois minutos. Quer saber o próximo passo sem pensar. Dores: perder o fio do treino, digitar entre séries, não lembrar a carga da última vez e não ter nada que o chame de volta nos dias de folga.

**P2. O planejador.** Administra o app conversando com o Claude, via MCP. Monta e edita a divisão, o objetivo e os exercícios, revisa o histórico e compara os períodos. Dores: refazer a ficha a cada mudança e não enxergar a evolução entre um período e outro.

### Jornada da P1 (com a gamificação completa)
- **Gatilho:** chega o aviso "a janela de peito e tríceps abre amanhã cedo". **Momento crítico:** um aviso em hora ruim faz o atleta silenciá-lo.
1. Decide ir. Abre o app e vê o mapa: dois grupos em janela, um esfriando.
2. Chega à academia. O app mostra o treino do dia (**Hipótese** H06).
3. Faz a série e registra com um toque (**Hipótese** H07: os valores vêm preenchidos). **Momento crítico:** se for lento, ele volta ao app antigo.
4. Descansa. O descanso planejado corre sozinho, e um toque pula para a próxima série.
5. Ajusta. Se a carga foi outra, um arrasto corrige. **Momento crítico:** um arrasto impreciso registra carga errada (R06).
6. Termina. As barras dos grupos treinados crescem, e o mapa mostra quando cada um reabre.

- **Resultado:** o treino fica registrado no servidor do PO, o progresso fica visível, e a próxima janela já tem data.
- **Momento crítico fora da jornada:** voltar depois de semanas parado e encontrar o mapa todo esfriado (Q04, respondida pela D53).

No MVP, a jornada vai do passo 2 ao 6, sem mapa, janelas nem avisos.

---

## 6. MVP e caso de negócio enxuto

### Canvas do MVP
- **O que aprender:** com os dados no próprio servidor, registrando com um toque por passo e administrando via Claude, o PO abandona o app pago e passa a registrar todo treino no app próprio?
- **Para quem:** P1, no celular, durante o treino; P2, via MCP.
- **Funcionalidades (ondas 1 a 4):** F01, F14, F02, F16, F03, F05, F04 e F06.
- **Métricas:** adoção (100% dos treinos no app próprio a partir da segunda semana); toques por passo (um, com ajuste só por arrasto); data de entrega de cada onda; treinos por semana como linha de base.
- **Perseverar:** depois de quatro semanas de uso, todos os treinos estão no app próprio e a assinatura foi cancelada. Seguir para a onda 5.
- **Pivotar:** se depois de quatro semanas ainda houver registro no app pago, refazer o fluxo da academia (F03, F04) antes da gamificação. Se uma onda atrasar mais que o dobro da estimativa, cortar escopo (por exemplo, MCP só local primeiro).
- **Custo (estimativa):** nenhum gasto novo. Kasparov, domínio e Cloudflare Tunnel já existem, e a assinatura do app atual deixa de ser paga.
- **Prazo (Hipótese H09):** cerca de seis semanas para as ondas 1 a 4, com umas quatro horas por semana.

### Marco
O próximo ciclo trimestral, em meados de dezembro de 2026, é marco do MVP, não prazo (D20). O primeiro período de 12 semanas do app começa quando a onda 7 sair.

### Go/no-go
- **Go para a onda 5:** os critérios de perseverar foram atingidos.
- **No-go:** registros ainda no app pago depois de quatro semanas; pivotar o fluxo da academia.
- **Dispensado (D45):** em 2026-11-22, o PO dispensou a espera das quatro semanas, e a onda 5 seguiu sem o go/no-go.

---

## 7. Features e enablers

**Legenda:** E é o esforço; $ é a contribuição para os objetivos; ♥ é o valor para o usuário.

| ID | Nome | Tipo | Onda | E | $ | ♥ | Incerteza | Hipótese de benefício | Critério de aceite (resumo) |
|---|---|---|---|---|---|---|---|---|---|
| F01 | Exercícios, músculos e grupos (via MCP) | Feature | 1 | E | $$ | ♥ | Verde | O modelo exercício → músculo → grupo permite somar volume e progresso por grupo | Exercício de repetição ou tempo, ligado a um ou mais músculos, cada músculo a um grupo |
| F14 | Publicação no kasparov, instalação e backup | Enabler (arquitetura) | 1 | EE | $$ | ♥ | Verde | A infraestrutura existente sustenta o app instalado no celular | App instalável com HTTPS; backup diário fora do disco principal |
| F02 | Programa de treino (via MCP) | Feature | 2 | E | $$ | ♥♥ | Verde | Com o programa cadastrado, o treino chega pronto ao celular | Objetivo, letras, séries, repetições ou tempo, carga e descanso por exercício; edição preserva o histórico |
| F16 | MCP público com autenticação | Enabler (arquitetura) | 2 | EE | $$ | ♥♥ | Amarelo | Administrar pelo Claude dispensa telas no computador | Chamada autenticada funciona; sem credencial, nada é exposto |
| F03 | Treino com um toque por passo | Feature | 3 | EE | $$$ | ♥♥♥ | Amarelo | Registro em um toque elimina o atrito que faria o PO voltar ao app pago | Valores preenchidos; um toque registra; toque duplo não duplica; funciona sem sinal |
| F05 | Descanso do programa | Feature | 3 | E | $ | ♥♥ | Verde | O descanso automático mantém o ritmo sem decisão do atleta | Conta o descanso planejado; um toque pula; ao fim, abre a próxima série ou exercício |
| F04 | Ajuste por arrasto | Feature | 4 | EE | $$ | ♥♥ | Amarelo | Ajustar sem teclado mantém a meta de um toque | Arrasto altera carga, repetições ou tempo em passos; carga não fica negativa; última série corrigível |
| F06 | Histórico (via MCP) | Feature | 4 | E | $$ | ♥♥ | Verde | Consultar e corrigir pelo Claude mantém o histórico confiável | Consulta por intervalo; edição e remoção com confirmação |
| F20 | Histórico no celular | Feature | 4b | E | $$ | ♥♥ | Verde | Ver na academia o que já foi feito, sem abrir o Claude, mantém o app utilizável antes da gamificação | Lista de treinos com exercícios, séries e cargas; remoção com confirmação; sem edição no celular (D50) |
| F07 | Cálculo da janela por grupo | Feature + EN01 | 5 | EE | $$$ | ♥♥ | Vermelho | Uma janela calibrada com dados reais é crível e puxa o PO de volta | Estado da janela por grupo (descansando, em janela, esfriando) pelo MCP e no treino do dia; reabertura no fim do treino; regra validada pelo PO antes da tela (EN01) |
| F15a | Indicadores de volume por grupo | Feature | 5 | E | $$ | ♥ | Verde | Medir o O4 sem esforço manual | Volume semanal por grupo pelo MCP, com o músculo secundário contando metade |
| F10 | Progresso por grupo e esfriamento | Feature | 6a e 6b | E | $$ | ♥♥ | Amarelo | Progresso visível sustenta a motivação (Octalysis 2) | Pontos por série relativos ao plano; nível de 1 a 20 por grupo; esfriamento e queda de nível; memória muscular; nível geral |
| F12 | Sugestão do treino do dia pelas janelas | Feature | 6b | E | $$ | ♥♥ | Amarelo | O atleta não precisa decidir o que treinar | Letra sugerida pelas janelas, com a regra da D39 |
| F15b | Indicador de janelas aproveitadas | Feature | 6b | E | $$ | ♥ | Verde | Medir o O1 | Janelas aproveitadas por semana pelo MCP; meta semanal no treino do dia |
| F08 | Mapa do corpo | Feature | 7a | EE | $$$ | ♥♥♥ | Amarelo | O mapa torna o estado das janelas visível de relance | Estado de cada grupo no mapa, sem depender só da cor; detalhe do grupo |
| F09 | Avisos perto de abrir e de fechar | Feature | 7a | EE | $$$ | ♥♥ | Amarelo | O aviso é o gatilho que falta hoje (H02) | Avisos no app instalado: um por letra perto de a janela abrir e de fechar, e antes da queda de nível |
| F11 | Períodos de 12 semanas e retrato | Feature | 7b | E | $ | ♥♥ | Verde | Começo e fim dão sentido ao esforço (Octalysis 4) | Período de 12 semanas com frase de intenção, retrato congelado e sequência de semanas com uma proteção por período |
| F17 | Avisos por e-mail | Feature | 7a e 7b | E | $ | ♥ | Vermelho | Um segundo canal garante o gatilho quando o aviso no celular não chega (R01, H02) | Aviso de janela por letra, aviso de queda de nível e resumo semanal por e-mail, sempre junto com o aviso no celular, pelo servidor SMTP próprio (ADR-007) |
| F18 | Recordes | Feature | 6a | E | $$ | ♥♥ | Verde | O recorde marca o progresso real de carga (O4) e equilibra o peso extrínseco do jogo | Recorde por número de repetições; marca ao lado da carga; série que passa do recorde |
| F19 | Medalhas e ranking pessoal | Feature | 7b | E | $ | ♥♥ | Amarelo | Medalhas e ranking guardam o histórico de longo prazo (Octalysis 4) | Medalhas, inclusive ocultas, numa estante; treinos do período ordenados por pontos |

### Enabler de exploração
- **EN01, calibrar a janela (de F07).** Pergunta: que horas-base por objetivo e que ajuste pelo volume fazem a janela parecer certa no uso real? Insumo: o histórico registrado durante o MVP. Aprendizado esperado: uma regra de cálculo validada pelo PO antes de a janela aparecer. A primeira regra saiu da literatura, sem os dados do MVP (D45, D47); a recalibração com o histórico real fica para depois.

---

## 8. WSJF e roadmap (valores relativos e preliminares)

**Fórmula:** WSJF = (Valor + Criticidade no tempo + RR/HO) ÷ Tamanho, em Fibonacci modificada.

- **Valor:** $ + ♥ convertidos (2 → 1, 3 → 2, 4 → 3, 5 → 5, 6 → 8).
- **Criticidade no tempo (D21):** marco = início do próximo ciclo. 8 para o MVP; 5 para a cadeia do período (F07, F10, F11, F08, F09); 2 para o resto.
- **RR/HO:** 1 + número de funcionalidades dependentes, com bônus de 3 para a vermelha, arredondado para a escala.
- **Tamanho:** E = 2; EE = 5.

O cálculo foi feito com código.

| Ordem | ID | Onda | Valor | Criticidade | RR/HO | Tamanho | WSJF |
|---|---|---|---|---|---|---|---|
| 1 | F02 | 2 | 3 | 8 | 13 | 2 | 12,0 |
| 2 | F01 | 1 | 2 | 8 | 13 | 2 | 11,5 |
| 3 | F06 | 4 | 3 | 8 | 1 | 2 | 6,0 |
| 4 | F03 | 3 | 8 | 8 | 13 | 5 | 5,8 |
| 5 | F05 | 3 | 2 | 8 | 1 | 2 | 5,5 |
| 6 | F10 | 6 | 3 | 5 | 3 | 2 | 5,5 |
| 7 | F11 | 7 | 2 | 5 | 1 | 2 | 4,0 |
| 8 | F07 | 5 | 5 | 5 | 8 | 5 | 3,6 |
| 9 | F12 | 6 | 3 | 2 | 1 | 2 | 3,0 |
| 10 | F08 | 7 | 8 | 5 | 1 | 5 | 2,8 |
| 11 | F14 | 1 | 2 | 8 | 3 | 5 | 2,6 |
| 12 | F15a | 5 | 2 | 2 | 1 | 2 | 2,5 |
| 13 | F15b | 6 | 2 | 2 | 1 | 2 | 2,5 |
| 14 | F16 | 2 | 3 | 8 | 1 | 5 | 2,4 |
| 15 | F04 | 4 | 3 | 8 | 1 | 5 | 2,4 |
| 16 | F09 | 7 | 5 | 5 | 1 | 5 | 2,2 |

**Contradições com o sequenciador e a decisão tomada (D20):** F16 e F04 aparecem no fim do ranking, mas ficam no MVP, porque fazem parte do núcleo definido pelo PO (D18) e da meta O5. F10 e F11 dependem da F07 e não podem andar antes dela. Dentro de cada onda, a ordem segue o WSJF.

### Roadmap
Todas as ondas passam nas regras do Caroli (conferidas com código): até 3 funcionalidades, até 1 vermelha, ao menos 1 verde, esforço até 5, valor ao menos 4 e dependências em ondas anteriores.

| Onda | Funcionalidades | Entrega |
|---|---|---|
| 1 | F01, F14 | Base de dados no servidor |
| 2 | F02, F16 | Programa montado pelo Claude |
| 3 | F03, F05 | Treino registrado pelo celular |
| 4 | F04, F06 | Registro completo — **fim do MVP** |
| 4b | F20, com ajustes na F03, na F04 e na F05 | Usabilidade mínima do treino e histórico no celular, antes da gamificação (D49) |
| 5 | F07, F15a, com a EN01 | Janela calibrada com dados reais; volume por grupo pelo MCP |
| 6a | F10 (pontos, nível e esfriamento), F18 | Pontos, nível por grupo, esfriamento e recordes |
| 6b | F10 (memória muscular e nível geral), F12, F15b | Memória muscular, nível geral, treino do dia pelas janelas e meta semanal |
| 7a | F08, F09, F17 (sem o resumo semanal) | Mapa do corpo e avisos no celular e por e-mail |
| 7b | F11, F19, F17 (resumo semanal) | Períodos, retrato, sequência de semanas, medalhas e ranking: início do primeiro período de 12 semanas |

A divisão das ondas 6 e 7 em partes, cada uma com deploy próprio, e as features F18 e F19 vêm da D35 e da D36. A divisão veio depois da conferência com as regras do Caroli e não foi reconferida com código. A F18 e a F19 ficam fora do cálculo do WSJF. As telas de administração no Mac entram depois da onda 7 (D37). A onda 4b vem da D49, depois do uso real do MVP, e não foi conferida com as regras do Caroli; a F20 fica fora do cálculo do WSJF.

---

## 9. User stories por feature

São 42 stories: 15 do MVP (ondas 1 a 4) e 27 das ondas 5 a 7, contando as duas da EN01. Os exemplos de cargas e exercícios nos cenários são ilustrativos. Nas ondas 5 a 7, os números de pontos, níveis e janelas são os parâmetros de partida das D38 a D43 e mudam com a calibração, sem perda de dado, porque o estado do jogo é derivado do histórico (ADR-010).

### F01. Exercícios, músculos e grupos
- **US-F01-01.** Como planejador, quero cadastrar músculos ligados a um grupo muscular, para que o progresso seja somado por grupo.
- **US-F01-02.** Como planejador, quero cadastrar um exercício do tipo repetição ou tempo, com os músculos que ele ativa, para que o app saiba quais grupos cada treino trabalha.

```gherkin
# language: pt
Funcionalidade: Cadastro de músculos e exercícios

  Cenário: músculo ligado a um grupo
    Quando o planejador cadastra o músculo "tríceps braquial" no grupo "braços"
    Então o músculo fica disponível para os exercícios

  Cenário: músculo sem grupo
    Quando o planejador cadastra um músculo sem informar o grupo
    Então o cadastro é recusado com o motivo "informe o grupo muscular"

  Esquema do Cenário: exercício de cada tipo
    Dado que os músculos <músculos> estão cadastrados
    Quando o planejador cadastra o exercício "<exercício>" do tipo <tipo> ativando esses músculos
    Então o exercício fica disponível para os programas
    E ele aparece ligado aos grupos <grupos>

    Exemplos:
      | exercício   | tipo      | músculos                         | grupos        |
      | Supino reto | repetição | peitoral maior, tríceps braquial | peito, braços |
      | Prancha     | tempo     | reto abdominal                   | core          |

  Cenário: exercício sem músculo
    Quando o planejador cadastra um exercício sem nenhum músculo
    Então o cadastro é recusado com o motivo "informe ao menos um músculo"
```

### F14. Publicação e backup (enabler)
- **US-F14-01.** Como atleta, quero instalar o app no celular a partir do meu domínio, depois de entrar com a minha credencial, para abri-lo como app na academia.
- **US-F14-02.** Como dono dos dados, quero um backup automático diário fora do disco principal, para não perder o histórico.
- **Aprendizado esperado:** confirmar que o kasparov, pelo Cloudflare Tunnel, sustenta o app instalado no celular (R01, R02).

```gherkin
# language: pt
Funcionalidade: Acesso e backup

  Cenário: instalação no celular
    Dado que o atleta entrou com a sua credencial pelo endereço do app
    Quando ele instala o app na tela inicial
    Então o app abre em tela cheia, sem a barra do navegador

  Cenário: acesso sem credencial
    Quando alguém abre o endereço do app sem estar autenticado
    Então nenhum dado de treino é exibido

  Cenário: backup diário
    Quando termina o dia
    Então existe uma cópia dos dados daquele dia fora do disco principal

  Cenário: falha no backup
    Dado que o backup do dia falhou
    Quando o planejador consulta a situação do app pelo Claude
    Então a falha aparece com data e motivo
```

### F02. Programa de treino
- **US-F02-01.** Como planejador, quero montar um programa com objetivo, letras e, para cada exercício, séries, repetições ou tempo, carga e descanso, para que o treino chegue pronto ao celular.
- **US-F02-02.** Como planejador, quero editar o programa sem alterar o histórico, para mudar frequência, objetivo e cargas no futuro.

```gherkin
# language: pt
Funcionalidade: Programa de treino

  Esquema do Cenário: exercício no programa
    Dado um programa com objetivo "hipertrofia" e a letra "A"
    Quando o planejador adiciona "<exercício>" com <séries> séries de <alvo>, carga de <carga> e descanso de <descanso>
    Então a letra "A" mostra o exercício com esses valores

    Exemplos:
      | exercício   | séries | alvo          | carga | descanso |
      | Supino reto | 3      | 10 repetições | 40 kg | 90 s     |
      | Prancha     | 3      | 45 s          | 0 kg  | 60 s     |

  Cenário: alvo incompatível com o tipo
    Quando o planejador informa repetições para um exercício do tipo tempo
    Então a inclusão é recusada com o motivo "este exercício é medido por tempo"

  Cenário: edição preserva o histórico
    Dado um treino já registrado com Supino reto a 40 kg
    Quando o planejador muda a carga do Supino reto no programa para 42,5 kg
    Então o próximo treino sugere 42,5 kg
    E o treino já registrado continua com 40 kg
```

### F16. MCP público (enabler)
- **US-F16-01.** Como planejador, quero conectar o Claude ao MCP do app com autenticação, para administrar tudo conversando.
- **Aprendizado esperado:** confirmar que dá para administrar o app inteiro pelo Claude, sem telas no computador (D15).

```gherkin
# language: pt
Funcionalidade: Administração via MCP

  Cenário: conexão autenticada
    Dado que o Claude está conectado ao MCP com a credencial do Leandro
    Quando o planejador pede a lista de programas
    Então os programas cadastrados são listados

  Cenário: conexão sem credencial
    Quando um cliente tenta usar o MCP sem credencial válida
    Então a chamada é recusada
    E nenhum dado é exposto
```

### F03. Treino com um toque por passo
- **US-F03-01.** Como atleta, quero abrir o treino do dia com o primeiro exercício pronto e os valores preenchidos, para começar sem configurar nada.
- **US-F03-02.** Como atleta, quero marcar a série como feita com um toque, para registrar sem interromper o treino.
- **US-F03-03.** Como atleta, quero registrar o treino mesmo sem sinal, para não depender da internet da academia.
- **US-F03-04.** Como atleta, quero ver a sequência do treino e ir para qualquer exercício que falta, para seguir quando o equipamento está ocupado.
- **US-F03-05.** Como atleta, quero pular um exercício, para encurtar o treino quando o tempo está curto.
- **US-F03-06.** Como atleta, quero rever as séries de um exercício já feito, para conferir o que registrei.
- **US-F03-07.** Como atleta, quero que o exercício por tempo conte sozinho, com contagem regressiva de 3 segundos e sinal sonoro no começo e no fim, para fazer a série sem olhar o relógio.
- **US-F03-08.** Como atleta, quero ver o tempo total do treino durante todo o treino e no resumo final, para controlar a duração do treino. *(onda 4b)*
- **US-F03-09.** Como atleta, quero descartar o treino em andamento, para não guardar no histórico um treino que não valeu. *(onda 4b)*

```gherkin
# language: pt
Funcionalidade: Execução do treino

  Esquema do Cenário: valores preenchidos
    Dado que o atleta abre a letra "A"
    E <situação>
    Então o Supino reto aparece com <carga> e 10 repetições

    Exemplos:
      | situação                                      | carga   |
      | é a primeira vez com esse exercício           | 40 kg   |
      | no último treino ele fez o Supino com 42,5 kg | 42,5 kg |

  Cenário: série com um toque
    Quando o atleta toca em "feito"
    Então a série é registrada com os valores exibidos
    E o descanso começa

  Cenário: toque duplo acidental
    Quando o atleta toca duas vezes seguidas em "feito"
    Então apenas uma série é registrada

  Cenário: sem sinal
    Dado que o celular está sem conexão
    Quando o atleta registra as séries do treino
    Então as séries ficam salvas no aparelho
    E são enviadas ao servidor quando a conexão voltar

  Cenário: exercício fora da ordem
    Dado que o atleta está no Supino reto da letra "A"
    Quando ele escolhe o Tríceps na polia na sequência do treino
    Então o Tríceps na polia aparece com os valores preenchidos
    E o Supino reto continua na sequência com as séries que faltam

  Cenário: exercício escolhido durante o descanso
    Dado que o descanso está contando
    Quando o atleta escolhe outro exercício na sequência
    Então o descanso continua
    E o exercício escolhido aparece quando o descanso termina

  Cenário: exercício pulado
    Quando o atleta pula a Prancha
    Então o treino segue para o próximo exercício que falta
    E a Prancha fica marcada como pulada e pode ser feita depois

  Cenário: fim com exercício pulado
    Dado que só falta a Prancha, que foi pulada
    Quando o atleta registra a última série do exercício atual
    Então o treino termina
    E o resumo mostra a Prancha entre os exercícios que ficaram de fora

  Cenário: rever exercício feito
    Dado que o atleta terminou o Supino reto
    Quando ele abre a sequência do treino
    Então o Supino reto mostra as séries registradas

  Cenário: exercício por tempo
    Dado que a Prancha exibida tem 45 s
    Quando o atleta toca em "Próximo"
    Então uma contagem de 3 segundos começa, com um sinal sonoro por segundo
    E, ao fim da contagem, um sinal sonoro marca o início da execução
    E o tempo da execução corre sozinho a partir de 45 s

  Cenário: fim do exercício por tempo
    Dado que a execução da Prancha está nos últimos 3 segundos
    Então cada segundo tem um sinal sonoro
    E, ao chegar a zero, um sinal sonoro de fim toca
    E a série é registrada com 45 s
    E o descanso começa

  Cenário: exercício por tempo encerrado antes
    Dado que a execução da Prancha está em 30 s de 45 s
    Quando o atleta toca em "Próximo"
    Então a série é registrada com 15 s
    E o descanso começa

  Cenário: tempo total durante o treino
    Dado que o atleta começou o treino da letra "A"
    Quando ele está na tela de série ou na tela de descanso
    Então o tempo total do treino aparece, contado desde o início do treino

  Cenário: tempo total no resumo
    Dado que o atleta começou o treino da letra "A" há 52 minutos
    Quando ele registra a última série do treino
    Então o resumo do treino mostra a duração de 52 minutos

  Cenário: treino descartado
    Dado que o atleta registrou 3 séries do treino da letra "A"
    Quando ele escolhe descartar o treino e confirma
    Então o treino e as 3 séries não ficam no histórico
    E o app volta para a lista de letras

  Cenário: descarte cancelado
    Quando o atleta escolhe descartar o treino e não confirma
    Então o treino continua de onde parou
```

### F05. Descanso do programa
- **US-F05-01.** Como atleta, quero que o descanso planejado conte sozinho e que um toque leve à próxima série, para seguir o ritmo do programa.
- **US-F05-02.** Como atleta, quero ouvir um sinal sonoro nos 3 últimos segundos do descanso, para voltar ao exercício sem olhar a tela. *(onda 4b)*
- **US-F05-03.** Como atleta, quero acelerar o descanso enquanto pressiono o cronômetro, para encurtar a pausa sem pular o descanso inteiro. *(onda 4b)*

```gherkin
# language: pt
Funcionalidade: Descanso

  Cenário: descanso termina
    Dado que o atleta registrou a 1ª série do Supino, com descanso de 90 s
    Quando passam 90 segundos
    Então a 2ª série aparece pronta para registrar

  Cenário: atleta pula o descanso
    Quando o atleta toca em "próxima" durante o descanso
    Então a próxima série aparece na hora

  Cenário: fim do exercício
    Dado que o atleta registrou a última série do Supino
    Quando o descanso termina
    Então o próximo exercício da letra aparece pronto

  Cenário: sinal sonoro no fim do descanso
    Dado que o descanso de 90 s está contando
    Quando faltam 3 segundos
    Então cada um dos 3 últimos segundos tem um sinal sonoro

  Cenário: descanso pulado sem sinal
    Dado que faltam 10 segundos de descanso
    Quando o atleta toca em "próxima"
    Então nenhum sinal sonoro toca

  Cenário: descanso acelerado
    Dado que o descanso está contando
    Quando o atleta pressiona e segura o cronômetro do descanso
    Então o tempo que falta diminui mais rápido que o normal

  Cenário: descanso volta ao ritmo normal
    Dado que o atleta está segurando o cronômetro do descanso
    Quando ele solta o cronômetro
    Então o descanso volta a contar no ritmo normal, a partir do tempo que falta
```

### F04. Ajuste por arrasto
- **US-F04-01.** Como atleta, quero ajustar carga ou repetições arrastando o valor antes de confirmar, para registrar o que fiz sem digitar.
- **US-F04-02.** Como atleta, quero corrigir a última série registrada, para desfazer um arrasto errado.

```gherkin
# language: pt
Funcionalidade: Ajuste por arrasto

  Esquema do Cenário: ajuste de valor
    Dado que o <campo> exibido é <inicial>
    Quando o atleta arrasta <passos> passos para <direção>
    Então o <campo> passa a ser <final>

    Exemplos:
      | campo      | inicial | passos | direção | final   |
      | carga      | 40 kg   | 1      | cima    | 42,5 kg |
      | repetições | 10      | 2      | baixo   | 8       |
      | tempo      | 45 s    | 1      | cima    | 50 s    |

  Cenário: carga não fica negativa
    Dado que a carga exibida é 0 kg
    Quando o atleta arrasta para baixo
    Então a carga continua 0 kg

  Cenário: correção da última série
    Dado que a última série foi registrada com 45 kg
    Quando o atleta corrige essa série para 42,5 kg
    Então o histórico mostra 42,5 kg
```

### F06. Histórico pelo MCP
- **US-F06-01.** Como planejador, quero consultar pelo Claude os treinos de um intervalo de datas, para revisar o que fiz.
- **US-F06-02.** Como planejador, quero editar ou remover um treino pelo Claude, para corrigir registros errados.

```gherkin
# language: pt
Funcionalidade: Histórico

  Cenário: consulta por intervalo
    Dado que houve três treinos na semana passada
    Quando o planejador pede os treinos da semana passada
    Então os três treinos aparecem, com exercícios, séries e cargas

  Cenário: remoção exige confirmação
    Quando o planejador pede para remover um treino
    Então o treino só é removido depois de uma confirmação explícita

  Cenário: treino inexistente
    Quando o planejador pede para editar um treino que não existe
    Então a edição é recusada com o motivo "treino não encontrado"
```

### F20. Histórico no celular (onda 4b)
- **US-F20-01.** Como atleta, quero ver no celular os treinos que já fiz, com exercícios, séries e cargas, para consultar o que fiz sem abrir o Claude.
- **US-F20-02.** Como atleta, quero apagar um treino no celular, para tirar do histórico um registro que não vale.

No celular, o histórico não tem edição; a edição fica só pelo MCP (D50).

```gherkin
# language: pt
Funcionalidade: Histórico no celular

  Cenário: lista de treinos
    Dado que o atleta fez três treinos na semana passada
    Quando ele abre o histórico
    Então os três treinos aparecem, do mais recente para o mais antigo, com a data e a letra

  Cenário: detalhe do treino
    Quando o atleta abre um treino do histórico
    Então aparecem os exercícios, as séries, as repetições e as cargas registradas

  Cenário: histórico sem edição
    Quando o atleta abre um treino do histórico
    Então nenhum valor do treino pode ser alterado

  Cenário: remoção exige confirmação
    Quando o atleta pede para apagar um treino
    Então o treino só é removido depois de uma confirmação explícita

  Cenário: remoção cancelada
    Quando o atleta pede para apagar um treino e não confirma
    Então o treino continua no histórico
```

### F15a. Indicadores de volume por grupo (onda 5)

- **US-F15a-01.** Como planejador, quero consultar pelo Claude o volume semanal de cada grupo muscular, para medir a progressão de carga (O4) sem conta manual.

O volume é a soma de carga × repetições. O músculo secundário conta metade para o grupo (D40). O exercício por tempo aparece em segundos, fora do volume em kg, e marca o grupo como treinado (D46).

```gherkin
# language: pt
Funcionalidade: Volume por grupo muscular

  Cenário: volume da semana por grupo
    Dado que na semana o atleta registrou 3 séries de 10 repetições com 40 kg no "Supino reto"
    E que o "Supino reto" ativa o peitoral maior como principal e o tríceps braquial como secundário
    Quando o planejador consulta o volume da semana pelo Claude
    Então o grupo peito aparece com 1.200 kg
    E o grupo tríceps aparece com 600 kg

  Cenário: comparação com a semana anterior
    Dado que o volume do grupo costas foi de 2.000 kg na semana anterior e de 2.400 kg nesta semana
    Quando o planejador consulta o volume das duas semanas
    Então o grupo costas aparece com alta de 20%

  Cenário: exercício por tempo
    Dado que na semana o atleta registrou 3 séries de 45 s na "Prancha"
    Quando o planejador consulta o volume da semana
    Então o grupo abdômen aparece com 135 s, separados do volume em kg
```

### EN01. Calibrar a janela (onda 5)

- **EN01-01.** Como planejador, quero simular pelo Claude as janelas de cada grupo muscular sobre o histórico registrado, com os parâmetros que eu escolher, para calibrar a regra antes de a janela aparecer no celular.
- **EN01-02.** Como PO, quero validar a regra e os parâmetros da janela com a literatura sobre recuperação e frequência de treino, para que a janela estreie crível.

A regra de partida sai da literatura sobre recuperação (H03) e dos valores do protótipo. A EN01-02 não tem tela: a saída é a ADR-031, com a regra e os parâmetros validados pelo PO a partir da literatura (D47), e a troca dos parâmetros no código. A recalibração com o histórico real fica para depois e não perde dado (ADR-010).

```gherkin
# language: pt
Funcionalidade: Simulação da janela

  Cenário: janelas do histórico com os parâmetros em uso
    Dado que o atleta treinou costas na segunda às 7h e na quinta às 7h
    Quando o planejador simula as janelas de costas na semana
    Então cada treino aparece com a abertura e o fechamento da janela seguinte
    E cada treino aparece como dentro ou fora da janela anterior

  Cenário: simulação com outros parâmetros
    Quando o planejador simula as janelas com horas-base diferentes das que estão em uso
    Então o resultado usa as horas-base pedidas
    E os parâmetros em uso no app não mudam

  Cenário: linha de base em janelas
    Quando o planejador simula as janelas de todo o histórico
    Então o resultado mostra, por grupo, quantas janelas foram aproveitadas (H04)

  Cenário: simulação sem histórico
    Dado que nenhum treino foi registrado
    Quando o planejador simula as janelas
    Então o resultado vem vazio, sem erro
```

### F07. Cálculo da janela por grupo (onda 5)

- **US-F07-01.** Como planejador, quero consultar pelo Claude o estado da janela de cada grupo muscular, para saber quais grupos estão prontos para treinar.
- **US-F07-02.** Como atleta, quero ver no treino do dia quais grupos de cada letra estão em janela e até quando, para escolher o treino sem pensar.
- **US-F07-03.** Como atleta, quero ver no fim do treino quando cada grupo trabalhado reabre, para saber o efeito do treino que acabei de fazer.

A janela de cada grupo é calculada a partir do último treino do grupo, pelo músculo principal ou secundário: ela abre depois de uma base mais o volume ajustado do treino, com teto, e fecha a um prazo fixo do treino (D47). Um grupo está descansando antes de a janela abrir, em janela enquanto ela está aberta e esfriando depois de ela fechar sem treino. A janela só aparece no celular depois da EN01-02.

```gherkin
# language: pt
Funcionalidade: Janela de atividade por grupo

  Cenário: grupo descansando
    Dado que o atleta treinou peito hoje às 7h
    Quando o planejador consulta as janelas pelo Claude
    Então peito aparece descansando, com o horário em que a janela abre

  Cenário: grupo em janela
    Dado que a janela de costas abriu e ainda não fechou
    Quando o planejador consulta as janelas
    Então costas aparece em janela, com o horário em que a janela fecha

  Cenário: janela passada sem treino
    Dado que a janela de quadríceps fechou sem treino de quadríceps
    Quando o planejador consulta as janelas
    Então quadríceps aparece esfriando desde o fechamento da janela

  Cenário: grupo nunca treinado
    Dado que nenhum treino trabalhou panturrilhas
    Quando o planejador consulta as janelas
    Então panturrilhas aparece sem janela

  Cenário: volume maior estica a janela
    Dado dois treinos de peito no mesmo objetivo e no mesmo horário, com volumes ajustados diferentes
    Quando o planejador consulta as janelas de cada um
    Então a janela do treino de maior volume abre mais tarde

  Cenário: letra com grupos em janela
    Dado que costas e bíceps estão em janela até amanhã às 20h
    E que a letra B treina costas, bíceps e lombar
    Quando o atleta abre o treino do dia
    Então a letra B mostra costas e bíceps em janela até amanhã às 20h

  Cenário: grupo descansando na letra
    Dado que a janela de peito abre amanhã às 9h
    Quando o atleta abre o treino do dia
    Então a letra que treina peito mostra peito descansando até amanhã às 9h

  Cenário: treino do dia sem histórico
    Dado que nenhum treino foi registrado
    Quando o atleta abre o treino do dia
    Então as letras aparecem sem estado de janela

  Cenário: reabertura no fim do treino
    Dado que o atleta terminou a letra A, que treina peito, ombros e tríceps
    Quando a tela de treino terminado aparece
    Então ela mostra quando a janela de peito, de ombros e de tríceps abre

  Cenário: reabertura de treino encerrado antes
    Dado que o atleta encerrou a letra A antes dos exercícios de ombros
    Quando a lista de letras aparece e a fila de envio esvazia
    Então a letra A mostra a janela só dos grupos que tiveram série registrada
```

### F10. Progresso por grupo e esfriamento (ondas 6a e 6b)

- **US-F10-01 (6a).** Como atleta, quero ver os pontos que cada série rende, na hora do registro, para sentir o efeito de cada série.
- **US-F10-02 (6a).** Como atleta, quero ver o nível de cada grupo muscular subir com os pontos, para ver a forma de cada grupo melhorar.
- **US-F10-03 (6a).** Como atleta, quero ver o grupo esfriar e perder nível quando a janela passa sem treino, para ter motivo de voltar a tempo.
- **US-F10-04 (6b).** Como atleta, quero pontos em dobro enquanto um grupo está abaixo do melhor nível, para recuperar rápido o que perdi.
- **US-F10-05 (6b).** Como atleta, quero ver o nível geral e o grupo que o limita, para saber qual grupo treinar.

Parâmetros de partida (D41 e D43), recalculáveis com os dados reais (ADR-010): a série que bate o plano vale 10 pontos, até o dobro do plano; os pontos valem em dobro com algum grupo do exercício em janela; o nível *n* custa 40 + 3 × (*n* − 1) pontos; o grupo esfriando perde cerca de 40 pontos por dia. A memória muscular não soma com o ×2 da janela. Fora da janela, a série rende pontos comuns (D52), e o primeiro treino do grupo depois de um esfriamento rende em dobro (D53). O ganho do grupo, o multiplicador, a perda e o recorde seguem as decisões D54 a D62.

```gherkin
# language: pt
Funcionalidade: Pontos, nível e esfriamento

  Cenário: série que bate o plano
    Dado que o plano do "Supino reto" é de 10 repetições com 40 kg
    Quando o atleta registra 10 repetições com 40 kg
    Então a série rende 10 pontos
    E os pontos sobem do botão "Próximo"

  Cenário: série acima do plano tem limite
    Quando o atleta registra o triplo do volume planejado da série
    Então a série rende 20 pontos, o dobro do plano

  Cenário: série em janela
    Dado que peito está em janela
    Quando o atleta registra no "Supino reto" uma série que bate o plano
    Então a série rende 20 pontos, com a marca de pontos em dobro

  Cenário: som desligado
    Dado que o atleta desligou o som do jogo
    Quando ele registra uma série
    Então os pontos aparecem na tela, sem som

  Cenário: barra de nível no descanso
    Dado que peito está no nível 3
    Quando o atleta registra uma série do "Supino reto" e o descanso começa
    Então a barra de nível de peito cresce com os pontos da série

  Cenário: subida de nível
    Dado que faltam 5 pontos para peito sair do nível 3
    Quando uma série rende 10 pontos para peito
    Então peito passa ao nível 4, e a barra mostra a sobra

  Cenário: entrada numa faixa
    Quando peito passa do nível 4 ao 5
    Então o selo da faixa de prata aparece em tela cheia por cerca de 1,7 s, sem pedir toque

  Cenário: redução de movimento
    Dado que o celular pede redução de movimento
    Quando peito sobe de nível
    Então o nível novo aparece sem animação

  Cenário: nível máximo
    Dado que peito está no nível 20
    Quando o atleta registra uma série do "Supino reto"
    Então peito continua no nível 20

  Cenário: barra esvazia depois da janela
    Dado que a janela de quadríceps fechou ontem sem treino
    Quando o atleta abre o treino do dia
    Então quadríceps aparece esfriando, com a barra menor que no fechamento da janela

  Cenário: queda de nível
    Dado que quadríceps está esfriando no nível 7
    Quando a barra de quadríceps chega a zero
    Então quadríceps cai para o nível 6 e continua esfriando

  Cenário: treino interrompe o esfriamento
    Dado que quadríceps está esfriando
    Quando o atleta registra uma série de agachamento
    Então quadríceps deixa de esfriar

  Cenário: nível 1 não cai
    Dado que panturrilhas está no nível 1 e esfriando
    Quando a barra de panturrilhas chega a zero
    Então panturrilhas continua no nível 1

  Cenário: memória muscular
    Dado que o melhor nível de costas é 12 e costas está no nível 8
    Quando o atleta registra num exercício de costas uma série que bate o plano
    Então a série rende pontos em dobro para costas, com a marca de memória muscular

  Cenário: memória muscular não soma com a janela
    Dado que costas está abaixo do melhor nível e em janela
    Quando o atleta registra num exercício de costas uma série que bate o plano
    Então a série rende o dobro, e não o quádruplo

  Cenário: fim da memória muscular
    Dado que o melhor nível de costas é 12
    Quando costas chega ao nível 12
    Então as séries seguintes de costas deixam de render a memória muscular

  Cenário: melhor nível nunca se perde
    Dado que o melhor nível de costas é 12
    Quando costas cai para o nível 8
    Então o melhor nível de costas continua 12

  Cenário: nível geral
    Dado que o programa ativo treina peito no nível 9, costas no nível 7 e quadríceps no nível 4
    Quando o atleta abre o treino do dia
    Então o nível geral aparece como 4, limitado por quadríceps

  Cenário: grupo fora do programa
    Dado que panturrilhas está no nível 1 e o programa ativo não treina panturrilhas
    Quando o atleta abre o treino do dia
    Então panturrilhas não limita o nível geral

  Cenário: atalho do nível geral
    Dado que quadríceps limita o nível geral e está em janela ou esfriando
    Quando o atleta toca no nível geral
    Então o app mostra a letra que mais treina quadríceps

  Cenário: grupo que limita está descansando
    Dado que quadríceps limita o nível geral e está descansando
    Quando o atleta toca no nível geral
    Então o app mostra quando a janela de quadríceps abre, sem levar à letra
```

### F18. Recordes (onda 6a)

- **US-F18-01.** Como atleta, quero ver quando passo do meu recorde num exercício, para ver a força crescer.

O recorde é a maior carga de um exercício para um número de repetições, ou mais repetições com a mesma carga. O app não sugere aumento de carga.

```gherkin
# language: pt
Funcionalidade: Recordes

  Cenário: marca do recorde na série
    Dado que o recorde do "Supino reto" para 10 repetições é de 42,5 kg
    Quando o atleta abre uma série do "Supino reto" com 10 repetições
    Então a marca de 42,5 kg aparece ao lado da carga

  Cenário: carga acima do recorde
    Dado que o recorde do "Supino reto" para 10 repetições é de 42,5 kg
    Quando o atleta registra 10 repetições com 45 kg
    Então a série aparece como recorde
    E o recorde para 10 repetições passa a 45 kg

  Cenário: mais repetições com a mesma carga
    Dado que o recorde do "Supino reto" com 40 kg é de 10 repetições
    Quando o atleta registra 12 repetições com 40 kg
    Então a série aparece como recorde

  Cenário: correção da última série
    Dado que a última série virou recorde por um erro de arrasto
    Quando o atleta corrige a série para uma carga abaixo do recorde anterior
    Então o recorde volta ao valor anterior
```

### F12. Sugestão do treino do dia pelas janelas (onda 6b)

- **US-F12-01.** Como atleta, quero que o treino do dia sugira a letra pelas janelas, para não precisar decidir o que treinar.

A regra segue a D39: sai da sugestão a letra cujos grupos estão na maioria descansando; entre as outras, grupos esfriando pesam mais que grupos em janela, e o grupo mais fraco desempata. Sem histórico, vale a sugestão da US-F03-01.

```gherkin
# language: pt
Funcionalidade: Sugestão pelas janelas

  Cenário: letra com a maioria dos grupos descansando
    Dado que a maioria dos grupos da letra A está descansando
    E que a maioria dos grupos da letra B está em janela
    Quando o atleta abre o treino do dia
    Então a letra B aparece sugerida

  Cenário: grupos esfriando pesam mais
    Dado que a letra B tem grupos em janela e a letra C tem grupos esfriando
    E que nenhuma das duas tem a maioria dos grupos descansando
    Quando o atleta abre o treino do dia
    Então a letra C aparece sugerida

  Cenário: grupo mais fraco desempata
    Dado que as letras B e C empatam pelas janelas
    E que o grupo de menor nível está na letra C
    Quando o atleta abre o treino do dia
    Então a letra C aparece sugerida

  Cenário: sem histórico
    Dado que nenhum treino foi registrado
    Quando o atleta abre o treino do dia
    Então a sugestão segue a regra da US-F03-01
```

### F15b. Indicador de janelas aproveitadas (onda 6b)

- **US-F15b-01.** Como planejador, quero consultar pelo Claude quantas janelas foram aproveitadas em cada semana, para medir a regularidade (O1, meta de 70%).
- **US-F15b-02.** Como atleta, quero ver a meta semanal de janelas no treino do dia, para saber quanto falta na semana.

Uma janela é aproveitada quando o grupo é treinado enquanto ela está aberta. O planejador define a meta semanal pelo Claude [a confirmar: na especificação da US-F15b-02].

```gherkin
# language: pt
Funcionalidade: Janelas aproveitadas e meta semanal

  Cenário: janelas aproveitadas na semana
    Dado que na semana abriram 10 janelas e o atleta treinou o grupo dentro de 7 delas
    Quando o planejador consulta as janelas aproveitadas da semana
    Então o resultado mostra 7 de 10, ou 70%

  Cenário: semana sem janela
    Dado que nenhuma janela abriu na semana
    Quando o planejador consulta as janelas aproveitadas da semana
    Então o resultado mostra 0 de 0, sem porcentagem

  Cenário: progresso da meta semanal
    Dado que a meta semanal é de 6 janelas e o atleta aproveitou 4 nesta semana
    Quando o atleta abre o treino do dia
    Então a faixa de jogo mostra 4 de 6

  Cenário: meta definida pelo Claude
    Quando o planejador define pelo Claude a meta semanal de 8 janelas
    Então a faixa de jogo do treino do dia passa a mostrar a meta de 8
```

### F08. Mapa do corpo (onda 7a)

- **US-F08-01.** Como atleta, quero ver num mapa do corpo o estado de cada grupo muscular, para entender de relance o que está em janela, descansando ou esfriando.

O visual segue o protótipo (`docs/prototipo/`).

```gherkin
# language: pt
Funcionalidade: Mapa do corpo

  Cenário: estado de cada grupo no mapa
    Dado que peito está em janela, costas está descansando e quadríceps está esfriando
    Quando o atleta abre o mapa do corpo
    Então cada grupo aparece com a marca do seu estado

  Cenário: estado sem depender só da cor
    Quando o atleta abre o mapa do corpo
    Então o estado de cada grupo também aparece por forma ou texto, sem depender só da cor

  Cenário: detalhe do grupo
    Quando o atleta toca em peito no mapa
    Então aparecem o nível, a barra de progresso, o melhor nível e o horário da janela de peito
```

### F09. Avisos perto de abrir e de fechar (onda 7a)

- **US-F09-01.** Como atleta, quero ativar os avisos no app instalado, para receber os avisos no celular.
- **US-F09-02.** Como atleta, quero um aviso perto de a janela abrir e perto de fechar, um por letra, e um aviso antes de um grupo cair de nível, para não perder a janela nem o nível.

O celular é um iPhone, e o aviso exige o app instalado na tela inicial, com iOS 16.4 ou posterior (D44, R01). A antecedência dos avisos depende da Q16. Todo aviso também vai por e-mail (D32, F17).

```gherkin
# language: pt
Funcionalidade: Avisos no celular

  Cenário: ativar os avisos
    Dado que o app está instalado na tela inicial do iPhone
    Quando o atleta ativa os avisos e aceita a permissão do sistema
    Então o celular passa a receber os avisos do app

  Cenário: app fora da tela inicial
    Dado que o app está aberto no Safari, sem instalação
    Quando o atleta abre o controle dos avisos
    Então o controle aparece indisponível, com o motivo "instale o app na tela inicial"

  Cenário: permissão negada
    Quando o atleta nega a permissão do sistema
    Então o controle dos avisos aparece desligado

  Cenário: desativar os avisos
    Quando o atleta desativa os avisos no app
    Então o celular deixa de receber avisos

  Cenário: aviso perto de abrir
    Dado que a janela de costas, bíceps e lombar abre amanhã às 9h
    Quando chega a hora do aviso de abertura
    Então o atleta recebe um aviso só, com a letra B e o horário da abertura

  Cenário: aviso perto de fechar
    Dado que a janela da letra B fecha hoje às 20h e os grupos não foram treinados
    Quando chega a hora do aviso de fechamento
    Então o atleta recebe um aviso com a letra B e o horário do fechamento

  Cenário: sem aviso de fechamento depois do treino
    Dado que o atleta treinou a letra B dentro da janela
    Quando chega a hora do aviso de fechamento da letra B
    Então nenhum aviso de fechamento é enviado

  Cenário: aviso antes da queda
    Dado que quadríceps cai para o nível 6 amanhã
    Quando chega a hora do aviso de queda
    Então o atleta recebe um aviso com o nível atual, o nível depois da queda e a letra que treina o grupo

  Cenário: toque no aviso
    Quando o atleta toca num aviso
    Então o app abre no treino do dia
```

### F11. Períodos de 12 semanas e retrato (onda 7b)

- **US-F11-01.** Como atleta, quero que o progresso seja organizado em períodos de 12 semanas, com uma frase de intenção, para dar começo e fim ao esforço.
- **US-F11-02.** Como atleta, quero que o fim do período congele o mapa num retrato, para guardar a forma de cada período.
- **US-F11-03.** Como atleta, quero ver a sequência de semanas com a meta semanal cumprida, para manter a regularidade de uma semana para outra.

O período zera as metas e o ranking; o nível de cada grupo atravessa os períodos (D24). A sequência de semanas tem uma proteção por período (D42). O alinhamento dos períodos ao ciclo trimestral depende da Q01.

```gherkin
# language: pt
Funcionalidade: Períodos, retratos e sequência de semanas

  Cenário: início do primeiro período
    Quando o primeiro período começa
    Então o atleta escreve a frase de intenção do período
    E o período mostra o início, o fim 12 semanas depois e a semana atual

  Cenário: o nível atravessa o período
    Dado que peito está no nível 15 no fim de um período
    Quando o período seguinte começa
    Então peito continua no nível 15
    E as metas e o ranking recomeçam do zero

  Cenário: retrato no fim do período
    Quando o período termina
    Então o mapa do corpo, os níveis e a frase de intenção ficam congelados num retrato

  Cenário: coleção de retratos
    Dado que dois períodos terminaram
    Quando o atleta abre a tela Período
    Então os dois retratos aparecem lado a lado

  Cenário: retrato congelado
    Dado que o retrato de um período foi congelado
    Quando o planejador edita pelo Claude um treino daquele período
    Então o retrato continua igual

  Cenário: sequência de semanas
    Dado que o atleta cumpriu a meta semanal nas últimas 3 semanas
    Quando o atleta abre o treino do dia
    Então a faixa de jogo mostra a sequência de 3 semanas

  Cenário: proteção da sequência
    Dado que o atleta tem uma sequência de 5 semanas e ainda não usou a proteção do período
    Quando uma semana termina sem a meta semanal cumprida
    Então a sequência continua em 5 semanas, e a proteção do período fica usada

  Cenário: semana perdida sem proteção
    Dado que a proteção do período já foi usada
    Quando uma semana termina sem a meta semanal cumprida
    Então a sequência volta a zero
```

### F19. Medalhas e ranking pessoal (onda 7b)

- **US-F19-01.** Como atleta, quero conquistar medalhas por marcos, algumas ocultas até a conquista, para guardar o que alcancei.
- **US-F19-02.** Como atleta, quero ver a posição de cada treino no ranking pessoal do período, para comparar o treino só com os meus treinos.

As medalhas marcam volume, janelas, sequência, nível e recorde. O catálogo de medalhas depende da Q17. O ranking não compara com outras pessoas (D23).

```gherkin
# language: pt
Funcionalidade: Medalhas e ranking pessoal

  Cenário: medalha conquistada
    Dado que o atleta ainda não tem recorde registrado
    Quando ele registra o primeiro recorde
    Então a medalha do primeiro recorde desce do topo da tela
    E a medalha fica na estante de medalhas

  Cenário: medalha oculta
    Quando o atleta abre a estante de medalhas
    Então as medalhas ocultas aparecem sem nome e sem critério até a conquista

  Cenário: medalha nunca se perde
    Dado que o atleta conquistou a medalha do nível 10 em peito
    Quando peito cai para o nível 8
    Então a medalha continua na estante

  Cenário: posição do treino no período
    Dado que um treino do período rendeu mais pontos que o treino de hoje e os outros renderam menos
    Quando a tela de treino terminado aparece
    Então ela mostra "2º do período"

  Cenário: ranking na tela Período
    Quando o atleta abre a tela Período
    Então os treinos do período aparecem ordenados por pontos
```

### F17. Avisos por e-mail (ondas 7a e 7b)

Esta feature entra com os avisos da onda 7a (D32). O resumo semanal (US-F17-03) fica para a 7b, porque traz as medalhas da F19 (D36). O endereço de remetente e o horário do resumo dependem da Q14, e a entrega depende do teste do R09.

- **US-F17-01.** Como atleta, quero receber por e-mail o aviso de janela, um por letra, para não perder a janela quando o aviso no celular não chega.
- **US-F17-02.** Como atleta, quero receber por e-mail o aviso antes de um grupo cair de nível, para ter tempo de treinar.
- **US-F17-03.** Como atleta, quero um resumo semanal por e-mail, com janelas aproveitadas, níveis, recordes e medalhas, para ver a semana sem abrir o app.
- **US-F17-04.** Como atleta, quero desligar os e-mails por um link no próprio e-mail, para parar de recebê-los sem entrar no app.

```gherkin
# language: pt
Funcionalidade: Avisos por e-mail

  Cenário: aviso de janela por e-mail
    Dado que a janela de costas, bíceps e lombar abre amanhã às 9h
    Quando chega a hora do aviso
    Então o atleta recebe um aviso no celular
    E recebe um e-mail com a letra B e o horário da janela

  Cenário: um e-mail por letra
    Dado que três grupos da letra B abrem no mesmo horário
    Quando chega a hora do aviso
    Então o atleta recebe um e-mail só, com os três grupos

  Cenário: aviso de queda por e-mail
    Dado que o quadríceps cai para o nível 6 amanhã
    Quando chega a hora do aviso de queda
    Então o atleta recebe um e-mail com o nível atual, o nível depois da queda e a letra que treina o grupo

  Cenário: resumo semanal
    Quando termina a semana
    Então o atleta recebe um e-mail com as janelas aproveitadas, os níveis, os recordes e as medalhas da semana

  Cenário: desligar os e-mails
    Quando o atleta abre o link de desligar num e-mail
    Então ele deixa de receber e-mails
    E continua recebendo os avisos no celular

  Cenário: falha no envio
    Dado que o servidor de e-mail não consegue entregar uma mensagem
    Então o aviso no celular é enviado mesmo assim
    E a falha fica registrada na situação do sistema
```

---

## 10. Riscos, questões em aberto e validações pendentes

### Riscos (ROAM)

| ID | Risco | ROAM | Tratamento |
|---|---|---|---|
| R03 | O MVP nunca fica pronto (sem prazo, PO sozinho, muitas frentes). É o principal risco (pré-mortem). | Mitigado | Data de cada onda revisada na `/revisao-semanal`; cortar escopo se uma onda atrasar mais que o dobro da estimativa |
| R05 | O MVP não ataca a falta aos treinos; o gatilho só chega na onda 7 | Aceito | Decisão D18 |
| R07 | MCP público sem autenticação forte exporia ou apagaria os dados | Mitigado | NFR02, US-F16-01 |
| R06 | Arrasto impreciso no meio do treino registra carga errada | Mitigado | US-F04-02 (correção da última série) |
| R01 | No iPhone, o aviso só funciona com o app instalado na tela inicial (iOS 16.4 ou posterior) | Assumido | Resolver a Q02 antes da onda 7 |
| R02 | Queda de internet ou energia em casa interrompe os avisos | Aceito | — |
| R04 | A gamificação é sobretudo extrínseca e pode perder força entre a quinta e a oitava semana | Aceito | Reforçar o núcleo 3 do Octalysis (feedback das escolhas) |
| R08 | Ver os níveis caírem depois de semanas parado desanima o retorno | Mitigado | Proteções da D24, sobretudo a memória muscular e o aviso antes da queda, e o primeiro treino depois do esfriamento em dobro (D53) |
| R09 | E-mail enviado do servidor de casa cai no spam ou é bloqueado: provedores de internet costumam bloquear a porta 25, e IP residencial tem má reputação | Assumido | Validar a entrega antes da onda 7, com SPF, DKIM, DMARC e DNS reverso (ADR-007) |

### Questões em aberto
- **Q01:** o primeiro período começa fora do ciclo; os períodos seguintes se realinham ao ciclo trimestral?
- **Q09:** a academia tem sinal de celular e Wi-Fi confiáveis?
- **Q14:** em que dia e hora sai o resumo semanal, e qual é o endereço de remetente dos e-mails (F17)?
- **Q16:** com quantas horas de antecedência saem os avisos de abertura, de fechamento e de queda?
- **Q17:** quais são as medalhas e o critério de cada uma? A proposta sai na especificação da US-F19-01.
- **Resolvidas:** Q02 (D44), Q03 (a F13 foi removida), Q04 (D53), Q05 (MVP sem gamificação, D18), Q06 (D39), Q07 (D46), Q08 (D40), Q10 (D37), Q11 (D41), Q12 (D42), Q13 (D43) e Q15 (D52).

### Hipóteses e validações pendentes (o PO é o único papel)

| ID | Hipótese | Validar com |
|---|---|---|
| H01 | O app atual não puxa o PO de volta | Duas semanas de uso |
| H02 | Um aviso no navegador do celular é gatilho suficiente | Primeiro mês da onda 7 |
| H03 | A janela-base pode sair da literatura sobre recuperação | EN01, com os dados do MVP |
| H04 | A linha de base em janelas é perto de zero | Duas primeiras semanas da onda 5 |
| H05 | O app atual exige mais de um toque por série | Contar os toques num treino real |
| H06 | O app sugere o treino do dia pelas janelas abertas | O PO (onda 6) |
| H07 | Carga e repetições vêm preenchidas do último treino | O PO (onda 3) |
| H08 | As marcações de esforço, valor e incerteza | O PO, ao começar cada onda |
| H09 | Cerca de seis semanas para o MVP, com umas quatro horas por semana | As horas reais disponíveis |
| H10 | O registro precisa funcionar sem sinal | Um treino real (Q09) |
| H11 | O passo do arrasto é definido por exercício | O PO (onda 4) |
| H12 | O app web também exige credencial | O PO (onda 1) |
| H13 | O app vem com um catálogo inicial de músculos e grupos | O PO (onda 1) |

### Registro de decisões

| ID | Decisão |
|---|---|
| D01 | Sem prazo fixo; o primeiro período começa quando o app ficar pronto |
| D02 | Roda no kasparov, exposto pelo Cloudflare Tunnel; dados com o PO |
| D03 | Hoje o PO usa um app pronto |
| D04 | Celular para a academia; administração pelo Claude, via MCP (revisada) |
| D05 | O app próprio se justifica pelos dados presos ou pagos no app atual |
| D06 | As regras de gamificação da seção 3 são requisitos |
| D07 | Cliente único: o PO |
| D08 | Diferença-chave: dados sob controle do PO, sem assinatura |
| D09 | Visão: Redação A |
| D10 | Objetivos principais: O1, O4 e O5; dados próprios viram NFR |
| D11 | Meta do O1: 70% ou mais das janelas aproveitadas |
| D12 | Meta do O4: +20% no volume semanal por grupo |
| D13 | Meta do O5: um toque por passo, com ajuste por arrasto |
| D14 | Importação do app atual removida do produto |
| D15 | No MVP, o MCP substitui as telas de administração (revisada por D22) |
| D16 | O descanso vem do programa, cadastrado junto com séries e repetições |
| D17 | Exercício de repetição ou tempo, que ativa músculos; cada músculo pertence a um grupo |
| D18 | MVP: ondas 1 a 4, acompanhamento do treino mais administração via MCP |
| D19 | F15 dividida em F15a (volume) e F15b (janelas) |
| D20 | Sequenciador mantido; o próximo ciclo é marco do MVP |
| D21 | Criticidade no tempo: 8 para o MVP, 5 para a cadeia do período, 2 para o resto |
| D22 | Telas de administração no Mac, com referência visual no macOS 27, entram depois do MVP e convivem com o MCP; a onda está em aberto (Q10) |
| D23 | Pontos, níveis por grupo muscular, recordes, medalhas e ranking pessoal entram na gamificação. O ranking compara só com o próprio histórico, sem elementos sociais (revisa a Seção 3 e o "não faz") |
| D24 | O grupo perde nível com o tempo assim que a janela passa sem treino, com quatro proteções: aviso antes da queda, memória muscular (pontos em dobro até o melhor nível), medalhas, recordes, retratos e melhor nível que nunca se perdem, e ritmo lento. O nível atravessa os períodos; o período zera só a barra do período, as metas e o ranking (revisa a regra de não perder progresso da Seção 3) |
| D25 | Começar e encerrar o treino pedem confirmação, com o resumo da letra e com as séries que faltam. São as duas exceções à meta de um toque por passo (O5); o treino que termina na última série não pede confirmação |
| D26 | O botão de encerrar sai do canto superior da tela de treino e vai para a folha da sequência do treino (US-F03-04), longe do polegar e do lugar onde se espera o voltar |
| D27 | O exercício por tempo tem contagem regressiva de 3 segundos e cronômetro de execução, com sinais sonoros no começo, nos últimos 3 segundos e no fim. O fim registra a série e inicia o descanso (US-F03-07) |
| D28 | O nível de cada grupo vai de 1 a 20 e mede a forma atual: aproveitando todas as janelas, o grupo chega ao 20 em cerca de 4 semanas (parâmetro). Os pontos são relativos ao plano, e cada grupo recebe o mesmo total por treino completo. O nível premia a regularidade; o recorde premia a força |
| D29 | O nível geral é o nível do grupo mais fraco entre os que o programa treina, e não a média. O app mostra qual grupo limita o nível geral e leva à letra que mais treina esse grupo |
| D30 | Catálogo inicial com 11 grupos musculares: peito, costas (latíssimo, trapézio e romboides), lombar (eretores da espinha), ombros, bíceps, tríceps, abdômen, quadríceps, posteriores de coxa, glúteos e panturrilhas. O exercício separa músculos principais e secundários; o secundário conta metade, como proposta para a Q08 (responde em parte à H13) |
| D31 | O aviso de janela é um por letra, não um por grupo, para os 11 grupos não virarem ruído (F09) |
| D32 | Avisos por e-mail entram na onda 7 (F17): aviso de janela por letra, aviso de queda de nível e resumo semanal. Todo aviso vai pelos dois canais, celular e e-mail. O envio é por servidor SMTP próprio no kasparov, para manter a NFR01 (ADR-007) |
| D33 | O produto se chama Heavy Duty |
| D34 | A roda do ajuste tem o valor maior acima: arrastar para baixo aumenta e arrastar para cima diminui. Os botões − e + ficam ao lado da roda, e os passos são de 2,5 kg, 1 repetição e 5 s (US-F04-01; decisão do PO no protótipo, plano do MVP, Seção 7). A direção foi substituída pela D51 |
| D35 | O recorde vira a F18 (onda 6a), e medalhas e ranking pessoal viram a F19 (onda 7b). A meta semanal entra na F15b (onda 6b). A sequência de semanas entra na F11 (onda 7b), porque a proteção dela é por período |
| D36 | A onda 6 se divide em 6a (pontos, nível e esfriamento da F10; F18) e 6b (memória muscular e nível geral da F10; F12; F15b), e a onda 7 em 7a (F08; F09; F17 sem o resumo semanal) e 7b (F11; F19; resumo semanal da F17). Cada parte tem deploy próprio. O primeiro período começa com o deploy da 7b |
| D37 | As telas de administração no Mac entram depois da onda 7 (responde à Q10) |
| D38 | A janela estreia com uma regra de partida tirada da literatura e do protótipo, ajustada com os dados do MVP (EN01). O cálculo e a simulação pelo MCP vêm antes da janela no celular, que só aparece depois de o PO validar a regra. O volume por grupo fica só no MCP por ora |
| D39 | A sugestão pelas janelas segue a proposta da Q06: sai da sugestão a letra cujos grupos estão na maioria descansando; entre as outras, grupos esfriando pesam mais que grupos em janela, e o grupo mais fraco desempata. O atalho do nível geral só leva à letra do grupo mais fraco se ele estiver em janela ou esfriando (responde à Q06) |
| D40 | O músculo secundário conta metade do volume para o grupo (responde à Q08 e confirma a proposta da D30) |
| D41 | Pontos e nível começam com os parâmetros do `gamificacao.md`: 10 pontos pela série que bate o plano, até o dobro; pontos em dobro em janela; o nível *n* custa 40 + 3 × (*n* − 1) pontos; o nível 20 em cerca de 4 semanas aproveitando todas as janelas. Os parâmetros mudam com a calibração (responde à Q11) |
| D42 | A sequência de semanas tem uma proteção por período (responde à Q12) |
| D43 | O grupo esfriando perde cerca de 40 pontos por dia, e vai do nível 20 ao 1 em 4 a 5 semanas. O ritmo muda com a calibração (responde à Q13) |
| D44 | O celular é um iPhone. O aviso exige o app instalado na tela inicial, com iOS 16.4 ou posterior (responde à Q02) |
| D45 | A onda 5 segue sem o go/no-go de quatro semanas de uso, e a janela aparece no celular sem esperar os dados do MVP. Substitui a espera da D38 |
| D46 | A série de exercício por tempo marca o grupo como treinado, com volume zero; os segundos aparecem à parte (responde à Q07) |
| D47 | A janela abre 24 h depois do treino, mais 1 h a cada 60 kg de volume ajustado, com teto de 72 h, e fecha 120 h depois do treino. O objetivo corrige o volume (força 130%, hipertrofia 100%, resistência 75%). O músculo secundário também abre a janela, com metade do volume. O treino antes de a janela abrir é neutro, e a janela ignora o sono (ADR-031) |
| D48 | O treino encerrado antes volta para a lista de letras, sem a tela de treino terminado. A reabertura desse treino aparece nos selos da janela de cada letra, que buscam as janelas de novo quando a fila de envio esvazia (US-F07-03) |
| D49 | Depois do uso real do MVP, a onda 4b entra antes da onda 5, com o mínimo para o app ser utilizável sem a gamificação: histórico no celular (F20), tempo total e descarte do treino (US-F03-08 e US-F03-09), sinal sonoro e aceleração do descanso (US-F05-02 e US-F05-03), a direção da roda (D51) e as correções de usabilidade abertas como bug |
| D50 | No celular, o histórico serve para ver e apagar, com confirmação; não há edição. A edição de um treino fica só pelo MCP (US-F06-02). Revisa em parte a D04 e a D15 |
| D51 | Na roda do ajuste, arrastar para cima aumenta e arrastar para baixo diminui. Os botões − e + e os passos da D34 continuam. Substitui a direção da D34 |
| D52 | Fora da janela, a série rende pontos comuns (×1), com o grupo descansando, esfriando ou sem janela. Razão: a D47 já declarou neutro o treino antes de a janela abrir, e a ADR-031 recusou penalizar o treino cedo; o ×2 em janela basta para a diferença. O parâmetro `outsideWindowPercent` começa em 100 e muda com a calibração (responde à Q15) |
| D53 | O primeiro treino do grupo depois de um esfriamento ("bem-vindo de volta") rende ×2 para o grupo, como em janela. O ×2 não soma com a memória muscular nem com o da janela: o máximo é ×2, como na D41. Razão: a perda de nível estreia na onda 6a, antes da memória muscular, e a volta é o momento mais frágil (R08) (responde à Q04) |
| D54 | O ganho do grupo vem da razão da série (feito ÷ planejado, até 2): o grupo principal do exercício recebe 10 × razão × 6 ÷ séries planejadas do grupo na letra, e o grupo secundário recebe 10 × razão × 0,5, sem a divisão, os dois vezes o multiplicador do próprio grupo. Um treino completo rende cerca de 60 pontos por grupo, ou 120 em janela, como pede a D28 (fórmula do protótipo v1) |
| D55 | Os pontos mostrados da série dobram se algum grupo do exercício está em janela (D41). O ganho de cada grupo usa o estado do próprio grupo: o grupo descansando não ganha o ×2 só por dividir o exercício com um grupo em janela |
| D56 | O ×2 vale pelo instante da série, contra a janela do treino anterior do grupo, com as janelas congeladas no início do treino. A janela que fecha no meio do treino deixa de dobrar, e o celular sem sinal chega ao mesmo resultado que a API |
| D57 | No exercício com carga planejada 0, a razão entre o feito e o planejado usa as repetições; no exercício por tempo, usa os segundos. Assim o volume planejado nunca é zero |
| D58 | A perda de quem esfria é contínua, em pontos inteiros por hora, desde o fechamento da janela. A barra do nível 20 fica cheia (97 pontos) e esvazia como as outras; na queda, a barra do nível de baixo começa cheia (D43) |
| D59 | O recorde segue a F18, e não o protótipo: maior carga para um número de repetições, ou mais repetições com a mesma carga. A primeira série de um exercício não é recorde, só exercício de repetição tem recorde na onda 6a, e a série anterior do mesmo treino conta |
| D60 | O som do jogo tem chave própria (`heavy-duty:game-sound`), separada do som do cronômetro, na folha da sequência do treino. O bipe do descanso é funcional; o som dos pontos é decorativo |
| D61 | O treino do dia mostra o selo e a barra de nível de cada grupo ao lado do selo da janela, na linha da letra, como no protótipo v1 |
| D62 | O resumo do treino com o total de pontos fica fora da onda 6a; os pontos do treino e o ranking chegam na onda 7b (F19) |

---

## 11. Rastreabilidade

| Objetivo | Features | Stories |
|---|---|---|
| O5. Um toque por passo | F03, F04, F05 | US-F03-01, US-F03-02, US-F03-03, US-F03-04, US-F03-05, US-F03-06, US-F03-07, US-F03-08, US-F03-09, US-F04-01, US-F04-02, US-F05-01, US-F05-02, US-F05-03 |
| O4. Progressão de carga | F02, F03, F06, F20; depois F15a, F18 e F10 | US-F02-01, US-F02-02, US-F03-02, US-F06-01, US-F20-01, US-F20-02, US-F15a-01, US-F18-01 |
| O1. Regularidade | F07, F08, F09, F10, F11, F12, F15b, F17, F19 (pós-MVP); o MVP gera os dados para a EN01 | EN01-01, EN01-02, US-F07-01 a US-F07-03, US-F10-01 a US-F10-05, US-F12-01, US-F15b-01, US-F15b-02, US-F08-01, US-F09-01, US-F09-02, US-F11-01 a US-F11-03, US-F17-01 a US-F17-04, US-F19-01, US-F19-02 |
| NFR01. Dados próprios | F14, F16 | US-F14-01, US-F14-02, US-F16-01 |
| Administração | F01, F02, F06, F16 | US-F01-01, US-F01-02, US-F02-01, US-F02-02, US-F06-01, US-F06-02, US-F16-01 |

---

## Próximos passos sugeridos
1. Responder às Q14, Q16, Q17 e Q01 antes das stories que cada uma bloqueia. Cada questão e cada story têm uma issue no GitHub, com as dependências.
2. Testar a entrega de e-mail pelo kasparov antes da onda 7a (R09).
3. Recalibrar a janela com o histórico real pela simulação da EN01-01 (ADR-031).
