# Production image of the web app (ADR-015).
FROM node:26.13.1-bookworm-slim AS base
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0 \
    NEXT_TELEMETRY_DISABLED=1
RUN corepack enable
WORKDIR /app

FROM base AS build
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc tsconfig.base.json ./
COPY apps/ui/package.json apps/ui/
RUN pnpm install --frozen-lockfile --filter heavy-duty --filter @heavy-duty/ui
COPY apps/ui apps/ui
RUN pnpm --filter @heavy-duty/ui build \
  && pnpm --filter @heavy-duty/ui deploy --prod --legacy /out \
  && cp -r apps/ui/.next /out/.next \
  && cp -r apps/ui/public/. /out/public/

FROM node:26.13.1-bookworm-slim AS runtime
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1
WORKDIR /app
COPY --from=build --chown=node:node /out ./
USER node
EXPOSE 3000
CMD ["node_modules/.bin/next", "start", "--hostname", "0.0.0.0", "--port", "3000"]
