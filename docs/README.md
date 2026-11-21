# Índice da documentação

Toda a documentação do projeto está em português do Brasil e segue `convencoes/escrita-tecnica.md`. O código e os comentários são em inglês.

## Documentos

| Documento | Conteúdo | Quando ler |
|---|---|---|
| `../DESIGN.md` | Diretrizes de interface (HIG) com referência no iOS 27 e no macOS 27 | Antes de criar ou alterar tela ou componente |
| `prd.md` | Problema, visão, features, stories, cenários de aceite, riscos e roadmap | Antes de especificar ou implementar uma story |
| `gamificacao.md` | Projeto de gamificação (Octalysis): regras do jogo, núcleos, jornada, questões em aberto e riscos | Antes de especificar ou implementar uma story das ondas 5 a 7 |
| `arquitetura/` | Modelo C4 até o nível 2, um arquivo por contêiner, modelo de entidade e relacionamento e decisões pendentes | Antes de criar módulo, rota, ferramenta MCP ou dependência |
| `adr/` | Registros de decisão de arquitetura e o modelo de ADR | Antes de propor uma decisão nova ou mudar uma existente |
| `convencoes/codigo.md` | Idioma, nomes, estrutura de pastas, formatos de dado e dependências | Ao escrever código |
| `convencoes/comentarios.md` | Quando um comentário é permitido e como ele é escrito | Ao escrever ou revisar comentário |
| `convencoes/testes.md` | Ferramentas, estrutura Given/When/Then, factories e regras de teste | Ao escrever teste |
| `convencoes/escrita-tecnica.md` | Regras de redação em português | Ao escrever documentação |
| `convencoes/git.md` | Branches, commits e pull requests | Ao fazer commit ou abrir PR |
| `qualidade.md` | Definição de pronto, verificações automáticas e roteiro de revisão | Antes de abrir ou revisar PR |

## Regras para documento novo

1. Escreva o documento conforme `convencoes/escrita-tecnica.md`, no nível `descritivo`.
2. Acrescente o documento na tabela desta página.
3. Decisão de arquitetura vai para uma ADR, não para um documento solto.
