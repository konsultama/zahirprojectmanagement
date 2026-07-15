import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiGet } from '../../lib/api';

interface AuditEntry {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  actor: { id: string; name: string; role: string } | null;
  reason: string | null;
  oldValue: unknown;
  newValue: unknown;
  ipAddress: string | null;
  createdAt: string;
}
interface AuditResponse {
  data: AuditEntry[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  entityTypes: string[];
}

const ACTION_META: Record<string, { label: string; color: string }> = {
  CREATE: { label: 'Buat', color: '#059669' },
  UPDATE: { label: 'Ubah', color: '#1570ef' },
  DELETE: { label: 'Hapus', color: '#e95044' },
  STATUS_CHANGE: { label: 'Ubah Status', color: '#7a5af8' },
  APPROVE: { label: 'Setujui', color: '#059669' },
  REJECT: { label: 'Tolak', color: '#e95044' },
  REOPEN: { label: 'Buka Ulang', color: '#f56b3b' },
};

const ACTIONS = ['CREATE', 'UPDATE', 'DELETE', 'STATUS_CHANGE', 'APPROVE', 'REJECT', 'REOPEN'];

function fmtTime(iso: string): string {
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}

function compact(v: unknown): string {
  if (v == null) return '';
  if (typeof v === 'object') {
    return Object.entries(v as Record<string, unknown>)
      .map(([k, val]) => `${k}: ${val}`)
      .join(', ');
  }
  return String(v);
}

export function AuditTrail({ projectId }: { projectId: string }) {
  const [page, setPage] = useState(1);
  const [entityType, setEntityType] = useState('');
  const [action, setAction] = useState('');

  const params = new URLSearchParams({ page: String(page), pageSize: '50' });
  if (entityType) params.set('entityType', entityType);
  if (action) params.set('action', action);

  const { data, isLoading } = useQuery({
    queryKey: ['audit', projectId, page, entityType, action],
    queryFn: () => apiGet<AuditResponse>(`/projects/${projectId}/audit?${params.toString()}`),
  });

  return (
    <div className="planning-panel">
      <div className="toolbar">
        <select value={entityType} onChange={(e) => { setEntityType(e.target.value); setPage(1); }}>
          <option value="">Semua entitas</option>
          {(data?.entityTypes ?? []).map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        <select value={action} onChange={(e) => { setAction(e.target.value); setPage(1); }}>
          <option value="">Semua aksi</option>
          {ACTIONS.map((a) => (
            <option key={a} value={a}>{ACTION_META[a]?.label ?? a}</option>
          ))}
        </select>
        <span className="muted" style={{ marginLeft: 'auto', alignSelf: 'center' }}>
          {data?.total ?? 0} entri
        </span>
      </div>

      <div className="card audit-list">
        {isLoading && <p className="muted">Memuat riwayat…</p>}
        {data && data.data.length === 0 && <p className="muted center">Belum ada riwayat.</p>}
        {data?.data.map((e) => {
          const meta = ACTION_META[e.action] ?? { label: e.action, color: '#667085' };
          const changes = compact(e.newValue);
          return (
            <div key={e.id} className="audit-item">
              <div className="audit-dot" style={{ background: meta.color }} />
              <div className="audit-body">
                <div className="audit-line">
                  <span className="audit-action" style={{ color: meta.color }}>{meta.label}</span>
                  <strong>{e.entityType}</strong>
                  <span className="muted">oleh {e.actor?.name ?? 'Sistem'}{e.actor?.role ? ` (${e.actor.role})` : ''}</span>
                  <span className="muted audit-time">{fmtTime(e.createdAt)}</span>
                </div>
                {changes && <div className="audit-detail muted">{changes}</div>}
                {e.reason && <div className="audit-reason">Alasan: {e.reason}</div>}
              </div>
            </div>
          );
        })}
      </div>

      {data && data.totalPages > 1 && (
        <div className="pager">
          <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>‹ Sebelumnya</button>
          <span>Halaman {data.page} / {data.totalPages}</span>
          <button disabled={page >= data.totalPages} onClick={() => setPage((p) => p + 1)}>Berikutnya ›</button>
        </div>
      )}
    </div>
  );
}
