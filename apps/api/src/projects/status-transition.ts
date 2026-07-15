import { ProjectStatus, Role } from '@prisma/client';

/**
 * Project status lifecycle (PRD §7.1.3).
 * Each allowed transition declares which roles may perform it and whether a
 * reason is mandatory. Gating that depends on project data (Initiating
 * approved, QC passed, docs complete) is checked in the service, not here.
 */
export interface TransitionRule {
  to: ProjectStatus;
  roles: Role[];
  reasonRequired: boolean;
  /** Human label for the "why" of a gate, used in errors. */
  label: string;
}

const A = ProjectStatus;

export const TRANSITIONS: Record<ProjectStatus, TransitionRule[]> = {
  [A.DRAFT]: [
    { to: A.ACTIVE, roles: [Role.ADMIN, Role.PM], reasonRequired: false, label: 'Aktifkan proyek' },
    { to: A.CANCELLED, roles: [Role.ADMIN, Role.PM], reasonRequired: true, label: 'Batalkan proyek' },
  ],
  [A.ACTIVE]: [
    { to: A.ON_HOLD, roles: [Role.ADMIN, Role.PM], reasonRequired: true, label: 'Tangguhkan' },
    { to: A.COMPLETED, roles: [Role.ADMIN, Role.PM], reasonRequired: false, label: 'Selesaikan pekerjaan' },
    { to: A.CANCELLED, roles: [Role.ADMIN, Role.PM], reasonRequired: true, label: 'Batalkan proyek' },
  ],
  [A.ON_HOLD]: [
    { to: A.ACTIVE, roles: [Role.ADMIN, Role.PM], reasonRequired: false, label: 'Lanjutkan' },
    { to: A.CANCELLED, roles: [Role.ADMIN, Role.PM], reasonRequired: true, label: 'Batalkan proyek' },
  ],
  [A.COMPLETED]: [
    { to: A.CLOSED, roles: [Role.ADMIN], reasonRequired: false, label: 'Tutup proyek' },
    { to: A.ACTIVE, roles: [Role.ADMIN], reasonRequired: true, label: 'Buka kembali (reopen)' },
  ],
  [A.CLOSED]: [
    { to: A.ACTIVE, roles: [Role.ADMIN], reasonRequired: true, label: 'Buka kembali (reopen)' },
  ],
  [A.CANCELLED]: [
    { to: A.DRAFT, roles: [Role.ADMIN], reasonRequired: true, label: 'Pulihkan ke draft' },
  ],
};

export function findTransition(
  from: ProjectStatus,
  to: ProjectStatus,
): TransitionRule | undefined {
  return TRANSITIONS[from]?.find((t) => t.to === to);
}

export function allowedTargets(from: ProjectStatus): ProjectStatus[] {
  return (TRANSITIONS[from] ?? []).map((t) => t.to);
}
