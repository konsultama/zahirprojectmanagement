import { useQuery } from '@tanstack/react-query';
import { apiGet, type HealthResponse } from './lib/api';

const STAGES = ['Initiating', 'Planning', 'Executing', 'Monitoring & Controlling', 'Closing'];

export function App() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['health'],
    queryFn: () => apiGet<HealthResponse>('/health'),
    retry: false,
  });

  const apiStatus = isLoading ? 'memeriksa…' : isError ? 'tidak terhubung' : (data?.status ?? '—');
  const dbStatus = isLoading ? '…' : isError ? '—' : (data?.db ?? '—');

  return (
    <main className="shell">
      <header>
        <h1>Aplikasi Project Management</h1>
        <p className="subtitle">Zahir · modul PROJ · siklus hidup proyek PMBOK</p>
      </header>

      <section className="card">
        <h2>Status Sistem</h2>
        <dl className="status">
          <div>
            <dt>API</dt>
            <dd className={isError ? 'bad' : 'good'}>{apiStatus}</dd>
          </div>
          <div>
            <dt>Database</dt>
            <dd className={dbStatus === 'up' ? 'good' : 'bad'}>{dbStatus}</dd>
          </div>
        </dl>
        {isError && (
          <p className="hint">
            API belum berjalan. Jalankan <code>pnpm db:up</code> lalu <code>pnpm dev</code>.
          </p>
        )}
      </section>

      <section className="card">
        <h2>5 Tahapan</h2>
        <ol className="stages">
          {STAGES.map((s, i) => (
            <li key={s}>
              <span className="num">{i + 1}</span>
              {s}
            </li>
          ))}
        </ol>
        <p className="hint">Scaffold aktif. Modul Master Data Project & tahapan menyusul.</p>
      </section>
    </main>
  );
}
