# Contêiner: servidor SMTP

| Campo | Valor |
|---|---|
| Nível C4 | 2, contêiner |
| Pasta | `infra/docker/smtp.Dockerfile`, se a #9 passar (ADR-038, Proposta) |
| Onde roda | Serviço no kasparov |
| ADRs | ADR-007, ADR-037; ADR-038 (Proposta) |
| Ondas | 7a (avisos) e 7b (resumo semanal) |

## Responsabilidade

- Entregar os e-mails que a API enfileira: aviso de janela por letra, aviso de queda de nível e resumo semanal (F17, D32).
- Assinar os e-mails com DKIM, para não caírem no spam.
- Só enviar. O servidor não recebe e-mail de fora.

## Tecnologias

| Tecnologia | Uso | Licença | Estado |
|---|---|---|---|
| Postfix, só envio | Fila e entrega SMTP | IPL-1.0 ou EPL-2.0, software do sistema | Aceita, ADR-007 |
| OpenDKIM | Assinatura DKIM | BSD | Aceita, ADR-007 |
| Registros SPF, DKIM e DMARC no DNS do domínio | Autenticação do remetente | — | Aceita, ADR-007 |

## Empacotamento

O empacotamento depende do teste da entrega, a tarefa manual #9 do PO (R09):

- Se a entrega funcionar, o servidor entra na pilha do Coolify como o serviço `smtp`, com a imagem `infra/docker/smtp.Dockerfile` publicada pelo CI e a chave DKIM num arquivo do host, montado só leitura (ADR-038, Proposta).
- Se a entrega falhar, o serviço não entra, e a API usa o relay da conta de e-mail do PO, plano B da ADR-007, com usuário e senha (`SMTP_USER`, `SMTP_PASSWORD_FILE`).

Nos dois casos, a API fala com o servidor pelas mesmas variáveis (`SMTP_HOST`, `SMTP_PORT`) e pela interface `MailSender` (ADR-037). Até a decisão, a API sobe com o canal de e-mail desligado.

## Interfaces

| Direção | Com quem | Como |
|---|---|---|
| Recebe | API | SMTP na rede interna da pilha, sem porta publicada no host |
| Envia | Provedor de e-mail do PO | SMTP na porta 25 [a confirmar: bloqueio pelo provedor de internet, R09] |

## Regras que a configuração segue

1. O servidor aceita mensagens só da API, pela rede interna da pilha.
2. Todo e-mail sai assinado com DKIM, e o domínio publica SPF e DMARC.
3. A entrega é validada antes da onda 7, com e-mails de teste para o endereço do PO (R09). Se falhar, o plano B é a ADR-007, alternativa "SMTP da conta de e-mail do PO".
4. O remetente (`MAIL_FROM`, no domínio do app, com o nome "Heavy Duty") e o destinatário (`MAIL_TO`) ficam em variáveis de ambiente, fora do Git (D88). A senha do relay e a chave DKIM ficam em arquivo do host, nunca em variável com o valor.
5. Todo e-mail leva o link de desligar e os cabeçalhos `List-Unsubscribe` e `List-Unsubscribe-Post` (RFC 8058), com um token próprio por e-mail (ADR-037).
