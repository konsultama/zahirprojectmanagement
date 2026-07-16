import { useState } from 'react';
import { LogIn } from 'lucide-react';
import { ApiError } from '../../lib/api';
import { useSession } from '../../session';

const DEMO = [
  { label: 'Rina — Admin', email: 'admin@contoh.id' },
  { label: 'Andi — PM', email: 'andi.pm@contoh.id' },
  { label: 'Bagus — Supervisor', email: 'bagus.spv@contoh.id' },
  { label: 'Sari — QC', email: 'sari.qc@contoh.id' },
  { label: 'Fitri — Finance', email: 'fitri.fin@contoh.id' },
  { label: 'Dedi — Direktur', email: 'dedi.dir@contoh.id' },
];
const DEMO_PW = 'zahir123';

export function LoginPage() {
  const { login } = useSession();
  const [email, setEmail] = useState('admin@contoh.id');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: string, p: string) => {
    setError('');
    setBusy(true);
    try {
      await login(e, p);
    } catch (err) {
      setError(err instanceof ApiError ? err.messages[0] : 'Gagal masuk.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="login-wrap">
      <div className="login-card">
        <div className="login-brand">
          <span className="brand-mark">PROJ</span>
          <span className="brand-name">Zahir Project Management</span>
        </div>
        <h1>Masuk</h1>

        <form
          onSubmit={(ev) => {
            ev.preventDefault();
            submit(email, password);
          }}
        >
          <div className="field">
            <label className="field-label">Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" />
          </div>
          <div className="field">
            <label className="field-label">Kata Sandi</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              placeholder="••••••••"
            />
          </div>
          {error && <div className="banner banner-error">{error}</div>}
          <button className="btn-primary login-submit" type="submit" disabled={busy}>
            <LogIn size={16} /> {busy ? 'Memproses…' : 'Masuk'}
          </button>
        </form>

        <div className="login-demo">
          <p className="muted small">Akun demo (kata sandi: <code>{DEMO_PW}</code>) — klik untuk masuk cepat:</p>
          <div className="login-demo-grid">
            {DEMO.map((d) => (
              <button key={d.email} className="btn-ghost" disabled={busy} onClick={() => submit(d.email, DEMO_PW)}>
                {d.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
