import { useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { PanelLeft, Bell, Search, LogOut } from 'lucide-react';
import { apiGet, type HealthResponse } from './lib/api';
import { SessionProvider, useSession } from './session';
import { ToastProvider } from './components/Toast';
import { Sidebar } from './components/Sidebar';
import { LoginPage } from './features/auth/LoginPage';
import { ProjectList } from './features/projects/ProjectList';
import { ProjectForm } from './features/projects/ProjectForm';
import { ProjectDetail } from './features/projects/ProjectDetail';
import { MasterLanding } from './features/master/MasterLanding';
import { MasterList } from './features/master/MasterList';
import { SettingsLanding } from './features/settings/SettingsLanding';
import { RbacMatrix } from './features/settings/RbacMatrix';
import { ReportsLanding } from './features/reports/ReportsLanding';
import { ReportView } from './features/reports/ReportView';
import { Dashboard } from './features/dashboard/Dashboard';

function initials(name?: string): string {
  if (!name) return '?';
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('');
}

function TopBar({ onToggle }: { onToggle: () => void }) {
  const { currentUser, currentPersona, logout } = useSession();
  const health = useQuery({
    queryKey: ['health'],
    queryFn: () => apiGet<HealthResponse>('/health'),
    retry: false,
    refetchInterval: 30000,
  });
  const dbUp = health.data?.db === 'up';
  const displayName = currentPersona?.name ?? currentUser?.name;
  const displayRole = currentPersona?.roleTitle ?? currentUser?.role;

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
        <div className="user-box">
          <span className="user-name">{displayName}</span>
          <span className="user-role muted">{displayRole}</span>
        </div>
        <div className="avatar" title={displayName}>
          {initials(displayName)}
        </div>
        <button className="icon-btn" onClick={logout} title="Keluar" aria-label="Keluar">
          <LogOut size={20} strokeWidth={2} />
        </button>
      </div>
    </header>
  );
}

function AppShell() {
  const [collapsed, setCollapsed] = useState(false);
  const { status } = useSession();

  if (status === 'loading') {
    return <div className="login-wrap"><div className="muted">Memuat…</div></div>;
  }
  if (status === 'anon') {
    return <LoginPage />;
  }

  return (
    <div className={`shell ${collapsed ? 'shell-collapsed' : ''}`}>
      <Sidebar collapsed={collapsed} />
      <div className="shell-main">
        <TopBar onToggle={() => setCollapsed((c) => !c)} />
        <main className="app-main">
          <Routes>
            <Route path="/" element={<Navigate to="/projects" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
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
            <Route path="/reports" element={<ReportsLanding />} />
            <Route path="/reports/:key" element={<ReportView />} />
            <Route path="*" element={<div className="page">Halaman tidak ditemukan.</div>} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <SessionProvider>
          <AppShell />
        </SessionProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}
