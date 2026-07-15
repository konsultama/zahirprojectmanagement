export type ExecutionStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'DONE' | 'BLOCKED' | 'CANCELLED';

export interface CostRecord {
  id: string;
  date: string;
  description: string;
  amount: number;
  referenceNo: string | null;
  attachmentUrl: string | null;
}

export interface ExecutionRow {
  wbsItemId: string;
  wbsNumber: string;
  name: string;
  itemType: 'GROUP' | 'TASK' | 'MATERIAL';
  location: string | null;
  uom: string | null;
  planQty: number;
  planBudget: number;
  executionId: string | null;
  actualQty: number;
  progressPct: number;
  actualCost: number;
  sisaAnggaran: number;
  variansPct: number;
  isOverBudget: boolean;
  isCompleted: boolean;
  status: ExecutionStatus;
  actualStart: string | null;
  actualEnd: string | null;
  pic: { id: string; name: string } | null;
  vendor: { id: string; name: string } | null;
  costActuals: CostRecord[];
}

export interface ExecutionSummary {
  progressPct: number;
  totalBudget: number;
  actualCost: number;
  sisaAnggaran: number;
  serapanPct: number;
  allowOverbudget: boolean;
  overbudgetTolerancePct: number | null;
}

export interface ExecutionResponse {
  locked: boolean;
  rows: ExecutionRow[];
  summary: ExecutionSummary;
}

export interface UpdateExecutionPayload {
  actualQty?: number;
  progressPct?: number;
  status?: ExecutionStatus;
  isCompleted?: boolean;
  actualStart?: string;
  actualEnd?: string;
  reason?: string;
}

export interface CostPayload {
  date: string;
  description: string;
  amount: number;
  referenceNo?: string;
  reason?: string;
}
