# Contêiner: API

| Campo | Valor |
|---|---|
| Nível C4 | 2, contêiner |
| Pasta | `apps/api` (`@heavy-duty/api`) |
| Onde roda | Processo Node.js no kasparov |
| ADRs | ADR-004, ADR-005, ADR-006 (proposta), ADR-007, ADR-010 |
| Ondas | 1 em diante |

## Responsabilidade

- Aplicar as regras de negócio e gravar os dados no banco.
- Atender o app web por HTTP e o Claude por MCP, com os mesmos services (ADR-006).
- Calcular o estado do jogo a partir do histórico: janela, pontos, nível, perda, recorde, nível geral e sugestão do dia (ADR-010).
- Agendar e enviar os avisos e o resumo semanal, por Web Push e por e-mail (onda 7).
- Expor a situação do sistema: backup, envio de e-mail e falhas.

## Tecnologias

| Tecnologia | Uso | Licença | Estado |
|---|---|---|---|
| Node.js 24 | Ambiente de execução | MIT | Aceita, ADR-004 |
| TypeScript, modo estrito | Linguagem | Apache-2.0 | Aceita, ADR-002 |
| Hono 4 e `@hono/node-server` | Rotas HTTP | MIT | Aceita, ADR-004 |
| `@hono/zod-openapi` e Zod | Validação de entrada e saída; OpenAPI gerado a partir dos schemas | MIT | Proposta [a confirmar no scaffold] |
| MCP TypeScript SDK (`@modelcontextprotocol/sdk`) | Servidor MCP com Streamable HTTP em `/mcp` | MIT | Proposta, ADR-006 |
| Drizzle ORM e drizzle-kit | Acesso ao SQLite e migrações | Apache-2.0 | Proposta: decisão pendente da onda 1 |
| better-sqlite3 | Driver do SQLite | MIT | Proposta: decisão pendente da onda 1 |
| croner | Agendador dos avisos e do resumo semanal | MIT | Proposta (onda 7) |
| web-push | Envio de Web Push com chaves VAPID | MPL-2.0, compatível como dependência | Proposta (onda 7) |
| Nodemailer | Montagem e envio do e-mail para o servidor SMTP local | MIT-0 [a confirmar] | Proposta (onda 7) |
| pino | Log estruturado | MIT | Proposta [a confirmar no scaffold] |
| Vitest | Teste unitário e de integração | MIT | Aceita, `docs/convencoes/testes.md` |

## Componentes (resumo do nível 3)

| Módulo | Entidades e cálculo | Onda | Features |
|---|---|---|---|
| `catalog` | `MuscleGroup`, `Muscle`, `Exercise`, músculos principais e secundários | 1 | F01 |
| `system` | Situação do backup e do envio de e-mail | 1 | F14, F17 |
| `programs` | `Program`, `ProgramDay`, `PlannedExercise` | 2 | F02 |
| `workouts` | `Workout`, `WorkoutSet`, exercícios pulados | 3 e 4 | F03, F04, F05, F06 |
| `windows` | Cálculo derivado: janela, volume, pontos, nível, recorde, nível geral, sugestão; `Period`, `PeriodSnapshot`, medalhas | 5 a 7 | F07, F10, F11, F12 |
| `notifications` | Agendador, Web Push, e-mail, resumo semanal, registro de envio | 7 | F09, F17 |

Cada módulo junta rota, ferramenta MCP, service, repositório e testes (`docs/convencoes/codigo.md`, Seção 6). A rota e a ferramenta MCP chamam o mesmo service.

## Interfaces

| Direção | Com quem | Protocolo | Exemplos |
|---|---|---|---|
| Recebe | App web, pelo túnel | HTTPS, JSON em `/api/*` | `GET /api/today`, `POST /api/workouts`, `POST /api/workouts/{id}/sets`, `GET /api/game` |
| Recebe | Claude, pelo túnel | MCP Streamable HTTP em `/mcp` | `add_exercise`, `list_programs`, `update_planned_exercise`, `list_workouts`, `remove_workout` |
| Grava e lê | Banco de dados | SQL pelo Drizzle | Todas as tabelas de `dados.md` |
| Envia | Servidor SMTP local | SMTP na porta local | E-mail de aviso e resumo semanal |
| Envia | Serviço de push do navegador | Web Push (HTTPS, VAPID) | Aviso de janela e de queda |

O contrato completo de cada rota e de cada ferramenta é gerado dos schemas no scaffold. Esta tabela só mostra exemplos.

## Regras que o código segue

1. Toda rota e toda ferramenta MCP exigem autenticação (NFR02). O método depende da ADR de autenticação (H12).
2. A ferramenta MCP destrutiva declara `destructiveHint: true` e só age depois de confirmação explícita (US-F06-02).
3. A gravação de série é idempotente pelo ID gerado no cliente: o mesmo ID não cria outra série.
4. O erro de domínio tem `code` em inglês, em `snake_case`, e `message` em português (`docs/convencoes/codigo.md`, Seção 8).
5. Data e hora são ISO 8601 em UTC; a carga é inteiro em gramas (`loadG`); o tempo é inteiro em segundos. A API não usa número de ponto flutuante para medida.
6. O cálculo do jogo fica em funções puras do módulo `windows`, com os parâmetros num arquivo de configuração versionado (ADR-010).
7. A falha de um canal de aviso não bloqueia o outro e fica registrada em `notifications`.
8. O log não leva credencial, token nem o endereço de e-mail do PO.
