export type CellKind =
  | 'text'
  | 'number'
  | 'currency'
  | 'percent'
  | 'date'
  | 'status'
  | 'stage'
  | 'risk-level'
  | 'schedule'
  | 'over';

export interface ReportColumn {
  key: string;
  label: string;
  kind?: CellKind;
  num?: boolean; // right-align
}
export interface SummaryField {
  key: string;
  label: string;
  kind?: CellKind;
}
export interface ReportConfig {
  key: string;
  title: string;
  description: string;
  icon: string;
  accent: string;
  columns: ReportColumn[];
  summary: SummaryField[];
}

export const REPORTS: ReportConfig[] = [
  {
    key: 'portfolio',
    title: 'Portofolio Proyek',
    description: 'Ringkasan seluruh proyek: status, tahapan, progres, & anggaran.',
    icon: 'LayoutGrid',
    accent: 'rgba(46,179,236,0.15)',
    columns: [
      { key: 'code', label: 'Kode' },
      { key: 'name', label: 'Nama Proyek' },
      { key: 'client', label: 'Client' },
      { key: 'pic', label: 'PIC' },
      { key: 'status', label: 'Status', kind: 'status' },
      { key: 'stage', label: 'Tahapan', kind: 'stage' },
      { key: 'progressPct', label: 'Progres', kind: 'percent', num: true },
      { key: 'totalBudget', label: 'Total Anggaran', kind: 'currency', num: true },
      { key: 'actualCost', label: 'Terpakai', kind: 'currency', num: true },
      { key: 'serapanPct', label: 'Serapan', kind: 'percent', num: true },
    ],
    summary: [
      { key: 'count', label: 'Jumlah Proyek', kind: 'number' },
      { key: 'totalBudget', label: 'Total Anggaran', kind: 'currency' },
      { key: 'totalActual', label: 'Total Terpakai', kind: 'currency' },
      { key: 'avgProgress', label: 'Rata-rata Progres', kind: 'percent' },
    ],
  },
  {
    key: 'budget',
    title: 'Serapan Anggaran',
    description: 'Estimasi vs rencana vs realisasi biaya, dan varians per proyek.',
    icon: 'Wallet',
    accent: 'rgba(245,107,59,0.15)',
    columns: [
      { key: 'code', label: 'Kode' },
      { key: 'name', label: 'Nama Proyek' },
      { key: 'estimate', label: 'Estimasi Awal', kind: 'currency', num: true },
      { key: 'plan', label: 'Total Rencana', kind: 'currency', num: true },
      { key: 'actual', label: 'Terpakai', kind: 'currency', num: true },
      { key: 'sisa', label: 'Sisa', kind: 'currency', num: true },
      { key: 'variansPct', label: 'Varians', kind: 'percent', num: true },
      { key: 'isOverbudget', label: 'Overbudget', kind: 'over' },
    ],
    summary: [
      { key: 'totalPlan', label: 'Total Rencana', kind: 'currency' },
      { key: 'totalActual', label: 'Total Terpakai', kind: 'currency' },
      { key: 'totalSisa', label: 'Total Sisa', kind: 'currency' },
      { key: 'overbudgetCount', label: 'Proyek Overbudget', kind: 'number' },
    ],
  },
  {
    key: 'schedule',
    title: 'Progres & Jadwal (SPI)',
    description: 'Progres aktual vs rencana berbasis waktu, SPI, & sisa hari.',
    icon: 'CalendarClock',
    accent: 'rgba(5,150,105,0.15)',
    columns: [
      { key: 'code', label: 'Kode' },
      { key: 'name', label: 'Nama Proyek' },
      { key: 'startDate', label: 'Mulai', kind: 'date' },
      { key: 'finishDate', label: 'Selesai', kind: 'date' },
      { key: 'sisaHari', label: 'Sisa Hari', kind: 'number', num: true },
      { key: 'actualProgress', label: 'Aktual', kind: 'percent', num: true },
      { key: 'plannedProgress', label: 'Rencana', kind: 'percent', num: true },
      { key: 'spi', label: 'SPI', kind: 'number', num: true },
      { key: 'onSchedule', label: 'Jadwal', kind: 'schedule' },
    ],
    summary: [
      { key: 'onTrack', label: 'On Track', kind: 'number' },
      { key: 'late', label: 'Terlambat', kind: 'number' },
    ],
  },
  {
    key: 'qc',
    title: 'Ringkasan QC',
    description: 'Rekap hasil pemeriksaan mutu (QC) per proyek.',
    icon: 'ShieldCheck',
    accent: 'rgba(233,80,68,0.15)',
    columns: [
      { key: 'code', label: 'Kode' },
      { key: 'name', label: 'Nama Proyek' },
      { key: 'total', label: 'Total Item', kind: 'number', num: true },
      { key: 'passed', label: 'Passed', kind: 'number', num: true },
      { key: 'failed', label: 'Failed', kind: 'number', num: true },
      { key: 'perluPerbaikan', label: 'Perlu Perbaikan', kind: 'number', num: true },
      { key: 'belum', label: 'Belum', kind: 'number', num: true },
      { key: 'passedPct', label: '% Passed', kind: 'percent', num: true },
    ],
    summary: [
      { key: 'totalItems', label: 'Total Item', kind: 'number' },
      { key: 'totalPassed', label: 'Total Passed', kind: 'number' },
      { key: 'totalFailed', label: 'Total Failed', kind: 'number' },
    ],
  },
  {
    key: 'risk',
    title: 'Register Risiko',
    description: 'Seluruh risiko lintas proyek, diurutkan berdasarkan skor.',
    icon: 'AlertTriangle',
    accent: 'rgba(195,208,70,0.15)',
    columns: [
      { key: 'projectCode', label: 'Proyek' },
      { key: 'code', label: 'Kode' },
      { key: 'description', label: 'Deskripsi Risiko' },
      { key: 'category', label: 'Kategori' },
      { key: 'score', label: 'Skor', kind: 'number', num: true },
      { key: 'level', label: 'Level', kind: 'risk-level' },
      { key: 'status', label: 'Status' },
      { key: 'owner', label: 'Owner' },
    ],
    summary: [
      { key: 'total', label: 'Total Risiko', kind: 'number' },
      { key: 'tinggi', label: 'Level Tinggi', kind: 'number' },
      { key: 'occurred', label: 'Terjadi', kind: 'number' },
    ],
  },
];

export const reportByKey = (key: string) => REPORTS.find((r) => r.key === key);
