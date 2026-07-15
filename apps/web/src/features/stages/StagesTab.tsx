import { useState } from 'react';
import { Lock } from 'lucide-react';
import { useStages } from './api';
import { InitiatingPanel } from './InitiatingPanel';
import { PlanningPanel } from '../planning/PlanningPanel';
import { STAGE_META, STAGE_STATUS_META } from '../projects/statusConfig';
import type { StageType } from '../../lib/types';

export function StagesTab({ projectId }: { projectId: string }) {
  const { data: stages, isLoading } = useStages(projectId);
  const [active, setActive] = useState<StageType>('INITIATING');

  if (isLoading || !stages) return <div className="card muted">Memuat tahapan…</div>;

  return (
    <div className="stages-tab">
      <div className="stage-subnav">
        {stages.map((s) => {
          const meta = STAGE_STATUS_META[s.status];
          return (
            <button
              key={s.id}
              className={`stage-subnav-item ${s.stageType === active ? 'active' : ''}`}
              onClick={() => setActive(s.stageType)}
            >
              <span className="ssi-seq" style={{ background: meta.color }}>
                {s.sequence}
              </span>
              <span className="ssi-name">{STAGE_META[s.stageType]}</span>
              <span className="ssi-status" style={{ color: meta.color }}>
                {meta.label}
                {s.approvalLocked && <Lock size={12} />}
              </span>
            </button>
          );
        })}
      </div>

      <div className="stage-body">
        {active === 'INITIATING' && <InitiatingPanel projectId={projectId} />}
        {active === 'PLANNING' && <PlanningPanel projectId={projectId} />}
        {active !== 'INITIATING' && active !== 'PLANNING' && (
          <div className="card placeholder">
            <Lock size={32} strokeWidth={1.5} />
            <p>
              Tahap <strong>{STAGE_META[active]}</strong> akan dibangun pada modul berikutnya (realisasi progres &
              biaya / QC).
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
