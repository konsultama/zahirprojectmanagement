import { Link } from 'react-router-dom';
import { Users, BookOpen, Boxes, Ruler, Warehouse, Tags, ListChecks } from 'lucide-react';
import { MASTER_ENTITIES } from './config';

const ICONS: Record<string, typeof Users> = { Users, BookOpen, Boxes, Ruler, Warehouse, Tags, ListChecks };

export function MasterLanding() {
  return (
    <div className="page">
      <div className="page-head">
        <h1>Data Master</h1>
      </div>
      <div className="master-cards">
        {MASTER_ENTITIES.filter((e) => !e.hidden).map((e) => {
          const Icon = ICONS[e.icon] ?? Boxes;
          return (
            <Link key={e.key} to={`/master/${e.key}`} className="master-card">
              <span className="master-icon" style={{ background: e.accent }}>
                <Icon size={26} strokeWidth={2} />
              </span>
              <span className="master-card-label">{e.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
