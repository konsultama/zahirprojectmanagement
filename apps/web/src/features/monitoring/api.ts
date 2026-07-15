import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiDelete, apiGet, apiPatch, apiPost } from '../../lib/api';
import type { CreateRiskPayload, DashboardData, QcResponse, Risk, UpdateQcPayload } from './types';

export function useQc(projectId: string) {
  return useQuery({ queryKey: ['qc', projectId], queryFn: () => apiGet<QcResponse>(`/projects/${projectId}/monitoring/qc`) });
}
export function useDashboard(projectId: string) {
  return useQuery({
    queryKey: ['dashboard', projectId],
    queryFn: () => apiGet<DashboardData>(`/projects/${projectId}/monitoring/dashboard`),
  });
}
export function useRisks(projectId: string) {
  return useQuery({ queryKey: ['risks', projectId], queryFn: () => apiGet<Risk[]>(`/projects/${projectId}/monitoring/risks`) });
}

export function useUpdateQc(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ wbsItemId, ...payload }: UpdateQcPayload & { wbsItemId: string }) =>
      apiPatch<QcResponse>(`/projects/${projectId}/monitoring/qc/${wbsItemId}`, payload),
    onSuccess: (data) => {
      qc.setQueryData(['qc', projectId], data);
      qc.invalidateQueries({ queryKey: ['executing', projectId] });
      qc.invalidateQueries({ queryKey: ['dashboard', projectId] });
      qc.invalidateQueries({ queryKey: ['stages', projectId] });
    },
  });
}

export function useCreateRisk(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateRiskPayload) => apiPost<Risk[]>(`/projects/${projectId}/monitoring/risks`, payload),
    onSuccess: (data) => qc.setQueryData(['risks', projectId], data),
  });
}
export function useUpdateRisk(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...payload }: Partial<CreateRiskPayload> & { id: string; status?: string }) =>
      apiPatch<Risk[]>(`/projects/${projectId}/monitoring/risks/${id}`, payload),
    onSuccess: (data) => qc.setQueryData(['risks', projectId], data),
  });
}
export function useDeleteRisk(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiDelete<Risk[]>(`/projects/${projectId}/monitoring/risks/${id}`),
    onSuccess: (data) => qc.setQueryData(['risks', projectId], data),
  });
}
