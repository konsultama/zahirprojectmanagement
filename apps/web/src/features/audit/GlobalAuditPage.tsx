import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, Download } from 'lucide-react';
import { apiGet } from '../../lib/api';
import { useSession } from '../../session';

interface AuditEntry {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  actor: { id: string; name: string; role: string } | null;
  project: { id: string; code: string; name: string } | null;
  reason: string | null;
  newValue: unknown;
  ipAddress: string | null;
  createdAt: string;
}
interface GlobalAuditResponse {
  data: AuditEntry[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  entityTypes: string[];
  projects: { id: string; code: string; name: string }[];
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
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  }).format(new Date(iso));
}
function compact(v: unknown): string {
  if (v == null) return '';
  if (typeof v === 'object') {
    return Object.entries(v as Record<string, unknown>).map(([k, val]) => `${k}: ${val}`).join(', ');
  }
  return String(v);
}

interface ExportRow {
  createdAt: string;
  action: string;
  entityType: string;
  entityId: string;
  project: string;
  actor: string;
  actorRole: string;
  reason: string;
  changes: string;
  ipAddress: string;
}
const CSV_HEADER = ['Waktu', 'Aksi', 'Entitas', 'ID Entitas', 'Proyek', 'Pelaku', 'Peran', 'Alasan', 'Perubahan', 'IP'];
const csvEsc = (s: string) => (/[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s);

export function GlobalAuditPage() {
  const { currentUser } = useSession();
  const [page, setPage] = useState(1);
  const [entityType, setEntityType] = useState('');
  const [action, setAction] = useState('');
  const [projectId, setProjectId] = useState('');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');

  const params = new URLSearchParams({ page: String(page), pageSize: '50' });
  if (entityType) params.set('entityType', entityType);
  if (action) params.set('action', action);
  if (projectId) params.set('projectId', projectId);
  if (search) params.set('search', search);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['global-audit', page, entityType, action, projectId, search],
    queryFn: () => apiGet<GlobalAuditResponse>(`/audit?${params.toString()}`),
    enabled: currentUser?.role === 'ADMIN',
  });

  const [exporting, setExporting] = useState(false);
  const exportCsv = async () => {
    setExporting(true);
    try {
      const exp = new URLSearchParams();
      if (entityType) exp.set('entityType', entityType);
      if (action) exp.set('action', action);
      if (projectId) exp.set('projectId', projectId);
      if (search) exp.set('search', search);
      const res = await apiGet<{ data: ExportRow[]; capped: boolean }>(`/audit/export?${exp.toString()}`);
      const lines = res.data.map((r) =>
        [
          fmtTime(r.createdAt), r.action, r.entityType, r.entityId, r.project,
          r.actor, r.actorRole, r.reason, r.changes, r.ipAddress,
        ].map((c) => csvEsc(String(c ?? ''))).join(','),
      );
      const csv = '﻿' + [CSV_HEADER.join(','), ...lines].join('\n'); // BOM for Excel UTF-8
      const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-trail-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  };

  if (currentUser?.role !== 'ADMIN') {
    return <div className="page"><p className="muted">Halaman ini hanya untuk Admin.</p></div>;
  }

  const reset = () => { setPage(1); };

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <Link to="/settings" className="back-link"><ChevronLeft size={16} /> Pengaturan</Link>
          <h1>Audit Trail Global</h1>
        </div>
      </div>

      <div className="toolbar">
        <select value={projectId} onChange={(e) => { setProjectId(e.target.value); reset(); }}>
          <option value="">Semua proyek</option>
          {(data?.projects ?? []).map((p) => (
            <option key={p.id} value={p.id}>{p.code} — {p.name}</option>
          ))}
        </select>
        <select value={entityType} onChange={(e) => { setEntityType(e.target.value); reset(); }}>
          <option value="">Semua entitas</option>
          {(data?.entityTypes ?? []).map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        <select value={action} onChange={(e) => { setAction(e.target.value); reset(); }}>
          <option value="">Semua aksi</option>
          {ACTIONS.map((a) => (
            <option key={a} value={a}>{ACTION_META[a]?.label ?? a}</option>
          ))}
        </select>
        <form
          onSubmit={(e) => { e.preventDefault(); setSearch(searchInput.trim()); reset(); }}
          style={{ display: 'flex', gap: '0.4rem' }}
        >
          <input
            placeholder="Cari pelaku / alasan…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
          <button type="submit" className="btn-ghost">Cari</button>
        </form>
        <span className="muted" style={{ marginLeft: 'auto', alignSelf: 'center' }}>{data?.total ?? 0} entri</span>
        <button className="btn-ghost" onClick={exportCsv} disabled={exporting || !data?.total}>
          <Download size={16} /> {exporting ? 'Mengekspor…' : 'Ekspor CSV'}
        </button>
      </div>

      <div className="card audit-list">
        {isLoading && <p className="muted">Memuat riwayat…</p>}
        {isError && <p className="muted">Gagal memuat audit trail.</p>}
        {data && data.data.length === 0 && <p className="muted center">Tidak ada entri yang cocok.</p>}
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
                  {e.project ? (
                    <Link to={`/projects/${e.project.id}`} className="chip" onClick={(ev) => ev.stopPropagation()}>
                      {e.project.code}
                    </Link>
                  ) : (
                    <span className="chip muted">global</span>
                  )}
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
