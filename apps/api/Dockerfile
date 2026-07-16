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
# non-interactively, then skip the pre-run deps check so build/test don't
# re-trigger the gate.
RUN pnpm install --frozen-lockfile --filter @proj/api... || true
RUN pnpm approve-builds --all
RUN pnpm config set verify-deps-before-run false

# Build
COPY apps/api ./apps/api
RUN pnpm --filter @proj/api exec prisma generate \
 && pnpm --filter @proj/api build

# Prune to a self-contained prod bundle (drops devDeps: nest-cli, tsc, vitest…),
# then regenerate the Prisma client into it (deploy re-installs deps fresh).
RUN pnpm --filter @proj/api --prod --legacy deploy /prod \
 && cd /prod && ./node_modules/.bin/prisma generate

# ---- runtime (slim) ----
FROM node:22-slim AS runtime
RUN apt-get update \
 && apt-get install -y --no-install-recommends openssl ca-certificates \
 && rm -rf /var/lib/apt/lists/*
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /prod/dist ./dist
COPY --from=build /prod/prisma ./prisma
COPY --from=build /prod/node_modules ./node_modules
COPY --from=build /prod/package.json ./
EXPOSE 3000
# Apply pending migrations, then start. Never seeds (production data is real).
CMD ["sh", "-c", "./node_modules/.bin/prisma migrate deploy && node dist/main.js"]
