# Arquitetura do Heavy Duty

Esta pasta descreve a arquitetura do Heavy Duty pelo modelo C4, até o nível 2: o contexto do sistema e os contêineres. Cada contêiner tem um arquivo próprio, com responsabilidade, tecnologias, interfaces e regras. O modelo de dados está em `dados.md`. As decisões tomadas estão nas ADRs de `docs/adr/`, e os requisitos vêm de `docs/prd.md`.

Estado: arquitetura planejada. Nenhum contêiner tem código ainda. Tecnologia marcada como Proposta depende de uma ADR com esse status.

## Modelo C4 nesta pasta

| Nível | O que mostra | Onde está |
|---|---|---|
| 1. Contexto | O sistema, as pessoas que o usam e os sistemas externos | Seção "Nível 1" desta página |
| 2. Contêineres | As partes que rodam separadas: apps, bancos, processos | Seção "Nível 2" desta página e um arquivo por contêiner |
| 3. Componentes | Os módulos dentro de cada contêiner | Resumidos no arquivo do contêiner; o detalhe fica no código |

Os diagramas usam a sintaxe C4 do mermaid: `C4Context` no nível 1 e `C4Container` no nível 2. O modelo de dados usa `erDiagram`. A sintaxe C4 do mermaid é marcada como experimental pelo projeto, e o layout automático pode mudar entre versões [a confirmar: renderização no GitHub].

## Nível 1: contexto do sistema

```mermaid
C4Context
  title Nível 1: contexto do Heavy Duty

  Person(atleta, "Atleta (P1)", "Treina na academia com o celular")
  Person(planejador, "Planejador (P2)", "Administra o app")
  System(hd, "Heavy Duty", "Registra o treino, calcula janelas e níveis e avisa")
  System_Ext(claude, "Claude", "Cliente MCP")
  System_Ext(cf, "Cloudflare", "HTTPS e túnel até o kasparov")
  System_Ext(push, "Serviço de push do navegador", "Apple ou Google")
  System_Ext(mail, "Provedor de e-mail do PO", "Recebe os e-mails")
  System_Ext(offsite, "Destino do backup", "A definir")

  Rel(atleta, cf, "Registra séries e acompanha o jogo", "HTTPS")
  Rel(planejador, cf, "Administra pelo Mac, depois do MVP", "HTTPS")
  Rel(planejador, claude, "Pede mudanças em linguagem natural")
  Rel(claude, cf, "Chama ferramentas", "MCP Streamable HTTP")
  Rel(cf, hd, "Encaminha pelo túnel")
  Rel(hd, push, "Envia aviso", "Web Push")
  Rel(push, atleta, "Mostra o aviso")
  Rel(hd, mail, "Envia aviso e resumo semanal", "SMTP")
  Rel(hd, offsite, "Copia o backup diário")

  UpdateLayoutConfig($c4ShapeInRow="3", $c4BoundaryInRow="1")
```

### Pessoas

| Pessoa | Papel | Canal |
|---|---|---|
| Atleta (P1) | O PO na academia, com o celular | App web instalado (PWA) |
| Planejador (P2) | O PO administrando exercícios, programas e histórico | Claude, via MCP; telas de administração no Mac depois do MVP (D22) |

### Sistemas externos

| Sistema | O que faz para o Heavy Duty | Dado que recebe | Requisito |
|---|---|---|---|
| Claude | Cliente MCP que administra o app em nome do Planejador | Chamadas e respostas das ferramentas MCP | F16, ADR-006 |
| Cloudflare | HTTPS e túnel até o kasparov, sem porta aberta no roteador | Tráfego cifrado em trânsito | NFR04, D02 |
| Serviço de push do navegador | Entrega o aviso no celular (Web Push) | Aviso cifrado de ponta a ponta pelo protocolo Web Push | F09, R01, Q02 |
| Provedor de e-mail do PO | Recebe os e-mails de aviso e o resumo semanal | Conteúdo mínimo: grupos, letra, horário e níveis | F17, ADR-007 |
| Destino do backup | Guarda a cópia diária fora do disco principal | Cópia do banco [a confirmar: cifrada] | NFR03, US-F14-02 |

## Nível 2: contêineres

```mermaid
C4Container
  title Nível 2: contêineres do Heavy Duty

  Person(atleta, "Atleta (P1)", "Usa o app no celular")
  System_Ext(claude, "Claude", "Cliente MCP")
  System_Ext(push, "Serviço de push do navegador", "Apple ou Google")
  System_Ext(mail, "Provedor de e-mail do PO", "Recebe os e-mails")
  System_Ext(offsite, "Destino do backup", "A definir")

  Boundary(navegador, "Celular ou Mac do PO", "Navegador") {
    ContainerDb(local, "Armazenamento local", "IndexedDB, Dexie", "Fila de séries sem sinal e cache do treino do dia")
  }

  System_Boundary(kasparov, "Heavy Duty, no servidor kasparov") {
    Container(tunnel, "Túnel", "cloudflared", "Publica com HTTPS e roteia por caminho")
    Container(web, "App web", "Next.js, Base UI, Animate UI", "Telas do treino, do jogo e da administração")
    Container(api, "API", "Node.js, Hono, MCP SDK", "Regras de negócio, HTTP, MCP, cálculo do jogo e avisos")
    ContainerDb(db, "Banco de dados", "SQLite em WAL", "Fonte da verdade dos dados")
    Container(backup, "Backup", "Node.js, timer do systemd", "Cópia diária do banco")
    Container(smtp, "Servidor SMTP", "Postfix, OpenDKIM", "Entrega os e-mails, a partir da onda 7")
  }

  Rel(atleta, tunnel, "Usa o app", "HTTPS")
  Rel(claude, tunnel, "Chama ferramentas", "MCP, /mcp")
  Rel(tunnel, web, "Encaminha as páginas", "HTTP local")
  Rel(tunnel, api, "Encaminha /api e /mcp", "HTTP local")
  Rel(web, api, "Lê e grava", "JSON por /api")
  Rel(web, local, "Guarda a fila de séries", "IndexedDB")
  Rel(api, db, "Lê e grava", "Drizzle ORM")
  Rel(api, smtp, "Enfileira e-mail", "SMTP local")
  Rel(api, push, "Envia aviso", "Web Push")
  Rel(smtp, mail, "Entrega", "SMTP")
  Rel(backup, db, "Copia", "API de backup do SQLite")
  Rel(backup, offsite, "Envia a cópia")

  UpdateLayoutConfig($c4ShapeInRow="3", $c4BoundaryInRow="1")
```

| Contêiner | Responsabilidade | Tecnologia principal | Arquivo |
|---|---|---|---|
| App web | Telas do treino, do jogo e da administração; instalação como PWA | Next.js, React, Base UI, Animate UI, Tailwind CSS (Aceita, ADR-009) | `app-web.md` |
| Armazenamento local | Fila de séries sem sinal e cache do treino do dia, no navegador | IndexedDB com Dexie | `armazenamento-local.md` |
| API | Regras de negócio, rotas HTTP, servidor MCP, cálculo do jogo e avisos | Node.js 24, Hono, MCP TypeScript SDK | `api.md` |
| Banco de dados | Catálogo, programas, treinos, retratos e registros do sistema | SQLite em WAL, com Drizzle ORM | `banco-de-dados.md` |
| Backup | Cópia diária do banco para fora do disco principal | Script Node.js com timer do systemd | `backup.md` |
| Servidor SMTP | Entrega os e-mails de aviso e o resumo semanal, a partir da onda 7 | Postfix e OpenDKIM (Aceita, ADR-007) | `servidor-smtp.md` |
| Túnel | Publica o app com HTTPS e roteia `/api` e `/mcp` para a API | cloudflared | `tunel.md` |

## Ambiente de desenvolvimento

O ambiente de desenvolvimento sobe com `docker compose up`, a partir do `compose.yaml` da raiz (ADR-011). Ele tem três serviços: `web` (Next.js com recarga automática), `api` (Hono com recarga automática, MCP e Swagger em `/api/docs`) e `proxy`, que roteia `/api` e `/mcp` para a API e o resto para o app web, como o túnel faz em produção. O banco de desenvolvimento fica em `./data/`, fora do Git.

## Implantação no kasparov

- O app web, a API, o servidor SMTP e o túnel são processos de longa duração no kasparov. O backup roda uma vez por dia.
- O túnel roteia por caminho no mesmo domínio: `/api/*` e `/mcp` vão para a API, e o resto vai para o app web. Com um domínio só, o cookie de sessão é do próprio site, e o navegador não precisa de CORS.
- A configuração sensível vem de variáveis de ambiente, fora do Git (`docs/convencoes/codigo.md`, Seção 11).
- A forma de empacotar e executar os processos (unidades do systemd ou Docker Compose) está em aberto, na tabela de decisões pendentes.

## Fluxos entre contêineres

### Registro de série no celular

1. O app web mostra a série com os valores do programa ou do último treino (US-F03-01).
2. O atleta toca em "Próximo". O app web gera o ID da série, que também é a chave de idempotência, e grava a série na fila do armazenamento local.
3. O app web envia a série à API. Se não há rede, a série fica na fila até a conexão voltar (US-F03-03).
4. A API grava a série no banco. Uma segunda requisição com o mesmo ID não cria outra série (US-F03-02).
5. O app web inicia o descanso com o `restSeconds` do programa (US-F05-01) e, com a gamificação, mostra os pontos calculados pela API (ADR-010).

### Administração pelo Claude

1. O Claude chama uma ferramenta MCP, como `add_exercise` ou `list_workouts`, com a credencial do PO (US-F16-01).
2. O túnel encaminha `/mcp` para a API, que valida a credencial. Sem credencial válida, a chamada é recusada e nenhum dado sai.
3. A ferramenta chama o service do módulo. A regra de negócio é a mesma da rota HTTP.
4. Ferramenta que remove ou edita histórico só age depois de confirmação explícita (US-F06-02).

### Aviso de janela, a partir da onda 7

1. O agendador da API calcula, a partir do histórico, quando cada janela abre e fecha (ADR-010).
2. Na hora do aviso, a API monta um aviso por letra (D31) e manda pelos dois canais (D32): Web Push para o serviço de push e e-mail para o servidor SMTP.
3. A falha de um canal não bloqueia o outro e fica registrada no banco (`notifications`).

## Requisitos não funcionais

| NFR | Onde a arquitetura atende | Estado |
|---|---|---|
| NFR01, dados no servidor | Banco e servidor SMTP no kasparov; nenhum terceiro guarda dados de treino | ADR-005, ADR-007 |
| NFR02, autenticação forte | Autenticação no app web, na API e no MCP | Pendente |
| NFR03, backup diário | Contêiner de backup, com o resultado registrado em `backup_runs` | Pendente: destino |
| NFR04, HTTPS | Túnel da Cloudflare | Definido no PRD (D02) |
| NFR05, instalação | Manifesto e service worker do app web (Serwist) | ADR-009 |
| NFR06, sem sinal | Fila no armazenamento local, com envio posterior | Pendente: ADR de sincronização (H10) |

## Decisões pendentes

| Decisão | Insumo | Prazo |
|---|---|---|
| Método de autenticação do app web e do MCP | NFR02, R07, H12 | Antes da onda 1 (app web) e da onda 2 (MCP) |
| Empacotamento e execução em produção no kasparov: Docker Compose, como no desenvolvimento (ADR-011), ou unidades do systemd | `README.md` desta pasta | Scaffold da onda 1 |
| Ferramentas de lint e formatação | `docs/convencoes/codigo.md` | Scaffold da onda 1 |
| Conjunto de ícones: Lucide, ou os ícones animados do Animate UI, que partem do Lucide | `DESIGN.md`, Seção 14 | Scaffold da onda 1 |
| Destino e ferramenta da cópia do backup | NFR03, US-F14-02, `backup.md` | Onda 1 |
| Estratégia de sincronização sem sinal e versão do UUID | H10, Q09, `armazenamento-local.md` | Antes da onda 3 |
| Avisos por Web Push no iPhone | Q02, R01 | Antes da onda 7 |
| Validação da entrega do SMTP próprio | ADR-007, R09 | Antes da onda 7 |
| Lugar das telas de administração: proposta de rotas `/admin` no mesmo app web | D22, Q10, `app-web.md` | Antes da onda das telas de administração |

Cada decisão vira uma ADR quando for tomada.

## Documentos desta pasta

| Arquivo | Conteúdo |
|---|---|
| `app-web.md` | Contêiner do app web (Next.js) |
| `armazenamento-local.md` | Contêiner do armazenamento local (IndexedDB) |
| `api.md` | Contêiner da API (Hono e MCP) |
| `banco-de-dados.md` | Contêiner do banco de dados (SQLite) |
| `backup.md` | Contêiner do backup |
| `servidor-smtp.md` | Contêiner do servidor SMTP |
| `tunel.md` | Contêiner do túnel (cloudflared) |
| `dados.md` | Modelo de entidade e relacionamento |
