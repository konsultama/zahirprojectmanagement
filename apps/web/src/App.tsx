import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiGet, type HealthResponse } from './lib/api';
import { SessionProvider, useSession } from './session';
import { ToastProvider } from './components/Toast';
import { ProjectList } from './features/projects/ProjectList';
import { ProjectForm } from './features/projects/ProjectForm';
import { ProjectDetail } from './features/projects/ProjectDetail';

function TopBar() {
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
      <div className="brand">
        <span className="brand-mark">PROJ</span>
        <span className="brand-name">Project Management</span>
      </div>
      <div className="topbar-right">
        <span className={`db-dot ${dbUp ? 'up' : 'down'}`} title={dbUp ? 'DB terhubung' : 'DB terputus'} />
        <label className="user-switch">
          <span>Masuk sebagai</span>
          <select value={currentUser?.id ?? ''} onChange={(e) => switchUser(e.target.value)}>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name} ({u.role})
              </option>
            ))}
          </select>
        </label>
      </div>
    </header>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <SessionProvider>
          <TopBar />
          <main className="app-main">
            <Routes>
              <Route path="/" element={<Navigate to="/projects" replace />} />
              <Route path="/projects" element={<ProjectList />} />
              <Route path="/projects/new" element={<ProjectForm />} />
              <Route path="/projects/:id" element={<ProjectDetail />} />
              <Route path="/projects/:id/edit" element={<ProjectForm />} />
              <Route path="*" element={<div className="page">Halaman tidak ditemukan.</div>} />
            </Routes>
          </main>
        </SessionProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}
