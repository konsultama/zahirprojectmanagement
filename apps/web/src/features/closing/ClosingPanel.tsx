import { useEffect, useState } from 'react';
import { Check, Send, X, FileText, AlertTriangle } from 'lucide-react';
import { ApiError } from '../../lib/api';
import { useToast } from '../../components/Toast';
import { useSession } from '../../session';
import { formatDate, formatRupiah } from '../../lib/format';
import {
  useApproveClosing,
  useClosing,
  useMasterUpdate,
  useRejectClosing,
  useSaveEvaluation,
  useSubmitClosing,
  useUpdateDoc,
} from './api';
import { ClosureReport } from './ClosureReport';
import { FileUpload } from '../../components/FileUpload';
import type { DocumentStatus } from './types';

const DOC_STATUS: { value: DocumentStatus; label: string }[] = [
  { value: 'BELUM', label: 'Belum' },
  { value: 'ADA', label: 'Ada' },
  { value: 'TERVERIFIKASI', label: 'Terverifikasi' },
  { value: 'TIDAK_BERLAKU', label: 'Tidak Berlaku' },
];

export function ClosingPanel({ projectId }: { projectId: string }) {
  const { data, isLoading } = useClosing(projectId);
  const { currentUser } = useSession();
  const toast = useToast();
  const updateDoc = useUpdateDoc(projectId);
  const saveEval = useSaveEvaluation(projectId);
  const masterUpdate = useMasterUpdate(projectId);
  const submit = useSubmitClosing(projectId);
  const approve = useApproveClosing(projectId);
  const reject = useRejectClosing(projectId);

  const [lessons, setLessons] = useState('');
  const [vendorRating, setVendorRating] = useState('');
  const [clientRating, setClientRating] = useState('');
  const [finishDate, setFinishDate] = useState('');
  const [progress, setProgress] = useState('');
  const [rejectMode, setRejectMode] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [showReport, setShowReport] = useState(false);

  useEffect(() => {
    if (!data) return;
    setLessons(data.evaluation.lessonsLearned ?? '');
    setVendorRating(data.evaluation.vendorRating ? String(data.evaluation.vendorRating) : '');
    setClientRating(data.evaluation.clientRating ? String(data.evaluation.clientRating) : '');
    setFinishDate(data.master.actualFinishDate?.slice(0, 10) ?? '');
    setProgress(String(data.master.progressPct));
  }, [data]);

  if (isLoading || !data) return <div className="muted">Memuat penutupan…</div>;

  const role = currentUser?.role;
  const canEdit = (role === 'ADMIN' || role === 'PM') && !data.readOnly;
  const canApprove = role === 'ADMIN' && data.stage.status === 'SUBMITTED';
  const closed = data.readOnly;

  const run = async (fn: () => Promise<unknown>, ok: string) => {
    try {
      await fn();
      toast.success(ok);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.messages[0] : 'Gagal.');
    }
  };

  const s = data.autoSummary;

  return (
    <div className="planning-panel">
      {closed && (
        <div className="banner banner-ok">
          <Check size={18} /> Proyek <strong>Ditutup (Closed)</strong>
          {data.stage.approvedAt ? ` pada ${formatDate(data.stage.approvedAt)}` : ''}. Seluruh data read-only.
          <button className="btn-ghost" style={{ marginLeft: 'auto' }} onClick={() => setShowReport(true)}>
            <FileText size={15} /> Closure Report
          </button>
        </div>
      )}
      {!closed && data.stage.rejectionReason && (
        <div className="banner banner-error">
          <AlertTriangle size={18} /> Ditolak: {data.stage.rejectionReason}
        </div>
      )}

      {/* Auto summary (§7.2.6 C) */}
      <div className="evm-grid">
        <div className="evm-card">
          <span className="dh-label">Anggaran Rencana vs Terpakai</span>
          <strong>{formatRupiah(s.budget.actual)}</strong>
          <span className="muted small">dari {formatRupiah(s.budget.plan)} · varians {formatRupiah(s.budget.variance)}</span>
        </div>
        <div className="evm-card">
          <span className="dh-label">Jadwal (rencana → aktual)</span>
          <strong>{s.schedule.actualDays} hari</strong>
          <span className="muted small">rencana {s.schedule.plannedDays} hari · {s.schedule.diffDays >= 0 ? '+' : ''}{s.schedule.diffDays} hari</span>
        </div>
        <div className="evm-card">
          <span className="dh-label">Mutu & Risiko</span>
          <strong>{s.qcFindings} temuan QC</strong>
          <span className="muted small">{s.risksOccurred} risiko terjadi · progres {s.progressPct}%</span>
        </div>
      </div>

      {/* Documents */}
      <div className="card">
        <div className="loc-head">
          <label className="field-label">
            Kelengkapan Dokumen — {data.completeness.requiredDone}/{data.completeness.requiredTotal} wajib lengkap
          </label>
        </div>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Dokumen</th>
                <th>Wajib</th>
                <th>Status</th>
                <th>No. Dokumen</th>
                <th>Tanggal</th>
                <th>File</th>
              </tr>
            </thead>
            <tbody>
              {data.documents.map((d) => (
                <tr key={d.id}>
                  <td>{d.name}</td>
                  <td>{d.isRequired ? <span className="chip">Wajib</span> : '—'}</td>
                  <td>
                    <select
                      value={d.status}
                      disabled={!canEdit}
                      onChange={(e) => {
                        const status = e.target.value as DocumentStatus;
                        if (status === 'TIDAK_BERLAKU' && d.isRequired) {
                          const waiverReason = window.prompt('Alasan dokumen wajib "Tidak Berlaku":');
                          if (!waiverReason) return;
                          run(() => updateDoc.mutateAsync({ id: d.id, status, waiverReason }), 'Dokumen diperbarui');
                        } else {
                          run(() => updateDoc.mutateAsync({ id: d.id, status }), 'Dokumen diperbarui');
                        }
                      }}
                    >
                      {DOC_STATUS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <input
                      defaultValue={d.documentNo ?? ''}
                      disabled={!canEdit}
                      onBlur={(e) => e.target.value !== (d.documentNo ?? '') && run(() => updateDoc.mutateAsync({ id: d.id, documentNo: e.target.value }), 'Tersimpan')}
                    />
                  </td>
                  <td>
                    <input
                      type="date"
                      defaultValue={d.documentDate?.slice(0, 10) ?? ''}
                      disabled={!canEdit}
                      onChange={(e) => run(() => updateDoc.mutateAsync({ id: d.id, documentDate: e.target.value }), 'Tersimpan')}
                    />
                  </td>
                  <td>
                    <FileUpload
                      value={d.fileUrl}
                      disabled={!canEdit}
                      onUploaded={(url) => run(() => updateDoc.mutateAsync({ id: d.id, fileUrl: url }), 'File tersimpan')}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Evaluation + Master update */}
      <div className="closing-cols">
        <div className="card">
          <label className="field-label">Evaluasi Akhir</label>
          <div className="field">
            <label className="field-label">Lessons Learned *</label>
            <textarea rows={3} value={lessons} disabled={!canEdit} onChange={(e) => setLessons(e.target.value)} />
          </div>
          <div className="two-col">
            <div className="field">
              <label className="field-label">Penilaian Vendor (1–5)</label>
              <input type="number" min={1} max={5} value={vendorRating} disabled={!canEdit} onChange={(e) => setVendorRating(e.target.value)} />
            </div>
            <div className="field">
              <label className="field-label">Kepuasan Client (1–5)</label>
              <input type="number" min={1} max={5} value={clientRating} disabled={!canEdit} onChange={(e) => setClientRating(e.target.value)} />
            </div>
          </div>
          {canEdit && (
            <button
              className="btn-ghost"
              onClick={() =>
                run(
                  () =>
                    saveEval.mutateAsync({
                      lessonsLearned: lessons,
                      vendorRating: vendorRating ? Number(vendorRating) : undefined,
                      clientRating: clientRating ? Number(clientRating) : undefined,
                    }),
                  'Evaluasi tersimpan',
                )
              }
            >
              Simpan Evaluasi
            </button>
          )}
        </div>

        <div className="card">
          <label className="field-label">Update Master Data Project</label>
          <div className="two-col">
            <div className="field">
              <label className="field-label">Tanggal Selesai Aktual</label>
              <input type="date" value={finishDate} disabled={!canEdit} onChange={(e) => setFinishDate(e.target.value)} />
            </div>
            <div className="field">
              <label className="field-label">Progress (%)</label>
              <input type="number" min={0} max={100} value={progress} disabled={!canEdit} onFocus={(e) => e.target.select()} onChange={(e) => setProgress(e.target.value)} />
            </div>
          </div>
          {canEdit && (
            <button
              className="btn-ghost"
              onClick={() => {
                const pct = progress ? Number(progress) : undefined;
                let progressReason: string | undefined;
                if (pct != null && pct < 100) {
                  progressReason = window.prompt('Progress < 100% memerlukan alasan:') ?? undefined;
                  if (!progressReason) return;
                }
                run(() => masterUpdate.mutateAsync({ actualFinishDate: finishDate || undefined, progressPct: pct, progressReason }), 'Master data diperbarui');
              }}
            >
              Terapkan ke Master
            </button>
          )}
        </div>
      </div>

      {/* Gating + actions */}
      {!closed && (
        <>
          {!data.gating.canSubmit && (
            <div className="banner banner-warn">
              Belum bisa ditutup: {data.gating.blockers.join(' · ')}
            </div>
          )}
          <div className="init-actions">
            {canEdit && data.stage.status !== 'SUBMITTED' && (
              <button
                className="btn-primary"
                disabled={!data.gating.canSubmit}
                title={data.gating.canSubmit ? '' : data.gating.blockers.join('; ')}
                onClick={() => run(() => submit.mutateAsync(), 'Closing diajukan')}
              >
                <Send size={16} /> Submit Closing
              </button>
            )}
            {data.stage.status === 'SUBMITTED' && !canApprove && <span className="muted">Menunggu persetujuan Admin.</span>}
            {canApprove && !rejectMode && (
              <>
                <button className="btn-primary" onClick={() => run(() => approve.mutateAsync(), 'Proyek ditutup')}>
                  <Check size={16} /> Setujui & Tutup Proyek
                </button>
                <button className="btn-danger" onClick={() => setRejectMode(true)}>
                  <X size={16} /> Tolak
                </button>
              </>
            )}
          </div>
          {canApprove && rejectMode && (
            <div className="card status-dialog">
              <div className="field">
                <label className="field-label">Alasan Penolakan *</label>
                <textarea rows={2} value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} />
              </div>
              <div className="dialog-actions">
                <button className="btn-danger" disabled={!rejectReason.trim()} onClick={async () => {
                  await run(() => reject.mutateAsync(rejectReason), 'Closing ditolak');
                  setRejectMode(false);
                  setRejectReason('');
                }}>
                  Proses Penolakan
                </button>
                <button className="btn-ghost" onClick={() => setRejectMode(false)}>Batal</button>
              </div>
            </div>
          )}
        </>
      )}

      {showReport && <ClosureReport projectId={projectId} onClose={() => setShowReport(false)} />}
    </div>
  );
}
