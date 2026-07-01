# ============================================================
# BetPredict Pro — Multi-stage Dockerfile
# Produces a single Node.js image serving both API + frontend
# ============================================================

# ── Stage 1: Install all workspace dependencies ──────────────
FROM node:24-slim AS deps

WORKDIR /build

RUN npm install -g pnpm@latest

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./
COPY lib/api-spec/package.json          ./lib/api-spec/
COPY lib/api-zod/package.json           ./lib/api-zod/
COPY lib/db/package.json                ./lib/db/
COPY artifacts/api-server/package.json  ./artifacts/api-server/
COPY artifacts/betpredict/package.json  ./artifacts/betpredict/

# Install all packages (dev + prod) — needed for build steps
RUN pnpm install --frozen-lockfile

# ── Stage 2: Build the frontend ──────────────────────────────
FROM deps AS build-frontend

WORKDIR /build

COPY lib/                ./lib/
COPY artifacts/betpredict/ ./artifacts/betpredict/
COPY attached_assets/    ./attached_assets/

# Codegen first so api-zod is available for the frontend
COPY lib/api-spec/ ./lib/api-spec/
RUN pnpm --filter @workspace/api-spec run codegen

ENV NODE_ENV=production
ENV PORT=3000
ENV BASE_PATH=/

RUN pnpm --filter @workspace/betpredict run build

# ── Stage 3: Build the API server ────────────────────────────
FROM deps AS build-api

WORKDIR /build

COPY lib/               ./lib/
COPY artifacts/api-server/ ./artifacts/api-server/

# Codegen
COPY lib/api-spec/ ./lib/api-spec/
RUN pnpm --filter @workspace/api-spec run codegen

RUN pnpm --filter @workspace/api-server run build

# ── Stage 4: Production runtime ──────────────────────────────
FROM node:24-slim AS production

WORKDIR /app

# Only copy what we need at runtime
COPY --from=build-api      /build/artifacts/api-server/dist/  ./dist/
COPY --from=build-frontend /build/artifacts/betpredict/dist/public/ ./public/

ENV NODE_ENV=production
ENV PORT=8080
ENV STATIC_DIR=/app/public

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD node -e "fetch('http://localhost:'+process.env.PORT+'/api/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "--enable-source-maps", "/app/dist/index.mjs"]
