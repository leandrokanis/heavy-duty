# Contêiner: banco de dados

| Campo | Valor |
|---|---|
| Nível C4 | 2, contêiner (armazenamento de dados) |
| Pasta | Esquema em `apps/api/src/db/schema.ts` e migrações em `apps/api/src/db/migrations/` (ADR-013) |
| Onde roda | Arquivo no disco do kasparov, aberto pelo processo da API |
| ADRs | ADR-005; ADR-010 define o que fica guardado |
| Ondas | 1 em diante |

## Responsabilidade

- Guardar catálogo, programas, treinos, séries, exercícios pulados, retratos do período, medalhas conquistadas, inscrições de push, registro de avisos, configurações e execuções de backup.
- Ser a fonte da verdade de todo dado do Heavy Duty (NFR01).

O estado do jogo (janela, pontos, nível, recorde, ranking) não fica guardado: a API calcula a partir do histórico (ADR-010). O modelo completo está em `dados.md`.

## Tecnologias

| Tecnologia | Uso | Licença | Estado |
|---|---|---|---|
| SQLite 3, modo WAL | Banco num arquivo só | Domínio público | Aceita, ADR-005 |
| better-sqlite3 | Driver, usado pela API e pelo backup | MIT | Aceita, ADR-013 |
| Drizzle ORM e drizzle-kit | Esquema em TypeScript e migrações versionadas | Apache-2.0 (ORM), MIT (drizzle-kit) | Aceita, ADR-013 |

## Interfaces

| Direção | Com quem | Como |
|---|---|---|
| Lê e grava | API | Drizzle ORM sobre better-sqlite3, no mesmo processo |
| Lê, e grava só `backup_runs` | Backup | API de backup do SQLite, sem parar a API |

## Regras que o código segue

1. Só a API grava nas tabelas de domínio. O backup lê o banco e grava só o resultado em `backup_runs`.
2. Toda mudança de esquema é uma migração versionada do drizzle-kit, no mesmo PR da mudança de código.
3. Tabela e coluna em `snake_case`, tabela no plural, unidade no nome da coluna (`load_g`, `rest_seconds`). O código TypeScript usa camelCase (`loadG`), e o Drizzle faz a conversão.
4. Medida é inteiro na menor unidade, sem ponto flutuante: carga em gramas (`load_g`), tempo em segundos. Nenhuma coluna usa `REAL`.
5. ID é texto com UUID; data e hora são texto ISO 8601 em UTC.
6. As restrições de domínio que o banco consegue garantir ficam também no banco, com `CHECK` e chave estrangeira: carga não negativa, tipo de exercício válido, letra única por programa.
7. Em produção, o arquivo do banco fica fora do repositório e do diretório do código, na pasta do host em `HEAVY_DUTY_DATA_DIR` (`compose.prod.yaml`). O caminho vem de `DATABASE_PATH`, obrigatória em produção. No desenvolvimento, o padrão é `data/heavy-duty.dev.sqlite`, na pasta `./data/` fora do Git (ADR-011).
