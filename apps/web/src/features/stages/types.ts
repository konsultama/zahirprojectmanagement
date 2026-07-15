import type { StageStatus, StageType, UserRef } from '../../lib/types';

export interface StageSummary {
  id: string;
  stageType: StageType;
  sequence: number;
  status: StageStatus;
  completionPct: number;
  pic: { id: string; name: string } | null;
  approvedBy: { id: string; name: string } | null;
  approvedAt: string | null;
  rejectionReason: string | null;
  approvalLocked: boolean;
}

export interface Deliverable {
  id?: string;
  name: string;
  description?: string;
  targetDate?: string;
}
export interface Stakeholder {
  id?: string;
  name: string;
  role?: string;
  contact?: string;
  influence?: 'HIGH' | 'MEDIUM' | 'LOW';
}
export interface InitialRisk {
  id?: string;
  description: string;
  impact?: string;
  likelihood?: string;
}

export interface ChecklistItem {
  id: string;
  text: string;
  isRequired: boolean;
  isChecked: boolean;
  notes?: string | null;
  attachmentUrl?: string | null;
  sortOrder: number;
}

export interface InitiatingForm {
  id: string;
  objective: string;
  inScope: string | null;
  outOfScope: string | null;
  assumptions: string[];
  constraints: string[];
  initialBudget: number | null;
  estimatedDays: number | null;
  sponsorApproverId: string | null;
  sponsorApproverName: string | null;
  deliverables: Deliverable[];
  stakeholders: Stakeholder[];
  initialRisks: InitialRisk[];
}

export interface InitiatingResponse {
  stage: {
    id: string;
    status: StageStatus;
    completionPct: number;
    approvedAt: string | null;
    rejectionReason: string | null;
  };
  form: InitiatingForm;
  checklist: ChecklistItem[];
  requiredChecklistDone: number;
  requiredChecklistTotal: number;
  missing: string[];
  canSubmit: boolean;
  readOnly: boolean;
}

export interface SaveInitiatingPayload {
  objective?: string;
  inScope?: string;
  outOfScope?: string;
  assumptions?: string[];
  constraints?: string[];
  initialBudget?: number;
  estimatedDays?: number;
  sponsorApproverId?: string;
  deliverables?: Deliverable[];
  stakeholders?: Stakeholder[];
  initialRisks?: InitialRisk[];
  reason?: string;
}

export type { UserRef };
