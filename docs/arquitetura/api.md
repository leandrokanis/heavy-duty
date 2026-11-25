# Contêiner: API

| Campo | Valor |
|---|---|
| Nível C4 | 2, contêiner |
| Pasta | `apps/api` (`@heavy-duty/api`) |
| Onde roda | Processo Node.js no kasparov |
| ADRs | ADR-004, ADR-005, ADR-006, ADR-007, ADR-010, ADR-013, ADR-014, ADR-017, ADR-019, ADR-035, ADR-036, ADR-037 |
| Ondas | 1 em diante |

## Responsabilidade

- Aplicar as regras de negócio e gravar os dados no banco.
- Atender o app web por HTTP e o Claude por MCP, com os mesmos services (ADR-006).
- Calcular o estado do jogo a partir do histórico: janela, pontos, nível, perda e recorde (ADR-010). A sugestão da letra pelas janelas e o nível geral ficam no app web (ADR-034, adendo da onda 6b).
- Agendar e enviar os avisos e o resumo semanal, por Web Push e por e-mail (onda 7), com um agendador no próprio processo (ADR-036).
- Expor a situação do sistema: backup, envio de e-mail e falhas.

## Tecnologias

| Tecnologia | Uso | Licença | Estado |
|---|---|---|---|
| Node.js 24 | Ambiente de execução | MIT | Aceita, ADR-004 |
| TypeScript, modo estrito | Linguagem | Apache-2.0 | Aceita, ADR-002 |
| Hono 4 e `@hono/node-server` | Rotas HTTP | MIT | Aceita, ADR-004 |
| `@hono/zod-openapi` 1.6.3, Zod 4 e `@hono/swagger-ui` | Validação de entrada e saída; OpenAPI 3.1 gerado a partir dos schemas; Swagger UI em `/api/docs` | MIT | Aceita, ADR-017 |
| MCP TypeScript SDK (`@modelcontextprotocol/sdk` 1.32.2) | Servidor MCP com Streamable HTTP em `/mcp`, sem estado | MIT | Aceita, ADR-006 |
| Drizzle ORM e drizzle-kit | Acesso ao SQLite e migrações | Apache-2.0 (ORM), MIT (drizzle-kit) | Aceita, ADR-013 |
| better-sqlite3 | Driver do SQLite | MIT | Aceita, ADR-013 |
| `web-push` 3.6.7 | Envio de Web Push com chaves VAPID, atrás da interface `PushSender` (`modules/notifications/push-sender.ts`) | MPL-2.0, compatível como dependência sem alteração | Aceita, ADR-035 (onda 7a) |
| Nodemailer | Montagem e envio do e-mail ao servidor SMTP, atrás da interface `MailSender` | MIT-0 [a confirmar no `package.json` instalado] | Aceita, ADR-037 (onda 7a) |
| pino | Log estruturado | MIT | Adiado: entra na primeira story que precisar de log; o scaffold usa `console.error` só em falha |
| Vitest | Teste unitário e de integração | MIT | Aceita, `docs/convencoes/testes.md` |
| `uuid` | Gerador de ID em UUID v7 (`createId()`) | MIT | Aceita, ADR-014 |
| `@simplewebauthn/server` 14.0.3 | Opções e verificação das cerimônias da chave de acesso (WebAuthn), atrás do adaptador `src/modules/auth/webauthn.ts` | MIT; dependências MIT, BSD-3-Clause, Apache-2.0 e 0BSD | Aceita, ADR-019 |
| tsx | Execução com recarga em desenvolvimento (`tsx watch`); a produção executa o build do `tsc` | MIT | Aceita, EN-S0 |

## Componentes (resumo do nível 3)

| Módulo | Entidades e cálculo | Onda | Features |
|---|---|---|---|
| `auth` | `AuthCredential`, `AuthSession`, `EnrollmentToken`; desafio na memória; guarda de sessão; comando `auth:enroll`. Servidor de autorização do MCP: `OAuthClient`, código de autorização, `OAuthGrant`; comando `auth:revoke-mcp` | 1 e 2 | F14, F16 |
| `catalog` | `MuscleGroup`, `Muscle`, `Exercise`, músculos principais e secundários | 1 | F01 |
| `system` | Situação do backup e do envio de e-mail | 1 | F14, F17 |
| `programs` | `Program`, `ProgramDay`, `PlannedExercise` | 2 | F02 |
| `workouts` | `Workout`, `WorkoutSet`, exercícios pulados. Treino do dia (US-F03-01): `GET /api/today`, só de leitura, com a letra sugerida, a carga preenchida e a duração estimada (`today.service.ts`, regras puras em `today.rules.ts`). Gravação da série (US-F03-02): `POST /api/workouts/{workoutId}/sets`, idempotente pelo `id` da série, que cria o treino na primeira série (`workout-set.service.ts`). Remoção pelo celular (US-F03-09, US-F20-02): `DELETE /api/workouts/{workoutId}`, sem código de confirmação (`deleteWorkoutById` em `workout-removal.service.ts`, ADR-032) | 3 e 4 | F03, F04, F05, F06 |
| `windows` | Cálculo derivado: janela, volume, pontos, nível, recorde; `Period`, `PeriodSnapshot`, medalhas. Já existe o volume por grupo muscular (US-F15a-01): a regra pura `volumeByMuscleGroup` (`volume.rules.ts`), com a porcentagem do músculo secundário em `windows.config.ts`, o repositório das séries de um intervalo e o service `getMuscleGroupVolume`, que a ferramenta MCP `get_muscle_group_volume` chama. A EN01-01 acrescentou a simulação das janelas: as regras puras `groupTrainingsOf`, `windowOf` e `simulateGroupWindows` (`window.rules.ts`), a validação dos parâmetros pedidos (`window-parameters.ts`) e o service `simulateActivityWindows`, que a ferramenta `simulate_activity_windows` chama. A US-F07-01 acrescentou o estado atual da janela: a regra pura `windowStateOf` e o service `listActivityWindows` (`window-state.service.ts`), que a rota `GET /api/windows` e a ferramenta `list_activity_windows` chamam. A US-F15b-01 acrescentou a contagem das janelas aproveitadas por semana: a regra pura `windowsUsedByWeek` (`windows-used.rules.ts`) e o service `getWindowsUsed`, que a ferramenta `get_windows_used` chama. A US-F15b-02 acrescentou a meta semanal: a tabela `weekly_goals`, o service `setWeeklyGoal` (`weekly-goal.service.ts`), que a ferramenta `set_weekly_goal` chama, e o service `getWeekWindows`, que a rota `GET /api/windows/week` chama | 5 a 7 | F07, F10, F11, F12, F15a |
| `notifications` | Inscrições de push (`PushSubscription`); agendador dos avisos com ciclo de 60 s e regras puras em `notices.rules.ts`, com antecedência e horário de silêncio em `notices.config.ts` (ADR-036); envio por `PushSender` (ADR-035) e `MailSender` (ADR-037); registro de cada aviso por canal em `notifications`; link de desligar e ferramenta `set_email_notices` (ADR-037); resumo semanal na onda 7b. O agendador usa `setInterval`, como o agendador do backup, sem o `croner` | 7 | F09, F17 |

Cada módulo junta rota, ferramenta MCP, service, repositório e testes (`docs/convencoes/codigo.md`, Seção 6). A rota e a ferramenta MCP chamam o mesmo service.

## Interfaces

| Direção | Com quem | Protocolo | Exemplos |
|---|---|---|---|
| Recebe | App web, pelo túnel | HTTPS, JSON em `/api/*` | `GET /api/today`, `POST /api/workouts/{workoutId}/sets`, `GET /api/game` |
| Recebe | Claude, pelo túnel | MCP Streamable HTTP em `/mcp`, com a credencial do MCP em `Authorization: Bearer` | `add_exercise`, `list_programs`, `update_planned_exercise`, `list_workouts`, `remove_workout`, `get_muscle_group_volume`, `simulate_activity_windows` |
| Recebe | Claude, pelo túnel | HTTPS, OAuth 2.1 em `/.well-known/oauth-*`, `/api/oauth/register` e `/api/oauth/token` | Descoberta, registro do cliente, troca e renovação da credencial do MCP |
| Grava e lê | Banco de dados | SQL pelo Drizzle | Todas as tabelas de `dados.md` |
| Envia | Servidor SMTP (serviço `smtp` da pilha, ADR-038, ou relay do plano B da ADR-007) | SMTP, configurado por `SMTP_HOST` e `SMTP_PORT` (ADR-037) | E-mail de aviso e resumo semanal |
| Envia | Serviço de push do navegador | Web Push (HTTPS, VAPID) | Aviso de janela e de queda |

O contrato de cada rota é gerado dos schemas em `docs/arquitetura/openapi.json` e descrito em `contratos.md`; as ferramentas MCP estão em `mcp.md`. Esta tabela só mostra exemplos.

## Regras que o código segue

1. Toda rota e toda ferramenta MCP exigem autenticação (NFR02). As rotas `/api/*` exigem a sessão de acesso da chave de acesso em todos os ambientes (ADR-019): a guarda de sessão tem lista fechada de rotas públicas, `GET /api/health` (sem dado de treino), as quatro rotas da cerimônia as duas rotas OAuth `POST /api/oauth/register` e `POST /api/oauth/token` (ADR-020) e, a partir da US-F17-04, `POST /api/email/unsubscribe`, o link de desligar (ADR-037, adendo da ADR-019). Uma rota nova nasce protegida. A guarda de origem recusa com 403 o método que muda estado com `Origin` de outro site. O `/mcp` exige a credencial do MCP em todos os ambientes (ADR-020), e cada canal lê só o próprio meio: o cookie não abre o `/mcp`, e a credencial do MCP não abre `/api/*`.
2. O `/mcp` só atende os hosts de `MCP_ALLOWED_HOSTS`, mais o hostname de `APP_ORIGIN`, e recusa com 403 o `Host` ou o `Origin` de fora da lista, contra DNS rebinding. A guarda de host roda antes da guarda da credencial (`mcp.md`, "Transporte e acesso").
3. A ferramenta MCP destrutiva declara `destructiveHint: true` e só age depois de confirmação explícita (US-F06-02).
4. A gravação de série é idempotente pelo ID gerado no cliente: o mesmo ID não cria outra série.
5. O erro de domínio tem `code` em inglês, em `snake_case`, e `message` em português (`docs/convencoes/codigo.md`, Seção 8).
6. Data e hora são ISO 8601 em UTC; a carga é inteiro em gramas (`loadG`); o tempo é inteiro em segundos. A API não usa número de ponto flutuante para medida.
7. O cálculo do jogo fica em funções puras, com os parâmetros num arquivo de configuração versionado (ADR-010). A janela fica no módulo `windows`; pontos, nível, perda e recorde ficam no pacote `@heavy-duty/game`, que o app web também usa, e o módulo `windows` os chama com o histórico (ADR-034).
8. A falha de um canal de aviso não bloqueia o outro e fica registrada em `notifications`. Cada aviso sai no máximo uma vez por canal, pela chave única da linha, sem nova tentativa (ADR-036).
9. O log não leva credencial, token, chave VAPID nem o endereço de e-mail do PO. O banco guarda só o SHA-256 do código de autorização, da credencial do MCP, do token de renovação e do token do link de desligar. As cerimônias da chave de acesso descartam a exceção da biblioteca, que cita o desafio, em vez de registrar a exceção no log (FR-028).

## Configuração

| Variável | Uso | Padrão | Produção |
|---|---|---|---|
| `NODE_ENV` | Ambiente | `development` | `production` |
| `PORT` | Porta HTTP | `3001` | `3001` |
| `DATABASE_PATH` | Arquivo do SQLite | `data/heavy-duty.dev.sqlite` na raiz do repositório | Obrigatória |
| `MCP_ALLOWED_HOSTS` | Hosts aceitos no `/mcp`, separados por vírgula. O hostname de `APP_ORIGIN` entra sempre na lista | `localhost`, `127.0.0.1`, `[::1]` | — (o domínio público vem de `APP_ORIGIN`) |
| `APP_ORIGIN` | Origem pública do app (esquema, host e porta). O RP ID do WebAuthn é o hostname; o cookie leva `Secure` quando o esquema é `https`; a guarda de origem compara o `Origin` com o valor; as URLs OAuth e o `WWW-Authenticate` do `/mcp` usam o valor | `http://localhost:8080` | Obrigatória e `https`, senão a API não sobe e o erro cita `APP_ORIGIN` |

| `NOTICE_TIME_ZONE` | Fuso do horário de silêncio e do texto dos avisos e dos e-mails (D81, ADR-036) | `America/Sao_Paulo` | Opcional |
| `VAPID_PUBLIC_KEY` | Chave pública VAPID, servida por `GET /api/notifications/push-key` (ADR-035) | — | Opcional; sem as três variáveis VAPID, o push fica desligado |
| `VAPID_PRIVATE_KEY_FILE` | Arquivo com a chave privada VAPID, montado só leitura (ADR-035) | — | Opcional |
| `VAPID_SUBJECT` | `subject` VAPID: a origem do app, sem e-mail pessoal (ADR-035) | `APP_ORIGIN` | Opcional |
| `SMTP_HOST`, `SMTP_PORT` | Servidor SMTP: o serviço `smtp` da pilha (ADR-038) ou o relay do plano B (ADR-007) | — | Opcional; sem `SMTP_HOST`, `MAIL_FROM` ou `MAIL_TO`, o e-mail fica desligado |
| `SMTP_USER`, `SMTP_PASSWORD_FILE` | Usuário e arquivo da senha, só no relay (ADR-037) | — | Opcional |
| `MAIL_FROM` | Remetente dos e-mails, no domínio do app, com o nome "Heavy Duty" (D88) | — | Opcional |
| `MAIL_TO` | Destinatário dos e-mails: o endereço do PO (D88) | — | Opcional |

Sem canal configurado, a API sobe e o agendador dos avisos não parte (ADR-036). As chaves e a senha vêm de arquivo, nunca de variável com o valor.

`APP_ORIGIN` não é segredo. O `compose.yaml` passa `http://localhost:${PROXY_PORT:-8080}`, e o `compose.coolify.yaml` exige `APP_ORIGIN`, preenchida nas variáveis do recurso no Coolify (`implantacao.md`). O `.env.example` ainda não traz a variável: a inclusão de `APP_ORIGIN=https://<HOSTNAME>` é tarefa manual do PO. O desenvolvimento usa `http://localhost:8080`, não `http://127.0.0.1:8080`, porque o WebAuthn não aceita endereço IP como RP ID.

## Cadastro da chave de acesso

O comando `pnpm --filter @heavy-duty/api auth:enroll` (`src/modules/auth/enroll.ts`) gera um link de cadastro de uso único, válido por 15 minutos, e imprime `<APP_ORIGIN>/cadastro#token=<token>` com o vencimento. O comando lê `DATABASE_PATH` e `APP_ORIGIN`, não cria banco nem executa migração, e termina com código 1 quando o arquivo do banco não existe ou a tabela `enrollment_tokens` falta. No desenvolvimento, execute `docker compose exec api pnpm --filter @heavy-duty/api auth:enroll`; na produção, execute `node dist/modules/auth/enroll.js` no terminal do contêiner `api`, pelo Coolify (`implantacao.md`). O link não vai para arquivo nem para canal compartilhado: abra o link no celular dentro do prazo.

## Revogação das autorizações do MCP

O comando `pnpm --filter @heavy-duty/api auth:revoke-mcp` (`src/modules/auth/revoke-mcp.ts`) revoga todas as autorizações do MCP: marca `revoked_at` em cada autorização ativa de `oauth_grants`, gasta os códigos de autorização pendentes e imprime quantas autorizações e códigos atingiu. A credencial do MCP e o token de renovação emitidos antes passam a ser recusados; o Claude precisa de nova aprovação do PO. O comando lê `DATABASE_PATH`, não cria banco nem executa migração, não imprime token nem hash e termina com código 1 quando o arquivo do banco não existe. No desenvolvimento, execute `docker compose exec api pnpm --filter @heavy-duty/api auth:revoke-mcp`; na produção, execute `node dist/modules/auth/revoke-mcp.js` no terminal do contêiner `api`, pelo Coolify.
