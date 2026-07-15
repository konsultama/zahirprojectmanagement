import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ApiError } from '../../lib/api';
import { useToast } from '../../components/Toast';
import { useSession } from '../../session';
import { StatusBadge, ProgressBar, OverbudgetFlag } from '../../components/ui';
import { STAGE_META, STAGE_STATUS_META, STATUS_META, REASON_REQUIRED } from './statusConfig';
import { formatDate, formatRupiah, daysUntil } from '../../lib/format';
import { useChangeStatus, useDeleteProject, useProject } from './api';
import { StagesTab } from '../stages/StagesTab';
import type { ProjectStatus } from '../../lib/types';

const TABS = ['Ringkasan', 'Lokasi', 'Tahapan', 'Dokumen', 'Riwayat'] as const;
type Tab = (typeof TABS)[number];

export function ProjectDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { currentUser } = useSession();
  const { data: p, isLoading, isError, error } = useProject(id);
  const changeStatus = useChangeStatus(id ?? '');
  const del = useDeleteProject();

  const [tab, setTab] = useState<Tab>('Ringkasan');
  const [pendingStatus, setPendingStatus] = useState<ProjectStatus | ''>('');
  const [reason, setReason] = useState('');

  if (isLoading) return <div className="page muted">Memuat…</div>;
  if (isError || !p)
    return <div className="page banner banner-error">{(error as Error)?.message ?? 'Proyek tidak ditemukan.'}</div>;

  const remaining = daysUntil(p.finishDate);
  const reasonNeeded = pendingStatus && REASON_REQUIRED[p.status]?.has(pendingStatus);

  const applyStatus = async () => {
    if (!pendingStatus) return;
    try {
      await changeStatus.mutateAsync({ status: pendingStatus, reason: reason || undefined });
      toast.success(`Status → ${STATUS_META[pendingStatus].label}`);
      setPendingStatus('');
      setReason('');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.messages[0] : 'Gagal mengubah status.');
    }
  };

  const onDelete = async () => {
    if (!window.confirm(`Hapus proyek ${p.code}? Data akan di-soft-delete dan hilang dari daftar.`)) return;
    try {
      await del.mutateAsync(p.id);
      toast.success(`${p.code} dihapus`);
      navigate('/projects');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.messages[0] : 'Gagal menghapus.');
    }
  };

  const canEdit = currentUser?.role === 'ADMIN' || currentUser?.role === 'PM';
  const canDelete = currentUser?.role === 'ADMIN';

  return (
    <div className="page">
      {/* Sticky header (§7.1.5) */}
      <div className="detail-header">
        <div className="dh-main">
          <button className="btn-ghost back" onClick={() => navigate('/projects')}>
            ‹ Daftar
          </button>
          <div>
            <div className="dh-title">
              <span className="dh-code">{p.code}</span>
              <h1>{p.name}</h1>
              {p.isOverbudget && <OverbudgetFlag />}
            </div>
            <div className="dh-meta">
              <span>Client: {p.client?.name ?? '—'}</span>
              <span>PIC: {p.pic?.name ?? '—'}</span>
              <StatusBadge status={p.status} />
            </div>
          </div>
        </div>
        <div className="dh-stats">
          <div className="dh-stat">
            <span className="dh-label">Progress</span>
            <ProgressBar value={p.progressPct} />
          </div>
          <div className="dh-stat">
            <span className="dh-label">Serapan Anggaran</span>
            <strong>{p.serapanPct}%</strong>
          </div>
          <div className="dh-stat">
            <span className="dh-label">Sisa Hari</span>
            <strong className={remaining != null && remaining < 0 ? 'bad' : ''}>
              {remaining == null ? '—' : `${remaining} hari`}
            </strong>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="detail-actions">
        {canEdit && p.status !== 'CLOSED' && (
          <button className="btn-ghost" onClick={() => navigate(`/projects/${p.id}/edit`)}>
            Edit
          </button>
        )}
        {p.allowedTransitions.length > 0 && (
          <select value={pendingStatus} onChange={(e) => setPendingStatus(e.target.value as ProjectStatus)}>
            <option value="">Ubah status…</option>
            {p.allowedTransitions.map((s) => (
              <option key={s} value={s}>
                → {STATUS_META[s].label}
              </option>
            ))}
          </select>
        )}
        {canDelete && (
          <button className="btn-danger" onClick={onDelete}>
            Hapus
          </button>
        )}
      </div>

      {pendingStatus && (
        <div className="card status-dialog">
          <p>
            Ubah status ke <strong>{STATUS_META[pendingStatus].label}</strong>?
          </p>
          {reasonNeeded && (
            <div className="field">
              <label className="field-label">Alasan *</label>
              <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} />
            </div>
          )}
          <div className="dialog-actions">
            <button
              className="btn-primary"
              disabled={changeStatus.isPending || (!!reasonNeeded && reason.trim().length === 0)}
              onClick={applyStatus}
            >
              Proses
            </button>
            <button className="btn-ghost" onClick={() => { setPendingStatus(''); setReason(''); }}>
              Batal
            </button>
          </div>
        </div>
      )}

      {/* 5-step stage bar */}
      <div className="stage-bar">
        {p.stages.map((s) => (
          <div key={s.id} className="stage-step" title={STAGE_STATUS_META[s.status].label}>
            <span className="stage-dot" style={{ background: STAGE_STATUS_META[s.status].color }} />
            <span className="stage-name">{STAGE_META[s.stageType]}</span>
            <span className="stage-status" style={{ color: STAGE_STATUS_META[s.status].color }}>
              {STAGE_STATUS_META[s.status].label}
            </span>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="tabs">
        {TABS.map((t) => (
          <button key={t} className={t === tab ? 'tab active' : 'tab'} onClick={() => setTab(t)}>
            {t}
          </button>
        ))}
      </div>

      {tab === 'Ringkasan' && (
        <div className="card summary-grid">
          <Field label="Kode Proyek" value={p.code} />
          <Field label="Status" value={STATUS_META[p.status].label} />
          <Field label="Tanggal Mulai" value={formatDate(p.startDate)} />
          <Field label="Tanggal Selesai" value={formatDate(p.finishDate)} />
          <Field label="Nilai Kontrak" value={formatRupiah(p.contractValue)} />
          <Field label="Estimasi Anggaran Awal" value={formatRupiah(p.initialBudget)} />
          <Field label="Total Anggaran (Rencana)" value={formatRupiah(p.totalBudget)} />
          <Field label="Anggaran Terpakai" value={formatRupiah(p.actualCost)} />
          <div className="span-2">
            <span className="field-label">Deskripsi</span>
            <p>{p.description || '—'}</p>
          </div>
        </div>
      )}

      {tab === 'Lokasi' && (
        <div className="card table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Nama Lokasi</th>
                <th>Kota</th>
                <th>Provinsi</th>
                <th>Bobot</th>
                <th>PIC</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {p.locations.map((l) => (
                <tr key={l.id}>
                  <td>{l.name}</td>
                  <td>{l.city ?? '—'}</td>
                  <td>{l.province ?? '—'}</td>
                  <td>{l.weightPct}%</td>
                  <td>{l.pic?.name ?? '—'}</td>
                  <td>{l.isCompleted ? 'Selesai' : 'Berjalan'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'Tahapan' && <StagesTab projectId={p.id} />}

      {(tab === 'Dokumen' || tab === 'Riwayat') && (
        <div className="card placeholder">
          <p>
            Tab <strong>{tab}</strong> akan diisi oleh modul berikutnya (Dokumen Closing / Audit trail).
          </p>
        </div>
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="field">
      <span className="field-label">{label}</span>
      <span className="field-value">{value}</span>
    </div>
  );
}
