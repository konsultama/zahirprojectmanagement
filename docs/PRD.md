# PRD — Aplikasi Project Management

| | |
|---|---|
| **Nama Produk** | Project Management (kode internal: PROJ) |
| **Versi Dokumen** | 1.0 (Draft) |
| **Tanggal** | 15 Juli 2026 |
| **Status** | Untuk direview |
| **Ruang Lingkup Rilis** | MVP — Modul Master Data Project & Modul Master Data Tahapan |

---

## 1. Ringkasan Eksekutif

Aplikasi Project Management adalah modul yang mengelola siklus hidup proyek dari inisiasi sampai penutupan, mengikuti lima tahapan standar PMBOK: **Initiating → Planning → Executing → Monitoring & Controlling → Closing**.

Nilai inti produk terletak pada **satu sumber kebenaran (single source of truth)**: rincian kegiatan yang dibuat di tahap Planning menjadi tulang punggung yang dipakai ulang oleh Executing (realisasi progres & biaya) dan Monitoring & Controlling (QC). Tidak ada input ganda, dan setiap angka progres maupun anggaran terpakai di level proyek dapat ditelusuri sampai ke sub-kegiatan paling bawah.

---

## 2. Latar Belakang & Masalah

| # | Masalah saat ini | Dampak |
|---|---|---|
| P1 | Rencana anggaran & jadwal tersebar di spreadsheet per-PIC | Versi berbeda-beda, angka tidak pernah sama |
| P2 | Realisasi pekerjaan dilaporkan terpisah dari rencananya | Tidak bisa membandingkan rencana vs realisasi tanpa rekap manual |
| P3 | Progres proyek diisi manual berdasarkan perkiraan | Angka progres subjektif dan sering menyesatkan |
| P4 | Overbudget baru ketahuan di akhir proyek | Tidak ada ruang untuk koreksi |
| P5 | Dokumen serah terima tidak terlacak | Proyek "selesai" tapi administrasi menggantung berbulan-bulan |
| P6 | Proyek multi-lokasi diperlakukan sebagai proyek terpisah | Sulit melihat gambaran utuh satu kontrak |

---

## 3. Tujuan & Metrik Keberhasilan

### 3.1 Tujuan Produk
1. Menyediakan basis data proyek terpusat yang mencakup proyek multi-lokasi.
2. Menegakkan alur kerja berbasis tahapan tanpa mengorbankan fleksibilitas lapangan.
3. Membuat progres dan anggaran terpakai **terhitung otomatis**, bukan diketik manual.
4. Memberi peringatan overbudget di titik pengeluaran, bukan di akhir proyek.
5. Memastikan penutupan proyek disertai kelengkapan dokumen yang terverifikasi.

### 3.2 Metrik Keberhasilan (diukur 90 hari setelah rilis)

| Metrik | Baseline | Target |
|---|---|---|
| Proyek aktif yang dikelola di aplikasi (bukan spreadsheet) | 0% | ≥ 80% |
| Waktu penyusunan RAB satu proyek | ~3 hari | ≤ 1 hari |
| Selisih progres laporan vs progres terhitung | ±20% | ≤ ±5% |
| Deteksi overbudget sebelum realisasi 80% | ~10% kasus | ≥ 90% kasus |
| Proyek closed dengan dokumen 100% lengkap | ~40% | ≥ 95% |
| Waktu tutup proyek setelah pekerjaan fisik selesai | ~45 hari | ≤ 14 hari |

---

## 4. Ruang Lingkup

### 4.1 Termasuk (MVP)
- Modul Master Data Project (CRUD, multi-lokasi, status, progres).
- Modul Master Data Tahapan dengan 5 tahapan dan seluruh perilaku yang dirinci di §7.
- Perhitungan rollup progres & anggaran otomatis.
- Peran pengguna & hak akses dasar (§6).
- Audit trail perubahan data.
- Ekspor daftar proyek & RAB ke Excel/PDF.

### 4.2 Tidak Termasuk (MVP)
- Gantt chart interaktif dan critical path (dijadwalkan Fase 2).
- Timesheet / absensi harian tenaga kerja.
- Purchase Order & integrasi pembayaran ke vendor (Fase 2, integrasi ke modul Pembelian).
- Aplikasi mobile native (web responsif dulu).
- Manajemen portofolio lintas-proyek / kapasitas sumber daya global.
- Kolaborasi real-time (komentar, mention) — Fase 3.

---

## 5. Persona

| Persona | Peran | Kebutuhan utama |
|---|---|---|
| **Andi — Project Manager** | Penanggung jawab proyek | Melihat status semua proyeknya, menyusun rencana, tahu lebih awal kalau ada yang melenceng |
| **Rina — Admin Proyek** | Input data harian | Form yang cepat, tidak mengulang input yang sudah ada di rencana |
| **Bagus — Site Supervisor** | Pelaksana lapangan | Update progres per kegiatan dari lokasi, tandai selesai |
| **Sari — QC / Pengawas** | Kontrol kualitas | Mengisi hasil pemeriksaan per kegiatan, menolak yang belum layak |
| **Dedi — Direktur / Manajemen** | Pemantau | Dashboard ringkas: progres, serapan anggaran, proyek bermasalah |
| **Fitri — Finance** | Kontrol anggaran | Melihat serapan anggaran & kasus overbudget beserta alasannya |

---

## 6. Peran & Hak Akses (RBAC)

| Aksi | Admin | PM | Supervisor | QC | Finance | Viewer |
|---|:--:|:--:|:--:|:--:|:--:|:--:|
| Buat/ubah Master Project | ✅ | ✅ | — | — | — | — |
| Hapus Project | ✅ | — | — | — | — | — |
| Isi tahap Initiating | ✅ | ✅ | — | — | — | — |
| Approve Initiating | ✅ | — | — | — | — | — |
| Susun Planning (RAB) | ✅ | ✅ | — | — | — | — |
| Approve Planning | ✅ | — | — | — | ✅ | — |
| Setujui overbudget | ✅ | — | — | — | ✅ | — |
| Update progres Executing | ✅ | ✅ | ✅ | — | — | — |
| Isi kolom QC (Monitoring) | ✅ | — | — | ✅ | — | — |
| Isi & submit Closing | ✅ | ✅ | — | — | — | — |
| Approve Closing | ✅ | — | — | — | — | — |
| Lihat proyek | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

**Aturan cakupan data:** PM, Supervisor, dan QC hanya melihat proyek tempat mereka ditugaskan. Admin, Finance, dan Direktur melihat semua proyek.

---

## 7. Kebutuhan Fungsional

### 7.1 Modul Master Data Project

#### 7.1.1 Spesifikasi Field

| Field | Tipe | Wajib | Aturan |
|---|---|:--:|---|
| Kode Proyek | Text (auto) | ✅ | Format `PRJ-YYYY-NNNNN`, auto-increment, unik, read-only, tidak berubah selamanya |
| Nama Proyek | Text (150) | ✅ | Unik per client; min. 3 karakter |
| Deskripsi | Rich text (2000) | — | Mendukung bold/italic/list |
| Tanggal Mulai (Start Date) | Date | ✅ | — |
| Tanggal Selesai (Finish Date) | Date | ✅ | Harus ≥ Tanggal Mulai |
| Persentase Progress | Decimal (0–100) | ✅ | **Read-only**, terhitung otomatis (lihat §8.1). Hanya Admin yang boleh override manual, wajib disertai alasan |
| Status | Enum | ✅ | Lihat §7.1.3 |
| Lokasi | Multi-entry | ✅ | Minimal 1 lokasi (lihat §7.1.2) |
| Nama Client | Relasi → Contact | ✅ | Dropdown search-as-you-type dari data Contact |
| Penanggung Jawab (PIC) | Relasi → User | ✅ | Dropdown search-as-you-type; boleh lebih dari satu (1 utama + N pendamping) |
| Nilai Kontrak | Currency | — | Untuk pembanding total anggaran |
| Tanggal Selesai Aktual | Date | — | Terisi otomatis saat status → `Closed` |
| Lampiran | File[] | — | Maks. 10 MB/file; pdf, doc(x), xls(x), jpg, png |

#### 7.1.2 Multi Lokasi
- Satu proyek memiliki **satu atau lebih** lokasi (relasi 1:N ke tabel `project_location`).
- Field per lokasi: Nama Lokasi (wajib), Alamat, Kota/Kabupaten, Provinsi, Koordinat (lat/long, opsional), Bobot Lokasi (%), PIC Lokasi (opsional).
- **Bobot Lokasi**: total seluruh bobot harus tepat **100%**. Jika pengguna tidak mengisi, sistem membagi rata otomatis. Bobot dipakai untuk menghitung progres proyek dari progres tiap lokasi.
- Setiap kegiatan di Planning **wajib** ditautkan ke tepat satu lokasi.
- Lokasi tidak dapat dihapus jika sudah ada kegiatan yang menautinya — sistem menawarkan pemindahan kegiatan ke lokasi lain terlebih dahulu.
- Daftar lokasi ditampilkan sebagai tabel yang bisa di-inline-edit; opsional tampilan peta (Fase 2).

#### 7.1.3 Status & Siklus Hidup

| Status | Arti | Transisi berikutnya yang diizinkan |
|---|---|---|
| `Draft` | Baru dibuat, belum disetujui | → Active, → Cancelled |
| `Active` | Berjalan | → On Hold, → Completed, → Cancelled |
| `On Hold` | Ditangguhkan sementara | → Active, → Cancelled |
| `Completed` | Pekerjaan fisik selesai, administrasi berjalan | → Closed, → Active (reopen, oleh Admin) |
| `Closed` | Tutup penuh, data read-only | → Active (reopen, Admin + alasan wajib) |
| `Cancelled` | Dibatalkan | → Draft (Admin + alasan wajib) |

**Aturan transisi:**
- `Draft → Active` hanya jika tahap **Initiating** sudah berstatus *Approved*.
- `Active → Completed` hanya jika seluruh kegiatan Executing berstatus selesai **dan** seluruh item QC yang wajib sudah `Passed`. Jika belum, sistem menampilkan daftar item yang menahan.
- `Completed → Closed` hanya jika tahap **Closing** sudah *Approved* dan dokumen wajib 100% lengkap.
- Perubahan status apa pun tercatat di audit trail: siapa, kapan, dari status apa ke apa, dan alasannya.
- Status `Closed` membuat seluruh data proyek read-only kecuali dibuka kembali oleh Admin.

#### 7.1.4 Daftar Proyek (List View)
- Kolom default: Kode, Nama Proyek, Client, PIC, Lokasi (badge "+N" jika >1), Tanggal Mulai, Tanggal Selesai, Progress (progress bar + %), Serapan Anggaran (%), Status (badge berwarna).
- Filter: Status, Client, PIC, Rentang tanggal, Lokasi/Provinsi, Tahapan aktif, Flag overbudget.
- Pencarian bebas: kode, nama proyek, nama client.
- Sortir semua kolom. **Default sortir: Kode Proyek** (nilai tidak berubah, sehingga posisi baris stabil saat operasi massal).
- Aksi per baris via menu titik tiga (⋮): Detail, Edit, Duplikat, Hapus, Ubah Status.
- Bulk action: ubah status, ekspor terpilih.
- Paginasi server-side, default 25 baris/halaman.

#### 7.1.5 Detail Proyek
Halaman detail memakai layout tab:
`Ringkasan | Lokasi | Initiating | Planning | Executing | Monitoring & Controlling | Closing | Dokumen | Riwayat`

Header lengket (sticky) selalu menampilkan: Kode & Nama, Client, PIC, Status, Progress bar, Serapan Anggaran, sisa hari terhadap Finish Date.

#### 7.1.6 User Story
- **US-P1** — Sebagai PM, saya ingin membuat proyek baru dengan beberapa lokasi sekaligus, agar satu kontrak tidak perlu dipecah jadi beberapa entri.
  - *AC1*: Menyimpan tanpa mengisi minimal satu lokasi ditolak dengan pesan error yang jelas di dekat field terkait.
  - *AC2*: Total bobot lokasi ≠ 100% menampilkan peringatan dan tombol "Bagi rata".
  - *AC3*: Setelah simpan berhasil, muncul notifikasi sukses dan pengguna diarahkan ke halaman detail proyek.
- **US-P2** — Sebagai Direktur, saya ingin melihat progres & serapan anggaran semua proyek dalam satu daftar, agar bisa tahu mana yang bermasalah tanpa bertanya ke PM.
  - *AC1*: Progres di daftar sama persis dengan hasil rollup dari kegiatan.
  - *AC2*: Proyek overbudget atau terlambat diberi penanda visual yang jelas.

---

### 7.2 Modul Master Data Tahapan

#### 7.2.1 Konsep Umum
- Setiap proyek otomatis memiliki 5 record tahapan saat dibuat, dengan urutan tetap.
- Setiap tahapan punya: Status (`Not Started` / `In Progress` / `Submitted` / `Approved` / `Rejected`), % penyelesaian tahapan, PIC, tanggal mulai & selesai aktual, catatan.
- **Gating (bukan penguncian kaku):**
  - Planning **tidak bisa** di-*approve* sebelum Initiating *Approved*.
  - Executing & Monitoring **tidak bisa** dimulai sebelum Planning *Approved* — karena keduanya bergantung penuh pada data Planning.
  - Closing **tidak bisa** di-*submit* sebelum Executing dan Monitoring selesai.
  - Namun tahapan tetap boleh **diisi** (draft) secara paralel; yang dikunci adalah approval-nya. Ini penting agar tim tidak terhambat menunggu tanda tangan.
- Perubahan pada tahapan yang sudah *Approved* memerlukan dialog **"Alasan Ubah"** dengan field alasan yang wajib diisi sebelum tombol *Proses* aktif. Alasan tersimpan di audit trail.
- Progress bar 5-langkah ditampilkan di header detail proyek.

---

#### 7.2.2 Tahap 1 — Initiating (Inisiasi)
**Tujuan:** menentukan tujuan, ruang lingkup, dan menyetujui proyek.
**Bentuk UI:** input form + checklist.

**A. Form Inisiasi**

| Field | Tipe | Wajib | Catatan |
|---|---|:--:|---|
| Tujuan Proyek (Objective) | Textarea (1000) | ✅ | — |
| Ruang Lingkup — Termasuk (In Scope) | Rich text / list | ✅ | Item bisa ditambah baris per baris |
| Ruang Lingkup — Tidak Termasuk (Out of Scope) | Rich text / list | — | Mencegah scope creep |
| Deliverable Utama | List | ✅ | Nama + deskripsi + target tanggal |
| Stakeholder | Tabel | ✅ | Nama, Peran, Kontak, Tingkat Pengaruh (High/Med/Low) |
| Asumsi | List | — | — |
| Batasan (Constraint) | List | — | — |
| Estimasi Anggaran Awal | Currency | ✅ | Menjadi pembanding total anggaran Planning |
| Estimasi Durasi | Number (hari) | ✅ | — |
| Risiko Awal | Tabel | — | Deskripsi, Dampak, Kemungkinan |
| Sponsor / Approver | Relasi → User | ✅ | — |

**B. Checklist Persetujuan**
Checklist dapat dikonfigurasi Admin (template default disediakan), masing-masing item: teks, wajib/opsional, penanggung jawab, tanggal centang, catatan, lampiran opsional.

Template default:
1. ☐ Tujuan & ruang lingkup disepakati bersama client
2. ☐ Stakeholder teridentifikasi lengkap
3. ☐ Estimasi anggaran awal disetujui
4. ☐ Dokumen kontrak / SPK tersedia *(wajib lampiran)*
5. ☐ Project charter ditandatangani *(wajib lampiran)*
6. ☐ Sumber daya inti tersedia
7. ☐ Risiko awal diidentifikasi

**Aturan:**
- Tombol **Submit untuk Persetujuan** aktif hanya jika seluruh field wajib terisi **dan** seluruh checklist wajib tercentang.
- Indikator progres checklist tampil sebagai `5/7 selesai` + progress bar.
- Setelah *Approved*: form menjadi read-only, status proyek otomatis dapat naik `Draft → Active`, dan tahap Planning dibuka.
- Approver dapat menolak (*Rejected*) dengan alasan wajib; status kembali ke `In Progress` dan alasan penolakan tampil di banner atas form.

**US-I1** — Sebagai PM, saya ingin tidak bisa memulai proyek sebelum charter disetujui, agar tidak ada pekerjaan berjalan tanpa dasar.
- *AC1*: Tombol Submit disabled dengan tooltip yang menyebutkan item apa saja yang belum lengkap.
- *AC2*: Percobaan mengubah status proyek ke `Active` sebelum Initiating approved ditolak beserta penjelasannya.

---

#### 7.2.3 Tahap 2 — Planning (Perencanaan)
**Tujuan:** membuat jadwal, anggaran, dan alokasi sumber daya secara detail.
**Bentuk UI:** rincian kegiatan & sub-kegiatan **berjenjang (hierarki)**, tiap baris bertipe **Task** atau **Material**, dengan input Qty, Nilai Anggaran, dan Total Anggaran; opsi anggaran boleh overbudget.

**A. Struktur Berjenjang (WBS)**
- Kedalaman maksimum **4 level**: Kegiatan → Sub-kegiatan → Sub-sub-kegiatan → Item.
- Penomoran WBS otomatis: `1`, `1.1`, `1.1.1`, `1.1.1.1`. Nomor tersusun ulang otomatis saat baris dipindahkan.
- Tampilan tabel pohon (tree table) yang bisa expand/collapse, drag-and-drop untuk memindah & mengubah level baris, dengan tombol indent/outdent sebagai alternatif.
- **Baris induk (parent)** = agregator: Qty dan Nilai Anggaran-nya read-only, terisi dari penjumlahan anak-anaknya.
- **Baris daun (leaf)** = tempat input sebenarnya.

**B. Field per Baris**

| Field | Tipe | Wajib | Catatan |
|---|---|:--:|---|
| No. WBS | Auto | ✅ | Read-only |
| Nama Kegiatan | Text (200) | ✅ | — |
| Tipe | Enum: `Task` \| `Material` | ✅ | Hanya pada baris daun; baris induk bertipe `Group` |
| Lokasi | Relasi → project_location | ✅ | Diwarisi dari induk, boleh ditimpa |
| Satuan (UoM) | Enum | ✅ | Task: hari/jam/ls/titik; Material: pcs/kg/m/m²/m³/unit/dus |
| Qty | Decimal (>0) | ✅ | Baris daun saja |
| Nilai Anggaran (harga satuan) | Currency (≥0) | ✅ | Baris daun saja |
| **Total Anggaran** | Currency | ✅ | **Terhitung** = Qty × Nilai Anggaran. Read-only |
| Tanggal Mulai | Date | ✅ | Harus dalam rentang tanggal proyek |
| Tanggal Selesai | Date | ✅ | ≥ Tanggal Mulai |
| Bobot (%) | Decimal | — | Default proporsional terhadap Total Anggaran; boleh diatur manual |
| PIC | Relasi → User | — | — |
| Vendor / Pemasok | Relasi → Contact | — | Relevan terutama untuk Material |
| Predecessor | Relasi → baris lain | — | Untuk Gantt di Fase 2 |
| Catatan | Text (500) | — | — |

**C. Perilaku Input (kritis)**
- Field **Qty** dan **Nilai Anggaran** bisa sudah terisi nilai default (mis. dari katalog produk saat memilih Material). Field-field ini **wajib menyeleksi seluruh isi saat difokuskan** (auto-select-all on focus). Ini mencegah kelas bug klasik di mana mengetik `5` pada field berisi `10` menghasilkan `50` alih-alih `5`.
- Input mata uang menampilkan pemisah ribuan saat blur, angka mentah saat fokus.
- Baris tersimpan otomatis saat blur (inline edit), dengan indikator status tersimpan per baris.

**D. Anggaran & Overbudget**
- **Total Anggaran Proyek** = Σ Total Anggaran seluruh baris daun.
- Dibandingkan terhadap **Estimasi Anggaran Awal** (dari Initiating) dan **Nilai Kontrak** (dari Master Project).
- Panel ringkasan lengket di atas tabel: Estimasi Awal | Total Rencana | Selisih | % terhadap Estimasi Awal.
- **Opsi "Izinkan Overbudget"** (toggle di level proyek, default: **OFF**):
  - **OFF** — Total Rencana > Estimasi Awal ⇒ Planning **tidak bisa di-submit**. Pesan error menyebutkan nilai kelebihannya.
  - **ON** — Planning boleh melebihi Estimasi Awal, dengan konsekuensi:
    - Sistem menampilkan banner peringatan permanen di halaman Planning.
    - Wajib mengisi field **Alasan Overbudget** (min. 20 karakter).
    - Wajib **Batas Toleransi Overbudget** (%, mis. 10%) — melebihi batas ini tetap diblokir.
    - Approval Planning naik satu tingkat: memerlukan persetujuan **Finance** selain Admin.
    - Proyek diberi flag `overbudget` yang tampil di daftar proyek dan dashboard.
  - Toggle ini hanya boleh diubah oleh Admin/Finance, dan perubahannya tercatat di audit trail.

**E. Aksi Tambahan**
- Impor RAB dari Excel dengan template baku + pratinjau validasi sebelum commit.
- Ekspor RAB ke Excel/PDF.
- Simpan sebagai Template Planning; buat Planning baru dari template.
- Duplikat baris beserta seluruh anaknya.
- Baseline: saat Planning *Approved*, sistem menyimpan snapshot sebagai **Baseline v1**. Perubahan setelahnya membuat Baseline v2, dst., agar perbandingan rencana-vs-realisasi tetap adil.

**US-PL1** — Sebagai PM, saya ingin menyusun RAB berjenjang dan totalnya terhitung sendiri, agar tidak ada salah hitung manual.
- *AC1*: Mengubah Qty pada baris daun langsung memperbarui total seluruh baris induk di atasnya sampai level 1 dan panel ringkasan.
- *AC2*: Baris induk tidak bisa diisi Qty/Nilai Anggaran secara langsung.
- *AC3*: Mengetik nilai baru pada field Qty yang sudah terisi menghasilkan tepat nilai yang diketik, bukan gabungan angka.

**US-PL2** — Sebagai Finance, saya ingin overbudget tidak bisa lewat begitu saja tanpa alasan dan persetujuan.
- *AC1*: Dengan toggle OFF, submit Planning yang melebihi estimasi ditolak.
- *AC2*: Dengan toggle ON tanpa alasan terisi, submit ditolak.
- *AC3*: Melebihi batas toleransi tetap ditolak meski toggle ON.

---

#### 7.2.4 Tahap 3 — Executing (Pelaksanaan)
**Tujuan:** menjalankan rencana serta mengelola tim dan vendor.
**Bentuk UI:** list yang **terhubung dengan Planning**, berisi persentase pengerjaan, anggaran terpakai, dan checklist selesai.

**A. Sumber Data**
- Daftar Executing **tidak bisa dibuat manual**. Ia adalah cermin 1:1 dari baris daun Planning yang sudah di-*approve*.
- Baris baru di Planning otomatis muncul di Executing. Baris yang dihapus di Planning ditandai `Cancelled` di Executing jika sudah pernah ada realisasinya (data realisasi tidak pernah dihapus diam-diam).

**B. Kolom List Executing**

| Kolom | Sumber | Editable |
|---|---|:--:|
| No. WBS | Planning | — |
| Nama Kegiatan | Planning | — |
| Tipe (Task/Material) | Planning | — |
| Lokasi | Planning | — |
| Qty Rencana | Planning | — |
| Anggaran Rencana | Planning | — |
| **Qty Realisasi** | Input | ✅ |
| **% Pengerjaan** | Input / terhitung | ✅ |
| **Anggaran Terpakai** | Input (akumulasi realisasi biaya) | ✅ |
| **Sisa Anggaran** | Terhitung = Rencana − Terpakai | — |
| **Varians (%)** | Terhitung | — |
| **☑ Selesai** | Checkbox | ✅ |
| PIC / Vendor | Planning, boleh ditimpa | ✅ |
| Tanggal Realisasi Mulai/Selesai | Input | ✅ |
| Status | Enum: `Not Started` / `In Progress` / `Done` / `Blocked` / `Cancelled` | ✅ |

**C. Aturan Perilaku**
- **% Pengerjaan** diisi 0–100.
  - Untuk tipe `Material`: bisa dihitung otomatis = (Qty Realisasi ÷ Qty Rencana) × 100, dibatasi maksimum 100.
  - Untuk tipe `Task`: diisi manual oleh Supervisor/PM.
- **Checkbox Selesai** dan % Pengerjaan saling terikat:
  - Mencentang Selesai ⇒ % Pengerjaan otomatis 100.
  - % Pengerjaan < 100 ⇒ checkbox Selesai tidak bisa dicentang, kecuali disertai alasan (mis. pekerjaan dihentikan lebih awal atas kesepakatan).
  - Menghapus centang Selesai memerlukan alasan wajib jika baris sudah pernah lolos QC.
- **Anggaran Terpakai** diisi lewat panel **Catatan Realisasi Biaya** per baris (tanggal, uraian, nilai, no. bukti, lampiran) — bukan angka gelondongan. Anggaran Terpakai = Σ catatan realisasi.
- **Peringatan overbudget per baris:**
  - Terpakai > Rencana ⇒ baris disorot merah + ikon peringatan.
  - Jika toggle overbudget proyek **OFF**, penyimpanan realisasi yang melampaui anggaran baris **diblokir** sampai Planning direvisi & disetujui ulang.
  - Jika **ON**, penyimpanan diizinkan tapi wajib mengisi alasan dan tetap dibatasi ambang toleransi.
- Update dapat dilakukan massal (bulk update % untuk baris terpilih) dan lewat tampilan yang ramah layar kecil untuk pemakaian di lapangan.

**D. Perhitungan Rollup**
Lihat §8.1 dan §8.2.

**US-E1** — Sebagai Supervisor, saya ingin update progres langsung di baris kegiatan yang sudah ada, tanpa mengetik ulang rencananya.
- *AC1*: Semua kolom rencana tampil read-only berdampingan dengan kolom realisasi.
- *AC2*: Perubahan % pengerjaan langsung memperbarui progres proyek di header.

**US-E2** — Sebagai Finance, saya ingin biaya yang melebihi rencana tidak bisa dimasukkan diam-diam.
- *AC1*: Realisasi melebihi anggaran baris memicu blokir atau permintaan alasan sesuai setelan toggle.
- *AC2*: Setiap catatan realisasi biaya menyimpan no. bukti dan lampiran.

---

#### 7.2.5 Tahap 4 — Monitoring & Controlling (Pengawasan)
**Tujuan:** memastikan progres sesuai jalur dan mengelola risiko.
**Bentuk UI:** list yang **terhubung dengan Planning** untuk update kolom Controlling/QC.

**A. List QC**
Sama seperti Executing, daftar ini adalah cermin dari baris Planning yang sudah approved — tidak ada input baris manual.

| Kolom | Sumber | Editable |
|---|---|:--:|
| No. WBS, Nama Kegiatan, Lokasi | Planning | — |
| % Pengerjaan | Executing | — |
| Status Executing | Executing | — |
| **Status QC** | Enum: `Belum Diperiksa` / `Passed` / `Failed` / `Perlu Perbaikan` / `Waived` | ✅ |
| **Tanggal Pemeriksaan** | Date | ✅ |
| **Pemeriksa (QC)** | Relasi → User | ✅ (auto-isi pengguna aktif) |
| **Catatan QC / Temuan** | Textarea | ✅ (wajib jika Failed / Perlu Perbaikan) |
| **Lampiran Bukti** | File[] | ✅ (wajib jika Failed) |
| **Tindakan Korektif** | Textarea | ✅ (wajib jika Failed) |
| **Batas Waktu Perbaikan** | Date | ✅ (wajib jika Perlu Perbaikan) |
| **Status Perbaikan** | Enum: `Open` / `In Progress` / `Closed` | ✅ |
| **Wajib QC?** | Boolean | ✅ (diatur di Planning) |

**B. Aturan Perilaku**
- Baris hanya dapat diperiksa jika % Pengerjaan ≥ 100 atau statusnya `Done`. Baris di bawah itu tampil tapi kolom QC-nya disabled.
- `Failed` ⇒ baris terkait di Executing otomatis kembali ke status `In Progress` dan centang Selesai dilepas, dengan notifikasi ke PIC baris tersebut.
- `Waived` hanya boleh dipilih Admin, wajib alasan.
- Proyek tidak bisa berstatus `Completed` selama masih ada baris **Wajib QC** yang belum `Passed`/`Waived`, atau masih ada temuan berstatus `Open`.

**C. Register Risiko (sub-tab)**

| Field | Tipe |
|---|---|
| Kode Risiko | Auto (`RSK-NNN`) |
| Deskripsi Risiko | Textarea (wajib) |
| Kategori | Enum: Biaya / Jadwal / Mutu / K3 / Eksternal / SDM |
| Kemungkinan | 1–5 |
| Dampak | 1–5 |
| **Skor Risiko** | Terhitung = Kemungkinan × Dampak; badge Hijau (1–6) / Kuning (8–12) / Merah (15–25) |
| Strategi Mitigasi | Enum: Avoid / Mitigate / Transfer / Accept |
| Rencana Mitigasi | Textarea |
| Owner Risiko | Relasi → User |
| Status | Open / Mitigated / Closed / Occurred |
| Kegiatan Terdampak | Relasi → baris Planning (opsional, multi) |

**D. Dashboard Kontrol (sub-tab)**
- Kurva-S: rencana kumulatif vs realisasi kumulatif (berbasis bobot & tanggal).
- Indikator: **SPI** = % Progres Aktual ÷ % Progres Rencana; **CPI** = (% Progres Aktual × Total Anggaran) ÷ Anggaran Terpakai.
- Rambu: SPI/CPI < 0,9 = merah; 0,9–1,0 = kuning; ≥ 1,0 = hijau.
- Daftar 5 kegiatan paling terlambat & 5 paling boros.
- Ringkasan QC: jumlah Passed / Failed / Belum Diperiksa.

**US-M1** — Sebagai QC, saya ingin menandai kegiatan yang tidak lolos pemeriksaan dan memaksa pekerjaan itu diulang.
- *AC1*: Menyimpan `Failed` tanpa catatan temuan & tindakan korektif ditolak.
- *AC2*: Setelah `Failed`, baris di Executing kembali `In Progress` dan progres proyek terhitung ulang turun.

---

#### 7.2.6 Tahap 5 — Closing (Penutupan)
**Tujuan:** menyelesaikan kontrak, serah terima hasil, dan evaluasi akhir.
**Bentuk UI:** opsi update Master Data Project + inputan kelengkapan dokumen.

**A. Panel Update Master Data Project**
Panel ini menampilkan nilai saat ini berdampingan dengan field yang bisa diperbarui saat penutupan, tanpa perlu keluar dari tahap Closing:

| Field | Perilaku |
|---|---|
| Status | Diusulkan `Completed` → `Closed` |
| Tanggal Selesai Aktual | Wajib; default hari ini |
| Persentase Progress | Diusulkan 100%; nilai < 100 wajib disertai alasan |
| Nilai Kontrak Akhir | Boleh diperbarui (mis. ada addendum) |
| Deskripsi | Boleh diperbarui |
| PIC | Boleh dialihkan ke PIC pemeliharaan |
| Lokasi | Boleh ditandai selesai per lokasi |

Setiap perubahan lewat panel ini menulis ke Master Data Project yang sama (bukan salinan), tercatat di audit trail, dan menampilkan diff "sebelum → sesudah" sebelum dikonfirmasi.

**B. Checklist Kelengkapan Dokumen**
Tabel dokumen yang dapat dikonfigurasi Admin per tipe proyek. Field per baris: Nama Dokumen, Wajib (Y/N), Status (`Belum` / `Ada` / `Terverifikasi` / `Tidak Berlaku`), File lampiran, Nomor Dokumen, Tanggal Dokumen, Diverifikasi Oleh, Tanggal Verifikasi, Catatan.

Template default:
1. Berita Acara Serah Terima (BAST) — **wajib**
2. Berita Acara Pemeriksaan Pekerjaan — **wajib**
3. Laporan Akhir Proyek — **wajib**
4. As-Built Drawing / Dokumentasi Hasil — wajib (bersyarat)
5. Foto Dokumentasi 0% / 50% / 100% — **wajib**
6. Sertifikat Garansi — opsional
7. Manual & Panduan Operasional — opsional
8. Laporan Realisasi Anggaran Akhir — **wajib**
9. Invoice Final & Bukti Pembayaran — **wajib**
10. Surat Penyelesaian Kontrak — **wajib**
11. Evaluasi Kepuasan Client — opsional
12. Dokumen Penutupan Vendor/Subkon — bersyarat (jika ada vendor)

Indikator kelengkapan: `9/10 dokumen wajib lengkap` + progress bar. Dokumen wajib berstatus `Tidak Berlaku` memerlukan alasan dan persetujuan Admin.

**C. Evaluasi Akhir (sub-panel)**
- Ringkasan otomatis: Anggaran Rencana vs Terpakai vs Varians; Jadwal Rencana vs Aktual vs Selisih hari; Jumlah temuan QC; Jumlah risiko yang benar-benar terjadi.
- Input: Lessons Learned (apa yang berjalan baik / apa yang perlu diperbaiki), Penilaian Kinerja Vendor (1–5 + catatan), Skor Kepuasan Client (1–5 + catatan).

**D. Aturan Penutupan**
- Tombol **Submit Closing** aktif hanya jika: seluruh dokumen **wajib** berstatus `Terverifikasi` atau `Tidak Berlaku` (dengan alasan), seluruh kegiatan Executing `Done`/`Cancelled`, seluruh QC wajib `Passed`/`Waived`, dan Lessons Learned terisi.
- Approver (Admin) melihat ringkasan penutupan lalu menyetujui atau menolak dengan alasan.
- Setelah *Approved*: status proyek → `Closed`, seluruh tab menjadi read-only, dan sistem menghasilkan **Project Closure Report** (PDF) yang dapat diunduh.
- Reopen hanya oleh Admin, dengan alasan wajib, dan tercatat.

**US-C1** — Sebagai Admin, saya ingin proyek tidak bisa ditutup selama dokumen wajib belum lengkap.
- *AC1*: Tombol Submit disabled dengan daftar hal yang menahan ditampilkan eksplisit.
- *AC2*: Setelah approve, seluruh form proyek read-only dan Closure Report tersedia.

**US-C2** — Sebagai PM, saya ingin memperbarui data master proyek langsung dari tahap Closing.
- *AC1*: Perubahan tercermin di Master Data Project & daftar proyek tanpa perlu edit terpisah.
- *AC2*: Sistem menampilkan diff sebelum konfirmasi dan mencatatnya di riwayat.

---

## 8. Aturan Bisnis & Formula

### 8.1 Perhitungan Progres

```
# Level baris (leaf)
progres_baris = % Pengerjaan (0–100)

# Bobot baris (default, jika tidak diatur manual)
bobot_baris = Total Anggaran baris ÷ Total Anggaran seluruh baris dalam lingkupnya × 100

# Level induk (rollup rekursif, bottom-up)
progres_induk = Σ (progres_anak × bobot_anak) ÷ Σ bobot_anak

# Level lokasi
progres_lokasi = Σ (progres_baris × bobot_baris) untuk semua baris di lokasi tsb

# Level proyek
progres_proyek = Σ (progres_lokasi × bobot_lokasi) ÷ 100
```
- Baris berstatus `Cancelled` dikeluarkan dari perhitungan dan bobotnya dinormalisasi ulang.
- Progres proyek dihitung ulang secara asinkron setiap ada perubahan realisasi; nilai hasil disimpan (materialized) agar daftar proyek tetap cepat.
- Progres dibulatkan 2 desimal, ditampilkan tanpa desimal di daftar.

### 8.2 Perhitungan Anggaran

```
total_anggaran_baris    = Qty × Nilai Anggaran
total_anggaran_proyek   = Σ total_anggaran_baris (semua leaf, kecuali Cancelled)
anggaran_terpakai_baris = Σ catatan realisasi biaya baris tsb
anggaran_terpakai_proyek= Σ anggaran_terpakai_baris
sisa_anggaran           = total_anggaran − anggaran_terpakai
varians_anggaran (%)    = (anggaran_terpakai − total_anggaran) ÷ total_anggaran × 100
serapan_anggaran (%)    = anggaran_terpakai ÷ total_anggaran × 100
```

### 8.3 Matriks Aturan Overbudget

| Kondisi | Toggle OFF | Toggle ON (dalam toleransi) | Toggle ON (di luar toleransi) |
|---|---|---|---|
| Planning > Estimasi Awal | Submit diblokir | Boleh + alasan wajib + approval Finance | Diblokir |
| Realisasi baris > Anggaran baris | Simpan diblokir | Boleh + alasan wajib + baris disorot merah | Diblokir |
| Realisasi proyek > Total Anggaran | Simpan diblokir | Boleh + flag `overbudget` + notifikasi Finance | Diblokir |

### 8.4 Aturan Umum
- **BR-1** — Kode Proyek dan No. WBS tidak pernah berubah setelah dibuat (kecuali WBS tersusun ulang karena pemindahan struktur).
- **BR-2** — Data proyek `Closed` bersifat read-only sampai dibuka kembali oleh Admin.
- **BR-3** — Setiap perubahan pada data yang sudah *Approved* memerlukan alasan wajib.
- **BR-4** — Penghapusan bersifat soft delete; data tidak pernah hilang secara fisik. Penghapusan permanen tidak dilakukan sistem secara otomatis.
- **BR-5** — Tanggal kegiatan tidak boleh keluar dari rentang tanggal proyek; jika perlu, sistem menawarkan perluasan tanggal proyek (memerlukan alasan).
- **BR-6** — Satu baris Planning hanya boleh ditautkan ke satu lokasi.
- **BR-7** — Total bobot lokasi harus tepat 100%.
- **BR-8** — Mata uang tunggal (IDR) pada MVP.

---

## 9. Model Data

```
project (1) ──< project_location (N)
project (1) ──< project_stage (5, tetap)
project (1) ──< project_document (N)          ← Closing
project (1) ──< project_risk (N)              ← Monitoring
project (1) ──< project_member (N)            ← PIC & tim
project (1) ──< audit_log (N)

project_stage(Initiating) (1) ── initiating_form (1)
project_stage(Initiating) (1) ──< initiating_checklist (N)

project (1) ──< wbs_item (N, self-referencing parent_id)
wbs_item (1) ── execution_record (1)          ← Executing
wbs_item (1) ── qc_record (1)                 ← Monitoring
execution_record (1) ──< cost_actual (N)      ← catatan realisasi biaya
wbs_item (1) ──< wbs_baseline (N)             ← snapshot per versi
```

### 9.1 Entitas Inti (ringkas)

**`project`**
`id`, `code`, `name`, `description`, `start_date`, `finish_date`, `progress_pct` *(terhitung)*, `status`, `client_id`, `pic_id`, `contract_value`, `initial_budget`, `total_budget` *(terhitung)*, `actual_cost` *(terhitung)*, `allow_overbudget` *(bool)*, `overbudget_tolerance_pct`, `overbudget_reason`, `is_overbudget` *(flag)*, `actual_finish_date`, `created_by`, `created_at`, `updated_by`, `updated_at`, `deleted_at`

**`project_location`**
`id`, `project_id`, `name`, `address`, `city`, `province`, `latitude`, `longitude`, `weight_pct`, `pic_id`, `is_completed`

**`project_stage`**
`id`, `project_id`, `stage_type` *(enum 1–5)*, `sequence`, `status`, `completion_pct`, `pic_id`, `actual_start`, `actual_end`, `approved_by`, `approved_at`, `rejection_reason`, `notes`

**`wbs_item`**
`id`, `project_id`, `parent_id`, `location_id`, `wbs_number`, `level`, `sort_order`, `name`, `item_type` *(`group`/`task`/`material`)*, `uom`, `qty`, `unit_budget`, `total_budget` *(terhitung)*, `weight_pct`, `start_date`, `end_date`, `pic_id`, `vendor_id`, `predecessor_id`, `notes`, `is_qc_required`, `deleted_at`

**`execution_record`**
`id`, `wbs_item_id`, `actual_qty`, `progress_pct`, `actual_cost` *(terhitung dari cost_actual)*, `is_completed`, `completed_at`, `completed_by`, `status`, `actual_start`, `actual_end`, `pic_id`, `notes`

**`cost_actual`**
`id`, `execution_record_id`, `date`, `description`, `amount`, `reference_no`, `attachment_url`, `created_by`, `created_at`

**`qc_record`**
`id`, `wbs_item_id`, `qc_status`, `inspection_date`, `inspector_id`, `findings`, `corrective_action`, `remediation_due_date`, `remediation_status`, `attachment_urls[]`, `notes`

**`project_document`**
`id`, `project_id`, `name`, `is_required`, `status`, `file_url`, `document_no`, `document_date`, `verified_by`, `verified_at`, `waiver_reason`, `notes`

**`project_risk`**
`id`, `project_id`, `code`, `description`, `category`, `likelihood`, `impact`, `score` *(terhitung)*, `mitigation_strategy`, `mitigation_plan`, `owner_id`, `status`, `affected_wbs_ids[]`

### 9.2 Indeks yang Direkomendasikan
`project(status, deleted_at)`, `project(code)` unik, `project(client_id)`, `project(pic_id)`, `wbs_item(project_id, parent_id, sort_order)`, `wbs_item(location_id)`, `execution_record(wbs_item_id)` unik, `qc_record(wbs_item_id)` unik, `cost_actual(execution_record_id, date)`.

---

## 10. Kebutuhan Non-Fungsional

| Kategori | Kebutuhan |
|---|---|
| **Performa** | Daftar proyek (1.000 proyek) muat < 2 detik. Tabel WBS 500 baris render < 3 detik dengan virtual scrolling. Rollup progres selesai < 5 detik setelah perubahan. |
| **Skala** | 10.000 proyek, 500 baris WBS per proyek, 200 pengguna bersamaan. |
| **Ketersediaan** | Uptime 99,5% jam kerja. |
| **Keamanan** | RBAC per §6; audit trail seluruh perubahan; enkripsi in-transit (TLS 1.3) & at-rest; lampiran dipindai antivirus; session timeout 8 jam. Token otentikasi & kredensial sesi tidak pernah diekspos di UI, log, atau URL. |
| **Audit** | Setiap create/update/delete tercatat: pengguna, timestamp, nilai lama, nilai baru, alasan (jika wajib), IP. Retensi 7 tahun. |
| **Kompatibilitas** | Chrome/Edge/Firefox/Safari versi terbaru−1. Web responsif; tampilan Executing dioptimalkan untuk tablet & ponsel. |
| **Aksesibilitas** | WCAG 2.1 AA: navigasi keyboard penuh, kontras memadai, label form eksplisit. Status tidak pernah dibedakan hanya dengan warna — selalu ada ikon/teks pendamping. |
| **Lokalisasi** | Bahasa Indonesia (utama) & Inggris. Format tanggal `dd/mm/yyyy`, angka `1.234.567,89`, mata uang `Rp`. Zona waktu WIB (Asia/Jakarta). |
| **Backup** | Backup harian, RPO 24 jam, RTO 4 jam. |

---

## 11. Integrasi

| Sistem | Arah | Data | Fase |
|---|---|---|---|
| **Master Data Contact** | Baca | Client, Vendor/Pemasok | MVP |
| **Master Data User** | Baca | PIC, tim, approver | MVP |
| **Master Data Produk/Item** | Baca | Katalog Material, satuan, harga default | MVP |
| **Modul Pembelian (Faktur Pembelian)** | Tulis/Baca | Realisasi biaya Material otomatis dari faktur pembelian yang ditautkan ke baris WBS | Fase 2 |
| **Modul Akuntansi** | Tulis | Jurnal biaya proyek, cost center | Fase 2 |
| **Notifikasi (Email/WA)** | Tulis | Approval, overbudget, QC gagal, tenggat perbaikan | Fase 2 |
| **Penyimpanan File** | Baca/Tulis | Lampiran dokumen & bukti QC | MVP |

---

## 12. Konvensi UX

Konvensi berikut mengikat karena mencegah kelas-kelas kegagalan yang sudah terbukti terjadi:

1. **Auto-select-all on focus** wajib untuk semua field numerik & teks yang bisa memiliki nilai awal (Qty, Nilai Anggaran, %, Deskripsi). Mengetik pada field terisi harus **mengganti**, bukan **menggabung**.
2. **Kegagalan simpan tidak boleh senyap.** Setiap penolakan validasi wajib menghasilkan pesan error yang terlihat: banner ringkasan di atas form + highlight & pesan inline di field bermasalah, dan viewport otomatis scroll ke field pertama yang bermasalah. Tombol Simpan yang "tidak melakukan apa-apa" adalah bug.
3. **Umpan balik hasil aksi** lewat toast: hijau untuk sukses (`[Kode] berhasil disimpan`), merah untuk gagal, dengan tombol Urungkan (undo) di mana relevan. Toast bertahan minimal 4 detik dan dapat ditutup manual.
4. **Dialog "Alasan Ubah"** muncul pada perubahan data yang sudah approved. Field alasan wajib; tombol Proses disabled sampai terisi.
5. **Konfirmasi destruktif**: hapus/batalkan/reopen selalu lewat dialog yang menyebutkan dampaknya secara spesifik ("Menghapus baris ini akan menghapus 4 sub-kegiatan dan 12 catatan realisasi biaya"). Penghapusan permanen tidak pernah dieksekusi otomatis oleh sistem.
6. **Menu titik tiga (⋮)** untuk aksi per baris, ditampilkan sebagai popover yang menyesuaikan posisi (flip ke atas dekat tepi bawah viewport) dengan pemisah visual dan warna merah untuk aksi destruktif — sehingga tidak ada risiko salah klik antara "Edit" dan "Hapus".
7. **Sortir default daftar** memakai kolom Kode (nilai stabil), bukan Nama (bisa berubah), agar posisi baris tidak bergeser saat operasi berurutan.
8. **Dropdown pencarian** (search-as-you-type) untuk semua relasi (Client, PIC, Vendor, Produk): ketik sebagian nama, pilih dari saran, dengan status kosong yang informatif dan opsi "Buat baru".
9. **Field terhitung** (Total Anggaran, Progress, Sisa Anggaran) tampil read-only dengan gaya visual berbeda dan tooltip berisi formulanya.
10. **Auto-save inline** pada tabel WBS/Executing dengan indikator per baris (menyimpan → tersimpan → gagal + retry).
11. **Data privasi**: pada data sample/dummy, gunakan nama fiktif realistis. Jangan pernah memakai data individu nyata tanpa konsen eksplisit.

---

## 13. Roadmap Rilis

| Fase | Cakupan | Estimasi |
|---|---|---|
| **Fase 1 — MVP** | Master Data Project (multi-lokasi, status), 5 tahapan lengkap, rollup progres & anggaran, RBAC, audit trail, ekspor | 12–14 minggu |
| **Fase 2 — Depth** | Gantt & critical path, integrasi Faktur Pembelian & Akuntansi, notifikasi, dashboard portofolio, tampilan peta lokasi | +8 minggu |
| **Fase 3 — Scale** | Kolaborasi (komentar/mention), mobile app, timesheet, forecasting berbasis riwayat, template industri | +10 minggu |

---

## 14. Risiko Produk

| # | Risiko | Dampak | Mitigasi |
|---|---|---|---|
| R1 | Tabel WBS berjenjang lambat pada proyek besar | Tinggi | Virtual scrolling, lazy-load per level, rollup asinkron |
| R2 | Pengguna lapangan enggan update progres | Tinggi | UI mobile-first untuk Executing, bulk update, pengingat otomatis |
| R3 | Gating tahapan dianggap terlalu kaku | Sedang | Pisahkan "boleh diisi" dari "boleh di-approve"; sediakan jalur waiver Admin |
| R4 | Aturan overbudget di-*bypass* dengan menaikkan Planning | Sedang | Baseline versi + laporan perbandingan terhadap Baseline v1; revisi Planning perlu approval Finance |
| R5 | Bobot lokasi/kegiatan diatur manual untuk mempercantik progres | Sedang | Audit trail perubahan bobot + laporan progres berbasis biaya sebagai pembanding |
| R6 | Migrasi data dari spreadsheet berantakan | Sedang | Importer Excel dengan pratinjau validasi + dukungan onboarding |

---

## 15. Pertanyaan Terbuka

1. **Multi-currency** — apakah ada proyek berkontrak mata uang asing? (MVP: IDR saja.)
2. **Retensi & termin pembayaran** — perlu dimodelkan di Planning, atau cukup ditangani modul Keuangan?
3. **Bobot progres** — apakah bobot berbasis nilai anggaran cukup, atau ada proyek yang butuh bobot berbasis durasi/manhour?
4. **Approval berjenjang** — apakah cukup satu approver per tahap, atau perlu rantai approval dinamis (nilai proyek menentukan level approver)?
5. **Subkontraktor** — apakah vendor perlu akses login untuk update progres bagiannya sendiri?
6. **Baseline** — berapa banyak versi baseline yang perlu disimpan, dan versi mana yang jadi acuan resmi Kurva-S?
7. **Template dokumen Closing** — apakah berbeda per tipe proyek/client, dan siapa yang berwenang mengubahnya?
8. **Definisi "Selesai"** — apakah checkbox Selesai di Executing memerlukan persetujuan PM, atau cukup Supervisor?

---

*Dokumen ini adalah draft untuk direview. Bagian §15 perlu dijawab sebelum masuk fase estimasi teknis.*
