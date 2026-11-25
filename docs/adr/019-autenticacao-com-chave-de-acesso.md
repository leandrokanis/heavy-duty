# ADR-019: Autenticação do app web com chave de acesso

| Campo | Valor |
|---|---|
| Status | Aceita |
| Data | 2026-11-21 |
| Decisor | PO, por delegação no plano do MVP |
| Requisitos relacionados | NFR02, NFR04, NFR05, H12, R07, US-F14-01, ADR-006, ADR-017 |

## Contexto

O PRD pede autenticação forte no app web e na API, sem dado de treino para quem não entrou (NFR02, H12 e R07, `docs/prd.md`, Seções 4 e 10). O PO é o único usuário e usa o app no celular, na academia (`CONTEXT.md`, seção "Pessoas e canais"). O app web e a API ficam no mesmo domínio, atrás do túnel em produção e do proxy no desenvolvimento (`docs/arquitetura/tunel.md`; ADR-011). A ADR-017 escondeu em produção o catálogo, a situação do sistema, o documento OpenAPI e o Swagger UI até a autenticação existir. Não há tela de administração nem `/mcp` público no MVP para cadastrar a primeira credencial: o canal de confiança é o shell do servidor (kasparov). A API roda num processo só (ADR-006).

## Decisão

O app web autentica o atleta com chave de acesso (passkey, WebAuthn) com verificação do usuário, como único método, e mantém uma sessão de acesso em cookie do próprio domínio. Detalhes que o código segue:

- A biblioteca é a `@simplewebauthn/server` 14.0.3 na API e a `@simplewebauthn/browser` 14.0.0 no app web, as duas com licença MIT. A API da versão 14 foi conferida nos tipos instalados; as diferenças ficam no `decisoes.md` da story [a confirmar na revisão do PO].
- As opções da cerimônia usam `residentKey: required`, `userVerification: required` e atestação `none`. O `user.id` é estável: o primeiro cadastro cria o valor e grava o valor na tabela `settings`, chave `webauthn_user_id`. A entrada não lista credenciais (`allowCredentials` vazio): o autenticador descobre a chave.
- A primeira chave de acesso entra por um link de cadastro de uso único, válido por 15 minutos. O comando `pnpm --filter @heavy-duty/api auth:enroll`, executado no servidor, gera o link `<APP_ORIGIN>/cadastro#token=<token>`. O token vai no fragmento da URL, para não chegar ao log do proxy nem do túnel. O banco guarda só o SHA-256 do token. O consumo do token é atômico (`UPDATE … WHERE used_at IS NULL AND expires_at > ?`).
- A sessão de acesso usa um token aleatório de 32 bytes em base64url. O banco guarda só o SHA-256 do token; não existe segredo de assinatura. O cookie se chama `hd_session` e tem `HttpOnly`, `SameSite=Lax`, `Path=/`, `Max-Age` de 30 dias, sem `Domain`, e `Secure` quando a origem é `https`. A sessão vence com 30 dias sem uso, e o uso renova o vencimento no máximo uma vez por dia.
- O desafio da cerimônia fica na memória do processo da API, por 5 minutos, com uso único, conferido pelo tipo (cadastro ou entrada) e com capacidade de 100 desafios. O servidor lê o desafio do `clientDataJSON` só para a busca no armazenamento; a biblioteca confere o desafio, a origem e o RP ID.
- Uma guarda de sessão protege `/api/*` em todos os ambientes. A lista de rotas públicas é fechada: `GET /api/health` e as quatro rotas da cerimônia. Uma rota nova nasce protegida.
- Uma guarda de origem recusa com 403 os métodos `POST`, `PUT`, `PATCH` e `DELETE` em `/api/*` quando o cabeçalho `Origin` existe e difere de `APP_ORIGIN`.
- A variável `APP_ORIGIN` configura a origem. O RP ID é o hostname da origem. Fora de produção, o padrão é `http://localhost:8080`; em produção, `APP_ORIGIN` é obrigatória e precisa ser `https`.
- As rotas que a ADR-017 escondia em produção (catálogo, situação do sistema, `/api/openapi.json` e `/api/docs`) passam a existir em produção, atrás da sessão de acesso, como a ADR-017 condicionava.
- O `/mcp` não muda até a US-F16-01: continua a responder 404 em produção e a funcionar fora de produção com a guarda de host.
- O app web mostra a tela de entrada no lugar da tela pedida, na mesma URL, quando a API responde 401 em `GET /api/auth/session`. A tela de cadastro (`/cadastro`) e a página sem conexão (`/~offline`) passam direto. O service worker não guarda resposta de `/api/*`.

## Adendo da onda 7a: rota pública do link de desligar

Decidido pelo PO em 2026-11-25, no plano da onda 7a; a decisão continua Aceita. O link de desligar dos e-mails precisa funcionar sem a sessão de acesso, inclusive no `POST` de um clique do cliente de e-mail (US-F17-04, D90, ADR-037).

- A lista fechada de rotas públicas da guarda de sessão ganha `POST /api/email/unsubscribe`. A rota só muda `email_enabled`, não devolve dado de treino e responde igual a token válido e inválido.
- A guarda de origem continua valendo para a rota: o `POST` sem `Origin` passa, e o `POST` com `Origin` de outro site é recusado com 403.
- A página `/desligar-emails` passa direto pelo `AuthGate`, como `/cadastro` e `/~offline`.

## Consequências

- A entrada é um toque com confirmação no celular, sem senha para lembrar, e a chave de acesso resiste a phishing.
- A sessão de acesso dispensa segredo no `.env`: o ambiente de desenvolvimento sobe sem valor sensível.
- Perder todas as chaves de acesso exige acesso ao shell do kasparov, para gerar um link de cadastro novo.
- O desenvolvimento usa `http://localhost:8080`, não `http://127.0.0.1:8080`: o WebAuthn não aceita endereço IP como RP ID.
- O e2e precisa de origem única para o app web e a API e do Chromium, por causa do autenticador virtual.
- Um reinício da API descarta os desafios pendentes; a cerimônia em andamento falha e o atleta toca de novo.
- Esta decisão não traz revogação nem listagem de chave de acesso.
- Os testes de rota existentes passam a mandar o cookie de uma sessão de acesso criada pelo helper `createSessionCookie`.

## Alternativas consideradas

| Alternativa | Motivo da recusa |
|---|---|
| Senha | Segredo memorizado, sujeito a phishing e reaproveitamento; o PRD pede autenticação forte (H12) |
| Código por e-mail | Depende do envio de e-mail (onda 7) e acrescenta um passo na academia |
| Cadastro aberto enquanto não há chave de acesso | Qualquer pessoa que chegue antes do PO toma o app |
| Token fixo no `.env` para o cadastro | Segredo de longa duração no servidor |
| Sessão assinada com `SESSION_SECRET` (JWT) | Exige segredo no `.env` e não permite encerrar a sessão no servidor sem lista de bloqueio |
| Desafio no banco | Tabela e limpeza para um dado de 5 minutos; a API roda num processo só (ADR-006) |
| `proxy.ts` do Next.js chamando a API | Duplica a guarda e exige o endereço interno da API no contêiner web |
| Implementação própria da verificação WebAuthn | Risco alto de erro em criptografia |

O rótulo de passkey no iOS em português fica `[a confirmar]`; o app usa "chave de acesso", o nome do Android em português.
