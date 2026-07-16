import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { FolderKanban, Wallet, TrendingUp, AlertTriangle, Clock, CheckCircle2, ShieldAlert } from 'lucide-react';
import { apiGet } from '../../lib/api';
import { formatRupiah } from '../../lib/format';
import { ProgressBar } from '../../components/ui';
import { STATUS_META, STAGE_META } from '../projects/statusConfig';
import type { ProjectStatus, StageType } from '../../lib/types';

interface DashboardData {
  kpi: {
    totalProjects: number;
    activeProjects: number;
    closedProjects: number;
    totalBudget: number;
    totalActual: number;
    serapanPct: number;
    avgProgress: number;
    overbudgetCount: number;
    lateCount: number;
  };
  statusBreakdown: Record<string, number>;
  stageBreakdown: Record<string, number>;
  attention: { code: string; name: string; reasons: string[] }[];
  topBudget: { code: string; name: string; plan: number; actual: number; serapanPct: number; progressPct: number }[];
  qc: { total: number; passed: number; failed: number; perluPerbaikan: number; belum: number };
  risk: { total: number; high: number };
}

function Kpi({ icon: Icon, label, value, sub, tone }: { icon: typeof Wallet; label: string; value: string; sub?: string; tone?: string }) {
  return (
    <div className="kpi-card">
      <span className="kpi-icon" style={{ background: tone ? `${tone}22` : '#eef2ff', color: tone ?? 'var(--brand)' }}>
        <Icon size={22} strokeWidth={2} />
      </span>
      <div className="kpi-body">
        <span className="dh-label">{label}</span>
        <strong>{value}</strong>
        {sub && <span className="muted small">{sub}</span>}
      </div>
    </div>
  );
}

function Breakdown({ title, data, colorOf, labelOf }: { title: string; data: Record<string, number>; colorOf: (k: string) => string; labelOf: (k: string) => string }) {
  const entries = Object.entries(data);
  const max = Math.max(1, ...entries.map(([, v]) => v));
  return (
    <div className="card">
      <h3 className="dash-h">{title}</h3>
      {entries.length === 0 && <p className="muted small">Belum ada data.</p>}
      <div className="breakdown">
        {entries.map(([k, v]) => (
          <div key={k} className="breakdown-row">
            <span className="breakdown-label">{labelOf(k)}</span>
            <div className="breakdown-bar-wrap">
              <div className="breakdown-bar" style={{ width: `${(v / max) * 100}%`, background: colorOf(k) }} />
            </div>
            <strong className="breakdown-val">{v}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

export function Dashboard() {
  const { data: d, isLoading } = useQuery({ queryKey: ['dashboard-portfolio'], queryFn: () => apiGet<DashboardData>('/dashboard') });

  if (isLoading || !d) return <div className="page muted">Memuat dasbor…</div>;
  const k = d.kpi;

  return (
    <div className="page">
      <div className="page-head">
        <h1>Dasbor</h1>
      </div>

      {/* KPI cards */}
      <div className="kpi-grid">
        <Kpi icon={FolderKanban} label="Total Proyek" value={String(k.totalProjects)} sub={`${k.activeProjects} aktif · ${k.closedProjects} ditutup`} tone="#1570ef" />
        <Kpi icon={Wallet} label="Total Anggaran" value={formatRupiah(k.totalBudget)} sub={`Terpakai ${formatRupiah(k.totalActual)}`} tone="#7a5af8" />
        <Kpi icon={TrendingUp} label="Serapan Anggaran" value={`${k.serapanPct}%`} tone="#059669" />
        <Kpi icon={CheckCircle2} label="Rata-rata Progres" value={`${k.avgProgress}%`} tone="#027fb3" />
        <Kpi icon={AlertTriangle} label="Overbudget" value={String(k.overbudgetCount)} sub="proyek" tone="#e95044" />
        <Kpi icon={Clock} label="Terlambat" value={String(k.lateCount)} sub="proyek (SPI < 0,9)" tone="#f56b3b" />
      </div>

      {/* Breakdown */}
      <div className="two-col">
        <Breakdown
          title="Proyek per Status"
          data={d.statusBreakdown}
          colorOf={(s) => STATUS_META[s as ProjectStatus]?.color ?? '#98a2b3'}
          labelOf={(s) => STATUS_META[s as ProjectStatus]?.label ?? s}
        />
        <Breakdown
          title="Proyek per Tahapan Aktif"
          data={d.stageBreakdown}
          colorOf={() => '#1570ef'}
          labelOf={(s) => STAGE_META[s as StageType] ?? s}
        />
      </div>

      {/* QC + Risk + Attention */}
      <div className="dash-lists">
        <div className="card">
          <h3 className="dash-h">Ringkasan QC</h3>
          <ul className="dash-ul">
            <li><span>Passed / Waived</span><strong className="good">{d.qc.passed}</strong></li>
            <li><span>Failed</span><strong className="bad">{d.qc.failed}</strong></li>
            <li><span>Perlu Perbaikan</span><strong>{d.qc.perluPerbaikan}</strong></li>
            <li><span>Belum Diperiksa</span><strong>{d.qc.belum}</strong></li>
          </ul>
        </div>
        <div className="card">
          <h3 className="dash-h">Risiko</h3>
          <ul className="dash-ul">
            <li><span>Total Risiko</span><strong>{d.risk.total}</strong></li>
            <li><span><ShieldAlert size={14} /> Level Tinggi</span><strong className="bad">{d.risk.high}</strong></li>
          </ul>
        </div>
        <div className="card">
          <h3 className="dash-h">Perlu Perhatian</h3>
          {d.attention.length === 0 ? (
            <p className="muted small">Semua proyek dalam kondisi baik. ✓</p>
          ) : (
            <ul className="dash-ul">
              {d.attention.map((a) => (
                <li key={a.code}>
                  <span><b>{a.code}</b> {a.name}</span>
                  <span className="bad small">{a.reasons.join(', ')}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Top budget */}
      <div className="card">
        <h3 className="dash-h">Top Proyek (Anggaran)</h3>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Kode</th>
                <th>Nama</th>
                <th className="num">Anggaran</th>
                <th className="num">Terpakai</th>
                <th style={{ width: 150 }}>Progres</th>
              </tr>
            </thead>
            <tbody>
              {d.topBudget.map((b) => (
                <tr key={b.code}>
                  <td><Link to="/projects">{b.code}</Link></td>
                  <td>{b.name}</td>
                  <td className="num">{formatRupiah(b.plan)}</td>
                  <td className="num">{formatRupiah(b.actual)}</td>
                  <td><ProgressBar value={b.progressPct} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
