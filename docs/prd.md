# PRD — App de treino

## 1. Controle

| Campo | Valor |
|---|---|
| Versão | 0.2 |
| Data | 20/11/2026 |
| Status | Rascunho — sujeito a revisão humana |
| Classificação | Público |
| Elaboração | Elaborado com apoio de IA (Lean Inception solo, método de Paulo Caroli, traduzido para SAFe) |
| PO, revisor e aprovador | Leandro Alves |

Todas as estimativas (esforço, valor, incerteza, WSJF e prazo) são preliminares e devem ser revisadas a cada onda.

---

## 2. Resumo executivo

A frequência de musculação do Leandro caiu para uma vez por semana ou menos porque nada o puxa de volta, e o app que ele usa hoje guarda o histórico em dados presos ou pagos. O produto é um app web pessoal, hospedado no próprio servidor (kasparov), com duas frentes: no celular, o acompanhamento do treino na academia, com um toque por passo; pelo Claude, via MCP, toda a administração. A diferença-chave são os dados sob controle dele, sem assinatura. O benefício principal é uma gamificação leve, desenhada com o Octalysis: janelas de atividade por grupo muscular, calculadas pelo app, que o avisam perto de abrir e de fechar, em períodos de 12 semanas. O MVP (ondas 1 a 4) entrega o núcleo: registro e administração. A gamificação vem nas ondas 5 a 7, calibrada com os dados reais do MVP. O principal risco é o MVP nunca ficar pronto, porque não há prazo fixo; a mitigação é acompanhar a data de cada onda na revisão semanal.

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
> Para o Leandro, que voltou a treinar pouco e não quer o histórico de treino preso em um app pago, o app de treino é um registro de musculação hospedado no próprio servidor, que acompanha o treino no celular e o puxa de volta com janelas de atividade por grupo muscular. Diferentemente dos apps prontos de registro, nosso produto mantém todos os dados sob controle dele, sem assinatura.

### Projeto de gamificação (Octalysis)
A gamificação é leve: sem pontos, medalhas, ranking ou elementos sociais. A regra de desenho é que o black hat (escassez, perda) traz de volta e o white hat (realização, criatividade) faz ficar.

| Núcleo | Intensidade proposta (0–10) | Mecânica |
|---|---|---|
| 1. Significado | 2 | Frase de intenção do período, exibida no retrato final (proposta) |
| 2. Realização | 8 | Barra de progresso por grupo muscular e mapa do corpo |
| 3. Criatividade e feedback | 5 | Divisão, objetivo e cargas livres; o mapa reage na hora ao registro |
| 4. Posse | 5 | Coleção de retratos congelados dos períodos |
| 5. Social | 0 | Excluído |
| 6. Escassez | 7 | Janela que abre depois do descanso e fecha; avisos perto de abrir e de fechar |
| 7. Imprevisibilidade | 3 | A janela varia conforme o volume do treino |
| 8. Perda | 4 | O grupo esfria quando a janela passa, mas nunca perde o progresso já feito |

Equilíbrio: white hat 15 contra black hat 14. Ponto fraco: o lado esquerdo do octógono (2, 4, 6, motivação extrínseca) soma 20, contra 8 do lado direito (3, 5, 7, intrínseca). O risco de perda de força entre a quinta e a oitava semana está registrado como R04.

**Regras de jogo decididas pelo PO:**
- A janela é por grupo muscular, e o próprio app calcula quando ela abre e quanto tempo fica aberta, a partir do último treino. O objetivo do programa define a janela-base, e o volume registrado a ajusta.
- Só musculação conta, em qualquer divisão.
- O progresso é uma barra por grupo, que cresce mais quando o grupo é treinado dentro da janela.
- Quando a janela passa sem treino, o grupo esfria, mas não perde progresso.
- Os períodos duram 12 semanas e terminam com um retrato congelado; o período seguinte recomeça do zero.
- O app avisa perto de a janela abrir e perto de fechar.

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
| Um registro de musculação com gamificação leve | Um personal trainer que monta treino ou prescreve carga |
| Uma ferramenta própria, rodando no kasparov | Um app de saúde geral (sono, dieta, cardio, BJJ) |

| Faz | Não faz |
|---|---|
| Guia e registra o treino com um toque por passo e ajuste por arrasto | Dar pontos, medalhas ou ranking |
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
- **Momento crítico fora da jornada:** voltar depois de semanas parado e encontrar o mapa todo esfriado (Q04).

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
| F07 | Cálculo da janela por grupo | Feature + EN01 | 5 | EE | $$$ | ♥♥ | Vermelho | Uma janela calibrada com dados reais é crível e puxa o PO de volta | A definir na onda 5 (depende de EN01, Q07, Q08) |
| F15a | Indicadores de volume por grupo | Feature | 5 | E | $$ | ♥ | Verde | Medir o O4 sem esforço manual | A definir |
| F10 | Progresso por grupo e esfriamento | Feature | 6 | E | $$ | ♥♥ | Amarelo | Progresso visível sustenta a motivação (Octalysis 2) | A definir (depende de Q04) |
| F12 | Sugestão do treino do dia pelas janelas | Feature | 6 | E | $$ | ♥♥ | Amarelo | O atleta não precisa decidir o que treinar | A definir (depende de Q06) |
| F15b | Indicador de janelas aproveitadas | Feature | 6 | E | $$ | ♥ | Verde | Medir o O1 | A definir |
| F08 | Mapa do corpo | Feature | 7 | EE | $$$ | ♥♥♥ | Amarelo | O mapa torna o estado das janelas visível de relance | A definir (protótipo antes) |
| F09 | Avisos perto de abrir e de fechar | Feature | 7 | EE | $$$ | ♥♥ | Amarelo | O aviso é o gatilho que falta hoje (H02) | A definir (depende de Q02) |
| F11 | Períodos de 12 semanas e retrato | Feature | 7 | E | $ | ♥♥ | Verde | Começo e fim dão sentido ao esforço (Octalysis 4) | A definir (depende de Q01) |

### Enabler de exploração
- **EN01, calibrar a janela (de F07).** Pergunta: que horas-base por objetivo e que ajuste pelo volume fazem a janela parecer certa no uso real? Insumo: o histórico registrado durante o MVP. Aprendizado esperado: uma regra de cálculo validada pelo PO antes de a janela aparecer.

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
| 5 | F07, F15a | Janela calibrada com dados reais; indicador de volume |
| 6 | F10, F12, F15b | Progresso, treino do dia e indicador de janelas |
| 7 | F08, F09, F11 | Mapa, avisos e períodos: início do primeiro período de 12 semanas |

---

## 9. User stories por feature (MVP)

São 15 stories. Os exemplos de cargas e exercícios nos cenários são ilustrativos.

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
```

### F05. Descanso do programa
- **US-F05-01.** Como atleta, quero que o descanso planejado conte sozinho e que um toque leve à próxima série, para seguir o ritmo do programa.

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

### Questões em aberto
- **Q01:** o primeiro período começa fora do ciclo; os períodos seguintes se realinham ao ciclo trimestral?
- **Q02:** o celular é iPhone ou Android?
- **Q04:** o primeiro treino depois de um esfriamento rende o progresso cheio ("bem-vindo de volta")?
- **Q06:** quando a janela sugere uma letra e o plano sugere outra, qual vale?
- **Q07:** como calcular o volume de um exercício por tempo?
- **Q08:** um músculo ativado de forma secundária conta o volume inteiro para o grupo, ou só uma parte?
- **Q09:** a academia tem sinal de celular e Wi-Fi confiáveis?
- **Q10:** em que onda entram as telas de administração no Mac (D22)?
- **Resolvidas:** Q03 (a F13 foi removida) e Q05 (MVP sem gamificação, D18).

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

---

## 11. Rastreabilidade

| Objetivo | Features | Stories |
|---|---|---|
| O5. Um toque por passo | F03, F04, F05 | US-F03-01, US-F03-02, US-F03-03, US-F04-01, US-F04-02, US-F05-01 |
| O4. Progressão de carga | F02, F03, F06; depois F10, F15a | US-F02-01, US-F02-02, US-F03-02, US-F06-01; stories das ondas 5 e 6 a escrever |
| O1. Regularidade | F07, F08, F09, F10, F11, F12, F15b (pós-MVP); o MVP gera os dados para a EN01 | Stories das ondas 5 a 7 a escrever |
| NFR01. Dados próprios | F14, F16 | US-F14-01, US-F14-02, US-F16-01 |
| Administração | F01, F02, F06, F16 | US-F01-01, US-F01-02, US-F02-01, US-F02-02, US-F06-01, US-F06-02, US-F16-01 |

---

## Próximos passos sugeridos
1. Responder às hipóteses H12 e H13, que entram na onda 1.
2. Incluir o MVP (ondas 1 a 4) como meta de desenvolvimento no planejamento do próximo ciclo (`plano-trimestral`), com a data de cada onda no scorecard.
3. Responder às Q02 e Q09 antes da onda 3: o tipo de celular e o sinal na academia definem a instalação e o modo sem sinal.
4. Ao fim do MVP, rodar a EN01 com o histórico real e escrever as stories da onda 5.
