# Diretrizes de interface do Heavy Duty

## Resumo

Este documento é o guia de interface (HIG) do Heavy Duty. Ele define layout, alvos de toque, navegação, tipografia, cor, materiais, forma, ícones, movimento e acessibilidade da PWA (`apps/ui`). A referência visual é a linguagem do iOS 27 e do macOS 27, baseada no Liquid Glass, adaptada para a web. O revisor confere cada regra no diff e na tela renderizada.

## Sumário

1. Linguagem de requisitos
2. Escopo e plataformas
3. Princípios de interface do app
4. Referência visual: Liquid Glass na web
5. Layout e margens
6. Agrupamento de conteúdo
7. Alvos de toque
8. Botões
9. Navegação
10. Tipografia
11. Cor
12. Materiais
13. Forma e cantos
14. Ícones
15. Movimento e resposta ao toque
    1. Cronômetro do exercício por tempo
    2. Descanso
16. Acessibilidade
17. Estados da interface
18. Tokens de design
19. Verificação geométrica
20. Roteiro de revisão
21. Referências

## 1. Linguagem de requisitos

As palavras-chave seguem o BCP 14 [RFC2119] [RFC8174], com a tabela de `docs/convencoes/comentarios.md`, Seção 2. Elas têm esse sentido só quando aparecem em caixa alta.

Os valores numéricos deste documento têm uma de três origens, sempre indicada:

- **HIG:** citado das Human Interface Guidelines da Apple [HIG].
- **WCAG:** citado das WCAG 2.2 [WCAG22].
- **Projeto:** decisão deste projeto, sujeita a revisão do PO.

Valor sem origem verificável fica como `[a confirmar: …]`. Não preencha lacuna com número inventado.

## 2. Escopo e plataformas

As regras valem para toda tela e todo componente de `apps/ui`.

| Contexto | Referência | Prioridade |
|---|---|---|
| PWA instalada no iPhone, na academia (persona Atleta, P1) | iOS 27 | Principal |
| PWA instalada em Android (Q02 do PRD está em aberto) | iOS 27, com o mesmo layout | Mesma do iPhone |
| Telas de administração no Mac (persona Planejador, P2) | macOS 27 | Depois do MVP (PRD, D22); onda em aberto (Q10) |
| PWA aberta no navegador do Mac, em janela larga | macOS 27 | Secundária |

A referência do macOS 27 vale para as telas de administração e para a adaptação do layout a telas largas (Seção 5.5).

A UI é uma página web. Ela segue a linguagem visual do iOS e do macOS, mas NÃO DEVE fingir ser um app nativo da Apple: não usa logotipo, marca, fonte nem ícone licenciado só para plataformas Apple (Seções 10 e 14).

## 3. Princípios de interface do app

Os princípios vêm das personas e das metas do PRD. Em conflito entre uma regra visual e um princípio, o princípio vence.

1. **Um toque por passo.** Cada passo do fluxo da academia DEVE pedir um toque (PRD, O5). A tela NÃO DEVE pedir confirmação extra no fluxo de treino, com duas exceções (PRD, D25):
   - Começar o treino DEVE pedir confirmação numa folha com o resumo da letra: exercícios, séries e duração estimada.
   - Encerrar o treino pelo botão "Encerrar", na folha da sequência do treino (Seção 9.4), DEVE pedir confirmação numa folha com as séries feitas e as que faltam. O treino que termina na última série NÃO DEVE pedir confirmação.
   - Na folha de encerrar, "Continuar" mantém o treino.
   - Com qualquer folha aberta, a da sequência do treino ou a de encerrar, o descanso continua contando, mas a próxima série espera a folha fechar. A série seguinte aparece quando a folha fecha, e o toque em "Próximo" espera 0,8 s depois dessa passagem.
2. **Leitura de relance.** O atleta olha o celular apoiado no banco, entre séries. Carga, repetições e descanso DEVEM ser os maiores elementos da tela de treino.
3. **Sem teclado no treino.** O fluxo de treino NÃO DEVE abrir teclado. Valores mudam por arrasto ou por toque (PRD, F04; Seção 16.3).
4. **Estado de rede visível.** Quando a série fica na fila local, a tela DEVE mostrar que o envio está pendente, sem bloquear o treino (PRD, US-F03-03).
5. **Gamificação sem comparação social.** A interface PODE mostrar pontos, níveis, recordes, medalhas e ranking pessoal, mas NÃO DEVE comparar o atleta com outras pessoas (PRD, D23; `docs/gamificacao.md`).
6. **Sem texto de instrução no fluxo da academia.** As telas do fluxo da academia NÃO DEVEM ter texto de instrução, como "Toque numa letra para começar". O significado vem do rótulo do controle, do ícone e do indicador visual. Rótulo de estado, como "Sugerida", não é instrução (US-F03-01).
7. **Indicador visual antes de texto.** Progresso e estado DEVERIAM aparecer num indicador visual (barra, pontos, anel) antes de aparecer em texto. O indicador DEVE ter papel e nome acessíveis, como `role="progressbar"` com `aria-valuetext` "1 de 3" (Seção 16.1; US-F03-01).

## 4. Referência visual: Liquid Glass na web

O Liquid Glass é a linguagem visual que a Apple introduziu no iOS 26 e no macOS 26 [APPLE-LG]. A linguagem separa duas camadas:

| Camada | Conteúdo | Material |
|---|---|---|
| Conteúdo | Treino do dia, séries, histórico | Fundo opaco |
| Controles e navegação | Barra de abas, barra de ferramentas, botões flutuantes, folhas | Vidro translúcido que flutua sobre o conteúdo |

Regras:

- O material de vidro DEVE ficar só na camada de controles e navegação. O conteúdo NÃO DEVE usar vidro.
- Vidro NÃO DEVE ficar sobre vidro.
- O texto sobre vidro DEVE manter o contraste da Seção 11.3 em qualquer conteúdo que passe por trás.

Segundo a cobertura de imprensa, o iOS 27 e o macOS 27 reduzem a transparência padrão do Liquid Glass e acrescentam um controle de transparência nos Ajustes, de "ultraclear" a "fully tinted" [IOS27-IMPRENSA] [a confirmar no HIG em developer.apple.com]. Uma página web não lê esse ajuste. Por isso:

- O vidro do app DEVERIA usar a transparência reduzida como padrão (Seção 12).
- O vidro DEVE virar fundo opaco quando o usuário pede menos transparência ou mais contraste (Seção 12).

## 5. Layout e margens

### 5.1. Área segura

- A página DEVE declarar `viewport-fit=cover` e respeitar `env(safe-area-inset-*)` em todo controle perto da borda.
- Fundo e imagem PODEM ir até a borda física. Controle interativo NÃO DEVE encostar na borda física.

### 5.2. Margens laterais

- O conteúdo DEVE respeitar uma margem lateral fixa em toda a tela. Valor: 16 px no celular (Projeto, alinhado à margem padrão do iOS [a confirmar: valor publicado no HIG]).
- Botão de largura total NÃO DEVERIA ser o padrão. "Buttons feel at home ... when they respect system-defined margins and are inset from the edges of the screen" [HIG-BUTTONS].

### 5.3. Escala de espaçamento

O espaçamento DEVE usar a escala de tokens da Seção 18, com base de 4 px (Projeto): 4, 8, 12, 16, 20, 24, 32, 40 e 48 px.

### 5.4. Ordem de leitura

- O item mais importante DEVE ficar perto do topo e da borda inicial [HIG-LAYOUT].
- Os componentes DEVEM estar alinhados entre si. Borda desalinhada parece descuido mesmo com espaçamento correto.
- O conteúdo que não cabe na primeira tela DEVE dar pista de que existe mais (revelação progressiva), em vez de sumir sem rastro.
- Na tela de treino, a ação principal ("Próximo") DEVERIA ficar na metade de baixo da tela, ao alcance do polegar (Projeto).

### 5.5. Tela larga e administração (referência macOS 27)

- Acima de 768 px de largura (Projeto [a confirmar]), a tela de treino DEVERIA ficar numa coluna central com largura máxima de 640 px (Projeto [a confirmar]), em vez de esticar.
- As telas de administração (exercícios, programas e histórico) DEVERIAM seguir a estrutura de janela do macOS 27: barra lateral para as seções, barra de ferramentas para as ações da tela atual e área de conteúdo.
- A barra lateral é navegação. Ela segue as regras de navegação da Seção 9.1: troca de seção, nunca ação.
- Ações destrutivas na administração, como remover um treino, DEVEM pedir confirmação explícita (PRD, US-F06-02).
- Os alvos de toque da Seção 7 valem também em tela larga, porque a PWA pode ser usada por toque num tablet (Projeto).

## 6. Agrupamento de conteúdo

- Grupos DEVEM ser separados por borda, mudança de cor de fundo ou divisor, não só por espaço [HIG-BOXES].
- Subgrupo DEVE usar espaçamento e alinhamento, não caixa dentro de caixa.
- Espaçamento menor indica relação maior. Espaçamento maior indica relação menor.
- Caixa DEVE ser pequena em relação ao contêiner. Caixa do tamanho da tela não separa nada.
- Título de grupo DEVE ser uma frase curta, em caixa de frase, sem pontuação final.

## 7. Alvos de toque

- Todo elemento tocável DEVE ter área de toque de pelo menos 44 × 44 px. "A button needs a hit region of at least 44×44 pt" [HIG-BUTTONS]. Na web, 1 pt corresponde a 1 px CSS na escala base. O valor coincide com o critério 2.5.5 das WCAG 2.2 [WCAG22].
- O desenho do ícone PODE ser menor que 44 px. O padding invisível completa a área de toque; a arte não aumenta.
- Os controles da tela de treino ("Próximo", ajuste de valor) DEVERIAM ter pelo menos 56 px de altura (Projeto), porque o atleta toca com a mão suada ou ocupada.
- Os botões "Entrar" e "Próximo" têm 64 px de altura (`--target-large`, Protótipo v1, `.btn-xl`). Os botões das folhas abertas na tela de treino têm 56 px.
- Duas áreas de toque NÃO DEVEM se sobrepor. A distância entre duas áreas vizinhas DEVERIA ser de pelo menos 8 px (Projeto).

```css
.icon-button {
  width: 24px;
  height: 24px;
  padding: 10px;
  box-sizing: content-box;
}
```

## 8. Botões

- O botão preferido DEVE se destacar pelo estilo (preenchimento ou cor de destaque), não pelo tamanho [HIG-BUTTONS]. Botões de uma mesma linha têm o mesmo tamanho.
- Uma tela NÃO DEVE ter mais de 2 botões de estilo proeminente [HIG-BUTTONS].
- Se o conteúdo atrás do botão já é colorido, o rótulo do botão DEVERIA ser monocromático.
- Todo botão DEVE ter estado pressionado, mostrado no `pointerdown`. "Without a press state, a button can feel unresponsive" [HIG-BUTTONS].
- Botão do Liquid Glass usa forma de cápsula ou círculo. Os botões do app DEVERIAM usar cápsula para ação com rótulo e círculo para ação só com ícone (Seção 13).

## 9. Navegação

### 9.1. Barra de abas

- A barra de abas DEVE servir só para trocar de seção, nunca para executar ação [HIG-TABBARS]. Ação sobre a tela atual vai para a barra de ferramentas ou para um botão flutuante independente.
- A barra de abas DEVE ficar visível em todas as seções. Exceção: folha ou modal de tela cheia temporário.
- Aba de seção vazia NÃO DEVE sumir nem ficar desativada. A seção mostra um estado vazio com explicação (Seção 17).
- O rótulo da aba DEVERIA ter uma palavra. Todas as abas usam o mesmo estilo de ícone.
- O selo (ponto ou número) DEVE marcar só informação que pede atenção.
- No estilo do iOS 27, a barra de abas flutua sobre o conteúdo, com material de vidro (Seção 12).

### 9.2. Navegação no MVP

O MVP tem uma seção na UI, o treino (PRD, ondas 1 a 4). Uma barra de abas com uma aba só NÃO DEVE existir. A barra de abas entra quando a UI tiver 2 seções ou mais, como o mapa do corpo da onda 7 [a confirmar: lista de seções na onda 6].

### 9.3. Botão flutuante sobre a barra de abas

O HIG não especifica botão de ação central sobre a barra de abas. Se o app adotar esse padrão:

- O botão DEVE ser um elemento independente, não um item da lista de abas.
- A barra DEVE reservar um espaço vazio do tamanho do botão, para o botão não cobrir a área de toque das abas vizinhas.
- A altura que o botão sobe acima da barra é escolha visual do PO. Ponto de partida: 15 % a 20 % da altura do botão, medidos contra o centro visual dos ícones das abas.

### 9.4. Navegação no treino

- O topo da tela de treino DEVE ter um controle com a letra e a barra de exercícios. Um toque nele abre a folha da sequência do treino (PRD, US-F03-04).
- A folha DEVE listar os exercícios da letra com o estado de cada um: feito, com as séries registradas (US-F03-06); atual; pulado; ou por fazer.
- A lista das séries registradas DEVE aparecer só no exercício feito e DEVE ser só de leitura: o item da série não é um controle e não leva a ação nenhuma. Cada item mostra o número da série, a carga em kg e as repetições ou os segundos registrados. O leitor de tela DEVE ler a série por extenso, como "Série 1: 42,5 kg, 10 repetições" (US-F03-06).
- Quando a folha passa da altura da tela, a lista de exercícios DEVE rolar dentro da folha, com o título, "Fechar" e "Encerrar" sempre visíveis. A página atrás da folha NÃO DEVE rolar (US-F03-06).
- Um toque num exercício que falta DEVE levar a ele. Durante o descanso, o exercício escolhido vira o próximo, e o descanso continua.
- Com a folha da sequência aberta, o descanso continua contando, mas a passagem à série seguinte espera a folha fechar (Seção 3, princípio 1).
- O exercício atual DEVE ter a ação "Pular" (US-F03-05), com área de toque de 56 px ou mais, e o texto do botão DEVE dizer o nome do exercício no nome acessível. A ação "Pular" NÃO DEVE aparecer quando não resta outro exercício, não pulado, com série por fazer: nesse caso o atleta termina o exercício ou encerra o treino. A ação NÃO DEVE depender de gesto (WCAG 2.5.7).
- O exercício pulado continua na lista com o texto "Pulado" e PODE ser feito depois. A tela de treino terminado DEVE mostrar a seção "Ficaram de fora" com os exercícios pulados que não foram feitos, e NÃO DEVE mostrar a seção quando nada ficou de fora.
- O botão de encerrar o treino DEVE ficar na folha da sequência, não no topo da tela de treino (PRD, D26). O canto superior é o lugar onde se espera o voltar e fica longe do polegar, o que facilita o toque acidental.

## 10. Tipografia

### 10.1. Família

- A fonte DEVE ser a fonte do sistema, pela pilha `system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`. No iPhone e no Mac, a pilha mostra a fonte do sistema da Apple sem distribuir o arquivo.
- O app NÃO DEVE incluir nem servir os arquivos da família SF. A licença da Apple restringe essas fontes a apps para plataformas Apple [APPLE-FONTS].

### 10.2. Tamanho e escala

- O tamanho da fonte DEVE estar em `rem` e acompanhar o ajuste de tamanho de texto do usuário.
- No Safari do iOS, o texto DEVE seguir o Dynamic Type por `font: -apple-system-body` na raiz, dentro de `@supports (font: -apple-system-body)`. A mesma regra repõe `font-family: var(--font-sans)`, e os outros navegadores mantêm a escala em `rem` (US-F03-01).
- A conferência do Dynamic Type no iPhone é tarefa manual: o Chromium do e2e não aceita `-apple-system-body`.
- O texto do corpo NÃO DEVE ficar abaixo de 1 rem (Projeto).

### 10.3. Números do treino

- Carga, repetições, tempo e descanso DEVEM usar `font-variant-numeric: tabular-nums`. Assim, os dígitos do cronômetro não mudam de largura a cada segundo.
- A unidade (`kg`, `s`) DEVERIA ter tamanho menor e peso menor que o número.

## 11. Cor

### 11.1. Papéis

- Cada cor DEVE ter um papel só em toda a interface [HIG-COLOR]. Se a cor de destaque indica elemento interativo, ela NÃO DEVE marcar texto só enfatizado, título ou contagem.
- A cor NÃO DEVE ser o único sinal de um estado. O estado também tem texto ou ícone.

| Papel | Token | Uso |
|---|---|---|
| Destaque | `--color-accent` | Só elemento interativo: botão proeminente, aba ativa, link |
| Texto | `--color-label`, `--color-label-secondary` | Texto principal e secundário |
| Fundo | `--color-background`, `--color-background-grouped` | Camada de conteúdo |
| Separador | `--color-separator` | Divisores e bordas de grupo |
| Sucesso | `--color-success` | Série registrada, envio concluído e treino concluído |
| Atenção | `--color-warning` | Envio pendente sem rede |
| Erro | `--color-danger` | Falha e ação destrutiva |
| Janela de atividade | `--color-window-open`, `--color-window-rest`, `--color-window-cooling` | Só o indicador do estado da janela: aberta, descansando e esfriando (onda 5, treino do dia). O texto do selo usa `--color-label`. A janela aberta também marca o ×2 dos pontos (ondas 6 e 7) |
| Pontos e nível | `--color-game-xp`, `--color-game-xp-2` | Só gamificação: pontos, barra e selo de nível (ondas 5 a 7) |
| Faixa de nível | `--color-tier-1` a `--color-tier-4` | Só gamificação: selo de nível em bronze, prata, ouro e violeta. Cada faixa também tem forma própria (círculo, escudo, hexágono e estrela), para não depender só da cor (`docs/gamificacao.md`) |
| Medalha e ranking | `--color-game-gold` | Só gamificação: medalhas e posições do ranking pessoal |
| Recorde | `--color-game-record` | Só gamificação: marca e destaque de recorde |
| Sequência de semanas | `--color-game-flame` | Só gamificação: ícone da sequência |

Os valores das cores, nos temas claro e escuro e no contraste alto, estão na Seção 18.

### 11.2. Aparência

- Toda cor DEVE ter variante clara, variante escura e variante de contraste alto de cada uma [HIG-COLOR].
- A aparência DEVE seguir `prefers-color-scheme` e `prefers-contrast`.

### 11.3. Contraste

| Elemento | Contraste mínimo | Origem |
|---|---|---|
| Texto normal | 4,5:1 | WCAG 1.4.3 |
| Texto grande (a partir de 24 px, ou 18,66 px em negrito) | 3:1 | WCAG 1.4.3 |
| Borda de controle, ícone e indicador de estado | 3:1 | WCAG 1.4.11 |

As cores de sucesso e de atenção marcam só ícone e indicador (3:1). Elas NÃO DEVEM colorir texto normal, porque no tema claro medem 3,95:1 (sucesso) e 4,29:1 (atenção) contra `--color-background`.

O contraste de texto sobre vidro DEVE ser medido contra o fundo mais claro e o mais escuro que podem passar por trás.

## 12. Materiais

- O vidro DEVE usar `backdrop-filter` com desfoque e um preenchimento semitransparente, nos tokens `--material-glass` e `--material-glass-fill`.
- O preenchimento do vidro DEVERIA ter opacidade alta o bastante para o texto passar na Seção 11.3 sem depender do conteúdo de trás (Projeto, alinhado à transparência reduzida do iOS 27).
- O vidro DEVE ter borda de 1 px em `--material-glass-border` e sombra `--shadow-glass`. A folha DEVE usar `--material-sheet-fill` com o mesmo desfoque, a mesma borda e a mesma sombra. Os valores estão na Seção 18.
- O vidro e a folha DEVEM virar fundo opaco `--color-background-elevated` nestes casos, e no contraste alto a borda passa a ter 1 px em `--color-label`:

```css
@supports not (backdrop-filter: blur(1px)) {
  .glass { background: var(--color-background-elevated); }
}

@media (prefers-reduced-transparency: reduce), (prefers-contrast: more) {
  .glass {
    backdrop-filter: none;
    background: var(--color-background-elevated);
  }
}
```

O suporte de navegador a `prefers-reduced-transparency` varia [a confirmar na primeira tela com vidro]. A regra com `prefers-contrast` cobre parte dos casos.

## 13. Forma e cantos

- Os cantos DEVEM ser concêntricos: o raio interno é o raio externo menos o padding entre as duas formas. Um botão dentro de um cartão com raio 20 px e padding 8 px tem raio 12 px.
- Os tokens de raio (`--radius-*`) DEVEM ser usados em vez de valor solto. Os valores estão na Seção 18.
- A Apple usa curva contínua nos cantos (superelipse). O HIG não publica um percentual de raio para elementos de interface em geral. Não cite números como "22,37 %" como regra da Apple.
- Na web, `border-radius` comum é o padrão. `corner-shape: squircle` PODE entrar como melhoria progressiva onde o navegador aceitar [a confirmar: suporte em 2026].
- Botão com rótulo DEVERIA ser cápsula (`border-radius: 9999px`). Botão só com ícone DEVERIA ser círculo.

## 14. Ícones

- O app DEVE usar um conjunto de ícones só, com tamanho, traço e nível de detalhe iguais.
- O app NÃO DEVE usar SF Symbols. A licença da Apple restringe os símbolos a apps para plataformas Apple [APPLE-SFSYMBOLS]. O conjunto escolhido DEVE ter licença compatível com MIT. O conjunto do app é o Lucide (`lucide-react`, ISC), conforme a ADR-016.
- O traço do ícone DEVERIA combinar com o peso do texto vizinho.
- Ícone assimétrico DEVE ser centralizado opticamente, não pela caixa delimitadora.
- Ícone sem rótulo visível DEVE ter nome acessível (`aria-label`).
- Os elementos de gamificação (pontos, nível, medalha, ranking, recorde, sequência e meta semanal) PODEM usar ícones preenchidos com gradiente, nas cores de jogo da Seção 11.1, para se distinguirem dos ícones de traço da interface (`docs/gamificacao.md`).

## 15. Movimento e resposta ao toque

- O estado pressionado DEVE aparecer no `pointerdown`, não na soltura do toque.
- A transição entre estados DEVERIA durar até 300 ms (Projeto [a confirmar]). As durações são os tokens `--duration-fast` (estado pressionado), `--duration-medium`, `--duration-base`, `--duration-countdown` (número da contagem de 3 s) e `--duration-toast` (tempo de exibição do aviso flutuante), com valores na Seção 18.
- O movimento DEVE ser reduzido a troca de opacidade, ou retirado, com `prefers-reduced-motion: reduce`.
- O fim do descanso DEVE ter sinal visual. O Safari do iOS não aceita a Vibration API, então a interface NÃO DEVE depender de vibração.
- As regras detalhadas de animação, mola e gesto ficam para um documento próprio [a confirmar: quando a onda 3 começar].
- Som, vibração e animações longas (pontos que sobem, subida de nível em tela cheia, medalha) PODEM ser usados só nos elementos de gamificação, conforme `docs/gamificacao.md`, no cronômetro do exercício por tempo (Seção 15.1) e nos 3 últimos segundos do descanso (Seção 15.2). O som DEVE ter chave para desligar. Uma informação NÃO DEVE depender só de som ou de vibração.
- A subida de nível em tela cheia NÃO DEVE pedir toque para fechar: ela some sozinha, para manter um toque por passo (PRD, O5).
- A tela cheia DEVE ficar para a entrada numa faixa de nível e para o nível 20. A subida de nível comum DEVE aparecer na própria barra, com animação e som curtos, para não cansar com subidas frequentes.

### 15.1. Cronômetro do exercício por tempo

- Em exercício por tempo, "Próximo" DEVE iniciar uma contagem regressiva de 3 segundos, com o número em destaque e um sinal sonoro curto por segundo (PRD, US-F03-07; D27).
- O fim da contagem DEVE ter um sinal sonoro distinto, mais agudo, que marca o início da execução.
- A execução DEVE mostrar o tempo restante num anel, como o descanso. Os últimos 3 segundos DEVEM ter um sinal sonoro por segundo e mudar a cor do anel para a cor de atenção.
- O fim da execução DEVE ter um sinal sonoro de fim, distinto dos outros, e DEVE registrar a série e iniciar o descanso sem pedir toque.
- Durante a execução, "Próximo" DEVE encerrar a série antes do fim e registrar o tempo feito. "Cancelar" DEVE voltar à série sem registrar.
- Durante a contagem de 3 segundos, "Próximo" DEVE ficar desativado, para um toque duplo não encerrar a série logo no começo.
- O anel e os números DEVEM bastar sem som: no iPhone, o som da página pode não tocar com o modo silencioso ligado [a confirmar: teste no iPhone durante um treino real].
- A tela DEVERIA ficar acesa durante a contagem, a execução e o descanso, com a Screen Wake Lock API onde o navegador aceitar [a confirmar: suporte em 2026].
- O encerramento antes do fim DEVE registrar o tempo feito: o alvo menos o tempo exibido no anel, com mínimo de 1 s.
- "Cancelar" DEVE existir na contagem e na execução, e DEVE voltar à mesma série sem registrar nada. Um toque em "Próximo" menos de 0,8 s depois de "Cancelar" NÃO DEVE ter efeito.
- O controle da sequência, no topo, DEVE ficar desativado durante a contagem e a execução.
- A tela do cronômetro DEVE ter a chave "Som" (`aria-pressed`). A escolha DEVE ficar guardada no aparelho e vir ligada por padrão. Ligar o som DEVE liberar o áudio dentro do toque.
- Os nomes acessíveis DEVEM ser "Contagem para começar" (contagem), "Tempo de execução" (tempo, `timer`) e "Execução restante" (anel, `progressbar`). O início da execução DEVE ser anunciado como "Começou" na região `aria-live="polite"`.
- A volta do segundo plano DEVE resolver a execução pelo relógio: a série vale o alvo, o descanso conta do fim da execução, e nenhum sinal atrasado toca.

### 15.2. Descanso

- O descanso DEVE mostrar o tempo restante em `m:ss`, com números tabulares, no centro de um anel que esvazia até o fim (PRD, US-F05-01).
- O anel DEVE ter o papel `progressbar` e o nome "Descanso restante", com o tempo restante em `aria-valuetext`. O tempo DEVE ter o papel `timer` e o nome "Descanso", fora do `progressbar`, porque os filhos de um `progressbar` são apresentacionais em ARIA.
- O traço do anel DEVE andar sem saltos, com transição linear, e DEVE parar de animar com `prefers-reduced-motion: reduce`.
- Quando a série seguinte é de outro exercício, o descanso DEVE mostrar o rótulo "A seguir" e o nome do exercício. O título continua com o exercício do descanso.
- "Próximo" DEVE ficar ativo durante o descanso. O toque pula o resto do descanso e abre a série seguinte sem registrar.
- Um toque que chega menos de 0,8 s depois de qualquer troca de tela (registro, fim do descanso ou pulo) NÃO DEVE ter efeito.
- O fim do descanso DEVE ter sinal visual na área da série (Seção 15) e DEVE ser anunciado na região `aria-live="polite"`, como "Série 2 de 3" ou "Tríceps na polia, série 1 de 3". O sinal NÃO DEVE depender de som nem de vibração.
- Os 3 últimos segundos do descanso DEVEM ter um sinal sonoro por segundo, distinto dos sinais do cronômetro, e mudar a cor do anel para a cor de atenção (PRD, US-F05-02). A passagem para 0 s não tem sinal sonoro: a série seguinte já tem o sinal visual.
- O descanso pulado por "Próximo" NÃO DEVE tocar sinal. Leitura do relógio mais de 1 s depois da anterior (volta do segundo plano) também não toca.
- O descanso DEVE ter a chave "Som" (`aria-pressed`), na mesma linha do botão da última série, com quebra de linha quando o texto cresce. A preferência é a mesma do cronômetro (Seção 15.1).
- A tela DEVERIA ficar acesa durante o descanso, com a Screen Wake Lock API onde o navegador aceitar [a confirmar: suporte no PWA do iPhone em 2026].
- Exercício com descanso de 0 s NÃO DEVE mostrar a tela de descanso.
- A última série da letra NÃO DEVE abrir descanso. A tela DEVE mostrar "Treino concluído" e o botão "Fechar", que volta às letras. "Fechar" DEVE ficar ativo com séries na fila, porque as séries já estão salvas na fila e seguem sozinhas para a API (US-F03-03; `docs/arquitetura/app-web.md`, seção "Fluxo da série com um toque").

## 16. Acessibilidade

### 16.1. Leitor de tela

- Todo controle DEVE ter papel e nome acessíveis. O teste de componente consulta por papel (`getByRole`), conforme `apps/ui/CLAUDE.md`.
- O fim do descanso e o registro da série DEVEM ser anunciados por uma região `aria-live="polite"`.

### 16.2. Tamanho de texto e zoom

- A página NÃO DEVE bloquear o zoom (`user-scalable=no` é proibido).
- A tela de treino DEVE continuar usável com o texto a 200 % (WCAG 1.4.4).

### 16.3. Ajuste por arrasto

O critério 2.5.7 das WCAG 2.2 (nível AA) pede uma alternativa de ponteiro único para toda ação feita por arrasto [WCAG22]. O ajuste por arrasto da F04 DEVE ter alternativa por toque.

- **Forma da roda.** Cada valor ajustável (carga, repetições ou tempo) é uma roda: o valor atual em destaque, o valor um passo acima em cima e o valor um passo abaixo embaixo, menores e esmaecidos. Abaixo do mínimo, a posição de baixo fica vazia. A roda NÃO DEVE ter texto de instrução.
- **Direção.** O valor maior fica acima, então arrastar para baixo aumenta o valor e arrastar para cima diminui. A roda do mouse para cima aumenta.
- **Alternativa por toque.** Os botões "−" e "+" ficam ao lado da roda, com 56 px de altura, e mudam o valor em um passo por toque. O botão "−" fica desativado no mínimo e continua focável. A alternativa não abre teclado e mantém a meta O5.
- **Teclado.** As setas para cima e para a direita aumentam um passo, e as setas para baixo e para a esquerda diminuem.
- **Passos e mínimos.** Carga: passo de 2,5 kg, mínimo de 0 kg. Repetições: passo de 1, mínimo de 1. Tempo: passo de 5 s, mínimo de 1 s. O passo soma ao valor exibido, sem arredondar para um múltiplo.
- **Distância do arrasto.** Um passo vale 22 px de arrasto (`DRAG_STEP_PX`) `[a confirmar no celular]`.
- **Movimento.** Com `prefers-reduced-motion: reduce`, a roda não anima o deslocamento: o valor troca na hora (Seção 15).
- **Acessibilidade.** Cada roda tem papel `spinbutton`, com nome igual ao rótulo, `aria-valuenow`, `aria-valuemin` e `aria-valuetext` por extenso, como "42,5 quilos".

## 17. Estados da interface

| Estado | Regra |
|---|---|
| Carregando | Esqueleto com o formato do conteúdo, sem bloquear a tela inteira |
| Vazio | Mensagem que diz por que está vazio e o que fazer. Exemplo: "Nenhum programa cadastrado. Monte um programa pelo Claude." |
| Sem rede | Indicador discreto de envio pendente, com a contagem de séries na fila |
| Erro | Mensagem com a causa e a ação possível, no texto do PRD quando houver |
| Sucesso | Retorno visual imediato no próprio controle, sem diálogo |

O aviso flutuante (`Toast`) confirma uma ação sem tomar o foco nem o toque. Ele segue estas regras:

- O aviso é uma cápsula de vidro (`.glass`), centralizada na horizontal, acima da área de ação.
- O aviso fica visível por 2,6 s (`--duration-toast`) e sai em até 300 ms.
- A base do aviso fica 16 px acima do topo de "Próximo", que fica a 32 px da borda de baixo: 112 px acima da borda, sem área segura.
- O aviso NÃO DEVE receber toque nem foco. O toque passa para o controle de baixo (`pointer-events: none`), porque um aviso sobre "Próximo" não pode custar um toque.
- O texto do aviso entra numa região `role="status"` montada desde a abertura da tela. O aviso NÃO DEVE repetir um texto que outra região viva já anuncia.
- Quando outra região viva anuncia o mesmo fato, o texto do aviso fica fora da região `role="status"` e fora da árvore de acessibilidade (`aria-hidden="true"`). É o caso do aviso da correção da última série, que a região viva da tela de treino já anuncia.

O texto exibido ao usuário é em português do Brasil (`docs/convencoes/codigo.md`, Seção 3).

## 18. Tokens de design

- Cor, espaço, raio, material, sombra, tipografia e duração DEVEM vir de tokens em CSS custom properties. O código NÃO DEVE usar valor solto que tem token.
- O nome do token é em inglês, em kebab-case, com o prefixo da categoria.

| Categoria | Prefixo | Exemplos |
|---|---|---|
| Cor | `--color-` | `--color-accent`, `--color-label-secondary` |
| Espaço | `--space-` | `--space-4` (4 px), `--space-16` (16 px) |
| Raio | `--radius-` | `--radius-card`, `--radius-sheet` |
| Material | `--material-` | `--material-glass`, `--material-glass-fill` |
| Sombra | `--shadow-` | `--shadow-glass` |
| Tipografia | `--font-` | `--font-size-large-title`, `--font-weight-semibold` |
| Duração | `--duration-` | `--duration-fast`, `--duration-base` |
| Alvo de toque | `--target-` | `--target-min` (44 px), `--target-workout` (56 px) |

Os tokens de espaço, alvo de toque, raio, tipografia e duração ficam no bloco `@theme static` de `apps/ui/src/app/globals.css` (ADR-009). Os tokens de cor, material e sombra mudam com o tema e com o contraste, então ficam no `:root`, com `light-dark(<claro>, <escuro>)` e com os valores de contraste alto em `@media (prefers-contrast: more)`. O app segue `prefers-color-scheme` e não tem chave de tema.

A origem "Protótipo v1" é `docs/prototipo/v1/index.html`. A origem "Projeto" marca um valor que o protótipo não define. O teste `apps/ui/src/app/globals.spec.ts` lê as tabelas desta seção e confere cada token no `globals.css`: uma divergência entre o documento e o arquivo faz o teste falhar. Os tokens de gamificação e de janela de atividade (Seção 11.1) entram na onda 5.

### 18.1. Cor

Na coluna "Contraste alto", "igual" mantém o valor do tema. Dois valores entre crases são o do tema claro e o do escuro, nessa ordem. Uma referência a outro token troca a cor pelo valor desse token.

| Token | Claro | Escuro | Contraste alto | Papel | Origem |
|---|---|---|---|---|---|
| `--color-background` | `#F2F3F7` | `#06070A` | igual | Fundo da página (camada de conteúdo) | Protótipo v1, `--app-bg` |
| `--color-background-grouped` | `#FFFFFF` | `#171A22` | igual | Caixa de grupo e cartão (Seção 6) | Protótipo v1, `--app-card` |
| `--color-background-elevated` | `#FFFFFF` | `#171A22` | igual | Fundo opaco do vidro e da folha (Seção 12) | Protótipo v1, `--app-card` |
| `--color-label` | `#12151C` | `#F1F3F8` | igual | Texto principal | Protótipo v1, `--fg` |
| `--color-label-secondary` | `#596173` | `#9EA6B6` | igual a `--color-label` | Texto secundário | Protótipo v1, `--fg-2`; contraste alto do Projeto |
| `--color-separator` | `#D8DCE4` | `#272C37` | `#596173` `#9EA6B6` | Divisor e borda de grupo | Protótipo v1, `--line`; contraste alto do Projeto |
| `--color-fill` | `rgba(118,124,140,.14)` | `rgba(140,148,166,.16)` | igual | Fundo de botão secundário, botão de ícone e etiqueta | Protótipo v1, `--fill` |
| `--color-fill-strong` | `rgba(118,124,140,.28)` | `rgba(140,148,166,.30)` | `#596173` `#9EA6B6` | Trilho de progresso, puxador e estado pressionado | Protótipo v1, `--fill-strong`; contraste alto do Projeto |
| `--color-accent` | `#2F55E4` | `#7B96FF` | igual | Só elemento interativo (Seção 11.1) | Protótipo v1, `--accent` |
| `--color-on-accent` | `#FFFFFF` | `#0A0F22` | igual | Texto e ícone sobre a cor de destaque | Protótipo v1, `--accent-fg` |
| `--color-accent-soft` | `rgba(47,85,228,.12)` | `rgba(123,150,255,.16)` | igual | Fundo do valor da roda durante o arrasto | Protótipo v1, `--accent-soft` |
| `--color-success` | `#1E8A4C` | `#41C47F` | igual | Ícone de série registrada e de envio concluído e marca do treino concluído | Protótipo v1, `--success` |
| `--color-success-soft` | `rgba(30,138,76,.16)` | `rgba(65,196,127,.16)` | igual | Fundo do círculo de treino concluído | Protótipo v1, `.ok-bg` |
| `--color-warning` | `#A86200` | `#F0A63A` | igual | Ícone da pílula de envio pendente, anel e tempo do cronômetro nos últimos 3 s | Protótipo v1, `--warning` |
| `--color-warning-soft` | `rgba(168,98,0,.14)` | `rgba(240,166,58,.14)` | igual | Fundo da pílula da fila de envio | Protótipo v1, `.pill` |
| `--color-danger` | `#C9302C` | `#FF6B62` | igual | Mensagem de erro e ação destrutiva | Protótipo v1, `--danger` |
| `--color-window-open` | `#0A8EA0` | `#2BC4D8` | igual | Indicador da janela aberta no selo do grupo (Seção 11.1) | Protótipo v1, `--win-open` |
| `--color-window-rest` | `#AEB4C0` | `#545C6B` | `#596173` `#9EA6B6` | Indicador da janela descansando no selo do grupo | Protótipo v1, `--win-rest`; contraste alto do Projeto |
| `--color-window-cooling` | `#6576A0` | `#8E9CC2` | igual | Indicador do grupo esfriando no selo, sempre com hachura | Protótipo v1, `--win-cool` |
| `--color-backdrop` | `rgba(8,10,16,.32)` | `rgba(8,10,16,.32)` | igual | Fundo escurecido atrás da folha | Protótipo v1, `.backdrop` |

Regras de uso da cor, além das da Seção 11.1:

- Sucesso e atenção marcam só ícone e indicador. Texto normal usa `--color-label` (Seção 11.3). A exceção é o tempo do cronômetro nos últimos 3 s, em `--color-warning`: é texto grande (4 rem, peso 700) e mede 4,29:1 no tema claro, acima do mínimo de 3:1 do texto grande.
- O selo de janela marca o estado com o indicador em `--color-window-*` e com o texto em `--color-label`, porque `--color-window-rest` mede menos de 3:1 sobre o fundo claro. O esfriando tem hachura além da cor (Seção 11.1).
- O texto sobre vidro usa só `--color-label`. O texto secundário sobre vidro mede 3,20:1 no tema claro e 2,49:1 no escuro, abaixo do mínimo.
- O texto de erro sobre `--color-fill` mede 4,30:1 no tema claro, abaixo de 4,5:1. A ação destrutiva da folha usa texto `--color-danger` sobre `--color-background-elevated`, com 5,33:1 no tema claro e 6,24:1 no escuro (EN-S1-03).

### 18.2. Material e sombra

| Token | Claro | Escuro | Papel | Origem |
|---|---|---|---|---|
| `--material-glass` | `blur(22px) saturate(1.7)` | igual | Desfoque do vidro, no `backdrop-filter` | Protótipo v1, `.glass` |
| `--material-glass-fill` | `rgba(252,252,254,.74)` | `rgba(34,37,46,.72)` | Preenchimento do vidro | Protótipo v1, `--glass-fill` |
| `--material-glass-border` | `rgba(255,255,255,.7)` | `rgba(255,255,255,.10)` | Borda de 1 px do vidro | Protótipo v1, `--glass-line` |
| `--material-sheet-fill` | `rgba(255,255,255,.92)` | `rgba(28,31,40,.95)` | Preenchimento da folha | Protótipo v1, `--sheet-fill` |
| `--shadow-glass` | `0 8px 28px rgba(15,20,35,.16)` | igual | Sombra do vidro e da folha | Protótipo v1, `.glass` |

### 18.3. Raio

| Token | Valor | Uso | Origem |
|---|---|---|---|
| `--radius-capsule` | `9999px` | Botão com rótulo e aviso flutuante | Seção 13 |
| `--radius-circle` | `50%` | Botão de ícone e letra | Seção 13 |
| `--radius-card` | `22px` | Caixa de grupo e cartão | Protótipo v1, `.group-box` |
| `--radius-control` | `24px` | Cartão da roda de valor | Protótipo v1, `.adj` |
| `--radius-inner` | `16px` | Área interna concêntrica, como o valor da roda dentro do cartão, e a linha atual e a linha pressionada da sequência do treino | Protótipo v1, `.adj-value` |
| `--radius-sheet` | `39px` | Folha flutuante | Protótipo v1, `.sheet` |
| `--radius-icon` | `22px` | Ícone do app de 84 px | Protótipo v1, `.app-glyph.big` |

### 18.4. Tipografia

Os tamanhos usam `rem` e seguem o Dynamic Type no iPhone (Seção 10.2). O corpo tem 1 rem, e não os 15 px do protótipo.

| Token | Valor | Uso | Origem |
|---|---|---|---|
| `--font-sans` | `system-ui, -apple-system, "Segoe UI", Roboto, sans-serif` | Família do app (Seção 10.1) | Projeto |
| `--font-size-large-title` | `2.125rem` | "Heavy Duty" na entrada, título de tela, "Treino concluído" e título da autorização do MCP | Protótipo v1 |
| `--font-size-title-1` | `1.75rem` | Nome do exercício | Protótipo v1 |
| `--font-size-title-2` | `1.375rem` | Título da folha | Protótipo v1 |
| `--font-size-title-3` | `1.25rem` | Valores da última série, valores vizinhos da roda e host da autorização do MCP | Protótipo v1 |
| `--font-size-headline` | `1.0625rem` | Título de linha e número dos pontos das séries | Protótipo v1 |
| `--font-size-body` | `1rem` | Texto corrido | Seção 10.2 |
| `--font-size-callout` | `0.9375rem` | Subtítulo e letra do círculo de 30 px | Protótipo v1 |
| `--font-size-subheadline` | `0.875rem` | Aviso flutuante e metadados | Protótipo v1 |
| `--font-size-footnote` | `0.8125rem` | Rótulo da roda e título de seção, como "Ficaram de fora" | Protótipo v1 |
| `--font-size-button-large` | `1.1875rem` | "Entrar" e "Próximo" | Protótipo v1, `.btn-xl` |
| `--font-size-unit` | `1.125rem` | `kg` e `s` ao lado do número e letra do círculo de 44 px | Protótipo v1 |
| `--font-size-wheel` | `3.5rem` | Valor da roda | Protótipo v1 |
| `--font-size-rest` | `3.75rem` | Tempo no anel do descanso | Protótipo v1 |
| `--font-size-execution` | `4rem` | Tempo da execução | Protótipo v1 |
| `--font-size-countdown` | `7rem` | Contagem de 3 s | Protótipo v1 |
| `--font-weight-regular` | `400` | Texto corrido | Protótipo v1 |
| `--font-weight-semibold` | `600` | Botão, destaque e aviso flutuante | Protótipo v1 |
| `--font-weight-bold` | `700` | Títulos | Protótipo v1 |
| `--font-weight-heavy` | `900` | Número da contagem | Protótipo v1 |
| `--font-tracking-tight` | `-0.02em` | Título grande e números grandes | Protótipo v1 |
| `--font-tracking-title-1` | `-0.015em` | Nome do exercício | Protótipo v1 |
| `--font-tracking-caps` | `0.04em` | Título de seção em caixa alta | Protótipo v1 |
| `--font-leading-none` | `1` | Números grandes | Protótipo v1 |
| `--font-leading-tight` | `1.1` | Título grande | Protótipo v1 |
| `--font-leading-title-1` | `1.15` | Nome do exercício | Protótipo v1 |
| `--font-leading-body` | `1.4` | Texto corrido | Protótipo v1 |

### 18.5. Duração

| Token | Valor | Uso | Origem |
|---|---|---|---|
| `--duration-fast` | `120ms` | Estado pressionado | Protótipo v1, `.btn` e `.step` |
| `--duration-medium` | `150ms` | Volta da roda ao centro | Protótipo v1, `.wheel` |
| `--duration-base` | `300ms` | Entrada e saída da folha e do aviso flutuante, fim do descanso | Seção 15 |
| `--duration-countdown` | `900ms` | Número da contagem de 3 s | Protótipo v1, `.cd-num` |
| `--duration-toast` | `2600ms` | Tempo de exibição do aviso flutuante | Protótipo v1, `toast()` |
| `--duration-tick` | `250ms` | Transição linear do traço do anel, igual ao passo do relógio (`TICK_MS`) | Projeto |

### 18.6. Espaço e alvo de toque

| Token | Valor | Uso | Origem |
|---|---|---|---|
| `--space-4` | `4px` | Escala de 4 px (Seção 5.3) | Seção 5.3 |
| `--space-8` | `8px` | Escala de 4 px | Seção 5.3 |
| `--space-12` | `12px` | Escala de 4 px | Seção 5.3 |
| `--space-16` | `16px` | Escala de 4 px | Seção 5.3 |
| `--space-20` | `20px` | Escala de 4 px | Seção 5.3 |
| `--space-24` | `24px` | Escala de 4 px | Seção 5.3 |
| `--space-32` | `32px` | Escala de 4 px | Seção 5.3 |
| `--space-40` | `40px` | Escala de 4 px | Seção 5.3 |
| `--space-48` | `48px` | Escala de 4 px | Seção 5.3 |
| `--space-margin-inline` | `var(--space-16)` | Margem lateral fixa no celular | Seção 5.2 |
| `--target-min` | `44px` | Área de toque mínima | Seção 7 |
| `--target-workout` | `56px` | Controles da tela de treino | Seção 7 |
| `--target-large` | `64px` | "Entrar" e "Próximo" | Protótipo v1, `.btn-xl` |
| `--target-gap` | `8px` | Distância entre áreas de toque vizinhas | Seção 7 |

### 18.7. Divergências resolvidas entre o protótipo e as regras

Quando o protótipo e uma regra deste documento divergem, a regra vale e a divergência fica registrada.

| # | Protótipo | Decisão | Motivo |
|---|---|---|---|
| 1 | Corpo de 15 px | Corpo de 1 rem | Seção 10.2 |
| 2 | Espaços fora da escala de 4 px | Arredondados para o valor mais próximo da escala; no empate, para o maior; acima de 48 px, soma de dois tokens | Seção 5.3 |
| 3 | Sem variante de contraste alto | Variante do Projeto na tabela de cor | Seção 11.2 |
| 4 | Ícones próprios em SVG | Lucide (ADR-016) | Seção 14 |
| 5 | Título da entrada em `h2` | `h1` com o mesmo texto | O `h1` do protótipo é o título da página de simulação |
| 6 | Sem área de mensagem na entrada | Região viva com as mensagens do PRD, no estilo de erro | Seção 17 |
| 7 | Tema forçado por `data-theme` | O app segue só `prefers-color-scheme` | Chave de tema seria comportamento novo |
| 8 | Botões da folha com 52 px | 56 px nas folhas abertas na tela de treino | Seção 7 |
| 9 | Atenção e sucesso em texto | Só ícone e indicador; texto em `--color-label` | Seção 11.3 |
| 10 | Nota "O método de autenticação está em aberto" | Chave de acesso, com o botão "Entrar" | ADR-019 |
| 11 | `rem` sobre 16 px | No iPhone, `rem` segue o Dynamic Type | Seção 10.2 |
| 12 | Título de seção "Escolha a letra" | Sem título de seção | Seção 3, princípio 6 |
| 13 | Controle do topo com 44 px | 56 px, com o mesmo visual | Seção 7 |
| 14 | Descanso sem o nome do exercício | O nome fica, como heading de nível 1, no topo | Seção 15.2 |
| 15 | "A seguir" só no `aria-label`, com a seta no lugar do texto | Rótulo "A seguir" visível ao lado da seta | Seção 15.2 |
| 16 | Sem a chave "Som" na tela do celular | Chave "Som" 24 px abaixo do anel do cronômetro; no descanso, ao lado do botão da última série | Seções 15.1 e 15.2 |
| 17 | Anel da execução em `--success` | Anel em `--color-label`; os últimos 3 s em `--color-warning` | Seção 11.1 (um papel por cor) |
| 18 | Sem animação na passagem para a série seguinte | Animação de fim do descanso, só opacidade com movimento reduzido | Seções 15 e 15.2 |
| 19 | Valores vizinhos da roda com 2,62:1 (claro) e 3,40:1 (escuro) contra o cartão | Ficam como no protótipo, decorativos e fora da árvore de acessibilidade. Registrado para o PO | Seção 16.3 ("menores e esmaecidos"); exceção de texto decorativo da WCAG 1.4.3 |
| 20 | Botão "−" ativo com a carga em 0 kg | "−" desativado no mínimo, com opacidade de 45 % e focável | Seção 16.3 |
| 21 | "Encerrar" da folha da sequência em vermelho sobre preenchimento: 3,90:1 (claro) e 4,23:1 (escuro) | Texto `--color-danger` sobre fundo opaco `--color-background-elevated`: 5,33:1 e 6,24:1 | Seções 11.3 e 18.1 |
| 22 | "Pular" com 44 px | 56 px | Seção 9.4 |
| 23 | Séries iguais do exercício feito agrupadas ("3 × 10 · 42,5 kg") | Uma etiqueta por série, com o número da série, a carga e as repetições ou os segundos | Seção 9.4; US-F03-06 |
| 24 | Etiquetas das séries e pontos também no exercício feito em parte | Lista das séries só no exercício feito | Seção 9.4 |
| 25 | Linha da sequência sem rótulo de estado, só com o círculo | Rótulos "Feito", "Atual", "Por fazer" e "Pulado" visíveis na linha de baixo, com "N de M" | Seção 9.4 e Seção 11.1 (a cor não é o único sinal) |

## 19. Verificação geométrica

Afirmações como "centralizado", "sem sobreposição", "cabe numa linha" e "espaçamento igual" DEVEM ter medida, não só captura de tela. A medida usa `getBoundingClientRect()` no Playwright (`e2e/`).

Antes de concluir uma barra de navegação, uma linha de botões ou outra linha de itens repetidos:

1. Meça a distância de centro a centro entre itens vizinhos do mesmo papel. A diferença DEVE ser de até 1 px. Não compare a distância de borda a borda: rótulos de tamanhos diferentes mudam essa distância sem defeito.
2. Meça o centro do contêiner e o centro de cada elemento posicionado à parte (botão flutuante, selo). A diferença DEVE ser de até 1 px.
3. Renderize o rótulo mais longo na largura mais estreita suportada (Projeto: 320 px [a confirmar]). O rótulo NÃO DEVE quebrar nem ser cortado.
4. Meça as áreas de toque. Nenhuma área DEVE ter menos de 44 × 44 px nem se sobrepor a outra.
5. Repita os passos 1 a 4 depois de qualquer mudança de padding, gap, número de colunas ou item novo.

Espaçamento desigual numa linha de itens repetidos é defeito crítico, não detalhe.

## 20. Roteiro de revisão

Para cada tela ou componente do diff, o revisor pergunta:

1. O controle interativo tem área de toque de 44 × 44 px ou mais, e 56 px na tela de treino?
2. O botão preferido se destaca pelo estilo, e a tela tem até 2 botões proeminentes?
3. O vidro fica só na camada de controles, com versão opaca para menos transparência e mais contraste?
4. Cada cor tem um papel só, com variantes clara, escura e de contraste alto?
5. O contraste passa na Seção 11.3?
6. O componente usa tokens, sem valor solto?
7. Os ícones são do conjunto único, com nome acessível quando não têm rótulo?
8. Há medida (Seção 19) para cada afirmação de alinhamento ou espaçamento?
9. O fluxo de treino continua com um toque por passo e sem teclado?

## 21. Referências

### 21.1. Referências normativas

- [RFC2119] Bradner, S., "Key words for use in RFCs to Indicate Requirement Levels", BCP 14, RFC 2119, março de 1997, https://www.rfc-editor.org/info/rfc2119.
- [RFC8174] Leiba, B., "Ambiguity of Uppercase vs Lowercase in RFC 2119 Key Words", BCP 14, RFC 8174, maio de 2017, https://www.rfc-editor.org/info/rfc8174.
- [WCAG22] W3C, "Web Content Accessibility Guidelines (WCAG) 2.2", outubro de 2023, https://www.w3.org/TR/WCAG22/.
- [HIG] Apple, "Human Interface Guidelines", https://developer.apple.com/design/human-interface-guidelines.
- [HIG-BUTTONS] Apple, "Buttons", Human Interface Guidelines, https://developer.apple.com/design/human-interface-guidelines/buttons.
- [HIG-LAYOUT] Apple, "Layout", Human Interface Guidelines, https://developer.apple.com/design/human-interface-guidelines/layout.
- [HIG-BOXES] Apple, "Boxes", Human Interface Guidelines, https://developer.apple.com/design/human-interface-guidelines/boxes.
- [HIG-TABBARS] Apple, "Tab bars", Human Interface Guidelines, https://developer.apple.com/design/human-interface-guidelines/tab-bars.
- [HIG-COLOR] Apple, "Color", Human Interface Guidelines, https://developer.apple.com/design/human-interface-guidelines/color.

### 21.2. Referências informativas

- [APPLE-LG] Apple, "Apple introduces a delightful and elegant new software design", Apple Newsroom, junho de 2025, https://www.apple.com/newsroom/ [a confirmar: URL exata do comunicado].
- [APPLE-FONTS] Apple, "Fonts for Apple platforms", https://developer.apple.com/fonts/. Termos de licença das fontes SF.
- [APPLE-SFSYMBOLS] Apple, "SF Symbols", https://developer.apple.com/sf-symbols/. Termos de licença dos símbolos.
- [IOS27-IMPRENSA] Cobertura de imprensa sobre o Liquid Glass no iOS 27 e no macOS 27, consultada em 2026-11-20. Fonte de terceiros, não substitui o HIG:
  - iDrop News, "iOS 27 & macOS Golden Gate Fix Liquid Glass UI", https://www.idropnews.com/news/apple-fixes-liquid-glass-ios-27-macos-golden-gate/265049/.
  - GSMSpecs, "Apple's Liquid Glass makeover gets a much-needed reality check in iOS 27", https://www.gsmspecs.com/news/ios-27-liquid-glass-update.
  - Wikipedia, "Liquid Glass", https://en.wikipedia.org/wiki/Liquid_Glass.

## Apoio de IA

Este documento foi elaborado com apoio de IA e precisa de revisão do PO. Os valores marcados como `[a confirmar]` e as regras do iOS 27 que vêm de imprensa precisam ser conferidos no HIG antes de virar código.
