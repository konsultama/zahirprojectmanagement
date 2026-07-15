# Aplikasi Project Management (PROJ)

Modul manajemen proyek untuk Zahir — mengelola siklus hidup proyek mengikuti 5 tahapan PMBOK: **Initiating → Planning → Executing → Monitoring & Controlling → Closing**.

Spesifikasi lengkap ada di [`docs/PRD.md`](docs/PRD.md).

## Arsitektur

Monorepo pnpm dengan dua aplikasi:

| Path | Stack | Peran |
|---|---|---|
| `apps/api` | NestJS + Prisma + PostgreSQL | REST API, RBAC, audit trail, rollup progres & anggaran |
| `apps/web` | React (Vite) + TypeScript + TanStack Table | Antarmuka pengguna |

Model data lengkap: [`apps/api/prisma/schema.prisma`](apps/api/prisma/schema.prisma) (mengikuti PRD §9).

## Prasyarat

- Node.js ≥ 22
- pnpm ≥ 11 (`corepack enable`)
- Docker (untuk PostgreSQL lokal) — atau PostgreSQL 16 yang sudah berjalan

## Mulai Cepat

```bash
# 1. Install dependencies
pnpm install

# 2. Siapkan environment
cp .env.example .env
cp .env.example apps/api/.env      # Prisma membaca apps/api/.env

# 3. Jalankan database PostgreSQL (Docker, host port 5433)
pnpm db:up

# 4. Buat skema & isi data contoh
pnpm db:migrate
pnpm db:seed

# 5. Jalankan API + Web (paralel)
pnpm dev
```

- API: http://localhost:3000/api (cek kesehatan: `GET /api/health`)
- Web: http://localhost:5173

## Skrip Berguna

| Perintah | Fungsi |
|---|---|
| `pnpm dev` | Jalankan API & Web bersamaan |
| `pnpm db:up` / `pnpm db:down` | Start/stop PostgreSQL (Docker) |
| `pnpm db:migrate` | Terapkan migrasi Prisma |
| `pnpm db:seed` | Isi data contoh (nama fiktif) |
| `pnpm db:studio` | Buka Prisma Studio |
| `pnpm build` | Build kedua aplikasi |

## Status

🚧 **MVP — dalam pengembangan.** Tahap saat ini: scaffold monorepo + model data (PRD §9). Modul fungsional (Master Data Project & 5 tahapan) menyusul.
