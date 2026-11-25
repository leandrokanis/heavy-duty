# ADR-037: Envio de e-mail e link de desligar

| Campo | Valor |
|---|---|
| Status | Aceita |
| Data | 2026-11-25 |
| Decisor | PO |
| Requisitos relacionados | F17, US-F17-01, US-F17-02, US-F17-04, NFR01, NFR02, D32, D88 a D91, R09, ADR-007, ADR-019, ADR-020, ADR-026 |

Elaborada com apoio de IA, a partir do plano da onda 7a aprovado pelo PO em 2026-11-25. Sujeita a revisão humana.

## Contexto

A F17 manda por e-mail o aviso de janela e o aviso de queda, junto com o aviso no celular (D32), e a US-F17-04 pede um link no próprio e-mail para desligar os e-mails sem entrar no app (`docs/prd.md`, Seção 9). A ADR-007 decidiu o envio por servidor SMTP próprio no kasparov, com o relay da conta do PO como plano B se a entrega falhar (R09). O teste da entrega é a tarefa manual #9 do PO, ainda em aberto.

Fatos do código e dos documentos que pesam na decisão (plano da onda 7a, Seção 1):

- O `dados.md` previa o "hash do token de desligar e-mail" em `settings`. Com só um hash guardado, a API não consegue pôr o token em claro em cada e-mail novo.
- A guarda de sessão tem lista fechada de rotas públicas (ADR-019; `docs/arquitetura/api.md`, regra 1). O link de desligar precisa funcionar sem a sessão de acesso, inclusive no `POST` de um clique que o cliente de e-mail faz sozinho (RFC 8058).
- Filtros de e-mail abrem os links da mensagem para conferir o destino. Um `GET` que desliga seria disparado sem o atleta pedir.

## Decisão

A API monta o e-mail e entrega ao servidor SMTP com o Nodemailer, atrás da interface `MailSender`. Cada e-mail leva um link de desligar com um token próprio, conferido por uma rota pública. Detalhes que o código segue:

- **Biblioteca.** A API usa o Nodemailer (licença MIT-0, conferida no `package.json` da versão 10.5.0 instalada; aprovado pelo PO no plano da onda 7a) atrás de `MailSender`. Os testes usam uma implementação falsa ou o transporte em memória do Nodemailer; o CI não precisa de servidor SMTP.
- **SMTP por variáveis.** A conexão vem de `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER` e do arquivo em `SMTP_PASSWORD_FILE`. A mesma configuração serve ao Postfix local (ADR-038) e ao relay do plano B da ADR-007: usuário e senha só existem no relay. O remetente vem de `MAIL_FROM`, com o nome "Heavy Duty", e o destinatário, de `MAIL_TO` (D88). Todas são opcionais: sem `SMTP_HOST`, `MAIL_FROM` ou `MAIL_TO`, a API sobe com o canal de e-mail desligado.
- **Conteúdo.** O e-mail tem assunto, texto e HTML mínimos, com grupos, letra, horário e níveis, e nada de carga, repetições ou histórico (ADR-007). O e-mail reusa o aviso calculado pelo agendador (ADR-036), sem recalcular.
- **Cabeçalhos de desligar.** Todo e-mail leva `List-Unsubscribe`, com a URL da rota de desligar, e `List-Unsubscribe-Post: List-Unsubscribe=One-Click` (RFC 8058), e um rodapé com o link de desligar.
- **Token por e-mail.** Cada e-mail leva um token aleatório de 32 bytes em base64url. O banco guarda só o SHA-256 do token, na coluna `unsubscribe_token_hash` da linha do aviso em `notifications` (D89). O token em claro só existe no e-mail.
- **Página e rota pública.** O link abre a página `/desligar-emails` do app web, fora do `AuthGate`, com o botão "Desligar e-mails"; o `GET` não desliga nada (D90). O botão e o `POST` de um clique chamam `POST /api/email/unsubscribe`, pública, com o token no corpo ou na URL. A rota limita o tamanho do token e do corpo e responde igual a token válido e inválido, para não revelar quais tokens existem.
- **Efeito.** Desligar grava `email_enabled = false` em `settings`. Os avisos no celular continuam. Com `email_enabled = false`, o agendador registra o canal de e-mail como `skipped`.
- **Religar.** O planejador liga ou desliga os e-mails pelo Claude com a ferramenta `set_email_notices`, que aplica direto, sem prévia nem código de confirmação, porque não altera o histórico (D91; ADR-026 não se aplica).
- **Situação do app.** `get_system_status` e `GET /api/system/status` mostram, por canal, o último envio e as últimas falhas dos avisos (US-F17-01, cenário "falha no envio").

## Adendo à ADR-019: rota pública do link de desligar

A lista fechada de rotas públicas da guarda de sessão (ADR-019, ampliada pela ADR-020) ganha `POST /api/email/unsubscribe`. A ADR-019 continua Aceita; esta ADR registra a exceção, e o adendo correspondente aparece no fim da ADR-019. A rota não devolve dado de treino, aceita corpo de até 1 KiB [a confirmar: limite na especificação da US-F17-04] e só muda `email_enabled`. A guarda de origem da ADR-019 continua valendo: o `POST` de um clique do cliente de e-mail chega sem `Origin` e passa; o `POST` com `Origin` de outro site é recusado com 403. A página `/desligar-emails` passa direto pelo `AuthGate`, como `/cadastro` e `/~offline`.

## Consequências

- O canal de e-mail fica pronto no código sem depender do resultado da #9: só a configuração muda entre o Postfix local e o relay.
- O banco continua sem token em claro, e nenhum segredo novo entra no `.env` (ADR-019, ADR-020).
- O `dados.md` deixa o hash do token em `settings` e passa a guardar o hash por e-mail, em `notifications`.
- A API passa a ter uma rota pública que muda estado. O dano máximo de um token vazado é desligar os e-mails, e o planejador religa pelo Claude.
- O token de um e-mail não vence [a confirmar: prazo de validade na especificação da US-F17-04]. A tabela `notifications` cresce com um hash por e-mail enviado.

## Alternativas consideradas

| Alternativa | Motivo da recusa |
|---|---|
| Token fixo em claro em `settings` | Quebra a regra "o banco guarda só o hash" (ADR-019, ADR-020) |
| HMAC com um segredo novo | Mais um segredo no `.env` para uma ação de baixo risco |
| `GET` do link já desliga | Filtros de e-mail abrem o link sozinhos e desligariam os e-mails sem o atleta pedir (D90) |
| Link que exige a sessão de acesso | A US-F17-04 pede desligar sem entrar no app; o `POST` de um clique não carrega cookie |
| Chave dos e-mails no app para religar | A story pede só o desligar; o MCP é o canal de administração (D04, D91) |
| Implementação própria do SMTP | Protocolo e codificação MIME com risco alto de erro |
