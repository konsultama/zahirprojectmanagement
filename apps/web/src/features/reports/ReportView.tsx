import { Link, useParams } from 'react-router-dom';
import { ChevronLeft, Printer, Download } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { apiGet } from '../../lib/api';
import { formatDate, formatRupiah } from '../../lib/format';
import { StatusBadge } from '../../components/ui';
import { STAGE_META } from '../projects/statusConfig';
import { reportByKey, type CellKind, type ReportColumn, type SummaryField } from './config';
import type { ProjectStatus, StageType } from '../../lib/types';

interface ReportData {
  rows: Record<string, unknown>[];
  summary: Record<string, unknown>;
}

const RISK_COLOR: Record<string, string> = { Tinggi: '#e95044', Sedang: '#f56b3b', Rendah: '#059669' };

function render(value: unknown, kind?: CellKind) {
  if (kind === 'currency') return formatRupiah(Number(value ?? 0));
  if (kind === 'percent') return value == null ? '—' : `${value}%`;
  if (kind === 'number') return value == null ? '—' : String(value);
  if (kind === 'date') return formatDate(value as string);
  if (kind === 'status') return <StatusBadge status={value as ProjectStatus} />;
  if (kind === 'stage') return STAGE_META[value as StageType] ?? String(value ?? '—');
  if (kind === 'risk-level')
    return (
      <span className="risk-badge" style={{ background: RISK_COLOR[value as string] ?? '#98a2b3' }}>
        {String(value)}
      </span>
    );
  if (kind === 'schedule')
    return value ? <span className="pill-ok">On track</span> : <span className="pill-bad">Terlambat</span>;
  if (kind === 'over') return value ? <span className="flag-over">⚠ Ya</span> : '—';
  return value == null || value === '' ? '—' : String(value);
}

function csvCell(value: unknown, kind?: CellKind): string {
  let s: string;
  if (kind === 'over') s = value ? 'Ya' : 'Tidak';
  else if (kind === 'schedule') s = value ? 'On track' : 'Terlambat';
  else if (kind === 'date') s = value ? String(value).slice(0, 10) : '';
  else s = value == null ? '' : String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function ReportView() {
  const { key = '' } = useParams();
  const config = reportByKey(key);
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['report', key],
    queryFn: () => apiGet<ReportData>(`/reports/${key}`),
    enabled: !!config,
  });

  if (!config) return <div className="page">Laporan tidak dikenali.</div>;

  const exportCsv = () => {
    if (!data) return;
    const header = config.columns.map((c) => c.label).join(',');
    const lines = data.rows.map((row) => config.columns.map((c) => csvCell(row[c.key], c.kind)).join(','));
    const csv = '﻿' + [header, ...lines].join('\n'); // BOM for Excel UTF-8
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `laporan-${key}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <Link to="/reports" className="back-link">
            <ChevronLeft size={16} /> Laporan
          </Link>
          <h1>{config.title}</h1>
        </div>
        <div className="report-actions no-print">
          <button className="btn-ghost" onClick={exportCsv} disabled={!data}>
            <Download size={16} /> Ekspor Excel
          </button>
          <button className="btn-ghost" onClick={() => window.print()}>
            <Printer size={16} /> Cetak
          </button>
        </div>
      </div>
      <p className="muted">{config.description}</p>

      {/* Summary cards */}
      {data && (
        <div className="report-summary">
          {config.summary.map((s: SummaryField) => (
            <div key={s.key} className="report-sum-item">
              <span className="dh-label">{s.label}</span>
              <strong>{render(data.summary[s.key], s.kind)}</strong>
            </div>
          ))}
        </div>
      )}

      {isError && <div className="banner banner-error">{(error as Error)?.message ?? 'Gagal memuat.'}</div>}

      <div className="card table-wrap print-area">
        <table className="data-table">
          <thead>
            <tr>
              {config.columns.map((c: ReportColumn) => (
                <th key={c.key} className={c.num ? 'num' : ''}>
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={config.columns.length} className="muted center">
                  Memuat…
                </td>
              </tr>
            )}
            {data && data.rows.length === 0 && (
              <tr>
                <td colSpan={config.columns.length} className="muted center">
                  Belum ada data.
                </td>
              </tr>
            )}
            {data?.rows.map((row, i) => (
              <tr key={i}>
                {config.columns.map((c: ReportColumn) => (
                  <td key={c.key} className={c.num ? 'num' : ''}>
                    {render(row[c.key], c.kind)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
