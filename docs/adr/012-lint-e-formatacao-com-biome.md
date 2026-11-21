# ADR-012: Lint e formatação com Biome

| Campo | Valor |
|---|---|
| Status | Aceita |
| Data | 2026-11-21 |
| Decisor | PO, por delegação no plano do MVP |
| Requisitos relacionados | ADR-002, EN-S0 (FR-004) |

## Contexto

O código precisa passar no lint e no formatador configurados no scaffold (`docs/convencoes/codigo.md`, Seção 9). A convenção deixava a escolha entre ESLint com typescript-eslint e Prettier, ou Biome, para uma ADR da onda 1. O plano do MVP recomenda o Biome (`specs/plano-mvp.md`, Seção 5, arquivo local).

## Decisão

O repositório usa o Biome 2.6.8 (`@biomejs/biome`, licença MIT OR Apache-2.0) para lint e formatação, com um arquivo `biome.json` na raiz. Detalhes que o código segue:

- O script `lint` da raiz executa `biome check .` uma vez, para o repositório inteiro. Cada pacote tem o próprio `lint` com `biome check .`, para uso com `pnpm --filter`.
- O estilo usa 2 espaços, aspas simples, ponto e vírgula só quando necessário e linha de até 100 colunas, como os exemplos de `docs/convencoes/`.
- As regras são o conjunto `recommended` do Biome, com o parser de CSS aceitando as diretivas do Tailwind CSS.
- O Biome ignora `docs/`, `specs/`, os arquivos `.md`, os artefatos de build (`.next/`, `dist/`, `public/sw.js`), os arquivos gerados (`next-env.d.ts`, `e2e/.features-gen/`, `apps/api/src/db/migrations/meta/`) e o que está no `.gitignore`.

## Consequências

- Uma ferramenta só faz lint e formatação, sem conflito entre ESLint e Prettier e sem plugin por linguagem.
- O Biome 2.6.8 formata Markdown por padrão. A documentação fica fora do Biome, porque segue `docs/convencoes/escrita-tecnica.md` e tem tabelas alinhadas à mão.
- As regras específicas de React Hooks e do Next.js do ESLint não estão no Biome com o mesmo nome. O conjunto `recommended` do Biome 2.6.8 cobre parte delas [a confirmar: cobertura de `react-hooks/exhaustive-deps`].

## Alternativas consideradas

| Alternativa | Motivo da recusa |
|---|---|
| ESLint com typescript-eslint e Prettier | Duas ferramentas e mais dependências para o mesmo resultado num projeto de uma pessoa |
| Só o `tsc`, sem lint | O `tsc` não pega regra de estilo nem de acessibilidade, como `noSvgWithoutTitle` |
