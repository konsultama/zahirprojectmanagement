export type DocumentStatus = 'BELUM' | 'ADA' | 'TERVERIFIKASI' | 'TIDAK_BERLAKU';

export interface ClosingDocument {
  id: string;
  name: string;
  isRequired: boolean;
  status: DocumentStatus;
  documentNo: string | null;
  documentDate: string | null;
  fileUrl: string | null;
  waiverReason: string | null;
  notes: string | null;
}

export interface Evaluation {
  lessonsLearned?: string;
  vendorRating?: number;
  vendorNotes?: string;
  clientRating?: number;
  clientNotes?: string;
}

export interface ClosingResponse {
  stage: { id: string; status: string; rejectionReason: string | null; approvedAt: string | null };
  documents: ClosingDocument[];
  completeness: { requiredDone: number; requiredTotal: number };
  evaluation: Evaluation;
  autoSummary: {
    budget: { plan: number; actual: number; variance: number };
    schedule: { plannedDays: number; actualDays: number; diffDays: number };
    qcFindings: number;
    risksOccurred: number;
    progressPct: number;
  };
  master: {
    status: string;
    actualFinishDate: string | null;
    progressPct: number;
    contractValue: number | null;
    description: string | null;
    pic: { id: string; name: string } | null;
  };
  gating: { canSubmit: boolean; blockers: string[] };
  readOnly: boolean;
}

export interface ClosureReport {
  generatedAt: string;
  project: {
    code: string;
    name: string;
    client: string | null;
    pic: string | null;
    status: string;
    startDate: string;
    finishDate: string;
    actualFinishDate: string | null;
    contractValue: number | null;
  };
  summary: ClosingResponse['autoSummary'];
  documents: ClosingDocument[];
  completeness: { requiredDone: number; requiredTotal: number };
  evaluation: Evaluation;
  approvedAt: string | null;
}

export interface UpdateDocPayload {
  status?: DocumentStatus;
  documentNo?: string;
  documentDate?: string;
  fileUrl?: string;
  waiverReason?: string;
  notes?: string;
}

export interface MasterUpdatePayload {
  actualFinishDate?: string;
  progressPct?: number;
  progressReason?: string;
  contractValue?: number;
  description?: string;
}
