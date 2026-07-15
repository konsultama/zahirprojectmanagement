/** Default Initiating approval checklist (PRD §7.2.2 B). Items 1–5 wajib. */
export const DEFAULT_INITIATING_CHECKLIST: {
  text: string;
  isRequired: boolean;
  needsAttachment: boolean;
}[] = [
  { text: 'Tujuan & ruang lingkup disepakati bersama client', isRequired: true, needsAttachment: false },
  { text: 'Stakeholder teridentifikasi lengkap', isRequired: true, needsAttachment: false },
  { text: 'Estimasi anggaran awal disetujui', isRequired: true, needsAttachment: false },
  { text: 'Dokumen kontrak / SPK tersedia', isRequired: true, needsAttachment: true },
  { text: 'Project charter ditandatangani', isRequired: true, needsAttachment: true },
  { text: 'Sumber daya inti tersedia', isRequired: false, needsAttachment: false },
  { text: 'Risiko awal diidentifikasi', isRequired: false, needsAttachment: false },
];
