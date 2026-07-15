import { useEffect, useState } from 'react';
import { Lock, ChevronDown, ChevronRight, Plus, Trash2, AlertTriangle } from 'lucide-react';
import { ApiError } from '../../lib/api';
import { useToast } from '../../components/Toast';
import { useSession } from '../../session';
import { ProgressBar } from '../../components/ui';
import { formatRupiah, formatDate } from '../../lib/format';
import { useAddCost, useDeleteCost, useExecuting, useUpdateExecution } from './api';
import type { CostPayload, ExecutionRow, UpdateExecutionPayload } from './types';

const STATUS_LABEL: Record<string, string> = {
  NOT_STARTED: 'Belum Mulai',
  IN_PROGRESS: 'Berjalan',
  DONE: 'Selesai',
  BLOCKED: 'Terhambat',
  CANCELLED: 'Dibatalkan',
};

export function ExecutingPanel({ projectId }: { projectId: string }) {
  const { data, isLoading } = useExecuting(projectId);
  const { currentUser } = useSession();
  const update = useUpdateExecution(projectId);
  const addCost = useAddCost(projectId);
  const delCost = useDeleteCost(projectId);
  const toast = useToast();
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  if (isLoading || !data) return <div className="muted">Memuat realisasi…</div>;
  if (data.locked) {
    return (
      <div className="card placeholder">
        <Lock size={32} strokeWidth={1.5} />
        <p>Executing terkunci. Tahap Planning harus disetujui lebih dulu.</p>
      </div>
    );
  }

  const role = currentUser?.role;
  const editable = role === 'ADMIN' || role === 'PM' || role === 'SUPERVISOR';
  const { summary, rows } = data;

  const run = async (fn: () => Promise<unknown>, ok: string) => {
    try {
      await fn();
      toast.success(ok);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.messages[0] : 'Gagal.');
    }
  };
  const patch = (wbsItemId: string, p: UpdateExecutionPayload, ok = 'Tersimpan') =>
    run(() => update.mutateAsync({ wbsItemId, ...p }), ok);
  const toggleExpand = (id: string) =>
    setExpanded((s) => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });

  return (
    <div className="planning-panel">
      {/* summary */}
      <div className="budget-summary">
        <div className="bs-item" style={{ minWidth: 200 }}>
          <span className="dh-label">Progres Proyek</span>
          <ProgressBar value={summary.progressPct} />
        </div>
        <div className="bs-item">
          <span className="dh-label">Total Anggaran</span>
          <strong>{formatRupiah(summary.totalBudget)}</strong>
        </div>
        <div className="bs-item">
          <span className="dh-label">Terpakai</span>
          <strong>{formatRupiah(summary.actualCost)}</strong>
        </div>
        <div className="bs-item">
          <span className="dh-label">Serapan</span>
          <strong className={summary.serapanPct > 100 ? 'bad' : ''}>{summary.serapanPct}%</strong>
        </div>
      </div>

      <div className="card table-wrap">
        <table className="data-table wbs-table exec-table">
          <thead>
            <tr>
              <th>No. WBS</th>
              <th style={{ minWidth: 160 }}>Kegiatan</th>
              <th className="num">Qty Rncn</th>
              <th className="num">Qty Real</th>
              <th style={{ width: 120 }}>% Kerja</th>
              <th className="num">Angg. Rncn</th>
              <th className="num">Terpakai</th>
              <th className="num">Sisa</th>
              <th>✓</th>
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <ExecRow
                key={r.wbsItemId}
                row={r}
                editable={editable}
                expanded={expanded.has(r.wbsItemId)}
                onToggleExpand={() => toggleExpand(r.wbsItemId)}
                onPatch={(p, ok) => patch(r.wbsItemId, p, ok)}
                onAddCost={(payload) => run(() => addCost.mutateAsync({ wbsItemId: r.wbsItemId, ...payload }), 'Biaya dicatat')}
                onDeleteCost={(costId) => run(() => delCost.mutateAsync(costId), 'Catatan biaya dihapus')}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ExecRow({
  row,
  editable,
  expanded,
  onToggleExpand,
  onPatch,
  onAddCost,
  onDeleteCost,
}: {
  row: ExecutionRow;
  editable: boolean;
  expanded: boolean;
  onToggleExpand: () => void;
  onPatch: (p: UpdateExecutionPayload, ok?: string) => void;
  onAddCost: (p: CostPayload) => void;
  onDeleteCost: (costId: string) => void;
}) {
  const [qty, setQty] = useState(row.actualQty ? String(row.actualQty) : '');
  const [prog, setProg] = useState(String(row.progressPct));
  useEffect(() => {
    setQty(row.actualQty ? String(row.actualQty) : '');
    setProg(String(row.progressPct));
  }, [row.actualQty, row.progressPct]);

  const onCheck = (checked: boolean) => {
    // Checking "Selesai" completes the row to 100% (§7.2.4 C) — no reason needed.
    onPatch({ isCompleted: checked }, checked ? 'Ditandai selesai (100%)' : 'Centang dilepas');
  };

  return (
    <>
      <tr className={row.isOverBudget ? 'exec-row over' : 'exec-row'}>
        <td className="wbs-num">{row.wbsNumber}</td>
        <td>
          {row.name}
          {row.isOverBudget && <AlertTriangle size={13} className="over-icon" />}
          <div className="row-sub muted">
            {row.itemType === 'MATERIAL' ? 'Material' : 'Task'} · {row.location ?? '—'}
          </div>
        </td>
        <td className="num">{row.planQty || '—'}</td>
        <td className="num">
          <input
            className="cell-num"
            type="number"
            value={qty}
            disabled={!editable}
            onFocus={(e) => e.target.select()}
            onChange={(e) => setQty(e.target.value)}
            onBlur={() => {
              const v = qty === '' ? 0 : Number(qty);
              if (Number.isNaN(v)) {
                setQty(row.actualQty ? String(row.actualQty) : '');
                return;
              }
              if (v !== row.actualQty) onPatch({ actualQty: v });
            }}
          />
        </td>
        <td>
          <div className="pct-cell">
            <input
              className="cell-num"
              type="number"
              min={0}
              max={100}
              value={prog}
              disabled={!editable || row.itemType === 'MATERIAL'}
              title={row.itemType === 'MATERIAL' ? 'Terhitung dari Qty realisasi' : ''}
              onFocus={(e) => e.target.select()}
              onChange={(e) => setProg(e.target.value)}
              onBlur={() => {
                const raw = prog === '' ? 0 : Number(prog);
                if (Number.isNaN(raw)) {
                  setProg(String(row.progressPct));
                  return;
                }
                const v = Math.max(0, Math.min(100, raw));
                if (v !== raw) setProg(String(v));
                if (v !== row.progressPct) onPatch({ progressPct: v });
              }}
            />
            <span className="pct-sign">%</span>
          </div>
        </td>
        <td className="num">{formatRupiah(row.planBudget)}</td>
        <td className={row.isOverBudget ? 'num bad' : 'num'}>{formatRupiah(row.actualCost)}</td>
        <td className={row.sisaAnggaran < 0 ? 'num bad' : 'num'}>{formatRupiah(row.sisaAnggaran)}</td>
        <td className="center">
          <input type="checkbox" checked={row.isCompleted} disabled={!editable} onChange={(e) => onCheck(e.target.checked)} />
        </td>
        <td>
          <span className={`exec-status s-${row.status}`}>{STATUS_LABEL[row.status]}</span>
        </td>
        <td>
          <button className="row-icon" onClick={onToggleExpand} title="Catatan realisasi biaya">
            {expanded ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
          </button>
        </td>
      </tr>
      {expanded && (
        <tr className="cost-row">
          <td colSpan={11}>
            <CostPanel row={row} editable={editable} onAddCost={onAddCost} onDeleteCost={onDeleteCost} />
          </td>
        </tr>
      )}
    </>
  );
}

function CostPanel({
  row,
  editable,
  onAddCost,
  onDeleteCost,
}: {
  row: ExecutionRow;
  editable: boolean;
  onAddCost: (p: CostPayload) => void;
  onDeleteCost: (costId: string) => void;
}) {
  const [date, setDate] = useState('');
  const [desc, setDesc] = useState('');
  const [amount, setAmount] = useState('');
  const [ref, setRef] = useState('');
  const [reason, setReason] = useState('');

  const submit = () => {
    if (!date || !desc || !amount) return;
    onAddCost({ date, description: desc, amount: Number(amount), referenceNo: ref || undefined, reason: reason || undefined });
    setDate('');
    setDesc('');
    setAmount('');
    setRef('');
    setReason('');
  };

  return (
    <div className="cost-panel">
      <div className="cost-head">
        <strong>Catatan Realisasi Biaya — {row.wbsNumber} {row.name}</strong>
        <span className="muted">Terpakai {formatRupiah(row.actualCost)} / Rencana {formatRupiah(row.planBudget)}</span>
      </div>
      {row.costActuals.length > 0 ? (
        <table className="cost-table">
          <thead>
            <tr>
              <th>Tanggal</th>
              <th>Uraian</th>
              <th>No. Bukti</th>
              <th className="num">Nilai</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {row.costActuals.map((c) => (
              <tr key={c.id}>
                <td>{formatDate(c.date)}</td>
                <td>{c.description}</td>
                <td>{c.referenceNo ?? '—'}</td>
                <td className="num">{formatRupiah(c.amount)}</td>
                <td>
                  {editable && (
                    <button className="row-icon danger" onClick={() => onDeleteCost(c.id)} title="Hapus">
                      <Trash2 size={14} />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="muted small">Belum ada catatan biaya.</p>
      )}
      {editable && (
        <div className="cost-form">
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          <input placeholder="Uraian" value={desc} onChange={(e) => setDesc(e.target.value)} />
          <input placeholder="No. bukti" value={ref} onChange={(e) => setRef(e.target.value)} />
          <input type="number" placeholder="Nilai" value={amount} onFocus={(e) => e.target.select()} onChange={(e) => setAmount(e.target.value)} />
          <input placeholder="Alasan (jika overbudget)" value={reason} onChange={(e) => setReason(e.target.value)} />
          <button className="btn-primary" onClick={submit}>
            <Plus size={15} /> Catat
          </button>
        </div>
      )}
    </div>
  );
}
