# ADR-035: Web Push com VAPID

| Campo | Valor |
|---|---|
| Status | Aceita |
| Data | 2026-11-25 |
| Decisor | PO |
| Requisitos relacionados | F09, US-F09-01, US-F09-02, NFR01, NFR05, D44, D85, D87, R01, ADR-009, ADR-028 |

Elaborada com apoio de IA, a partir do plano da onda 7a aprovado pelo PO em 2026-11-25. Sujeita a revisão humana.

## Contexto

A F09 manda os avisos de janela e de queda para o celular (`docs/prd.md`, Seção 9). O celular é um iPhone, e o aviso exige o app instalado na tela inicial, com iOS 16.4 ou posterior (D44, R01). O padrão aberto para isso é o Web Push: o navegador inscreve o aparelho num serviço de push (Apple ou Google), e o servidor envia a mensagem cifrada para o endereço da inscrição, assinada com um par de chaves VAPID (RFC 8292).

Fatos do código que pesam na decisão (plano da onda 7a, Seção 1):

- O service worker existe só no build de produção, porque o Serwist fica desligado no `next dev` (`docs/arquitetura/app-web.md`, regra 6). Hoje o `sw.ts` só faz cache: faltam os eventos `push` e `notificationclick`.
- As imagens são genéricas: o CI faz o build do app web sem configuração do ambiente (ADR-028). Uma chave em `NEXT_PUBLIC_*` ficaria presa no build.
- O `compose.coolify.yaml` recusa a partida sem variável obrigatória. Variável nova obrigatória derrubaria o deploy da onda 7a antes de o PO configurar as chaves.
- O modelo de dados já prevê a tabela `push_subscriptions`, com `endpoint` único (`docs/arquitetura/dados.md`).

O Safari tem regras próprias: a permissão só pode ser pedida num toque do usuário, a inscrição exige `userVisibleOnly: true`, toda mensagem recebida precisa mostrar uma notificação (senão o Safari revoga a inscrição) e o evento `pushsubscriptionchange` não tem entrega garantida [a confirmar: comportamento no iPhone do PO, só verificável na produção].

## Decisão

A API envia os avisos no celular por Web Push, com a biblioteca `web-push` e um par de chaves VAPID do próprio app. Detalhes que o código segue:

- **Biblioteca.** A API usa `web-push` (licença MPL-2.0, compatível como dependência de um projeto MIT; aprovada pelo PO no plano da onda 7a) atrás da interface `PushSender`. Os testes usam uma implementação falsa; o CI não precisa de chave nem de rede de push.
- **Chave pública pela API.** O app web busca a chave pública em `GET /api/notifications/push-key`, que devolve também se o push está configurado no servidor. A chave não entra no build do app web.
- **Chave privada por arquivo.** A chave privada vem do arquivo em `VAPID_PRIVATE_KEY_FILE`, montado só leitura a partir do host, com dono UID 1000 e permissão `600`. A chave pública vem de `VAPID_PUBLIC_KEY`, e o `subject` VAPID, de `VAPID_SUBJECT` (a origem do app, sem e-mail pessoal). As três variáveis são opcionais: sem elas, a API sobe com o canal de push desligado.
- **Inscrições.** A inscrição fica em `push_subscriptions`, com `endpoint` único. O app web grava a inscrição com `PUT /api/notifications/push-subscriptions` e apaga com `DELETE` na mesma rota, pelo `endpoint`. O app web manda a inscrição de novo à API a cada abertura, porque o Safari não garante o `pushsubscriptionchange`. A inscrição que o serviço de push recusa com 404 ou 410 sai da tabela.
- **Requisitos do iOS (D44).** O app web oferece a ativação só com o app instalado (`display-mode: standalone` ou `navigator.standalone`) e com suporte a `PushManager`. O pedido de permissão acontece só no toque na chave "Avisos no celular" (D87). A inscrição usa `userVisibleOnly: true`.
- **Service worker.** O `sw.ts` ganha o evento `push`, que sempre mostra uma notificação, com `tag` por letra, e o `notificationclick`, que abre o treino do dia, `/` (D85).
- **Conteúdo.** A mensagem leva o mínimo: grupos, letra, horário e níveis, como o e-mail (ADR-007). O conteúdo vai cifrado de ponta a ponta pelo protocolo Web Push.

## Consequências

- O aviso no celular chega sem app nativo e sem serviço de terceiros além do serviço de push do navegador, que só vê a mensagem cifrada (NFR01).
- A mesma imagem do app web serve a qualquer ambiente, porque a chave pública vem da API em tempo de execução.
- O deploy da onda 7a não depende das chaves: sem configuração, a folha dos avisos mostra "avisos não configurados no servidor".
- Gerar o par VAPID e guardar a chave privada no host são tarefas manuais do PO, fora do Git.
- O teste real só acontece no iPhone, depois do deploy na `main`, porque só a produção tem `https` público. O e2e usa um `PushManager` falso e não alcança o serviço de push.
- Trocar o par VAPID invalida as inscrições existentes; o atleta ativa os avisos de novo.

## Alternativas consideradas

| Alternativa | Motivo da recusa |
|---|---|
| Chave pública em `NEXT_PUBLIC_*` | Prende a chave no build; as imagens do CI são genéricas (ADR-028) |
| Chave privada em variável de ambiente | O valor apareceria na configuração do Coolify e no `docker inspect`; o arquivo segue o padrão da senha do restic (ADR-018) |
| Implementação própria do protocolo Web Push | Criptografia (ECDH, HKDF, AES-GCM) e assinatura VAPID com risco alto de erro |
| App nativo com APNs | Exige conta paga de desenvolvedor e outro código; o PRD pede um app web (NFR05) |
| Serviço de push de terceiros (como OneSignal) | Mais um terceiro com o conteúdo dos avisos, contra a NFR01 |
