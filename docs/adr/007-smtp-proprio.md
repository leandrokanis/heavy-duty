# ADR-007: Envio de e-mail por servidor SMTP próprio no kasparov

| Campo | Valor |
|---|---|
| Status | Proposta |
| Data | 2026-11-21 |
| Decisor | PO |
| Requisitos relacionados | NFR01, F17, D32, R09 |

## Contexto

A F17 manda por e-mail o aviso de janela, o aviso de queda de nível e o resumo semanal, sempre junto com o aviso no celular (PRD, D32). A NFR01 pede que os dados fiquem no kasparov, sem serviço de terceiros (PRD, Seção 4).

Um serviço transacional de e-mail entrega melhor, mas veria o conteúdo dos avisos. Um servidor SMTP no próprio kasparov mantém a NFR01, mas tem um risco de entrega: provedores de internet costumam bloquear a porta 25, e IP residencial tem má reputação nos filtros de spam (PRD, R09) [a confirmar: política do provedor de internet do kasparov].

## Decisão

O kasparov envia os e-mails por um servidor SMTP próprio. Detalhes que o código e a infraestrutura precisam seguir:

- A API monta e enfileira o e-mail; o servidor SMTP entrega. A falha de entrega não bloqueia o aviso no celular e fica registrada na situação do sistema (módulo `system`).
- O domínio de envio DEVE ter SPF, DKIM e DMARC configurados, e o IP DEVERIA ter DNS reverso [a confirmar: viabilidade com o provedor de internet].
- O e-mail leva o mínimo de dado: grupos, letra, horário e níveis. Ele não leva carga, repetições nem histórico.
- Todo e-mail tem link de desligar e o cabeçalho `List-Unsubscribe` (US-F17-04).
- O endereço do PO e as credenciais do servidor ficam em variáveis de ambiente, fora do Git (`.env`).

## Consequências

- A NFR01 continua valendo: nenhum terceiro recebe o conteúdo dos avisos.
- Passa a ser obrigatório validar a entrega antes da onda 7: enviar e-mails de teste para o endereço do PO e conferir se chegam na caixa de entrada.
- A manutenção do servidor de e-mail (atualizações, reputação, filas) fica com o PO.
- Se a entrega falhar, a decisão volta para discussão, com as alternativas abaixo.

## Alternativas consideradas

| Alternativa | Motivo da recusa |
|---|---|
| SMTP da conta de e-mail do PO (relay) | Entrega melhor, mas o provedor da conta vê o conteúdo. Fica como plano B se a validação de entrega falhar |
| Serviço transacional de e-mail | Melhor entrega, mas mais um terceiro com o conteúdo dos avisos, contra a NFR01 |
| Só aviso no celular, sem e-mail | O PO decidiu ter os dois canais (D32) |
