export type QcStatus = 'BELUM_DIPERIKSA' | 'PASSED' | 'FAILED' | 'PERLU_PERBAIKAN' | 'WAIVED';
export type RemediationStatus = 'OPEN' | 'IN_PROGRESS' | 'CLOSED';
export type RiskCategory = 'BIAYA' | 'JADWAL' | 'MUTU' | 'K3' | 'EKSTERNAL' | 'SDM';
export type MitigationStrategy = 'AVOID' | 'MITIGATE' | 'TRANSFER' | 'ACCEPT';
export type RiskStatus = 'OPEN' | 'MITIGATED' | 'CLOSED' | 'OCCURRED';

export interface QcRow {
  wbsItemId: string;
  wbsNumber: string;
  name: string;
  location: string | null;
  isQcRequired: boolean;
  progressPct: number;
  executionStatus: string;
  inspectable: boolean;
  qcStatus: QcStatus;
  inspectionDate: string | null;
  inspector: { id: string; name: string } | null;
  findings: string | null;
  correctiveAction: string | null;
  remediationDue: string | null;
  remediationStatus: RemediationStatus | null;
  notes: string | null;
}

export interface QcResponse {
  locked: boolean;
  rows: QcRow[];
  counts: Record<string, number>;
}

export interface UpdateQcPayload {
  qcStatus: QcStatus;
  findings?: string;
  correctiveAction?: string;
  remediationDue?: string;
  remediationStatus?: RemediationStatus;
  notes?: string;
  reason?: string;
}

export interface Risk {
  id: string;
  code: string;
  description: string;
  category: RiskCategory;
  likelihood: number;
  impact: number;
  score: number;
  band: 'green' | 'yellow' | 'red';
  mitigationStrategy: MitigationStrategy | null;
  mitigationPlan: string | null;
  ownerId: string | null;
  owner: { id: string; name: string } | null;
  status: RiskStatus;
  affectedWbsIds: string[];
}

export interface CreateRiskPayload {
  description: string;
  category: RiskCategory;
  likelihood: number;
  impact: number;
  mitigationStrategy?: MitigationStrategy;
  mitigationPlan?: string;
  ownerId?: string;
}

export interface DashboardData {
  progress: { actual: number; planned: number };
  evm: { spi: number | null; cpi: number | null; spiLight: string; cpiLight: string };
  budget: { totalBudget: number; actualCost: number; earned: number; serapanPct: number };
  qcSummary: Record<string, number>;
  topDelayed: { wbsNumber: string; name: string; progressPct: number; delay: number }[];
  topOver: { wbsNumber: string; name: string; costOver: number }[];
}
