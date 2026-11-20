# Contribuição

O projeto tem um mantenedor, que também é o PO e o único usuário. Contribuições externas são bem-vindas por issue e por pull request.

## Idioma

- Código, comentários, nomes de teste e mensagens de commit são em inglês.
- Documentação, issues e descrições de PR são em português do Brasil, conforme `docs/convencoes/escrita-tecnica.md`.

## Fluxo de contribuição

1. Abra uma issue com o problema ou a ideia. Cite a story do PRD (`US-F03-02`, por exemplo), se houver.
2. Crie uma branch a partir de `main`, com o nome definido em `docs/convencoes/git.md`.
3. Escreva o teste antes do código. As regras estão em `docs/convencoes/testes.md`.
4. Escreva as mensagens de commit em Conventional Commits, conforme `docs/convencoes/git.md`, Seção 4.
5. Execute `pnpm lint`, `pnpm typecheck` e `pnpm test` antes de abrir o PR.
6. Abra o PR com o modelo do repositório e preencha o checklist.

## Regras de revisão

Todo PR passa por revisão de outra pessoa ou, na falta dela, por uma revisão registrada do mantenedor, conforme `docs/qualidade.md`. Saída de IA é sugestão: o autor do PR responde pelo código.

## Segredos e dados pessoais

Não inclua senha, token, chave, backup do banco ou dado pessoal em commit, issue ou PR. Para relatar vulnerabilidade, siga `SECURITY.md`.
