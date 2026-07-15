import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiDelete, apiGet, apiPatch, apiPost } from '../../lib/api';
import type { CostPayload, ExecutionResponse, UpdateExecutionPayload } from './types';

export function useExecuting(projectId: string) {
  return useQuery({
    queryKey: ['executing', projectId],
    queryFn: () => apiGet<ExecutionResponse>(`/projects/${projectId}/executing`),
  });
}

function useExecMutation<TArgs>(projectId: string, fn: (a: TArgs) => Promise<ExecutionResponse>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: (data) => {
      qc.setQueryData(['executing', projectId], data);
      qc.invalidateQueries({ queryKey: ['project', projectId] });
    },
  });
}

export function useUpdateExecution(projectId: string) {
  return useExecMutation(projectId, ({ wbsItemId, ...payload }: UpdateExecutionPayload & { wbsItemId: string }) =>
    apiPatch<ExecutionResponse>(`/projects/${projectId}/executing/${wbsItemId}`, payload),
  );
}
export function useAddCost(projectId: string) {
  return useExecMutation(projectId, ({ wbsItemId, ...payload }: CostPayload & { wbsItemId: string }) =>
    apiPost<ExecutionResponse>(`/projects/${projectId}/executing/${wbsItemId}/cost`, payload),
  );
}
export function useDeleteCost(projectId: string) {
  return useExecMutation(projectId, (costId: string) =>
    apiDelete<ExecutionResponse>(`/projects/${projectId}/executing/cost/${costId}`),
  );
}
