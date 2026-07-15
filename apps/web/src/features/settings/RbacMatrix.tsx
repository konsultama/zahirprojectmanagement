import { Link } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { ApiError } from '../../lib/api';
import { useToast } from '../../components/Toast';
import { useSession } from '../../session';
import { useRbac, useSetPermission } from './rbac';

export function RbacMatrix() {
  const { data, isLoading } = useRbac();
  const setPerm = useSetPermission();
  const { currentUser } = useSession();
  const toast = useToast();
  const canEdit = currentUser?.role === 'ADMIN';

  const toggle = async (role: string, permissionKey: string, allowed: boolean) => {
    try {
      await setPerm.mutateAsync({ role, permissionKey, allowed });
    } catch (e) {
      toast.error(e instanceof ApiError ? e.messages[0] : 'Gagal memperbarui.');
    }
  };

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <Link to="/settings" className="back-link">
            <ChevronLeft size={16} /> Pengaturan
          </Link>
          <h1>Peran & Hak Akses (RBAC)</h1>
        </div>
      </div>

      {!canEdit && (
        <div className="banner banner-warn">Hanya Admin yang dapat mengubah matriks hak akses.</div>
      )}

      {isLoading || !data ? (
        <div className="muted">Memuat…</div>
      ) : (
        <div className="card table-wrap">
          <table className="data-table rbac-table">
            <thead>
              <tr>
                <th style={{ textAlign: 'left', minWidth: 240 }}>Aksi</th>
                {data.roles.map((r) => (
                  <th key={r.key} className="center" title={r.label}>
                    {r.key}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.permissions.map((p) => (
                <tr key={p.key}>
                  <td>{p.label}</td>
                  {data.roles.map((r) => {
                    const allowed = data.matrix[p.key]?.[r.key] ?? false;
                    return (
                      <td key={r.key} className="center">
                        <input
                          type="checkbox"
                          checked={allowed}
                          disabled={!canEdit || setPerm.isPending}
                          onChange={(e) => toggle(r.key, p.key, e.target.checked)}
                          aria-label={`${p.label} — ${r.label}`}
                        />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="muted small">
        Matriks ini mengikuti PRD §6 dan tersimpan di basis data (dapat dikonfigurasi Admin, tercatat di audit
        trail). Penegakan hak akses pada endpoint saat ini masih memakai aturan bawaan yang sama.
      </p>
    </div>
  );
}
