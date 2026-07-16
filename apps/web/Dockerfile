# Production image for the React web app (built static assets served by nginx).
# Build context = repo root.
# Build:  docker build -f apps/web/Dockerfile -t proj-web .
FROM node:22-slim AS build
RUN corepack enable
WORKDIR /app
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/
# Approve native build scripts (esbuild) non-interactively — see api/Dockerfile.
RUN pnpm install --frozen-lockfile --filter @proj/web... || true
RUN pnpm approve-builds --all
# Skip the pre-run deps check (it would re-trigger the ignored-builds gate).
RUN pnpm config set verify-deps-before-run false
COPY apps/web ./apps/web
# Same-origin API path — nginx proxies /api to the api service.
ENV VITE_API_BASE_URL=/api
RUN pnpm --filter @proj/web build

# ---- runtime ----
FROM nginx:alpine AS runtime
COPY --from=build /app/apps/web/dist /usr/share/nginx/html
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
