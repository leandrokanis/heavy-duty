# ADR-038: Serviço SMTP na pilha do Coolify

| Campo | Valor |
|---|---|
| Status | Proposta |
| Data | 2026-11-25 |
| Decisor | PO |
| Requisitos relacionados | F17, NFR01, R09, ADR-007, ADR-028, ADR-037 |

Elaborada com apoio de IA, a partir do plano da onda 7a aprovado pelo PO em 2026-11-25. Sujeita a revisão humana. A decisão depende do resultado da tarefa manual #9 do PO (teste da entrega, R09).

## Contexto

A ADR-007 decidiu o envio de e-mail por servidor SMTP próprio no kasparov, com Postfix e OpenDKIM, e a validação da entrega antes da onda 7 (R09). O `servidor-smtp.md` ainda marca o empacotamento como `[a confirmar no scaffold da onda 7]`. A produção roda no Coolify, com a pilha `compose.coolify.yaml` e imagens que o GitHub Actions testa e publica no GHCR (ADR-028). A API entrega o e-mail a um servidor SMTP configurado por variáveis (ADR-037).

A tarefa #9 confere a porta 25 de saída com o provedor de internet, publica SPF, DKIM e DMARC, pede o DNS reverso e registra o resultado de e-mails de teste. Se a entrega falhar, o plano B da ADR-007 é o relay da conta de e-mail do PO, e este serviço não entra.

## Decisão

Se a #9 passar, o servidor SMTP entra na pilha do Coolify como o serviço `smtp`, com Postfix e OpenDKIM, só para envio. Detalhes que a infraestrutura segue:

- **Imagem.** A imagem sai de `infra/docker/smtp.Dockerfile` e é publicada no GHCR pelo CI, como a quinta imagem (`ghcr.io/leandrokanis/heavy-duty-smtp`). O teste de fumaça do CI passa a iniciar o serviço.
- **Só envio.** O serviço aceita mensagens só da rede interna da pilha, sem porta publicada no host, e não recebe e-mail de fora.
- **DKIM.** A chave privada DKIM vem de um arquivo do host, montado só leitura, com dono do usuário do OpenDKIM e permissão `600` [a confirmar: UID do OpenDKIM na imagem]. A chave não entra no Git, na imagem nem em variável.
- **Configuração da API.** Com o serviço na pilha, a API usa `SMTP_HOST=smtp` e a porta interna do serviço, sem usuário nem senha (ADR-037).
- **Falha da #9.** Se a entrega falhar, esta ADR muda para Descartada, e uma ADR nova revisa a ADR-007 com o relay da conta do PO.

## Consequências

- Nenhum terceiro recebe o conteúdo dos avisos, se a entrega funcionar (NFR01).
- O CI ganha a quinta imagem e o teste de fumaça do serviço.
- A manutenção do Postfix e do OpenDKIM (atualizações, reputação do IP, filas) fica com o PO.
- Gerar a chave DKIM e publicar o registro no DNS são tarefas manuais do PO.

## Alternativas consideradas

| Alternativa | Motivo da recusa |
|---|---|
| Postfix instalado direto no kasparov, fora do Coolify | Segunda forma de rodar o app, fora da pilha e do CI (ADR-028) |
| Imagem pronta de terceiros com Postfix e OpenDKIM | [a confirmar: avaliar na especificação, se a #9 passar] |
| Relay da conta de e-mail do PO | Plano B da ADR-007, se a #9 falhar; o provedor da conta vê o conteúdo |
