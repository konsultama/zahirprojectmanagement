import { useState } from 'react';
import { Lock, Send, Check, X, Plus } from 'lucide-react';
import { ApiError } from '../../lib/api';
import { useToast } from '../../components/Toast';
import { useSession } from '../../session';
import { formatRupiah } from '../../lib/format';
import { STAGE_STATUS_META } from '../projects/statusConfig';
import { useContacts, useProject, useUsersSearch } from '../projects/api';
import { WbsRow, type RowOption } from './WbsRow';
import {
  useApprovePlanning,
  useCreateWbs,
  useDeleteWbs,
  usePlanning,
  useRejectPlanning,
  useSetOverbudget,
  useSubmitPlanning,
  useUpdateWbs,
} from './api';
import type { UpdateWbsPayload, WbsNode } from './types';

export function PlanningPanel({ projectId }: { projectId: string }) {
  const toast = useToast();
  const { currentUser } = useSession();
  const { data, isLoading } = usePlanning(projectId);

  const createWbs = useCreateWbs(projectId);
  const updateWbs = useUpdateWbs(projectId);
  const deleteWbs = useDeleteWbs(projectId);
  const setOver = useSetOverbudget(projectId);
  const submit = useSubmitPlanning(projectId);
  const approve = useApprovePlanning(projectId);
  const reject = useRejectPlanning(projectId);

  const users = useUsersSearch('');
  const vendors = useContacts('VENDOR', '');
  const project = useProject(projectId);
  const picOptions: RowOption[] = (users.data ?? []).map((u) => ({ id: u.id, label: u.name }));
  const vendorOptions: RowOption[] = (vendors.data ?? []).map((v) => ({ id: v.id, label: v.name }));
  const locationOptions: RowOption[] = (project.data?.locations ?? []).map((l) => ({ id: l.id, label: l.name }));

  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [showOver, setShowOver] = useState(false);
  const [tol, setTol] = useState('10');
  const [obReason, setObReason] = useState('');
  const [rejectMode, setRejectMode] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  if (isLoading || !data) return <div className="muted">Memuat RAB…</div>;

  const { summary, planningStatus, tree } = data;
  const meta = STAGE_STATUS_META[planningStatus];
  const role = currentUser?.role;
  const isPlanner = role === 'ADMIN' || role === 'PM';
  const editable = isPlanner && planningStatus !== 'APPROVED' && planningStatus !== 'SUBMITTED';
  const canApprove = (role === 'ADMIN' || role === 'FINANCE') && planningStatus === 'SUBMITTED';
  const canToggleOver = role === 'ADMIN' || role === 'FINANCE';

  const run = async (fn: () => Promise<unknown>, ok: string) => {
    try {
      await fn();
      toast.success(ok);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.messages[0] : 'Gagal.');
    }
  };

  // flatten tree honoring collapsed
  const rows: { node: WbsNode; depth: number; hasChildren: boolean }[] = [];
  const walk = (nodes: WbsNode[], depth: number) => {
    for (const n of nodes) {
      const hasChildren = n.children.length > 0;
      rows.push({ node: n, depth, hasChildren });
      if (hasChildren && !collapsed.has(n.id)) walk(n.children, depth + 1);
    }
  };
  walk(tree, 0);

  // predecessor options: every node (regardless of collapse), labelled by WBS number + name
  const predecessorOptions: RowOption[] = [];
  const collectAll = (nodes: WbsNode[]) => {
    for (const n of nodes) {
      predecessorOptions.push({ id: n.id, label: `${n.wbsNumber} ${n.name}` });
      collectAll(n.children);
    }
  };
  collectAll(tree);

  const toggle = (id: string) =>
    setCollapsed((s) => {
      const next = new Set(s);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const addRoot = () =>
    run(() => createWbs.mutateAsync({ name: 'Kegiatan Baru', itemType: 'TASK' }), 'Kegiatan ditambahkan');
  const addChild = (parentId: string) =>
    run(() => createWbs.mutateAsync({ parentId, name: 'Sub-kegiatan Baru', itemType: 'TASK' }), 'Sub-baris ditambahkan');
  const update = (id: string, patch: UpdateWbsPayload) =>
    run(() => updateWbs.mutateAsync({ id, ...patch }), 'Tersimpan');
  const del = (n: WbsNode) => {
    const kids = n.children.length;
    const msg = kids > 0 ? `Hapus "${n.name}" beserta ${kids} sub-baris?` : `Hapus "${n.name}"?`;
    if (window.confirm(msg)) run(() => deleteWbs.mutateAsync(n.id), 'Baris dihapus');
  };

  const overPct = summary.pctOfEstimate;
  const overClass = overPct != null && overPct > 100 ? 'over' : 'ok';

  return (
    <div className="planning-panel">
      {/* status + rejection */}
      {planningStatus === 'APPROVED' && (
        <div className="banner banner-ok">
          <Check size={18} /> Planning <strong>Disetujui</strong> — Baseline tersimpan. RAB read-only.
        </div>
      )}
      {data.tree.length > 0 && summary.isOverbudget && (
        <div className="banner banner-warn">
          ⚠ Proyek ditandai <strong>Overbudget</strong>. {summary.overbudgetReason}
        </div>
      )}

      {/* Sticky budget summary (§7.2.3 D) */}
      <div className="budget-summary">
        <div className="bs-item">
          <span className="dh-label">Estimasi Awal</span>
          <strong>{formatRupiah(summary.estimate)}</strong>
        </div>
        <div className="bs-item">
          <span className="dh-label">Total Rencana</span>
          <strong>{formatRupiah(summary.totalPlan)}</strong>
        </div>
        <div className="bs-item">
          <span className="dh-label">Selisih</span>
          <strong className={summary.selisih != null && summary.selisih > 0 ? 'bad' : 'good'}>
            {summary.selisih == null ? '—' : formatRupiah(summary.selisih)}
          </strong>
        </div>
        <div className="bs-item">
          <span className="dh-label">% Estimasi</span>
          <strong className={overClass === 'over' ? 'bad' : ''}>
            {overPct == null ? '—' : `${overPct}%`}
          </strong>
        </div>
        <div className="bs-status">
          <span className="badge" style={{ color: meta.color, borderColor: meta.color }}>
            <span className="badge-dot" style={{ background: meta.color }} /> {meta.label}
          </span>
        </div>
      </div>

      {/* Overbudget control */}
      {canToggleOver && (
        <div className="card overbudget-box">
          <label className="ob-toggle">
            <input
              type="checkbox"
              checked={summary.allowOverbudget}
              onChange={(e) => {
                if (e.target.checked) setShowOver(true);
                else run(() => setOver.mutateAsync({ allowOverbudget: false }), 'Overbudget dimatikan');
              }}
            />
            Izinkan Overbudget
            {summary.allowOverbudget && <span className="muted"> · toleransi {summary.overbudgetTolerancePct}%</span>}
          </label>
          {(showOver || summary.allowOverbudget) && (
            <div className="ob-fields">
              <div className="field">
                <label className="field-label">Batas Toleransi (%)</label>
                <input type="number" value={tol} onFocus={(e) => e.target.select()} onChange={(e) => setTol(e.target.value)} />
              </div>
              <div className="field" style={{ flex: 1 }}>
                <label className="field-label">Alasan Overbudget (min. 20 karakter)</label>
                <input value={obReason} placeholder={summary.overbudgetReason ?? ''} onChange={(e) => setObReason(e.target.value)} />
              </div>
              <button
                className="btn-primary"
                onClick={() =>
                  run(
                    () => setOver.mutateAsync({ allowOverbudget: true, tolerancePct: Number(tol), reason: obReason }),
                    'Overbudget diaktifkan',
                  )
                }
              >
                Simpan
              </button>
            </div>
          )}
        </div>
      )}

      {/* WBS tree table */}
      <div className="card table-wrap">
        <table className="data-table wbs-table">
          <thead>
            <tr>
              <th style={{ minWidth: 120 }}>No. WBS</th>
              <th style={{ minWidth: 200 }}>Nama Kegiatan</th>
              <th>Tipe</th>
              <th>Satuan</th>
              <th className="num">Qty</th>
              <th className="num">Nilai Anggaran</th>
              <th className="num">Total</th>
              <th>PIC</th>
              <th>Vendor</th>
              <th>Predecessor</th>
              <th style={{ width: 70 }} />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={11} className="muted center">
                  Belum ada kegiatan. {editable && 'Klik "Tambah Kegiatan".'}
                </td>
              </tr>
            )}
            {rows.map(({ node, depth, hasChildren }) => (
              <WbsRow
                key={node.id}
                node={node}
                depth={depth}
                hasChildren={hasChildren}
                collapsed={collapsed.has(node.id)}
                editable={editable}
                picOptions={picOptions}
                vendorOptions={vendorOptions}
                predecessorOptions={predecessorOptions}
                locationOptions={locationOptions}
                onToggle={() => toggle(node.id)}
                onUpdate={(patch) => update(node.id, patch)}
                onAddChild={() => addChild(node.id)}
                onDelete={() => del(node)}
              />
            ))}
          </tbody>
        </table>
        {editable && (
          <div className="wbs-add">
            <button className="btn-ghost" onClick={addRoot}>
              <Plus size={15} /> Tambah Kegiatan
            </button>
          </div>
        )}
      </div>

      {/* Stage actions */}
      <div className="init-actions">
        {editable && (
          <button className="btn-primary" onClick={() => run(() => submit.mutateAsync(), 'Planning diajukan')}>
            <Send size={16} /> Submit untuk Persetujuan
          </button>
        )}
        {planningStatus === 'SUBMITTED' && !canApprove && (
          <span className="muted">
            <Lock size={14} /> Menunggu persetujuan{summary.isOverbudget ? ' Finance (overbudget)' : ''}.
          </span>
        )}
        {canApprove && !rejectMode && (
          <>
            <button className="btn-primary" onClick={() => run(() => approve.mutateAsync(), 'Planning disetujui — Baseline dibuat')}>
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
              disabled={rejectReason.trim().length === 0}
              onClick={async () => {
                await run(() => reject.mutateAsync(rejectReason), 'Planning ditolak');
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
    </div>
  );
}
