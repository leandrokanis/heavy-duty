# ADR-031: Regra da janela de atividade

| Campo | Valor |
|---|---|
| Status | Aceita |
| Data | 2026-11-22 |
| Decisor | PO |
| Requisitos relacionados | EN01-02, F07, H03, D38, D40, D45, D46, D47, ADR-010 |

## Contexto

A EN01-01 trouxe uma regra de partida da janela com os valores do protótipo v1 e duas estimativas: o teto de 72 h até abrir e as 48 h de janela aberta (plano local da onda 5, Seção 4). A EN01-02 previa validar essa regra com quatro semanas de dados do MVP (D38). Em 2026-11-22, o PO dispensou essa espera (D45) e decidiu a regra numa sessão de perguntas, com base na literatura abaixo.

A pesquisa leu resumos e citações, não os textos completos. Os números de cada fonte são aproximados [a confirmar nos originais].

| Tema | Achado | Fonte |
|---|---|---|
| Síntese de proteína | Em treinados, sobe em 2 a 4 h e dura de 24 a 36 h; em iniciantes, ainda está alta em 48 h | MacDougall et al., 1995 (PubMed 8563679) |
| Recuperação do desempenho | Força e salto voltam entre 24 e 72 h, em geral pelo menos 48 h depois de séries pesadas; mais perto da falha e mais volume pedem mais tempo | Morán-Navarro et al., 2017 (PubMed 28965198); Pareja-Blanco et al., 2019 (PMC6473797) |
| Frequência | Treinar cada grupo 2 vezes por semana rende mais hipertrofia que 1 vez; com o volume semanal igualado, a frequência quase não importa | Schoenfeld et al., 2016 (PubMed 27102172); Schoenfeld et al., 2019 |
| Perda por parar | A força se mantém por até 3 a 4 semanas; o tamanho cai pouco em 1 a 3 semanas e volta rápido | Revisões sobre destreino (PMC10809978; PubMed 39364857) |
| Músculo secundário | Contar a série indireta como metade foi o que melhor explicou o ganho de hipertrofia e de força | Pelland et al., 2024, preprint (SportRxiv 460) |
| Diferença entre grupos | A recuperação mais lenta da perna tem pouca medida direta | Korak et al., International Journal of Exercise Science, vol. 8 |

## Decisão

A janela de um grupo abre depois de uma base mais o volume ajustado do treino, com teto, e fecha a um prazo fixo do treino.

- **Treino do grupo.** O grupo conta como treinado no treino com série de um exercício que tem músculo do grupo como principal ou como secundário. O instante é a última dessas séries.
- **Volume.** O principal conta inteiro, e o secundário conta metade, só quando o grupo não é principal no mesmo exercício (D40). A série de exercício por tempo conta o grupo como treinado, com volume zero (D46).
- **Volume ajustado.** O volume vezes o fator do objetivo atual do programa: força 130%, hipertrofia 100%, resistência 75%. O fator compensa a distorção do volume pela faixa de repetições.
- **Abertura.** 24 h depois do treino, mais 1 hora a cada 60 kg de volume ajustado, com teto de 72 h.
- **Fechamento.** 120 h depois do treino, para qualquer volume. O prazo vem da recomendação de treinar cada grupo pelo menos 2 vezes por semana, com folga para qualquer divisão em letras.
- **Treino antes de abrir.** Substitui a janela pendente e não conta como aproveitada nem como perdida.
- **Sono.** A janela ignora o horário de sono; os avisos da onda 7 tratam disso (Q16).
- **Parâmetros.** Ficam em `apps/api/src/modules/windows/windows.config.ts`: `baseOpenHours` 24, `openMinutesPerAdjustedKg` 1, `maxOpenHours` 72, `closeAfterHours` 120, `goalVolumePercent` 130/100/75 e `secondaryVolumePercent` 50. O `closeAfterHours` substitui o `openDurationHours` da EN01-01.

## Consequências

- A janela tem uma regra só, no servidor, para o MCP e para as telas da #21 e da #22.
- Os números são estimativas tiradas da literatura, não medidas no PO. A recalibração com o histórico real, pela simulação da EN01-01, pode trocá-los sem perder dado (ADR-010).
- Um treino leve abre mais cedo e fica mais tempo aberto. Um treino pesado abre no teto e fica 48 h aberto.
- O secundário abre janela. Lombar e abdômen, secundários em muitos exercícios, quase sempre têm uma janela correndo, e o treino "cedo" fica mais comum. Por isso o treino cedo é neutro.
- O treino do dia (#21) e a tela de treino terminado (#22) mostram só os grupos dos músculos principais; o MCP mostra todos.

## Alternativas consideradas

| Alternativa | Motivo da recusa |
|---|---|
| Manter a regra de partida: base de 40 h e 48 h abertas depois da abertura | A base é alta para treino leve, e o treino leve passaria a fechar mais cedo, cobrando pressa de quem treinou menos |
| Base diferente por objetivo, sem fator sobre o volume | Nenhum estudo sustenta os números, e carga leve perto da falha cansa mais (Pareja-Blanco et al., 2019) |
| Só o músculo principal abre janela | Ignora o estímulo do secundário que a literatura mostra (Pelland et al., 2024) |
| Penalizar o treino antes de abrir | A literatura não mostra prejuízo de treinar com mais frequência com o volume igualado |
| Empurrar a abertura de madrugada para as 7h | Pede o fuso do PO e muda a conta; a recuperação não para à noite |
| Esperar quatro semanas de dados | O PO dispensou a espera (D45) |

Esta ADR foi redigida com apoio de IA, a partir das decisões do PO em 2026-11-22.
