import type { StageStatus } from '../../lib/types';

export type WbsItemType = 'GROUP' | 'TASK' | 'MATERIAL';

export interface WbsNode {
  id: string;
  parentId: string | null;
  wbsNumber: string;
  level: number;
  sortOrder: number;
  name: string;
  itemType: WbsItemType;
  locationId: string;
  locationName: string | null;
  uom: string | null;
  qty: number | null;
  unitBudget: number | null;
  totalBudget: number;
  weightPct: number | null;
  startDate: string | null;
  endDate: string | null;
  isQcRequired: boolean;
  picId: string | null;
  picName: string | null;
  vendorId: string | null;
  vendorName: string | null;
  predecessorId: string | null;
  predecessorNumber: string | null;
  notes: string | null;
  children: WbsNode[];
}

export interface PlanningSummary {
  totalPlan: number;
  estimate: number | null;
  contractValue: number | null;
  selisih: number | null;
  pctOfEstimate: number | null;
  allowOverbudget: boolean;
  overbudgetTolerancePct: number | null;
  overbudgetReason: string | null;
  isOverbudget: boolean;
}

export interface PlanningResponse {
  tree: WbsNode[];
  summary: PlanningSummary;
  planningStatus: StageStatus;
}

export interface CreateWbsPayload {
  parentId?: string;
  name: string;
  itemType: 'TASK' | 'MATERIAL';
  uom?: string;
  qty?: number;
  unitBudget?: number;
  startDate?: string;
  endDate?: string;
}

export interface UpdateWbsPayload {
  name?: string;
  itemType?: 'TASK' | 'MATERIAL';
  uom?: string;
  qty?: number;
  unitBudget?: number;
  startDate?: string;
  endDate?: string;
  weightPct?: number;
  isQcRequired?: boolean;
  notes?: string;
  picId?: string;
  vendorId?: string;
  predecessorId?: string;
  reason?: string;
}

export interface OverbudgetPayload {
  allowOverbudget: boolean;
  tolerancePct?: number;
  reason?: string;
}

export interface BaselineSummary {
  version: number;
  snapshotAt: string;
  total: number;
  itemCount: number;
}
