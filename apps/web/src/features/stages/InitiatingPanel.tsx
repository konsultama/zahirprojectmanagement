import { useEffect, useState } from 'react';
import { CheckCircle2, AlertTriangle, Send, Check, X } from 'lucide-react';
import { ApiError } from '../../lib/api';
import { useToast } from '../../components/Toast';
import { useSession } from '../../session';
import { SearchSelect } from '../../components/SearchSelect';
import { useUsersSearch } from '../projects/api';
import {
  useApproveInitiating,
  useInitiating,
  useRejectInitiating,
  useSaveInitiating,
  useSubmitInitiating,
  useToggleChecklist,
} from './api';
import type { Deliverable, Stakeholder } from './types';
import { STAGE_STATUS_META } from '../projects/statusConfig';

export function InitiatingPanel({ projectId }: { projectId: string }) {
  const toast = useToast();
  const { currentUser } = useSession();
  const { data, isLoading } = useInitiating(projectId);

  const save = useSaveInitiating(projectId);
  const toggle = useToggleChecklist(projectId);
  const submit = useSubmitInitiating(projectId);
  const approve = useApproveInitiating(projectId);
  const reject = useRejectInitiating(projectId);

  const [objective, setObjective] = useState('');
  const [inScope, setInScope] = useState('');
  const [outOfScope, setOutOfScope] = useState('');
  const [initialBudget, setInitialBudget] = useState('');
  const [estimatedDays, setEstimatedDays] = useState('');
  const [sponsorId, setSponsorId] = useState('');
  const [sponsorLabel, setSponsorLabel] = useState('');
  const [deliverables, setDeliverables] = useState<Deliverable[]>([]);
  const [stakeholders, setStakeholders] = useState<Stakeholder[]>([]);
  const [sponsorQuery, setSponsorQuery] = useState('');
  const [rejectMode, setRejectMode] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const users = useUsersSearch(sponsorQuery);

  // hydrate from server
  useEffect(() => {
    if (!data) return;
    const f = data.form;
    setObjective(f.objective ?? '');
    setInScope(f.inScope ?? '');
    setOutOfScope(f.outOfScope ?? '');
    setInitialBudget(f.initialBudget != null ? String(f.initialBudget) : '');
    setEstimatedDays(f.estimatedDays != null ? String(f.estimatedDays) : '');
    setSponsorId(f.sponsorApproverId ?? '');
    setSponsorLabel(f.sponsorApproverName ?? '');
    setDeliverables(f.deliverables.length ? f.deliverables : []);
    setStakeholders(f.stakeholders.length ? f.stakeholders : []);
  }, [data]);

  if (isLoading || !data) return <div className="muted">Memuat…</div>;

  const { stage, checklist, missing, canSubmit, readOnly } = data;
  const meta = STAGE_STATUS_META[stage.status];
  const canEdit = (currentUser?.role === 'ADMIN' || currentUser?.role === 'PM') && !readOnly;
  const canApprove = currentUser?.role === 'ADMIN' && stage.status === 'SUBMITTED';

  const onSave = async () => {
    try {
      await save.mutateAsync({
        objective,
        inScope,
        outOfScope,
        initialBudget: initialBudget ? Number(initialBudget) : undefined,
        estimatedDays: estimatedDays ? Number(estimatedDays) : undefined,
        sponsorApproverId: sponsorId || undefined,
        deliverables: deliverables.filter((d) => d.name.trim()),
        stakeholders: stakeholders.filter((s) => s.name.trim()),
      });
      toast.success('Form Inisiasi tersimpan');
    } catch (e) {
      toast.error(e instanceof ApiError ? e.messages[0] : 'Gagal menyimpan.');
    }
  };

  const onToggle = async (itemId: string, checked: boolean) => {
    try {
      await toggle.mutateAsync({ itemId, isChecked: checked });
    } catch (e) {
      toast.error(e instanceof ApiError ? e.messages[0] : 'Gagal.');
    }
  };

  const run = async (fn: () => Promise<unknown>, ok: string) => {
    try {
      await fn();
      toast.success(ok);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.messages[0] : 'Gagal.');
    }
  };

  return (
    <div className="init-panel">
      {/* status / banners */}
      {readOnly && (
        <div className="banner banner-ok">
          <CheckCircle2 size={18} /> Tahap Initiating <strong>Disetujui</strong>
          {stage.approvedAt ? ` pada ${new Date(stage.approvedAt).toLocaleDateString('id-ID')}` : ''}. Form
          bersifat read-only.
        </div>
      )}
      {!readOnly && stage.rejectionReason && (
        <div className="banner banner-error">
          <AlertTriangle size={18} /> Ditolak: {stage.rejectionReason}
        </div>
      )}

      <div className="init-head">
        <span className="badge" style={{ color: meta.color, borderColor: meta.color }}>
          <span className="badge-dot" style={{ background: meta.color }} /> {meta.label}
        </span>
        <span className="muted">Kelengkapan: {stage.completionPct}%</span>
      </div>

      {/* Form */}
      <div className="card form-grid">
        <div className="field span-2">
          <label className="field-label">Tujuan Proyek *</label>
          <textarea rows={2} value={objective} disabled={!canEdit} onFocus={(e) => e.target.select()} onChange={(e) => setObjective(e.target.value)} />
        </div>
        <div className="field">
          <label className="field-label">Ruang Lingkup — In Scope *</label>
          <textarea rows={2} value={inScope} disabled={!canEdit} onChange={(e) => setInScope(e.target.value)} />
        </div>
        <div className="field">
          <label className="field-label">Ruang Lingkup — Out of Scope</label>
          <textarea rows={2} value={outOfScope} disabled={!canEdit} onChange={(e) => setOutOfScope(e.target.value)} />
        </div>
        <div className="field">
          <label className="field-label">Estimasi Anggaran Awal *</label>
          <input type="number" value={initialBudget} disabled={!canEdit} onFocus={(e) => e.target.select()} onChange={(e) => setInitialBudget(e.target.value)} />
        </div>
        <div className="field">
          <label className="field-label">Estimasi Durasi (hari) *</label>
          <input type="number" value={estimatedDays} disabled={!canEdit} onFocus={(e) => e.target.select()} onChange={(e) => setEstimatedDays(e.target.value)} />
        </div>
        <div className="field span-2">
          <label className="field-label">Sponsor / Approver *</label>
          {canEdit ? (
            <SearchSelect
              value={sponsorId}
              valueLabel={sponsorLabel}
              placeholder="Cari user…"
              options={(users.data ?? []).map((u) => ({ id: u.id, name: u.name, sub: u.role }))}
              onSearch={setSponsorQuery}
              onSelect={(o) => {
                setSponsorId(o.id);
                setSponsorLabel(o.name);
              }}
            />
          ) : (
            <input value={sponsorLabel || '—'} disabled />
          )}
        </div>

        {/* Deliverables */}
        <div className="span-2">
          <MiniList
            title="Deliverable Utama *"
            rows={deliverables}
            disabled={!canEdit}
            cols={[
              { key: 'name', label: 'Nama', placeholder: 'mis. Gudang siap operasi' },
              { key: 'targetDate', label: 'Target', type: 'date' },
            ]}
            onChange={setDeliverables}
            makeEmpty={() => ({ name: '' })}
          />
        </div>

        {/* Stakeholders */}
        <div className="span-2">
          <MiniList
            title="Stakeholder *"
            rows={stakeholders}
            disabled={!canEdit}
            cols={[
              { key: 'name', label: 'Nama', placeholder: 'Nama stakeholder' },
              { key: 'role', label: 'Peran' },
              { key: 'influence', label: 'Pengaruh', type: 'influence' },
            ]}
            onChange={setStakeholders}
            makeEmpty={() => ({ name: '', influence: 'MEDIUM' as const })}
          />
        </div>
      </div>

      {/* Checklist */}
      <div className="card">
        <div className="loc-head">
          <label className="field-label">
            Checklist Persetujuan — {data.requiredChecklistDone}/{data.requiredChecklistTotal} wajib selesai
          </label>
        </div>
        <ul className="checklist">
          {checklist.map((c) => (
            <li key={c.id}>
              <label>
                <input
                  type="checkbox"
                  checked={c.isChecked}
                  disabled={!canEdit || toggle.isPending}
                  onChange={(e) => onToggle(c.id, e.target.checked)}
                />
                <span>{c.text}</span>
                {c.isRequired && <span className="req">wajib</span>}
              </label>
            </li>
          ))}
        </ul>
      </div>

      {/* Actions */}
      <div className="init-actions">
        {canEdit && (
          <button className="btn-ghost" onClick={onSave} disabled={save.isPending}>
            {save.isPending ? 'Menyimpan…' : 'Simpan Form'}
          </button>
        )}
        {canEdit && stage.status !== 'SUBMITTED' && (
          <button
            className="btn-primary"
            disabled={!canSubmit || submit.isPending}
            title={canSubmit ? 'Ajukan untuk persetujuan' : `Belum lengkap: ${missing.join('; ')}`}
            onClick={() => run(() => submit.mutateAsync(), 'Diajukan untuk persetujuan')}
          >
            <Send size={16} /> Submit untuk Persetujuan
          </button>
        )}
        {canApprove && !rejectMode && (
          <>
            <button className="btn-primary" onClick={() => run(() => approve.mutateAsync(), 'Initiating disetujui')}>
              <Check size={16} /> Setujui
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
            <button
              className="btn-danger"
              disabled={rejectReason.trim().length === 0 || reject.isPending}
              onClick={async () => {
                await run(() => reject.mutateAsync(rejectReason), 'Initiating ditolak');
                setRejectMode(false);
                setRejectReason('');
              }}
            >
              Proses Penolakan
            </button>
            <button className="btn-ghost" onClick={() => setRejectMode(false)}>
              Batal
            </button>
          </div>
        </div>
      )}

      {!canSubmit && stage.status !== 'APPROVED' && (
        <p className="muted small">
          Yang belum lengkap: {missing.join(' · ')}
        </p>
      )}
    </div>
  );
}

// --- generic mini inline list editor for deliverables / stakeholders ---
interface Col {
  key: string;
  label: string;
  type?: 'text' | 'date' | 'influence';
  placeholder?: string;
}
function MiniList<T>({
  title,
  rows,
  cols,
  disabled,
  onChange,
  makeEmpty,
}: {
  title: string;
  rows: T[];
  cols: Col[];
  disabled?: boolean;
  onChange: (rows: T[]) => void;
  makeEmpty: () => T;
}) {
  const cell = (r: T, key: string): unknown => (r as Record<string, unknown>)[key];
  const update = (i: number, key: string, val: unknown) =>
    onChange(rows.map((r, idx) => (idx === i ? ({ ...r, [key]: val } as T) : r)));
  return (
    <div className="loc-editor">
      <div className="loc-head">
        <label className="field-label">{title}</label>
        {!disabled && (
          <button type="button" className="btn-ghost" onClick={() => onChange([...rows, makeEmpty()])}>
            + Tambah
          </button>
        )}
      </div>
      <table className="loc-table">
        <thead>
          <tr>
            {cols.map((c) => (
              <th key={c.key}>{c.label}</th>
            ))}
            <th style={{ width: 36 }} />
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr>
              <td colSpan={cols.length + 1} className="muted">
                Belum ada. {!disabled && 'Klik "+ Tambah".'}
              </td>
            </tr>
          )}
          {rows.map((r, i) => (
            <tr key={i}>
              {cols.map((c) => (
                <td key={c.key}>
                  {c.type === 'influence' ? (
                    <select disabled={disabled} value={String(cell(r, c.key) ?? 'MEDIUM')} onChange={(e) => update(i, c.key, e.target.value)}>
                      <option value="HIGH">High</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="LOW">Low</option>
                    </select>
                  ) : (
                    <input
                      type={c.type === 'date' ? 'date' : 'text'}
                      disabled={disabled}
                      placeholder={c.placeholder}
                      // date fields arrive as full ISO strings; the date input needs yyyy-mm-dd
                      value={c.type === 'date' ? String(cell(r, c.key) ?? '').slice(0, 10) : String(cell(r, c.key) ?? '')}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => update(i, c.key, e.target.value)}
                    />
                  )}
                </td>
              ))}
              <td>
                {!disabled && (
                  <button type="button" className="btn-remove" onClick={() => onChange(rows.filter((_, idx) => idx !== i))}>
                    ×
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
