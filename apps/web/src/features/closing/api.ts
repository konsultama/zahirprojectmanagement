import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPatch, apiPost, apiPut } from '../../lib/api';
import type { ClosingResponse, ClosureReport, Evaluation, MasterUpdatePayload, UpdateDocPayload } from './types';

export function useClosing(projectId: string) {
  return useQuery({ queryKey: ['closing', projectId], queryFn: () => apiGet<ClosingResponse>(`/projects/${projectId}/closing`) });
}

function useClosingMutation<TArgs>(projectId: string, fn: (a: TArgs) => Promise<ClosingResponse>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: (data) => {
      qc.setQueryData(['closing', projectId], data);
      qc.invalidateQueries({ queryKey: ['project', projectId] });
      qc.invalidateQueries({ queryKey: ['stages', projectId] });
    },
  });
}

export function useUpdateDoc(projectId: string) {
  return useClosingMutation(projectId, ({ id, ...payload }: UpdateDocPayload & { id: string }) =>
    apiPatch<ClosingResponse>(`/projects/${projectId}/closing/documents/${id}`, payload),
  );
}
export function useSaveEvaluation(projectId: string) {
  return useClosingMutation(projectId, (payload: Evaluation) =>
    apiPut<ClosingResponse>(`/projects/${projectId}/closing/evaluation`, payload),
  );
}
export function useMasterUpdate(projectId: string) {
  return useClosingMutation(projectId, (payload: MasterUpdatePayload) =>
    apiPost<ClosingResponse>(`/projects/${projectId}/closing/master-update`, payload),
  );
}
export function useSubmitClosing(projectId: string) {
  return useClosingMutation<void>(projectId, () => apiPost<ClosingResponse>(`/projects/${projectId}/closing/submit`, {}));
}
export function useApproveClosing(projectId: string) {
  return useClosingMutation<void>(projectId, () => apiPost<ClosingResponse>(`/projects/${projectId}/closing/approve`, {}));
}
export function useRejectClosing(projectId: string) {
  return useClosingMutation(projectId, (reason: string) => apiPost<ClosingResponse>(`/projects/${projectId}/closing/reject`, { reason }));
}
export function useClosureReport(projectId: string, enabled: boolean) {
  return useQuery({
    queryKey: ['closure-report', projectId],
    queryFn: () => apiGet<ClosureReport>(`/projects/${projectId}/closing/report`),
    enabled,
  });
}
