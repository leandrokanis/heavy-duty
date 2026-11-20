# Especificações por story

Cada story em desenvolvimento tem uma pasta nesta pasta. A pasta junta a especificação, o plano técnico e o registro de verificação da story.

## Layout da pasta

```text
docs/specs/<id-da-story>-<slug>/
  spec.md        cenários Dado/Quando/Então e requisitos funcionais da story
  issues/        um arquivo por issue, cada issue cabe num PR
  plan.md        plano técnico da issue, com passos em checkbox e comandos de teste
  tdd.md         registro dos ciclos RED, GREEN e REFACTOR
  qa.md          plano de QA e veredito de cada rodada de verificação
  debug.md       diagnóstico e plano de correção de bug, quando houver
```

Exemplo: `docs/specs/US-F03-02-one-tap-set/`.

## Regras

1. O nome da pasta começa com o ID da story do PRD (`US-F03-02`) e termina com um slug em inglês.
2. O `spec.md` cita os cenários de aceite do PRD e não os contradiz. Mudança de requisito volta para o PRD.
3. Os arquivos da pasta são em português, conforme `docs/convencoes/escrita-tecnica.md`.
4. A pasta continua no repositório depois do merge, como registro da story.

## Uso com Claude Code

As skills `dev-specify`, `dev-breakdown`, `dev-plan`, `dev-implement`, `dev-qa` e `dev-debug` usam esta pasta como `FEATURE_DIR`.
