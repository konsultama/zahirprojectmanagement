import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Boxes, Database, ChartColumn, Settings } from 'lucide-react';

interface NavItem {
  label: string;
  to?: string;
  icon: typeof LayoutDashboard;
  disabled?: boolean;
}

// Zahir ERP menu structure (style-guide commonIconsUsed). Only "Proyek" is live in this MVP.
const NAV: NavItem[] = [
  { label: 'Dasbor', to: '/dashboard', icon: LayoutDashboard },
  { label: 'Proyek', to: '/projects', icon: Boxes },
  { label: 'Data Master', to: '/master', icon: Database },
  { label: 'Laporan', to: '/reports', icon: ChartColumn },
  { label: 'Pengaturan', to: '/settings', icon: Settings },
];

export function Sidebar({ collapsed }: { collapsed: boolean }) {
  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-brand">
        <span className="brand-mark">PROJ</span>
        {!collapsed && <span className="brand-name">Zahir ERP</span>}
      </div>
      <nav className="sidebar-nav">
        {NAV.map((item) => {
          const Icon = item.icon;
          if (item.disabled || !item.to) {
            return (
              <span key={item.label} className="nav-item disabled" title={`${item.label} (segera hadir)`}>
                <Icon size={24} strokeWidth={2} />
                {!collapsed && <span>{item.label}</span>}
              </span>
            );
          }
          return (
            <NavLink
              key={item.label}
              to={item.to}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              title={item.label}
            >
              <Icon size={24} strokeWidth={2} />
              {!collapsed && <span>{item.label}</span>}
            </NavLink>
          );
        })}
      </nav>
    </aside>
  );
}
