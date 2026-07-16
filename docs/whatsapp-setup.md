# Menghubungkan Notifikasi WhatsApp

Aplikasi mengirim notifikasi prioritas tinggi (tahap ditolak, QC gagal, overbudget, proyek ditutup — sesuai **Pengaturan → Routing Notifikasi**) ke WhatsApp lewat **WhatsApp Cloud API** resmi dari Meta.

> Ringkas: buat app Meta → tambah produk WhatsApp → ambil **Access Token** + **Phone Number ID** → daftarkan **nomor tujuan** → isi di **Pengaturan → Notifikasi WhatsApp** → **Uji kirim**.

---

## 1. Prasyarat
- Akun **Facebook/Meta** dan sebuah **Meta Business Account** (gratis, di [business.facebook.com](https://business.facebook.com)).
- Nomor HP untuk **penerima** notifikasi (bisa nomor Anda sendiri untuk uji).
- Untuk uji cepat, **tidak perlu** nomor WhatsApp Business sendiri — Meta menyediakan **nomor uji** bawaan.

## 2. Buat App Meta + tambah produk WhatsApp
1. Buka [developers.facebook.com](https://developers.facebook.com) → **My Apps** → **Create App**.
2. Pilih tipe **Business** → beri nama → Create.
3. Di dashboard app, cari **WhatsApp** → **Set up**.
4. Pilih (atau buat) Meta Business Account saat diminta.

## 3. Ambil kredensial (mode uji)
Masuk ke **WhatsApp → API Setup**. Di sini tersedia:
- **Temporary access token** — berlaku **24 jam** (untuk uji). Salin ini sebagai **Access Token**.
- **Phone number ID** — ID dari "Test number" bawaan Meta. Salin sebagai **Phone Number ID**.
  (Jangan tertukar dengan "WhatsApp Business Account ID".)

## 4. Daftarkan nomor penerima (WAJIB di mode uji)
Di **API Setup**, bagian **To** → **Manage phone number list** → **Add recipient** → masukkan nomor tujuan (format internasional tanpa `+`, mis. `628123456789`) → verifikasi via OTP yang dikirim ke nomor itu.
Mode uji hanya mengizinkan pengiriman ke nomor yang terdaftar (maks. 5).

## 5. Isi konfigurasi di aplikasi
Masuk sebagai **Admin** → **Pengaturan → Notifikasi WhatsApp**:
| Field | Isi |
|---|---|
| **Aktifkan** | centang |
| **Access Token** | token dari langkah 3 |
| **Phone Number ID** | ID dari langkah 3 |
| **Nomor Tujuan** | nomor terdaftar dari langkah 4 (mis. `628123456789`) |
| **Versi API** | biarkan `v21.0` |

Klik **Simpan**.

## 6. Uji kirim
Klik **Uji kirim**.
- **Berhasil** → notifikasi masuk ke WhatsApp penerima.
- **Gagal dengan pesan "re-engagement"/"template required"** → lihat catatan sesi 24 jam di bawah (ini bukan bug).
- **Gagal 401 / OAuthException code 190** → Access Token salah/kedaluwarsa (token uji hanya 24 jam).

## ⚠️ Penting: jendela 24 jam vs template
WhatsApp Cloud API membedakan dua jenis pesan:
- **Pesan teks bebas** (yang dikirim aplikasi ini) **hanya bisa** dikirim dalam **24 jam** setelah penerima terakhir mengirim pesan ke nomor bisnis. → Untuk uji: **kirim dulu satu pesan** dari WhatsApp penerima ke nomor bisnis Meta, lalu tekan **Uji kirim** dalam 24 jam.
- **Business-initiated** (mengirim kapan saja tanpa penerima memulai) **wajib memakai template pesan** yang sudah disetujui Meta.

Jadi untuk **alert otomatis 24/7** (di luar sesi 24 jam), diperlukan dukungan **template** — belum aktif secara default; bisa kami tambahkan (lihat bagian Produksi).

## 7. Ke produksi (token permanen)
Token uji 24 jam tidak cocok untuk produksi. Buat token permanen via **System User**:
1. [business.facebook.com](https://business.facebook.com) → **Business Settings → Users → System Users** → **Add** (peran Admin).
2. **Add Assets** → pilih app Anda → beri izin penuh.
3. **Generate New Token** → pilih app → centang izin **`whatsapp_business_messaging`** dan **`whatsapp_business_management`** → Generate. **Salin & simpan** (hanya tampil sekali).
4. Ganti Access Token di **Pengaturan → Notifikasi WhatsApp** dengan token permanen ini.
5. Tambah & verifikasi **nomor WhatsApp bisnis** Anda sendiri (menggantikan nomor uji) di WhatsApp Manager, lalu pakai Phone Number ID-nya.
6. Untuk alert business-initiated: buat & submit **message template** di WhatsApp Manager, tunggu persetujuan, lalu aktifkan dukungan template di aplikasi.

## Alternatif: gateway pihak ketiga (opsional)
Bila ingin lebih sederhana tanpa proses Meta (umum di Indonesia): gateway seperti Fonnte/Wablas/Twilio. Ini memerlukan penyesuaian kecil pada `WhatsappService` (endpoint & format payload berbeda) — beri tahu bila ingin dukungan salah satunya.

## Referensi konfigurasi via environment (opsional)
Selain lewat UI, dapat diisi via env (fallback bila DB kosong):
```
WHATSAPP_TOKEN="..."
WHATSAPP_PHONE_ID="..."
WHATSAPP_RECIPIENT="628123456789"
WHATSAPP_API_VERSION="v21.0"
```
