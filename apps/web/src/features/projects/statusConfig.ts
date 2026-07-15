import type { ProjectStatus, StageStatus, StageType } from '../../lib/types';

// Status label + color. Never color-only (§10 Aksesibilitas) — text always present.
export const STATUS_META: Record<ProjectStatus, { label: string; color: string }> = {
  DRAFT: { label: 'Draft', color: '#667085' },
  ACTIVE: { label: 'Aktif', color: '#1570ef' },
  ON_HOLD: { label: 'Ditangguhkan', color: '#f79009' },
  COMPLETED: { label: 'Selesai', color: '#7a5af8' },
  CLOSED: { label: 'Ditutup', color: '#067647' },
  CANCELLED: { label: 'Dibatalkan', color: '#b42318' },
};

// Transitions that require a reason (mirror of backend status-transition.ts).
export const REASON_REQUIRED: Partial<Record<ProjectStatus, Set<ProjectStatus>>> = {
  DRAFT: new Set(['CANCELLED']),
  ACTIVE: new Set(['ON_HOLD', 'CANCELLED']),
  ON_HOLD: new Set(['CANCELLED']),
  COMPLETED: new Set(['ACTIVE']),
  CLOSED: new Set(['ACTIVE']),
  CANCELLED: new Set(['DRAFT']),
};

export const STAGE_META: Record<StageType, string> = {
  INITIATING: 'Initiating',
  PLANNING: 'Planning',
  EXECUTING: 'Executing',
  MONITORING: 'Monitoring & Controlling',
  CLOSING: 'Closing',
};

export const STAGE_STATUS_META: Record<StageStatus, { label: string; color: string }> = {
  NOT_STARTED: { label: 'Belum Mulai', color: '#98a2b3' },
  IN_PROGRESS: { label: 'Berjalan', color: '#1570ef' },
  SUBMITTED: { label: 'Diajukan', color: '#f79009' },
  APPROVED: { label: 'Disetujui', color: '#067647' },
  REJECTED: { label: 'Ditolak', color: '#b42318' },
};
