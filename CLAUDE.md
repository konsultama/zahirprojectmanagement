# CLAUDE.md

Guidance for Claude Code (and any agent) working in this repo. Keep it short and current — update it when a convention changes.

## What this is

Zahir Project Management — a PMBOK project-management web app. Five stages drive everything: **Initiating → Planning → Executing → Monitoring & Controlling → Closing**, plus a Master Data module. Full spec: [`docs/PRD.md`](docs/PRD.md). Section refs below (`§6`, `§7.2.5`, `§8.1`) point into it.

pnpm monorepo:

| Path | Stack |
|---|---|
| `apps/api` | NestJS 10 · Prisma 5 · PostgreSQL |
| `apps/web` | React 18 · Vite 5 · TanStack Query/Table · react-router 6 |

## Commands

```bash
pnpm dev                 # run api + web together
pnpm --filter @proj/api dev     # api only (nest --watch, port 3000, prefix /api)
pnpm --filter @proj/web dev     # web only (vite, port 5173)
pnpm build               # build both (run before claiming done)
pnpm test                # vitest, both packages
pnpm --filter @proj/api prisma:migrate   # create/apply a migration
pnpm --filter @proj/api prisma:studio    # inspect the DB
```

Always `pnpm build` **and** `pnpm test` before saying a change works. When touching an endpoint, also curl it against the running api (see "Verifying" below) — this codebase has been verified behaviorally throughout, not just compiled.

## Local database — NOT Docker

Development uses a **local Homebrew PostgreSQL 14**, database `proj_db`, trust auth (no password). `apps/api/.env`:

```
DATABASE_URL=postgresql://adinugrohoirawan@localhost:5432/proj_db?schema=public
```

`docker-compose.yml` / `.env.example` describe a Docker Postgres 16 on port 5433 — that path is documented but not what's running here. Prisma reads `apps/api/.env` (not root `.env`).

## Architecture & conventions

- **Auth is homegrown, zero JWT libraries.** `apps/api/src/auth/jwt.util.ts` does scrypt password hashing and HS256 sign/verify with Node `crypto` only. Don't add `jsonwebtoken`/`bcrypt`. Demo password for every seeded user is `zahir123`.
- **Two auth paths.** `current-user.middleware.ts` verifies a `Bearer` JWT, and falls back to an `x-user-id` header for dev/curl. Keep the fallback working.
- **RBAC is live, not static.** `@Permission('key')` + `PermissionsGuard` check a DB matrix (`RolePermission`) via `rbac.service.ts`, which caches and invalidates on `setCell`. Default matrix lives in `settings/rbac.permissions.ts` (`§6`) and is lazy-seeded. When adding a protected route, add its key there first and confirm the default preserves current behavior.
- **Data scoping.** PM/SUPERVISOR/QC see only projects they're PIC or member of; ADMIN/FINANCE/VIEWER see all. Preserve this in any new list endpoint.
- **Master Data is one generic CRUD.** `master/master.registry.ts` maps an entity key → Prisma delegate; `master.service.ts`/`master.controller.ts` handle all of them dynamically. Add a new master entity by registering it, not by writing a new controller.
- **Lazy-seeding pattern.** Checklist template, closing docs, and the RBAC matrix seed themselves on first access — don't assume a migration seeded them.
- **Stage status is derived.** `ProjectStage.status`/`completionPct` are recomputed by the owning service (`recompute()` / `updateStageCompletion()` / `refreshStage()`), e.g. `monitoring.service.ts` sets the Monitoring stage from QC coverage. If a stage header looks wrong, fix the recompute, not the read.
- **WBS math.** Auto WBS numbering (`1 → 1.1 → 1.1.1`, max 4 levels), bottom-up budget rollup, location-weighted progress (`§8.1`). Groups never carry their own qty/budget.
- **Notifications never break business ops.** `notifications/notification.service.ts` is `@Global`, wrapped in try/catch, called *after* the transaction commits. `notifyProject` notifies the PIC + members **except the actor**. Adding a trigger = one more post-commit call; never let it throw into the caller.
- **Global modules:** `AuthModule`, `NotificationsModule`, `CommonModule` are `@Global` — inject their services without re-importing.
- **File uploads:** multer diskStorage, UUID filenames, `uploads/` (gitignored).
- **Web:** server state via TanStack Query (`lib/api.ts` holds token + `Authorization` header, `absoluteFileUrl`); session/auth in `session.tsx`; theme is the Zahir ERP style (blue sidebar `#2479AE`, green primary `#059669`, ink `#394D6F`, Mulish, Lucide icons).

## Gotchas (learned the hard way)

- **`UID` is a reserved shell/zsh var** — never name one `UID` in scripts; it errors with "failed to change user ID". Use `UNIT_ID` etc.
- **Empty-string → non-nullable column = 500.** Sanitize on write: empty enum → omit, number → 0, boolean → false; default web selects to the first option.
- **New relation → add the back-relation** on the other model or `prisma migrate` fails validation (e.g. `notifications Notification[]` on `User`).
- **Specs must stay out of the Nest build.** `apps/api/tsconfig.json` excludes `src/**/*.spec.ts` so they don't land in `dist/`.
- **One Vitest version across the workspace (v2).** Web needs Vitest 2 (Vite 5 lacks the `./module-runner` export Vitest 4 wants), and api is pinned to match. They must stay equal: `@testing-library/jest-dom/vitest` augments whichever `vitest` it resolves — a version split makes it patch a different `expect` than the web runner uses, and every `toBeInTheDocument` throws "Invalid Chai property". Bump both together (and only past 2 when Vite goes to 6+).

## Testing

`apps/*/src/**/*.spec.ts`, run with `pnpm test`. Current suite covers pure/critical logic: `jwt.util`, `status-transition` (`§7.1.3`), `rbac.permissions` (`§6`), `rabCsv` parser. Prefer testing extracted pure functions over service methods that need a DB.

## Verifying an endpoint by hand

```bash
API=http://localhost:3000/api
TOK=$(curl -s -X POST "$API/auth/login" -H 'Content-Type: application/json' \
  -d '{"email":"andi.pm@contoh.id","password":"zahir123"}' \
  | node -e 'process.stdout.write(JSON.parse(require("fs").readFileSync(0)).token)')
curl -s "$API/projects" -H "Authorization: Bearer $TOK"
```

## Git

Remote: `github.com/konsultama/zahirprojectmanagement`, branch `main`. Commit only when asked. End commit messages with:

```
Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
```
