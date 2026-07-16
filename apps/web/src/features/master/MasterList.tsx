import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Plus, Pencil, Trash2, Check, ChevronLeft } from 'lucide-react';
import { ApiError } from '../../lib/api';
import { useToast } from '../../components/Toast';
import { useSession } from '../../session';
import { formatRupiah } from '../../lib/format';
import { entityByKey, type Column } from './config';
import { MasterForm } from './MasterForm';
import { useCreateMaster, useDeleteMaster, useMasterList, useUpdateMaster, type MasterRow } from './api';

function cell(row: MasterRow, col: Column) {
  const v = row[col.key];
  if (col.kind === 'currency') return formatRupiah(Number(v ?? 0));
  if (col.kind === 'boolean') return v ? <Check size={15} color="#059669" /> : '—';
  if (col.kind === 'ref') return (v as { name?: string } | null)?.name ?? '—';
  return v == null || v === '' ? '—' : String(v);
}

export function MasterList({
  entityKey,
  backTo = '/master',
  backLabel = 'Data Master',
}: {
  entityKey?: string;
  backTo?: string;
  backLabel?: string;
} = {}) {
  const params = useParams();
  const entity = entityKey ?? params.entity ?? '';
  const config = entityByKey(entity);
  const { currentUser } = useSession();
  const toast = useToast();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<MasterRow | null>(null);
  const [creating, setCreating] = useState(false);

  const { data, isLoading } = useMasterList(entity, page, search);
  const create = useCreateMaster(entity);
  const update = useUpdateMaster(entity);
  const del = useDeleteMaster(entity);

  if (!config) return <div className="page">Entitas tidak dikenali.</div>;

  const canWrite = currentUser?.role === 'ADMIN' || currentUser?.role === 'PM';
  const canDelete = currentUser?.role === 'ADMIN';

  const onDelete = async (row: MasterRow) => {
    if (!window.confirm(`Hapus "${row.name ?? row.code}"?`)) return;
    try {
      await del.mutateAsync(row.id);
      toast.success('Data dihapus');
    } catch (e) {
      toast.error(e instanceof ApiError ? e.messages[0] : 'Gagal menghapus.');
    }
  };

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <Link to={backTo} className="back-link">
            <ChevronLeft size={16} /> {backLabel}
          </Link>
          <h1>{config.label}</h1>
        </div>
        {canWrite && (
          <button className="btn-primary" onClick={() => setCreating(true)}>
            <Plus size={16} /> Tambah
          </button>
        )}
      </div>

      <div className="toolbar">
        <input className="search" aria-label="Cari data" placeholder="Cari…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
      </div>

      <div className="card table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              {config.columns.map((c) => (
                <th key={c.key} className={c.kind === 'currency' ? 'num' : ''}>{c.label}</th>
              ))}
              {(canWrite || canDelete) && <th style={{ width: 90 }} />}
            </tr>
          </thead>
          <tbody>
            {isLoading && <tr><td colSpan={config.columns.length + 1} className="muted center">Memuat…</td></tr>}
            {data && data.data.length === 0 && (
              <tr><td colSpan={config.columns.length + 1} className="muted center">Belum ada data.</td></tr>
            )}
            {data?.data.map((row) => (
              <tr key={row.id}>
                {config.columns.map((c) => (
                  <td key={c.key} className={c.kind === 'currency' ? 'num' : ''}>{cell(row, c)}</td>
                ))}
                {(canWrite || canDelete) && (
                  <td className="wbs-actions">
                    {canWrite && (
                      <button className="row-icon" title="Ubah" onClick={() => setEditing(row)}>
                        <Pencil size={15} />
                      </button>
                    )}
                    {canDelete && (
                      <button className="row-icon danger" title="Hapus" onClick={() => onDelete(row)}>
                        <Trash2 size={15} />
                      </button>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {data && data.totalPages > 1 && (
        <div className="pager">
          <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>‹ Sebelumnya</button>
          <span>Halaman {data.page} / {data.totalPages} · {data.total} data</span>
          <button disabled={page >= data.totalPages} onClick={() => setPage((p) => p + 1)}>Berikutnya ›</button>
        </div>
      )}

      {creating && (
        <MasterForm config={config} initial={null} onClose={() => setCreating(false)} onSave={(body) => create.mutateAsync(body)} />
      )}
      {editing && (
        <MasterForm
          config={config}
          initial={editing}
          onClose={() => setEditing(null)}
          onSave={(body) => update.mutateAsync({ id: editing.id, ...body })}
        />
      )}
    </div>
  );
}
