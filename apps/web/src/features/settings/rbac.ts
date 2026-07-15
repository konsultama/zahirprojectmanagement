import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPatch } from '../../lib/api';

export interface RbacMatrix {
  permissions: { key: string; label: string }[];
  roles: { key: string; label: string }[];
  matrix: Record<string, Record<string, boolean>>;
}

export function useRbac() {
  return useQuery({ queryKey: ['rbac'], queryFn: () => apiGet<RbacMatrix>('/settings/rbac') });
}

export function useSetPermission() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { role: string; permissionKey: string; allowed: boolean }) =>
      apiPatch<RbacMatrix>('/settings/rbac', body),
    onSuccess: (data) => qc.setQueryData(['rbac'], data),
  });
}
