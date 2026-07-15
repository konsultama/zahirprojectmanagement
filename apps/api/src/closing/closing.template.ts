/** Default Closing document checklist (§7.2.6 B). */
export const DEFAULT_CLOSING_DOCS: { name: string; isRequired: boolean }[] = [
  { name: 'Berita Acara Serah Terima (BAST)', isRequired: true },
  { name: 'Berita Acara Pemeriksaan Pekerjaan', isRequired: true },
  { name: 'Laporan Akhir Proyek', isRequired: true },
  { name: 'As-Built Drawing / Dokumentasi Hasil', isRequired: true },
  { name: 'Foto Dokumentasi 0% / 50% / 100%', isRequired: true },
  { name: 'Sertifikat Garansi', isRequired: false },
  { name: 'Manual & Panduan Operasional', isRequired: false },
  { name: 'Laporan Realisasi Anggaran Akhir', isRequired: true },
  { name: 'Invoice Final & Bukti Pembayaran', isRequired: true },
  { name: 'Surat Penyelesaian Kontrak', isRequired: true },
  { name: 'Evaluasi Kepuasan Client', isRequired: false },
  { name: 'Dokumen Penutupan Vendor/Subkon', isRequired: false },
];
