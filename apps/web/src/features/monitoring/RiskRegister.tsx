import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { ApiError } from '../../lib/api';
import { useToast } from '../../components/Toast';
import { useSession } from '../../session';
import { useCreateRisk, useDeleteRisk, useRisks, useUpdateRisk } from './api';
import type { RiskCategory, RiskStatus } from './types';

const CATEGORIES: RiskCategory[] = ['BIAYA', 'JADWAL', 'MUTU', 'K3', 'EKSTERNAL', 'SDM'];
const STATUSES: RiskStatus[] = ['OPEN', 'MITIGATED', 'CLOSED', 'OCCURRED'];
const BAND_COLOR = { green: '#059669', yellow: '#f56b3b', red: '#e95044' };

export function RiskRegister({ projectId }: { projectId: string }) {
  const { data: risks, isLoading } = useRisks(projectId);
  const { currentUser } = useSession();
  const create = useCreateRisk(projectId);
  const update = useUpdateRisk(projectId);
  const del = useDeleteRisk(projectId);
  const toast = useToast();

  const [desc, setDesc] = useState('');
  const [category, setCategory] = useState<RiskCategory>('JADWAL');
  const [likelihood, setLikelihood] = useState(3);
  const [impact, setImpact] = useState(3);

  const canEdit = currentUser?.role === 'ADMIN' || currentUser?.role === 'PM' || currentUser?.role === 'QC';
  const canDelete = currentUser?.role === 'ADMIN' || currentUser?.role === 'PM';

  const run = async (fn: () => Promise<unknown>, ok: string) => {
    try {
      await fn();
      toast.success(ok);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.messages[0] : 'Gagal.');
    }
  };

  const add = () => {
    if (!desc.trim()) return;
    run(() => create.mutateAsync({ description: desc, category, likelihood, impact }), 'Risiko ditambahkan');
    setDesc('');
  };

  if (isLoading || !risks) return <div className="muted">Memuat risiko…</div>;

  return (
    <div className="planning-panel">
      {canEdit && (
        <div className="card risk-form">
          <input placeholder="Deskripsi risiko…" value={desc} onChange={(e) => setDesc(e.target.value)} />
          <select value={category} onChange={(e) => setCategory(e.target.value as RiskCategory)}>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <label className="risk-num">
            Kemungkinan
            <select value={likelihood} onChange={(e) => setLikelihood(Number(e.target.value))}>
              {[1, 2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </label>
          <label className="risk-num">
            Dampak
            <select value={impact} onChange={(e) => setImpact(Number(e.target.value))}>
              {[1, 2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </label>
          <span className="risk-score-preview">Skor {likelihood * impact}</span>
          <button className="btn-primary" onClick={add}>
            Tambah
          </button>
        </div>
      )}

      <div className="card table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Kode</th>
              <th>Deskripsi</th>
              <th>Kategori</th>
              <th className="num">K×D</th>
              <th>Skor</th>
              <th>Owner</th>
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {risks.length === 0 && (
              <tr>
                <td colSpan={8} className="muted center">
                  Belum ada risiko.
                </td>
              </tr>
            )}
            {risks.map((r) => (
              <tr key={r.id}>
                <td className="wbs-num">{r.code}</td>
                <td>{r.description}</td>
                <td>{r.category}</td>
                <td className="num">{r.likelihood}×{r.impact}</td>
                <td>
                  <span className="risk-badge" style={{ background: BAND_COLOR[r.band] }}>
                    {r.score}
                  </span>
                </td>
                <td>{r.owner?.name ?? '—'}</td>
                <td>
                  {canEdit ? (
                    <select value={r.status} onChange={(e) => run(() => update.mutateAsync({ id: r.id, status: e.target.value }), 'Status diperbarui')}>
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  ) : (
                    r.status
                  )}
                </td>
                <td>
                  {canDelete && (
                    <button className="row-icon danger" onClick={() => run(() => del.mutateAsync(r.id), 'Risiko dihapus')} title="Hapus">
                      <Trash2 size={15} />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
