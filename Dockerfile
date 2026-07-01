# ============================================================
# BetPredict Pro — Multi-stage Dockerfile
# Single image: Express API + built React frontend
# Auto-migrates the database (idempotent) on every start
# ============================================================

# ── Stage 1: Install workspace dependencies ───────────────────
FROM node:24-slim AS deps
WORKDIR /build
RUN npm install -g pnpm@latest
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./
COPY lib/api-spec/package.json          ./lib/api-spec/
COPY lib/api-zod/package.json           ./lib/api-zod/
COPY lib/db/package.json                ./lib/db/
COPY artifacts/api-server/package.json  ./artifacts/api-server/
COPY artifacts/betpredict/package.json  ./artifacts/betpredict/
RUN pnpm install --frozen-lockfile

# ── Stage 2: Build the frontend ──────────────────────────────
FROM deps AS build-frontend
WORKDIR /build
COPY lib/                  ./lib/
COPY lib/api-spec/         ./lib/api-spec/
COPY artifacts/betpredict/ ./artifacts/betpredict/
COPY attached_assets/      ./attached_assets/
RUN pnpm --filter @workspace/api-spec run codegen
ENV NODE_ENV=production PORT=3000 BASE_PATH=/
RUN pnpm --filter @workspace/betpredict run build

# ── Stage 3: Build the API server ────────────────────────────
FROM deps AS build-api
WORKDIR /build
COPY lib/                  ./lib/
COPY lib/api-spec/         ./lib/api-spec/
COPY artifacts/api-server/ ./artifacts/api-server/
RUN pnpm --filter @workspace/api-spec run codegen
RUN pnpm --filter @workspace/api-server run build

# ── Stage 4: Lean production runtime ─────────────────────────
FROM node:24-slim AS production
WORKDIR /app

# Built API server
COPY --from=build-api      /build/artifacts/api-server/dist/ ./dist/

# Built React frontend (served as static files by Express in prod)
COPY --from=build-frontend /build/artifacts/betpredict/dist/public/ ./public/

# Standalone migration script — needs pg at runtime
COPY scripts/migrate.mjs ./migrate.mjs
# Install only pg (all its sub-deps pulled in automatically)
RUN npm install --no-save pg@^8

# Startup script: migrate → serve
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

ENV NODE_ENV=production
ENV PORT=8080
ENV STATIC_DIR=/app/public

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=5 \
  CMD node -e "fetch('http://localhost:'+process.env.PORT+'/api/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

ENTRYPOINT ["/docker-entrypoint.sh"]
