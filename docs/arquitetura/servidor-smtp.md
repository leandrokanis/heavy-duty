# Contêiner: servidor SMTP

| Campo | Valor |
|---|---|
| Nível C4 | 2, contêiner |
| Pasta | Configuração de infraestrutura [a confirmar no scaffold da onda 7] |
| Onde roda | Serviço no kasparov |
| ADRs | ADR-007 (proposta) |
| Ondas | 7 |

## Responsabilidade

- Entregar os e-mails que a API enfileira: aviso de janela por letra, aviso de queda de nível e resumo semanal (F17, D32).
- Assinar os e-mails com DKIM, para não caírem no spam.
- Só enviar. O servidor não recebe e-mail de fora.

## Tecnologias

| Tecnologia | Uso | Licença | Estado |
|---|---|---|---|
| Postfix, só envio | Fila e entrega SMTP | IPL-1.0 ou EPL-2.0, software do sistema | Proposta, ADR-007 |
| OpenDKIM | Assinatura DKIM | BSD | Proposta, ADR-007 |
| Registros SPF, DKIM e DMARC no DNS do domínio | Autenticação do remetente | — | Proposta, ADR-007 |

## Interfaces

| Direção | Com quem | Como |
|---|---|---|
| Recebe | API | SMTP na interface local, sem acesso de fora |
| Envia | Provedor de e-mail do PO | SMTP na porta 25 [a confirmar: bloqueio pelo provedor de internet, R09] |

## Regras que a configuração segue

1. O servidor aceita mensagens só da API, pela interface local.
2. Todo e-mail sai assinado com DKIM, e o domínio publica SPF e DMARC.
3. A entrega é validada antes da onda 7, com e-mails de teste para o endereço do PO (R09). Se falhar, o plano B é a ADR-007, alternativa "SMTP da conta de e-mail do PO".
4. Credenciais e o endereço do PO ficam em variáveis de ambiente, fora do Git.
