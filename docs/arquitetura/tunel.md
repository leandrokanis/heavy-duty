# Contêiner: túnel

| Campo | Valor |
|---|---|
| Nível C4 | 2, contêiner |
| Pasta | Serviços `cloudflared` e `proxy` em `compose.coolify.yaml`, com o roteamento em `infra/caddy/Caddyfile` (ADR-028) |
| Onde roda | Serviço `cloudflared` no kasparov |
| ADRs | Definido no PRD (D02); ADR-028 |
| Ondas | 1 |

## Responsabilidade

- Publicar o Heavy Duty com HTTPS, sem abrir porta no roteador de casa (NFR04).
- Rotear as requisições por caminho, no mesmo domínio, para o contêiner certo.

## Tecnologias

| Tecnologia | Uso | Licença | Estado |
|---|---|---|---|
| Cloudflare Tunnel (`cloudflared`) | Túnel de saída até a Cloudflare, gerenciado pelo painel, com token | Apache-2.0 | Definido no PRD (D02); ADR-028 |
| Caddy (`caddy:2.11.7-alpine`, imagem `heavy-duty-proxy`) | Roteamento por caminho, o mesmo do desenvolvimento | Apache-2.0 | Aceita, ADR-015 e ADR-028 |

## Roteamento

| Caminho | Destino | Porta local |
|---|---|---|
| `/api/*` | API | 3001 |
| `/mcp` | API, servidor MCP | mesma da API |
| `/.well-known/oauth-*` | API, metadados OAuth do `/mcp` (US-F16-01, ADR-020) | mesma da API |
| todo o resto | App web (Next.js) | 3000 |

O hostname público do túnel aponta para `http://proxy:80`, o serviço do Caddy na pilha `compose.coolify.yaml`. O Caddy aplica a tabela acima com o `infra/caddy/Caddyfile`, o mesmo arquivo do proxy de desenvolvimento. O proxy do ponta a ponta (`e2e/support/proxy.ts`) segue o mesmo roteamento. A tela de autorização `/autorizar` fica no app web, como o resto.

Com um domínio só para tudo, o cookie de sessão é do próprio site, e o app web chama a API sem CORS.

## Interfaces

| Direção | Com quem | Como |
|---|---|---|
| Recebe | Cloudflare | Túnel de saída, iniciado pelo kasparov |
| Encaminha | Proxy (Caddy) | HTTP local, em `http://proxy:80` |
| Encaminha, pelo proxy | App web e API | HTTP local, conforme a tabela de roteamento |

## Regras que a configuração segue

1. Nenhuma porta do kasparov fica aberta para a internet; só o túnel de saída.
2. O roteamento por caminho fica versionado no `Caddyfile`. O painel da Cloudflare guarda só o hostname e o destino `http://proxy:80`. O token do túnel vem da variável `CLOUDFLARE_TUNNEL_TOKEN` do recurso no Coolify, fora do Git.
3. A queda da internet ou da energia em casa derruba o acesso e os avisos (R02, aceito).
