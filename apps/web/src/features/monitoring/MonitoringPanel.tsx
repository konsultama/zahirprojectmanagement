import { useState } from 'react';
import { QcList } from './QcList';
import { RiskRegister } from './RiskRegister';
import { ControlDashboard } from './ControlDashboard';

const SUBTABS = ['QC', 'Register Risiko', 'Dashboard Kontrol'] as const;
type SubTab = (typeof SUBTABS)[number];

export function MonitoringPanel({ projectId }: { projectId: string }) {
  const [sub, setSub] = useState<SubTab>('QC');
  return (
    <div className="planning-panel">
      <div className="tabs subtabs">
        {SUBTABS.map((t) => (
          <button key={t} className={t === sub ? 'tab active' : 'tab'} onClick={() => setSub(t)}>
            {t}
          </button>
        ))}
      </div>
      {sub === 'QC' && <QcList projectId={projectId} />}
      {sub === 'Register Risiko' && <RiskRegister projectId={projectId} />}
      {sub === 'Dashboard Kontrol' && <ControlDashboard projectId={projectId} />}
    </div>
  );
}
