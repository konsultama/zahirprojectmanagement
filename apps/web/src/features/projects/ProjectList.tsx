import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useProjects, type ProjectFilters } from './api';
import { StatusBadge, ProgressBar, OverbudgetFlag } from '../../components/ui';
import { STATUS_META } from './statusConfig';
import { formatDate, formatRupiah } from '../../lib/format';
import type { ProjectStatus } from '../../lib/types';

const STATUSES: ProjectStatus[] = ['DRAFT', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'CLOSED', 'CANCELLED'];

export function ProjectList() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState<ProjectFilters>({
    page: 1,
    pageSize: 25,
    sort: 'code',
    order: 'asc',
    status: '',
    search: '',
  });

  const { data, isLoading, isError, error } = useProjects(filters);

  const toggleSort = (field: string) => {
    setFilters((f) => ({
      ...f,
      sort: field,
      order: f.sort === field && f.order === 'asc' ? 'desc' : 'asc',
      page: 1,
    }));
  };
  const sortMark = (field: string) => (filters.sort === field ? (filters.order === 'asc' ? ' ▲' : ' ▼') : '');

  return (
    <div className="page">
      <div className="page-head">
        <h1>Daftar Proyek</h1>
        <button className="btn-primary" onClick={() => navigate('/projects/new')}>
          + Proyek Baru
        </button>
      </div>

      <div className="toolbar">
        <input
          className="search"
          placeholder="Cari kode, nama proyek, atau client…"
          value={filters.search}
          onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value, page: 1 }))}
        />
        <select
          value={filters.status}
          onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value as ProjectStatus | '', page: 1 }))}
        >
          <option value="">Semua status</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS_META[s].label}
            </option>
          ))}
        </select>
      </div>

      {isError && (
        <div className="banner banner-error">{(error as Error)?.message ?? 'Gagal memuat data.'}</div>
      )}

      <div className="card table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th className="sortable" onClick={() => toggleSort('code')}>
                Kode{sortMark('code')}
              </th>
              <th className="sortable" onClick={() => toggleSort('name')}>
                Nama Proyek{sortMark('name')}
              </th>
              <th>Client</th>
              <th>PIC</th>
              <th>Lokasi</th>
              <th className="sortable" onClick={() => toggleSort('finishDate')}>
                Selesai{sortMark('finishDate')}
              </th>
              <th style={{ width: 160 }}>Progress</th>
              <th>Serapan</th>
              <th className="sortable" onClick={() => toggleSort('status')}>
                Status{sortMark('status')}
              </th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={9} className="muted center">
                  Memuat…
                </td>
              </tr>
            )}
            {!isLoading && data?.data.length === 0 && (
              <tr>
                <td colSpan={9} className="muted center">
                  Belum ada proyek. Klik "Proyek Baru" untuk membuat.
                </td>
              </tr>
            )}
            {data?.data.map((p) => (
              <tr key={p.id} className="row-clickable" onClick={() => navigate(`/projects/${p.id}`)}>
                <td>
                  <Link to={`/projects/${p.id}`} onClick={(e) => e.stopPropagation()}>
                    {p.code}
                  </Link>
                </td>
                <td>
                  {p.name} {p.isOverbudget && <OverbudgetFlag />}
                </td>
                <td>{p.client?.name ?? '—'}</td>
                <td>{p.pic?.name ?? '—'}</td>
                <td>
                  {p.locations[0]?.name ?? '—'}
                  {p.locationCount > 1 && <span className="chip">+{p.locationCount - 1}</span>}
                </td>
                <td>{formatDate(p.finishDate)}</td>
                <td>
                  <ProgressBar value={p.progressPct} />
                </td>
                <td title={`${formatRupiah(p.actualCost)} / ${formatRupiah(p.totalBudget)}`}>
                  {p.serapanPct}%
                </td>
                <td>
                  <StatusBadge status={p.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {data && data.totalPages > 1 && (
        <div className="pager">
          <button disabled={filters.page <= 1} onClick={() => setFilters((f) => ({ ...f, page: f.page - 1 }))}>
            ‹ Sebelumnya
          </button>
          <span>
            Halaman {data.page} / {data.totalPages} · {data.total} proyek
          </span>
          <button
            disabled={filters.page >= data.totalPages}
            onClick={() => setFilters((f) => ({ ...f, page: f.page + 1 }))}
          >
            Berikutnya ›
          </button>
        </div>
      )}
    </div>
  );
}
