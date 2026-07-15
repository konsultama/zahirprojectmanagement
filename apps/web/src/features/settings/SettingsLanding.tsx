import { Link } from 'react-router-dom';
import { UserCircle, ShieldCheck } from 'lucide-react';

const CARDS = [
  { to: '/settings/persona', label: 'Persona', icon: UserCircle, accent: 'rgba(46,179,236,0.15)', desc: 'Kelola persona pengguna (§5)' },
  { to: '/settings/rbac', label: 'Peran & Hak Akses', icon: ShieldCheck, accent: 'rgba(5,150,105,0.15)', desc: 'Matriks RBAC per peran (§6)' },
];

export function SettingsLanding() {
  return (
    <div className="page">
      <div className="page-head">
        <h1>Pengaturan</h1>
      </div>
      <div className="master-cards">
        {CARDS.map((c) => {
          const Icon = c.icon;
          return (
            <Link key={c.to} to={c.to} className="master-card">
              <span className="master-icon" style={{ background: c.accent }}>
                <Icon size={26} strokeWidth={2} />
              </span>
              <span>
                <span className="master-card-label">{c.label}</span>
                <span className="master-card-desc muted">{c.desc}</span>
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
