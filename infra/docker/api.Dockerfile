# Production images of the API (ADR-015) and of the daily backup (ADR-018).
# Build with an explicit target: api or backup.
FROM restic/restic:0.20.0 AS restic

FROM node:24.22.2-bookworm-slim AS base
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN corepack enable
WORKDIR /app

FROM base AS build
# better-sqlite3 compiles its native addon when no prebuilt binary matches.
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc tsconfig.base.json ./
COPY apps/api/package.json apps/api/
COPY packages/game/package.json packages/game/
RUN pnpm install --frozen-lockfile --filter heavy-duty --filter "@heavy-duty/api..."
COPY packages/game packages/game
COPY apps/api apps/api
# The trailing ... builds the game package before the API, see ADR-034.
RUN pnpm --filter "@heavy-duty/api..." build \
  && pnpm --filter @heavy-duty/api deploy --prod --legacy /out \
  && cp -r apps/api/dist /out/dist

FROM node:24.22.2-bookworm-slim AS api
# The deployed game package only has dist, which this export condition selects (ADR-034).
ENV NODE_ENV=production \
    NODE_OPTIONS=--conditions=heavy-duty-dist \
    PORT=3001 \
    DATABASE_PATH=/app/data/heavy-duty.sqlite
WORKDIR /app
COPY --from=build --chown=node:node /out ./
RUN mkdir -p /app/data && chown node:node /app/data
USER node
EXPOSE 3001
CMD ["sh", "-c", "node dist/db/migrate.js && node dist/db/seed.js && exec node dist/server.js"]

FROM node:24.22.2-bookworm-slim AS backup
# restic needs the CA certificates for a remote repository over HTTPS.
RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates \
  && rm -rf /var/lib/apt/lists/*
COPY --from=restic /usr/bin/restic /usr/local/bin/restic
ENV NODE_ENV=production \
    NODE_OPTIONS=--conditions=heavy-duty-dist \
    DATABASE_PATH=/app/data/heavy-duty.sqlite \
    RESTIC_REPOSITORY=/backup/restic
WORKDIR /app
COPY --from=build --chown=node:node /out ./
RUN mkdir -p /app/data /backup && chown node:node /app/data /backup
USER node
CMD ["node", "dist/modules/system/backup/scheduler.js"]
