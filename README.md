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

## Modul yang sudah ada

### Master Data Project (§7.1) ✅
- CRUD proyek + kode otomatis `PRJ-YYYY-NNNNN` (immutable).
- Multi-lokasi dengan validasi bobot 100% + "Bagi rata".
- State machine status (§7.1.3) dengan gating (Initiating approved, QC, dokumen) & alasan wajib.
- 5 tahapan otomatis dibuat saat proyek dibuat.
- RBAC per peran + data-scope (PM/Supervisor/QC hanya proyek yang ditugaskan).
- Audit trail otomatis (create/update/status).
- UI: daftar proyek (cari/filter/sortir/paginasi), form create/edit, halaman detail bertab, toast, dan **user switcher** untuk mencoba peran berbeda.

### API utama
| Method | Endpoint | Peran |
|---|---|---|
| `GET` | `/api/projects` | semua (data-scoped) |
| `POST` | `/api/projects` | Admin, PM |
| `GET` | `/api/projects/:id` | semua (data-scoped) |
| `PATCH` | `/api/projects/:id` | Admin, PM |
| `POST` | `/api/projects/:id/status` | per-transisi |
| `DELETE` | `/api/projects/:id` | Admin |
| `GET` | `/api/contacts`, `/api/users` | dropdown |

> **Auth MVP:** peran ditentukan lewat header `x-user-id` (dipilih dari user switcher di UI). JWT login menyusul.

## Status

🚧 **MVP — dalam pengembangan.** Selesai: scaffold + model data (§9), **Master Data Project (§7.1)**. Berikutnya: Master Data Tahapan (§7.2 — Initiating → Closing).
