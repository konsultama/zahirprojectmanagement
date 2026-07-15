import { Fragment, useState } from 'react';
import { Lock, ChevronDown, ChevronRight } from 'lucide-react';
import { ApiError } from '../../lib/api';
import { useToast } from '../../components/Toast';
import { useSession } from '../../session';
import { formatDate } from '../../lib/format';
import { useQc, useUpdateQc } from './api';
import type { QcRow, QcStatus, UpdateQcPayload } from './types';

const QC_META: Record<QcStatus, { label: string; color: string }> = {
  BELUM_DIPERIKSA: { label: 'Belum Diperiksa', color: '#98a2b3' },
  PASSED: { label: 'Passed', color: '#059669' },
  FAILED: { label: 'Failed', color: '#e95044' },
  PERLU_PERBAIKAN: { label: 'Perlu Perbaikan', color: '#f56b3b' },
  WAIVED: { label: 'Waived', color: '#7a5af8' },
};

export function QcList({ projectId }: { projectId: string }) {
  const { data, isLoading } = useQc(projectId);
  const { currentUser } = useSession();
  const update = useUpdateQc(projectId);
  const toast = useToast();
  const [open, setOpen] = useState<string | null>(null);

  if (isLoading || !data) return <div className="muted">Memuat QC…</div>;
  if (data.locked)
    return (
      <div className="card placeholder">
        <Lock size={32} strokeWidth={1.5} />
        <p>QC terkunci. Planning harus disetujui lebih dulu.</p>
      </div>
    );

  const canQc = currentUser?.role === 'ADMIN' || currentUser?.role === 'QC';

  return (
    <div className="planning-panel">
      <div className="qc-legend">
        {Object.entries(data.counts).map(([k, v]) => (
          <span key={k} className="qc-legend-item">
            <span className="badge-dot" style={{ background: QC_META[k as QcStatus].color }} />
            {QC_META[k as QcStatus].label}: <strong>{v}</strong>
          </span>
        ))}
      </div>

      <div className="card table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>No. WBS</th>
              <th>Kegiatan</th>
              <th>Lokasi</th>
              <th className="num">% Kerja</th>
              <th>Wajib QC</th>
              <th>Status QC</th>
              <th>Pemeriksa</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {data.rows.map((r) => {
              const meta = QC_META[r.qcStatus];
              const isOpen = open === r.wbsItemId;
              return (
                <Fragment key={r.wbsItemId}>
                  <tr className={r.qcStatus === 'FAILED' ? 'exec-row over' : ''}>
                    <td className="wbs-num">{r.wbsNumber}</td>
                    <td>{r.name}</td>
                    <td>{r.location ?? '—'}</td>
                    <td className="num">{r.progressPct}%</td>
                    <td>{r.isQcRequired ? <span className="chip">Wajib</span> : '—'}</td>
                    <td>
                      <span className="exec-status" style={{ background: `${meta.color}22`, color: meta.color }}>
                        {meta.label}
                      </span>
                    </td>
                    <td>{r.inspector?.name ?? '—'}</td>
                    <td>
                      {canQc && r.inspectable && (
                        <button className="row-icon" onClick={() => setOpen(isOpen ? null : r.wbsItemId)} title="Periksa">
                          {isOpen ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                        </button>
                      )}
                      {!r.inspectable && <span className="muted small" title="Belum selesai dikerjakan">🔒</span>}
                    </td>
                  </tr>
                  {isOpen && canQc && (
                    <tr className="cost-row">
                      <td colSpan={8}>
                        <QcEditor
                          row={r}
                          isAdmin={currentUser?.role === 'ADMIN'}
                          onSave={async (payload) => {
                            try {
                              await update.mutateAsync({ wbsItemId: r.wbsItemId, ...payload });
                              toast.success(`QC ${r.wbsNumber}: ${QC_META[payload.qcStatus].label}`);
                              setOpen(null);
                            } catch (e) {
                              toast.error(e instanceof ApiError ? e.messages[0] : 'Gagal.');
                            }
                          }}
                        />
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function QcEditor({ row, isAdmin, onSave }: { row: QcRow; isAdmin: boolean; onSave: (p: UpdateQcPayload) => void }) {
  const [status, setStatus] = useState<QcStatus>(row.qcStatus === 'BELUM_DIPERIKSA' ? 'PASSED' : row.qcStatus);
  const [findings, setFindings] = useState(row.findings ?? '');
  const [action, setAction] = useState(row.correctiveAction ?? '');
  const [due, setDue] = useState(row.remediationDue?.slice(0, 10) ?? '');
  const [reason, setReason] = useState('');

  const needFindings = status === 'FAILED' || status === 'PERLU_PERBAIKAN';
  const needAction = status === 'FAILED';
  const needDue = status === 'PERLU_PERBAIKAN';
  const needReason = status === 'WAIVED';

  return (
    <div className="cost-panel">
      <div className="qc-editor-grid">
        <div className="field">
          <label className="field-label">Status QC</label>
          <select value={status} onChange={(e) => setStatus(e.target.value as QcStatus)}>
            <option value="PASSED">Passed</option>
            <option value="FAILED">Failed</option>
            <option value="PERLU_PERBAIKAN">Perlu Perbaikan</option>
            {isAdmin && <option value="WAIVED">Waived (Admin)</option>}
          </select>
        </div>
        {needFindings && (
          <div className="field span-2">
            <label className="field-label">Catatan Temuan *</label>
            <textarea rows={2} value={findings} onChange={(e) => setFindings(e.target.value)} />
          </div>
        )}
        {needAction && (
          <div className="field span-2">
            <label className="field-label">Tindakan Korektif *</label>
            <textarea rows={2} value={action} onChange={(e) => setAction(e.target.value)} />
          </div>
        )}
        {needDue && (
          <div className="field">
            <label className="field-label">Batas Waktu Perbaikan *</label>
            <input type="date" value={due} onChange={(e) => setDue(e.target.value)} />
          </div>
        )}
        {needReason && (
          <div className="field span-2">
            <label className="field-label">Alasan Waived *</label>
            <input value={reason} onChange={(e) => setReason(e.target.value)} />
          </div>
        )}
      </div>
      <div className="dialog-actions">
        <button
          className="btn-primary"
          onClick={() =>
            onSave({
              qcStatus: status,
              findings: findings || undefined,
              correctiveAction: action || undefined,
              remediationDue: due || undefined,
              reason: reason || undefined,
            })
          }
        >
          Simpan Pemeriksaan
        </button>
      </div>
      {row.inspectionDate && (
        <p className="muted small">Terakhir diperiksa {formatDate(row.inspectionDate)} oleh {row.inspector?.name ?? '—'}.</p>
      )}
    </div>
  );
}
