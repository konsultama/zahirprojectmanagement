import { Role } from '@prisma/client';

/** Actions from PRD §6, with their default allowed roles. */
export interface PermissionDef {
  key: string;
  label: string;
  defaults: Role[];
}

const A = Role.ADMIN;
const PM = Role.PM;
const SUP = Role.SUPERVISOR;
const QC = Role.QC;
const FIN = Role.FINANCE;
const V = Role.VIEWER;

export const PERMISSIONS: PermissionDef[] = [
  { key: 'master_project.write', label: 'Buat/ubah Master Project', defaults: [A, PM] },
  { key: 'master_project.delete', label: 'Hapus Project', defaults: [A] },
  { key: 'initiating.fill', label: 'Isi tahap Initiating', defaults: [A, PM] },
  { key: 'initiating.approve', label: 'Approve Initiating', defaults: [A] },
  { key: 'planning.compose', label: 'Susun Planning (RAB)', defaults: [A, PM] },
  { key: 'planning.approve', label: 'Approve Planning', defaults: [A, FIN] },
  { key: 'overbudget.approve', label: 'Setujui overbudget', defaults: [A, FIN] },
  { key: 'executing.update', label: 'Update progres Executing', defaults: [A, PM, SUP] },
  { key: 'qc.fill', label: 'Isi kolom QC (Monitoring)', defaults: [A, QC] },
  { key: 'closing.fill', label: 'Isi & submit Closing', defaults: [A, PM] },
  { key: 'closing.approve', label: 'Approve Closing', defaults: [A] },
  { key: 'project.view', label: 'Lihat proyek', defaults: [A, PM, SUP, QC, FIN, V] },
];

export const ROLES: Role[] = [Role.ADMIN, Role.PM, Role.SUPERVISOR, Role.QC, Role.FINANCE, Role.VIEWER];

export const ROLE_LABELS: Record<Role, string> = {
  ADMIN: 'Admin',
  PM: 'Project Manager',
  SUPERVISOR: 'Supervisor',
  QC: 'QC / Pengawas',
  FINANCE: 'Finance',
  VIEWER: 'Viewer',
};
