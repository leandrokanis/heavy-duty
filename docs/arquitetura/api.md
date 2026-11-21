# Contêiner: API

| Campo | Valor |
|---|---|
| Nível C4 | 2, contêiner |
| Pasta | `apps/api` (`@heavy-duty/api`) |
| Onde roda | Processo Node.js no kasparov |
| ADRs | ADR-004, ADR-005, ADR-006, ADR-007, ADR-010, ADR-013, ADR-014, ADR-017 |
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
| `@hono/zod-openapi` 1.6.3, Zod 4 e `@hono/swagger-ui` | Validação de entrada e saída; OpenAPI 3.1 gerado a partir dos schemas; Swagger UI em `/api/docs` | MIT | Aceita, ADR-017 |
| MCP TypeScript SDK (`@modelcontextprotocol/sdk` 1.32.2) | Servidor MCP com Streamable HTTP em `/mcp`, sem estado | MIT | Aceita, ADR-006 |
| Drizzle ORM e drizzle-kit | Acesso ao SQLite e migrações | Apache-2.0 (ORM), MIT (drizzle-kit) | Aceita, ADR-013 |
| better-sqlite3 | Driver do SQLite | MIT | Aceita, ADR-013 |
| croner | Agendador dos avisos e do resumo semanal | MIT | Proposta (onda 7) |
| web-push | Envio de Web Push com chaves VAPID | MPL-2.0, compatível como dependência | Proposta (onda 7) |
| Nodemailer | Montagem e envio do e-mail para o servidor SMTP local | MIT-0 [a confirmar] | Proposta (onda 7) |
| pino | Log estruturado | MIT | Adiado: entra na primeira story que precisar de log; o scaffold usa `console.error` só em falha |
| Vitest | Teste unitário e de integração | MIT | Aceita, `docs/convencoes/testes.md` |
| `uuid` | Gerador de ID em UUID v7 (`createId()`) | MIT | Aceita, ADR-014 |
| tsx | Execução com recarga em desenvolvimento (`tsx watch`); a produção executa o build do `tsc` | MIT | Aceita, EN-S0 |

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

O contrato de cada rota é gerado dos schemas em `docs/arquitetura/openapi.json` e descrito em `contratos.md`; as ferramentas MCP estão em `mcp.md`. Esta tabela só mostra exemplos.

## Regras que o código segue

1. Toda rota e toda ferramenta MCP exigem autenticação (NFR02). O método depende da ADR de autenticação (H12). Até a autenticação existir, `/api/docs`, `/api/openapi.json` e `/mcp` só existem fora de `NODE_ENV=production`; `GET /api/health` é pública porque não devolve dado de treino (ADR-017).
2. O `/mcp` só atende os hosts de `MCP_ALLOWED_HOSTS` e recusa com 403 o `Host` ou o `Origin` de fora da lista, contra DNS rebinding (`mcp.md`, "Transporte e acesso").
3. A ferramenta MCP destrutiva declara `destructiveHint: true` e só age depois de confirmação explícita (US-F06-02).
4. A gravação de série é idempotente pelo ID gerado no cliente: o mesmo ID não cria outra série.
5. O erro de domínio tem `code` em inglês, em `snake_case`, e `message` em português (`docs/convencoes/codigo.md`, Seção 8).
6. Data e hora são ISO 8601 em UTC; a carga é inteiro em gramas (`loadG`); o tempo é inteiro em segundos. A API não usa número de ponto flutuante para medida.
7. O cálculo do jogo fica em funções puras do módulo `windows`, com os parâmetros num arquivo de configuração versionado (ADR-010).
8. A falha de um canal de aviso não bloqueia o outro e fica registrada em `notifications`.
9. O log não leva credencial, token nem o endereço de e-mail do PO.
