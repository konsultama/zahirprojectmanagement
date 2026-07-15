import type { ProjectStatus } from '../lib/types';
import { STATUS_META } from '../features/projects/statusConfig';

export function StatusBadge({ status }: { status: ProjectStatus }) {
  const meta = STATUS_META[status];
  return (
    <span className="badge" style={{ color: meta.color, borderColor: meta.color }}>
      <span className="badge-dot" style={{ background: meta.color }} aria-hidden />
      {meta.label}
    </span>
  );
}

export function ProgressBar({ value }: { value: number }) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div className="progress" title={`${pct}%`}>
      <div className="progress-bar" style={{ width: `${pct}%` }} />
      <span className="progress-label">{Math.round(pct)}%</span>
    </div>
  );
}

export function OverbudgetFlag() {
  return (
    <span className="flag-over" title="Overbudget">
      ⚠ Overbudget
    </span>
  );
}
