# Contêiner: túnel

| Campo | Valor |
|---|---|
| Nível C4 | 2, contêiner |
| Pasta | `infra/cloudflared/config.yml` e serviço `cloudflared` em `compose.prod.yaml` (ADR-015) |
| Onde roda | Serviço `cloudflared` no kasparov |
| ADRs | Definido no PRD (D02); sem ADR própria |
| Ondas | 1 |

## Responsabilidade

- Publicar o Heavy Duty com HTTPS, sem abrir porta no roteador de casa (NFR04).
- Rotear as requisições por caminho, no mesmo domínio, para o contêiner certo.

## Tecnologias

| Tecnologia | Uso | Licença | Estado |
|---|---|---|---|
| Cloudflare Tunnel (`cloudflared`) | Túnel de saída até a Cloudflare e roteamento por regras de entrada | Apache-2.0 | Definido no PRD (D02) |

## Roteamento

| Caminho | Destino | Porta local |
|---|---|---|
| `/api/*` | API | 3001 |
| `/mcp` | API, servidor MCP | mesma da API |
| `/.well-known/oauth-*` | API, metadados OAuth do `/mcp` (US-F16-01, ADR-020) | mesma da API |
| todo o resto | App web (Next.js) | 3000 |

A regra de entrada da API em `infra/cloudflared/config.yml` usa a expressão `^/(api|mcp|\.well-known/oauth-[a-z-]+)(/.*)?$`. O proxy de desenvolvimento (`infra/caddy/Caddyfile`) e o proxy do ponta a ponta (`e2e/support/proxy.ts`) seguem o mesmo roteamento. A tela de autorização `/autorizar` fica no app web, como o resto.

Com um domínio só para tudo, o cookie de sessão é do próprio site, e o app web chama a API sem CORS.

## Interfaces

| Direção | Com quem | Como |
|---|---|---|
| Recebe | Cloudflare | Túnel de saída, iniciado pelo kasparov |
| Encaminha | App web e API | HTTP local, conforme a tabela de roteamento |

## Regras que a configuração segue

1. Nenhuma porta do kasparov fica aberta para a internet; só o túnel de saída.
2. O roteamento por caminho fica versionado no repositório, sem a credencial do túnel, que vem do ambiente.
3. A queda da internet ou da energia em casa derruba o acesso e os avisos (R02, aceito).
