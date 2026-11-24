# Development image for the web and api services (ADR-011).
FROM node:24.22.2-bookworm-slim

# better-sqlite3 compiles its native addon when no prebuilt binary matches.
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ curl \
  && rm -rf /var/lib/apt/lists/*

# restic sends the backup copy to its encrypted repository (ADR-018).
COPY --from=restic/restic:0.18.1 /usr/bin/restic /usr/local/bin/restic

RUN corepack enable

WORKDIR /app

# Mount points of the named volumes, owned by node so the volumes start writable.
RUN mkdir -p /app/node_modules /app/apps/api/node_modules /app/apps/ui/node_modules \
    /app/packages/game/node_modules \
    /app/apps/ui/.next /app/data /pnpm-store /backup \
  && chown -R node:node /app /pnpm-store /backup

USER node

ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0 \
    npm_config_store_dir=/pnpm-store

RUN corepack prepare pnpm@10.34.9 --activate
