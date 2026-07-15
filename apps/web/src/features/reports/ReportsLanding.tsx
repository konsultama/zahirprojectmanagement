import { Link } from 'react-router-dom';
import { LayoutGrid, Wallet, CalendarClock, ShieldCheck, AlertTriangle } from 'lucide-react';
import { REPORTS } from './config';

const ICONS: Record<string, typeof LayoutGrid> = { LayoutGrid, Wallet, CalendarClock, ShieldCheck, AlertTriangle };

export function ReportsLanding() {
  return (
    <div className="page">
      <div className="page-head">
        <h1>Laporan</h1>
      </div>
      <div className="master-cards">
        {REPORTS.map((r) => {
          const Icon = ICONS[r.icon] ?? LayoutGrid;
          return (
            <Link key={r.key} to={`/reports/${r.key}`} className="master-card">
              <span className="master-icon" style={{ background: r.accent }}>
                <Icon size={26} strokeWidth={2} />
              </span>
              <span>
                <span className="master-card-label">{r.title}</span>
                <span className="master-card-desc muted">{r.description}</span>
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
