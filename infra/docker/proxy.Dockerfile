# Production image of the path proxy (ADR-028), with the same Caddyfile as development.
FROM caddy:2.11.9-alpine
COPY infra/caddy/Caddyfile /etc/caddy/Caddyfile
