import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiDelete, apiGet, apiPatch, apiPost } from '../../lib/api';
import type {
  BaselineSummary,
  CreateWbsPayload,
  OverbudgetPayload,
  PlanningResponse,
  UpdateWbsPayload,
} from './types';

export function usePlanning(projectId: string) {
  return useQuery({
    queryKey: ['planning', projectId],
    queryFn: () => apiGet<PlanningResponse>(`/projects/${projectId}/planning`),
  });
}

export function useBaselines(projectId: string) {
  return useQuery({
    queryKey: ['baselines', projectId],
    queryFn: () => apiGet<BaselineSummary[]>(`/projects/${projectId}/planning/baselines`),
  });
}

function usePlanningMutation<TArgs>(projectId: string, fn: (a: TArgs) => Promise<PlanningResponse>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: (data) => {
      qc.setQueryData(['planning', projectId], data);
      qc.invalidateQueries({ queryKey: ['stages', projectId] });
      qc.invalidateQueries({ queryKey: ['project', projectId] });
      qc.invalidateQueries({ queryKey: ['baselines', projectId] });
    },
  });
}

export function useCreateWbs(projectId: string) {
  return usePlanningMutation(projectId, (payload: CreateWbsPayload) =>
    apiPost<PlanningResponse>(`/projects/${projectId}/planning/wbs`, payload),
  );
}
export function useUpdateWbs(projectId: string) {
  return usePlanningMutation(projectId, ({ id, ...payload }: UpdateWbsPayload & { id: string }) =>
    apiPatch<PlanningResponse>(`/projects/${projectId}/planning/wbs/${id}`, payload),
  );
}
export function useDeleteWbs(projectId: string) {
  return usePlanningMutation(projectId, (id: string) =>
    apiDelete<PlanningResponse>(`/projects/${projectId}/planning/wbs/${id}`),
  );
}
export function useSetOverbudget(projectId: string) {
  return usePlanningMutation(projectId, (payload: OverbudgetPayload) =>
    apiPost<PlanningResponse>(`/projects/${projectId}/planning/overbudget`, payload),
  );
}
export function useSubmitPlanning(projectId: string) {
  return usePlanningMutation<void>(projectId, () =>
    apiPost<PlanningResponse>(`/projects/${projectId}/planning/submit`, {}),
  );
}
export function useApprovePlanning(projectId: string) {
  return usePlanningMutation<void>(projectId, () =>
    apiPost<PlanningResponse>(`/projects/${projectId}/planning/approve`, {}),
  );
}
export function useRejectPlanning(projectId: string) {
  return usePlanningMutation(projectId, (reason: string) =>
    apiPost<PlanningResponse>(`/projects/${projectId}/planning/reject`, { reason }),
  );
}

export interface ImportRabRow {
  wbsNumber: string;
  name: string;
  itemType?: string;
  uom?: string;
  qty?: number;
  unitBudget?: number;
  locationName?: string;
}
export function useImportRab(projectId: string) {
  return usePlanningMutation(projectId, (payload: { rows: ImportRabRow[]; replace?: boolean }) =>
    apiPost<PlanningResponse>(`/projects/${projectId}/planning/import`, payload),
  );
}
