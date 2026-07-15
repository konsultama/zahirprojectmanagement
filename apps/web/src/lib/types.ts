export type Role = 'ADMIN' | 'PM' | 'SUPERVISOR' | 'QC' | 'FINANCE' | 'VIEWER';

export type ProjectStatus =
  | 'DRAFT'
  | 'ACTIVE'
  | 'ON_HOLD'
  | 'COMPLETED'
  | 'CLOSED'
  | 'CANCELLED';

export type StageType = 'INITIATING' | 'PLANNING' | 'EXECUTING' | 'MONITORING' | 'CLOSING';
export type StageStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';

export interface UserRef {
  id: string;
  name: string;
  email?: string;
  role?: Role;
}

export interface ContactRef {
  id: string;
  name: string;
  type?: string;
  email?: string;
}

export interface LocationInput {
  id?: string;
  name: string;
  address?: string;
  city?: string;
  province?: string;
  weightPct?: number;
  picId?: string;
}

export interface ProjectLocation extends LocationInput {
  id: string;
  weightPct: number;
  isCompleted?: boolean;
  pic?: UserRef | null;
}

export interface ProjectStage {
  id: string;
  stageType: StageType;
  sequence: number;
  status: StageStatus;
  completionPct: number;
}

export interface ProjectListRow {
  id: string;
  code: string;
  name: string;
  client: { id: string; name: string } | null;
  pic: { id: string; name: string } | null;
  locationCount: number;
  locations: { id: string; name: string; province: string | null }[];
  startDate: string;
  finishDate: string;
  progressPct: number;
  totalBudget: number;
  actualCost: number;
  serapanPct: number;
  status: ProjectStatus;
  activeStage: { stageType: StageType; status: StageStatus } | null;
  isOverbudget: boolean;
}

export interface ProjectListResponse {
  data: ProjectListRow[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface ProjectDetail {
  id: string;
  code: string;
  name: string;
  description: string | null;
  startDate: string;
  finishDate: string;
  actualFinishDate: string | null;
  progressPct: number;
  status: ProjectStatus;
  client: { id: string; name: string } | null;
  pic: { id: string; name: string } | null;
  contractValue: number | null;
  initialBudget: number | null;
  totalBudget: number;
  actualCost: number;
  serapanPct: number;
  isOverbudget: boolean;
  allowOverbudget: boolean;
  allowedTransitions: ProjectStatus[];
  locations: ProjectLocation[];
  stages: ProjectStage[];
  members: { id: string; role: string; user: UserRef }[];
}

export interface CreateProjectPayload {
  name: string;
  description?: string;
  startDate: string;
  finishDate: string;
  clientId: string;
  picId: string;
  contractValue?: number;
  initialBudget?: number;
  locations: LocationInput[];
}
