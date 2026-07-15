import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiDelete, apiGet, apiPatch, apiPost } from '../../lib/api';

export interface MasterRow {
  id: string;
  [key: string]: unknown;
}
export interface MasterListResponse {
  data: MasterRow[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export function useMasterList(entity: string, page: number, search: string) {
  const params = new URLSearchParams({ page: String(page), pageSize: '25' });
  if (search) params.set('search', search);
  return useQuery({
    queryKey: ['master', entity, page, search],
    queryFn: () => apiGet<MasterListResponse>(`/master/${entity}?${params.toString()}`),
  });
}

/** User accounts for the user-ref field (persona link). */
export function useUsers(enabled: boolean) {
  return useQuery({
    queryKey: ['users-all'],
    queryFn: () => apiGet<{ id: string; name: string; role: string }[]>('/users'),
    enabled,
  });
}

/** All rows of an entity for reference dropdowns. */
export function useMasterOptions(entity: string | undefined) {
  return useQuery({
    queryKey: ['master-options', entity],
    queryFn: () => apiGet<MasterListResponse>(`/master/${entity}?pageSize=100`),
    enabled: !!entity,
  });
}

export function useCreateMaster(entity: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Record<string, unknown>) => apiPost(`/master/${entity}`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['master', entity] });
      qc.invalidateQueries({ queryKey: ['master-options', entity] });
    },
  });
}
export function useUpdateMaster(entity: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: Record<string, unknown> & { id: string }) => apiPatch(`/master/${entity}/${id}`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['master', entity] });
      qc.invalidateQueries({ queryKey: ['master-options', entity] });
    },
  });
}
export function useDeleteMaster(entity: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiDelete(`/master/${entity}/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['master', entity] }),
  });
}
