# Diretrizes de interface do app de treino

## Resumo

Este documento é o guia de interface (HIG) do app de treino. Ele define layout, alvos de toque, navegação, tipografia, cor, materiais, forma, ícones, movimento e acessibilidade da PWA (`apps/ui`). A referência visual é a linguagem do iOS 27 e do macOS 27, baseada no Liquid Glass, adaptada para a web. O revisor confere cada regra no diff e na tela renderizada.

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

1. **Um toque por passo.** Cada passo do fluxo da academia DEVE pedir um toque (PRD, O5). A tela NÃO DEVE pedir confirmação extra no fluxo de treino.
2. **Leitura de relance.** O atleta olha o celular apoiado no banco, entre séries. Carga, repetições e descanso DEVEM ser os maiores elementos da tela de treino.
3. **Sem teclado no treino.** O fluxo de treino NÃO DEVE abrir teclado. Valores mudam por arrasto ou por toque (PRD, F04; Seção 16.3).
4. **Estado de rede visível.** Quando a série fica na fila local, a tela DEVE mostrar que o envio está pendente, sem bloquear o treino (PRD, US-F03-03).
5. **Gamificação leve.** A interface NÃO DEVE mostrar pontos, medalhas ou ranking (PRD, Seção 3).

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
- Na tela de treino, a ação principal ("feito") DEVERIA ficar na metade de baixo da tela, ao alcance do polegar (Projeto).

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
- Os controles da tela de treino ("feito", "próxima", ajuste de valor) DEVERIAM ter pelo menos 56 px de altura (Projeto), porque o atleta toca com a mão suada ou ocupada.
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

## 10. Tipografia

### 10.1. Família

- A fonte DEVE ser a fonte do sistema, pela pilha `system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`. No iPhone e no Mac, a pilha mostra a fonte do sistema da Apple sem distribuir o arquivo.
- O app NÃO DEVE incluir nem servir os arquivos da família SF. A licença da Apple restringe essas fontes a apps para plataformas Apple [APPLE-FONTS].

### 10.2. Tamanho e escala

- O tamanho da fonte DEVE estar em `rem` e acompanhar o ajuste de tamanho de texto do usuário.
- No Safari do iOS, o texto PODE seguir o Dynamic Type por `font: -apple-system-body` na raiz [a confirmar no scaffold].
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
| Sucesso | `--color-success` | Série registrada, envio concluído |
| Atenção | `--color-warning` | Envio pendente sem rede |
| Erro | `--color-danger` | Falha e ação destrutiva |
| Janela de atividade | `--color-window-open`, `--color-window-cooling` | Reservado para as ondas 5 a 7 |

Os valores das cores são definidos no scaffold da onda 1 [a confirmar: paleta escolhida pelo PO].

### 11.2. Aparência

- Toda cor DEVE ter variante clara, variante escura e variante de contraste alto de cada uma [HIG-COLOR].
- A aparência DEVE seguir `prefers-color-scheme` e `prefers-contrast`.

### 11.3. Contraste

| Elemento | Contraste mínimo | Origem |
|---|---|---|
| Texto normal | 4,5:1 | WCAG 1.4.3 |
| Texto grande (a partir de 24 px, ou 18,66 px em negrito) | 3:1 | WCAG 1.4.3 |
| Borda de controle, ícone e indicador de estado | 3:1 | WCAG 1.4.11 |

O contraste de texto sobre vidro DEVE ser medido contra o fundo mais claro e o mais escuro que podem passar por trás.

## 12. Materiais

- O vidro DEVE usar `backdrop-filter` com desfoque e um preenchimento semitransparente, nos tokens `--material-glass` e `--material-glass-fill`.
- O preenchimento do vidro DEVERIA ter opacidade alta o bastante para o texto passar na Seção 11.3 sem depender do conteúdo de trás (Projeto, alinhado à transparência reduzida do iOS 27).
- O vidro DEVE virar fundo opaco nestes casos:

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

O suporte de navegador a `prefers-reduced-transparency` varia [a confirmar no scaffold]. A regra com `prefers-contrast` cobre parte dos casos.

## 13. Forma e cantos

- Os cantos DEVEM ser concêntricos: o raio interno é o raio externo menos o padding entre as duas formas. Um botão dentro de um cartão com raio 20 px e padding 8 px tem raio 12 px.
- Os tokens de raio (`--radius-*`) DEVEM ser usados em vez de valor solto.
- A Apple usa curva contínua nos cantos (superelipse). O HIG não publica um percentual de raio para elementos de interface em geral. Não cite números como "22,37 %" como regra da Apple.
- Na web, `border-radius` comum é o padrão. `corner-shape: squircle` PODE entrar como melhoria progressiva onde o navegador aceitar [a confirmar: suporte em 2026].
- Botão com rótulo DEVERIA ser cápsula (`border-radius: 9999px`). Botão só com ícone DEVERIA ser círculo.

## 14. Ícones

- O app DEVE usar um conjunto de ícones só, com tamanho, traço e nível de detalhe iguais.
- O app NÃO DEVE usar SF Symbols. A licença da Apple restringe os símbolos a apps para plataformas Apple [APPLE-SFSYMBOLS]. O conjunto escolhido DEVE ter licença compatível com MIT [a confirmar: Lucide (ISC) ou outro, por ADR no scaffold].
- O traço do ícone DEVERIA combinar com o peso do texto vizinho.
- Ícone assimétrico DEVE ser centralizado opticamente, não pela caixa delimitadora.
- Ícone sem rótulo visível DEVE ter nome acessível (`aria-label`).

## 15. Movimento e resposta ao toque

- O estado pressionado DEVE aparecer no `pointerdown`, não na soltura do toque.
- A transição entre estados DEVERIA durar até 300 ms (Projeto [a confirmar]).
- O movimento DEVE ser reduzido a troca de opacidade, ou retirado, com `prefers-reduced-motion: reduce`.
- O fim do descanso DEVE ter sinal visual. O Safari do iOS não aceita a Vibration API, então a interface NÃO DEVE depender de vibração.
- As regras detalhadas de animação, mola e gesto ficam para um documento próprio [a confirmar: quando a onda 3 começar].

## 16. Acessibilidade

### 16.1. Leitor de tela

- Todo controle DEVE ter papel e nome acessíveis. O teste de componente consulta por papel (`getByRole`), conforme `apps/ui/CLAUDE.md`.
- O fim do descanso e o registro da série DEVEM ser anunciados por uma região `aria-live="polite"`.

### 16.2. Tamanho de texto e zoom

- A página NÃO DEVE bloquear o zoom (`user-scalable=no` é proibido).
- A tela de treino DEVE continuar usável com o texto a 200 % (WCAG 1.4.4).

### 16.3. Ajuste por arrasto

O critério 2.5.7 das WCAG 2.2 (nível AA) pede uma alternativa de ponteiro único para toda ação feita por arrasto [WCAG22]. O ajuste por arrasto da F04 DEVE ter alternativa por toque, como botões de mais e menos que mudam o valor em um passo. A alternativa mantém a meta O5, porque não abre teclado [a confirmar com o PO: forma da alternativa na onda 4].

## 17. Estados da interface

| Estado | Regra |
|---|---|
| Carregando | Esqueleto com o formato do conteúdo, sem bloquear a tela inteira |
| Vazio | Mensagem que diz por que está vazio e o que fazer. Exemplo: "Nenhum programa cadastrado. Monte um programa pelo Claude." |
| Sem rede | Indicador discreto de envio pendente, com a contagem de séries na fila |
| Erro | Mensagem com a causa e a ação possível, no texto do PRD quando houver |
| Sucesso | Retorno visual imediato no próprio controle, sem diálogo |

O texto exibido ao usuário é em português do Brasil (`docs/convencoes/codigo.md`, Seção 3).

## 18. Tokens de design

- Cor, espaço, raio, material, sombra, tipografia e duração DEVEM vir de tokens em CSS custom properties. O código NÃO DEVE usar valor solto que tem token.
- O nome do token é em inglês, em kebab-case, com o prefixo da categoria.

| Categoria | Prefixo | Exemplos |
|---|---|---|
| Cor | `--color-` | `--color-accent`, `--color-label-secondary` |
| Espaço | `--space-` | `--space-4` (4 px), `--space-16` (16 px) |
| Raio | `--radius-` | `--radius-card`, `--radius-control` |
| Material | `--material-` | `--material-glass`, `--material-glass-fill` |
| Tipografia | `--font-` | `--font-size-display`, `--font-weight-semibold` |
| Duração | `--duration-` | `--duration-fast`, `--duration-base` |
| Alvo de toque | `--target-` | `--target-min` (44 px), `--target-workout` (56 px) |

Os tokens ficam em `apps/ui/src/shared/design/tokens.css` [a confirmar no scaffold da onda 1].

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
