import { Link } from 'react-router-dom';
import { UserCircle, ShieldCheck, History, Mail } from 'lucide-react';
import { useSession } from '../../session';

const CARDS = [
  { to: '/settings/persona', label: 'Persona', icon: UserCircle, accent: 'rgba(46,179,236,0.15)', desc: 'Kelola persona pengguna (§5)', adminOnly: false },
  { to: '/settings/rbac', label: 'Peran & Hak Akses', icon: ShieldCheck, accent: 'rgba(5,150,105,0.15)', desc: 'Matriks RBAC per peran (§6)', adminOnly: false },
  { to: '/settings/audit', label: 'Audit Trail Global', icon: History, accent: 'rgba(122,90,248,0.15)', desc: 'Riwayat aktivitas lintas proyek (§10)', adminOnly: true },
  { to: '/settings/smtp', label: 'Email (SMTP)', icon: Mail, accent: 'rgba(245,107,59,0.15)', desc: 'Konfigurasi server email notifikasi', adminOnly: true },
];

export function SettingsLanding() {
  const { currentUser } = useSession();
  const cards = CARDS.filter((c) => !c.adminOnly || currentUser?.role === 'ADMIN');
  return (
    <div className="page">
      <div className="page-head">
        <h1>Pengaturan</h1>
      </div>
      <div className="master-cards">
        {cards.map((c) => {
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
