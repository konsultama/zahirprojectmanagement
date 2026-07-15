import { useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { PanelLeft, Bell, Search, LayoutDashboard } from 'lucide-react';
import { apiGet, type HealthResponse } from './lib/api';
import { SessionProvider, useSession } from './session';
import { ToastProvider } from './components/Toast';
import { Sidebar } from './components/Sidebar';
import { ProjectList } from './features/projects/ProjectList';
import { ProjectForm } from './features/projects/ProjectForm';
import { ProjectDetail } from './features/projects/ProjectDetail';
import { MasterLanding } from './features/master/MasterLanding';
import { MasterList } from './features/master/MasterList';
import { SettingsLanding } from './features/settings/SettingsLanding';
import { RbacMatrix } from './features/settings/RbacMatrix';

function initials(name?: string): string {
  if (!name) return '?';
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('');
}

function TopBar({ onToggle }: { onToggle: () => void }) {
  const { users, currentUser, switchUser } = useSession();
  const health = useQuery({
    queryKey: ['health'],
    queryFn: () => apiGet<HealthResponse>('/health'),
    retry: false,
    refetchInterval: 30000,
  });
  const dbUp = health.data?.db === 'up';

  return (
    <header className="topbar">
      <div className="topbar-left">
        <button className="icon-btn" onClick={onToggle} aria-label="Toggle sidebar">
          <PanelLeft size={20} strokeWidth={2} />
        </button>
        <div className="topbar-search">
          <Search size={18} strokeWidth={2} />
          <input placeholder="Pencarian…" />
        </div>
      </div>
      <div className="topbar-right">
        <span className={`db-dot ${dbUp ? 'up' : 'down'}`} title={dbUp ? 'DB terhubung' : 'DB terputus'} />
        <button className="icon-btn" aria-label="Notifikasi">
          <Bell size={22} strokeWidth={2} />
        </button>
        <label className="user-switch">
          <select value={currentUser?.id ?? ''} onChange={(e) => switchUser(e.target.value)} aria-label="Masuk sebagai">
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name} · {u.role}
              </option>
            ))}
          </select>
        </label>
        <div className="avatar" title={currentUser?.name}>
          {initials(currentUser?.name)}
        </div>
      </div>
    </header>
  );
}

function DashboardPlaceholder() {
  return (
    <div className="page">
      <div className="page-head">
        <h1>Dasbor</h1>
      </div>
      <div className="card placeholder">
        <LayoutDashboard size={40} strokeWidth={1.5} />
        <p>Dasbor ringkas (progres & serapan anggaran seluruh proyek) menyusul. Buka menu Proyek untuk mulai.</p>
      </div>
    </div>
  );
}

export function App() {
  const [collapsed, setCollapsed] = useState(false);
  return (
    <BrowserRouter>
      <ToastProvider>
        <SessionProvider>
          <div className={`shell ${collapsed ? 'shell-collapsed' : ''}`}>
            <Sidebar collapsed={collapsed} />
            <div className="shell-main">
              <TopBar onToggle={() => setCollapsed((c) => !c)} />
              <main className="app-main">
                <Routes>
                  <Route path="/" element={<Navigate to="/projects" replace />} />
                  <Route path="/dashboard" element={<DashboardPlaceholder />} />
                  <Route path="/projects" element={<ProjectList />} />
                  <Route path="/projects/new" element={<ProjectForm />} />
                  <Route path="/projects/:id" element={<ProjectDetail />} />
                  <Route path="/projects/:id/edit" element={<ProjectForm />} />
                  <Route path="/master" element={<MasterLanding />} />
                  <Route path="/master/:entity" element={<MasterList />} />
                  <Route path="/settings" element={<SettingsLanding />} />
                  <Route
                    path="/settings/persona"
                    element={<MasterList entityKey="persona" backTo="/settings" backLabel="Pengaturan" />}
                  />
                  <Route path="/settings/rbac" element={<RbacMatrix />} />
                  <Route path="*" element={<div className="page">Halaman tidak ditemukan.</div>} />
                </Routes>
              </main>
            </div>
          </div>
        </SessionProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}
