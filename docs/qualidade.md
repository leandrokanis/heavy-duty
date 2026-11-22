# Qualidade

Este documento define quando uma mudança está pronta, as verificações automáticas que cada PR passa e o roteiro de revisão de código.

Saída de IA não é evidência objetiva nem resultado validado. O código e o documento gerados com apoio de IA passam pela mesma revisão humana que qualquer outra mudança.

## Definição de pronto

Uma story está pronta quando todos os itens abaixo são verdadeiros:

1. Os cenários de aceite da story no PRD têm teste, e os testes passam.
2. `pnpm lint`, `pnpm typecheck` e `pnpm test` passam na branch.
3. O cenário ponta a ponta da story passa, quando a story tem fluxo na UI.
4. A revisão de código terminou sem achado crítico aberto.
5. A decisão de arquitetura nova tem ADR aceita.
6. A documentação afetada (`CONTEXT.md`, `docs/arquitetura/`, `CLAUDE.md` do app) está atualizada.
7. O PR não acrescenta segredo, credencial, backup nem dado pessoal.

## Verificações automáticas

O workflow `.github/workflows/ci.yml` (ADR-028) roda as verificações marcadas com "CI" em todo PR e todo push para `main` e `mvp`. O merge na `main` só acontece com os checks verdes, e o deploy só acontece depois deles (`docs/arquitetura/implantacao.md`). As outras verificações continuam com quem abre o PR, que executa o comando e relata a saída.

| Verificação | Comando | Quando | Onde |
|---|---|---|---|
| Lint | `pnpm lint` | Todo PR | CI |
| Tipos | `pnpm typecheck` | Todo PR | CI |
| Testes unitários, de integração e de componente | `pnpm test` | Todo PR | CI |
| Testes ponta a ponta | `pnpm e2e` | Todo PR | CI |
| Contrato da API | `pnpm --filter @heavy-duty/api openapi:check` | Todo PR | CI |
| Imagens de produção | Build das imagens e teste de fumaça da pilha `compose.coolify.yaml` | Todo PR | CI |
| Vulnerabilidade em dependência | `pnpm audit --prod --audit-level high` e alertas do Dependabot | Todo PR e uma vez por semana | CI, sem bloquear o deploy, e Dependabot |
| Ambiente de desenvolvimento | `docker compose up -d --build` e `curl` em `/` e `/api/health` pelo proxy | Todo PR que muda dependência, `compose.yaml` ou `infra/` | Quem abre o PR |
| Licença de dependência | `pnpm licenses list` | Todo PR que muda `pnpm-lock.yaml` | Quem abre o PR |
| Segredo no código | Varredura de segredos do GitHub, com bloqueio no push | Todo push | GitHub |

A meta de cobertura de teste não está definida [a confirmar: definir depois da onda 1, com a primeira medição].

## Revisão de código

Todo PR tem revisão antes do merge. O projeto tem um mantenedor; sem outra pessoa disponível, o mantenedor faz a revisão em sessão separada da escrita, com o roteiro abaixo, e registra o resultado no PR. A revisão automática por IA é insumo para o revisor, não substitui o revisor.

O revisor confere o diff contra a branch `main` atualizada, em seis critérios:

| Critério | Pergunta |
|---|---|
| Efetividade | A mudança atende os cenários de aceite da story? |
| Escopo | A mudança faz só o que a issue pede? |
| Arquitetura | A mudança respeita as ADRs e a estrutura de `docs/arquitetura/`? |
| Qualidade | Os testes cobrem caminho feliz e erro? Há falha de segurança ou de tratamento de erro? |
| Nomes | Os nomes seguem `CONTEXT.md` e `docs/convencoes/codigo.md`? |
| Estilo | Os comentários seguem o roteiro de `docs/convencoes/comentarios.md`, Seção 10? |

## Verificação dos requisitos não funcionais

| NFR | Como verificar |
|---|---|
| NFR01, dados no servidor | Revisão de dependências: nenhuma dependência envia dado de treino para serviço de terceiros |
| NFR02, autenticação | Teste de integração: rota e ferramenta MCP sem credencial respondem sem dado |
| NFR03, backup | Registro diário do backup no módulo `system` e teste de restauração [a confirmar: frequência do teste de restauração] |
| NFR04, HTTPS | Acesso pelo domínio público só responde em HTTPS |
| NFR05, instalação | Cenário de aceite US-F14-01 num celular real |
| NFR06, sem sinal | Cenário ponta a ponta com a rede desligada (US-F03-03) |

## Declaração de apoio de IA

O PR feito com apoio de IA declara o apoio na seção "Apoio de IA" do modelo de PR e no rodapé `Co-Authored-By` do commit.
