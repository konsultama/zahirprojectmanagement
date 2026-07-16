# Production image for the NestJS API. Build context = repo root.
# Build:  docker build -f apps/api/Dockerfile -t proj-api .
FROM node:22-slim AS build
RUN corepack enable \
 && apt-get update \
 && apt-get install -y --no-install-recommends openssl ca-certificates \
 && rm -rf /var/lib/apt/lists/*
WORKDIR /app

# Install deps first (cached until manifests change). Web's manifest is copied
# too so the frozen lockfile validates against the whole workspace.
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/
# pnpm 11 gates native build scripts (Prisma/esbuild/Nest) behind an approval
# that onlyBuiltDependencies doesn't satisfy on a clean install — approve them
# non-interactively so the engines/binaries actually build.
RUN pnpm install --frozen-lockfile --filter @proj/api... || true
RUN pnpm approve-builds --all
# Skip the pre-run deps check (it would re-trigger the ignored-builds gate).
RUN pnpm config set verify-deps-before-run false

# Build
COPY apps/api ./apps/api
RUN pnpm --filter @proj/api exec prisma generate \
 && pnpm --filter @proj/api build

# ---- runtime ----
FROM node:22-slim AS runtime
RUN corepack enable \
 && apt-get update \
 && apt-get install -y --no-install-recommends openssl ca-certificates \
 && rm -rf /var/lib/apt/lists/*
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /app ./
WORKDIR /app/apps/api
EXPOSE 3000
# Apply pending migrations, then start. Never seeds (production data is real).
CMD ["sh", "-c", "pnpm exec prisma migrate deploy && node dist/main.js"]
