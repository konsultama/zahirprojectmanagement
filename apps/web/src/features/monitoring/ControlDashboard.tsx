import { ProgressBar } from '../../components/ui';
import { formatRupiah } from '../../lib/format';
import { useDashboard } from './api';

const LIGHT_COLOR: Record<string, string> = {
  green: '#059669',
  yellow: '#f56b3b',
  red: '#e95044',
  na: '#98a2b3',
};

function EvmCard({ label, value, light, hint }: { label: string; value: number | null; light: string; hint: string }) {
  return (
    <div className="evm-card" style={{ borderColor: LIGHT_COLOR[light] }}>
      <span className="dh-label">{label}</span>
      <strong style={{ color: LIGHT_COLOR[light], fontSize: '1.6rem' }}>{value == null ? '—' : value.toFixed(2)}</strong>
      <span className="muted small">{hint}</span>
    </div>
  );
}

export function ControlDashboard({ projectId }: { projectId: string }) {
  const { data: d, isLoading } = useDashboard(projectId);
  if (isLoading || !d) return <div className="muted">Memuat dashboard…</div>;

  return (
    <div className="planning-panel">
      {/* Progress: actual vs planned */}
      <div className="card">
        <div className="scurve-row">
          <div>
            <span className="dh-label">Progres Aktual</span>
            <ProgressBar value={d.progress.actual} />
          </div>
          <div>
            <span className="dh-label">Progres Rencana (berbasis waktu)</span>
            <ProgressBar value={d.progress.planned} />
          </div>
        </div>
      </div>

      {/* EVM cards */}
      <div className="evm-grid">
        <EvmCard label="SPI (Jadwal)" value={d.evm.spi} light={d.evm.spiLight} hint="Aktual ÷ Rencana · ≥1 tepat waktu" />
        <EvmCard label="CPI (Biaya)" value={d.evm.cpi} light={d.evm.cpiLight} hint="Earned ÷ Terpakai · ≥1 hemat" />
        <div className="evm-card">
          <span className="dh-label">Serapan Anggaran</span>
          <strong style={{ fontSize: '1.6rem' }}>{d.budget.serapanPct}%</strong>
          <span className="muted small">
            {formatRupiah(d.budget.actualCost)} / {formatRupiah(d.budget.totalBudget)}
          </span>
        </div>
      </div>

      <div className="dash-lists">
        <div className="card">
          <h3 className="dash-h">5 Kegiatan Paling Terlambat</h3>
          {d.topDelayed.length === 0 ? (
            <p className="muted small">Tidak ada yang terlambat.</p>
          ) : (
            <ul className="dash-ul">
              {d.topDelayed.map((r) => (
                <li key={r.wbsNumber}>
                  <span>
                    <b>{r.wbsNumber}</b> {r.name}
                  </span>
                  <span className="bad">−{r.delay}%</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="card">
          <h3 className="dash-h">5 Kegiatan Paling Boros</h3>
          {d.topOver.length === 0 ? (
            <p className="muted small">Tidak ada yang overbudget.</p>
          ) : (
            <ul className="dash-ul">
              {d.topOver.map((r) => (
                <li key={r.wbsNumber}>
                  <span>
                    <b>{r.wbsNumber}</b> {r.name}
                  </span>
                  <span className="bad">+{formatRupiah(r.costOver)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="card">
          <h3 className="dash-h">Ringkasan QC</h3>
          <ul className="dash-ul">
            {Object.entries(d.qcSummary).map(([k, v]) => (
              <li key={k}>
                <span>{k.replace(/_/g, ' ')}</span>
                <strong>{v}</strong>
              </li>
            ))}
            {Object.keys(d.qcSummary).length === 0 && <li className="muted">Belum ada data QC.</li>}
          </ul>
        </div>
      </div>
    </div>
  );
}
