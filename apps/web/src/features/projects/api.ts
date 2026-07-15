import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiDelete, apiGet, apiPatch, apiPost } from '../../lib/api';
import type {
  ContactRef,
  CreateProjectPayload,
  ProjectDetail,
  ProjectListResponse,
  ProjectStatus,
  UserRef,
} from '../../lib/types';

export interface ProjectFilters {
  page: number;
  pageSize: number;
  search?: string;
  status?: ProjectStatus | '';
  sort?: string;
  order?: 'asc' | 'desc';
}

function toQuery(f: ProjectFilters): string {
  const p = new URLSearchParams();
  p.set('page', String(f.page));
  p.set('pageSize', String(f.pageSize));
  if (f.search) p.set('search', f.search);
  if (f.status) p.set('status', f.status);
  if (f.sort) p.set('sort', f.sort);
  if (f.order) p.set('order', f.order);
  return p.toString();
}

export function useProjects(filters: ProjectFilters) {
  return useQuery({
    queryKey: ['projects', filters],
    queryFn: () => apiGet<ProjectListResponse>(`/projects?${toQuery(filters)}`),
  });
}

export function useProject(id: string | undefined) {
  return useQuery({
    queryKey: ['project', id],
    queryFn: () => apiGet<ProjectDetail>(`/projects/${id}`),
    enabled: !!id,
  });
}

export function useCreateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateProjectPayload) => apiPost<ProjectDetail>('/projects', payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['projects'] }),
  });
}

export function useUpdateProject(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Partial<CreateProjectPayload> & { reason?: string }) =>
      apiPatch<ProjectDetail>(`/projects/${id}`, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['projects'] });
      qc.invalidateQueries({ queryKey: ['project', id] });
    },
  });
}

export function useChangeStatus(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { status: ProjectStatus; reason?: string }) =>
      apiPost<ProjectDetail>(`/projects/${id}/status`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['projects'] });
      qc.invalidateQueries({ queryKey: ['project', id] });
    },
  });
}

export function useDeleteProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiDelete<{ id: string }>(`/projects/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['projects'] }),
  });
}

export function useContacts(type: 'CLIENT' | 'VENDOR', search: string) {
  return useQuery({
    queryKey: ['contacts', type, search],
    queryFn: () =>
      apiGet<ContactRef[]>(`/contacts?type=${type}${search ? `&search=${encodeURIComponent(search)}` : ''}`),
  });
}

export function useUsersSearch(search: string) {
  return useQuery({
    queryKey: ['users', search],
    queryFn: () => apiGet<UserRef[]>(`/users${search ? `?search=${encodeURIComponent(search)}` : ''}`),
  });
}
