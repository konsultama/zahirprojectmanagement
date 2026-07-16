# Aplikasi Project Management (PROJ)

[![CI](https://github.com/konsultama/zahirprojectmanagement/actions/workflows/ci.yml/badge.svg)](https://github.com/konsultama/zahirprojectmanagement/actions/workflows/ci.yml)

Modul manajemen proyek untuk Zahir — mengelola siklus hidup proyek mengikuti 5 tahapan PMBOK: **Initiating → Planning → Executing → Monitoring & Controlling → Closing**, plus Master Data.

Spesifikasi lengkap: [`docs/PRD.md`](docs/PRD.md). Panduan arsitektur & konvensi untuk kontributor/agent: [`CLAUDE.md`](CLAUDE.md).

## Arsitektur

Monorepo pnpm dengan dua aplikasi:

| Path | Stack | Peran |
|---|---|---|
| `apps/api` | NestJS · Prisma · PostgreSQL | REST API, auth JWT, RBAC live, audit trail, notifikasi (SSE), rollup progres & anggaran |
| `apps/web` | React (Vite) · TypeScript · TanStack Query/Table | Antarmuka pengguna |

Model data lengkap: [`apps/api/prisma/schema.prisma`](apps/api/prisma/schema.prisma) (mengikuti PRD §9).

## Prasyarat

- Node.js ≥ 22
- pnpm ≥ 11 (`corepack enable`)
- PostgreSQL — Docker (`postgres:16`, port 5433) **atau** instalasi lokal yang sudah berjalan

## Mulai Cepat

```bash
# 1. Install dependencies
pnpm install

# 2. Siapkan environment (Prisma membaca apps/api/.env)
cp .env.example .env
cp .env.example apps/api/.env

# 3. Jalankan PostgreSQL (Docker) — atau arahkan DATABASE_URL ke Postgres lokal
pnpm db:up

# 4. Buat skema & isi data contoh
pnpm db:migrate
pnpm db:seed

# 5. Jalankan API + Web (paralel)
pnpm dev
```

- API: http://localhost:3000/api (cek kesehatan: `GET /api/health`)
- Web: http://localhost:5173
- **Login demo:** setiap user seed memakai kata sandi `zahir123`; UI menyediakan quick-login per persona.

## Skrip Berguna

| Perintah | Fungsi |
|---|---|
| `pnpm dev` | Jalankan API & Web bersamaan |
| `pnpm build` | Build kedua aplikasi |
| `pnpm test` | Jalankan seluruh test (Vitest — api + web) |
| `pnpm db:up` / `pnpm db:down` | Start/stop PostgreSQL (Docker) |
| `pnpm db:migrate` | Terapkan migrasi Prisma |
| `pnpm db:seed` | Isi data contoh (nama fiktif) |
| `pnpm db:studio` | Buka Prisma Studio |

## Fitur

**Alur PMBOK (§7.2)** — kelima tahap lengkap dengan gating & approval:
- **Initiating**: form charter, deliverable, stakeholder, risiko, checklist persetujuan → submit/approve.
- **Planning**: WBS + RAB (penomoran & rollup anggaran otomatis, baseline versi), impor/ekspor CSV, kontrol overbudget (persetujuan Finance/Admin).
- **Executing**: progres per kegiatan, biaya aktual, penyelesaian.
- **Monitoring & Controlling**: QC per item, dashboard EVM (SPI/CPI), temuan & remediasi.
- **Closing**: checklist dokumen (template dapat dikonfigurasi Admin), evaluasi, laporan penutupan (cetak/PDF), penutupan proyek.

**Master Data (§7.1)**: CRUD generik untuk proyek, kontak, akun, produk, satuan, gudang, checklist, template dokumen closing — kode proyek otomatis `PRJ-YYYY-NNNNN`, multi-lokasi berbobot, state machine status.

**Platform**:
- **Auth JWT** (scrypt + HS256, tanpa library eksternal) dengan fallback `x-user-id` untuk dev.
- **RBAC live** — matriks izin per peran (§6) tersimpan di DB, di-cache, dapat diedit Admin; data-scope (PM/Supervisor/QC hanya proyek yang ditugaskan).
- **Notifikasi realtime** via Server-Sent Events (approval, QC gagal, overbudget, penutupan).
- **Pencarian global**, **Dashboard portofolio**, **Laporan** (+ekspor CSV), unggah berkas.
- **Audit trail** — per-proyek (tab Riwayat) & **global lintas-proyek** (Admin, +ekspor CSV).
- **Aksesibilitas** (dialog/label ARIA) & **test otomatis** (Vitest, dijalankan di CI).

## Status

✅ **MVP lengkap + penguatan.** Seluruh alur PMBOK (§7) dan Master Data (§7.1) selesai, ditambah auth JWT, RBAC live, notifikasi realtime, audit global, uji otomatis, dan CI. Lihat riwayat commit untuk detail per fitur.
