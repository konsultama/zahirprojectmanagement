import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPatch, apiPost, apiPut } from '../../lib/api';
import type { InitiatingResponse, SaveInitiatingPayload, StageSummary } from './types';

export function useStages(projectId: string) {
  return useQuery({
    queryKey: ['stages', projectId],
    queryFn: () => apiGet<StageSummary[]>(`/projects/${projectId}/stages`),
  });
}

export function useInitiating(projectId: string) {
  return useQuery({
    queryKey: ['initiating', projectId],
    queryFn: () => apiGet<InitiatingResponse>(`/projects/${projectId}/initiating`),
  });
}

function useInitiatingMutation<TArgs>(
  projectId: string,
  fn: (args: TArgs) => Promise<InitiatingResponse>,
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: (data) => {
      qc.setQueryData(['initiating', projectId], data);
      qc.invalidateQueries({ queryKey: ['stages', projectId] });
      qc.invalidateQueries({ queryKey: ['project', projectId] });
    },
  });
}

export function useSaveInitiating(projectId: string) {
  return useInitiatingMutation(projectId, (payload: SaveInitiatingPayload) =>
    apiPut<InitiatingResponse>(`/projects/${projectId}/initiating`, payload),
  );
}

export function useToggleChecklist(projectId: string) {
  return useInitiatingMutation(
    projectId,
    ({ itemId, isChecked, reason }: { itemId: string; isChecked: boolean; reason?: string }) =>
      apiPatch<InitiatingResponse>(`/projects/${projectId}/initiating/checklist/${itemId}`, {
        isChecked,
        reason,
      }),
  );
}

export function useSubmitInitiating(projectId: string) {
  return useInitiatingMutation<void>(projectId, () =>
    apiPost<InitiatingResponse>(`/projects/${projectId}/initiating/submit`, {}),
  );
}

export function useApproveInitiating(projectId: string) {
  return useInitiatingMutation<void>(projectId, () =>
    apiPost<InitiatingResponse>(`/projects/${projectId}/initiating/approve`, {}),
  );
}

export function useRejectInitiating(projectId: string) {
  return useInitiatingMutation(projectId, (reason: string) =>
    apiPost<InitiatingResponse>(`/projects/${projectId}/initiating/reject`, { reason }),
  );
}
