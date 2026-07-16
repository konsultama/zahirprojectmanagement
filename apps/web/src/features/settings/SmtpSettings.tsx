import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, Mail, Send } from 'lucide-react';
import { apiGet, apiPatch, apiPost, ApiError } from '../../lib/api';
import { useToast } from '../../components/Toast';
import { useSession } from '../../session';

interface SmtpConfig {
  enabled: boolean;
  host: string;
  port: number;
  secure: boolean;
  user: string;
  from: string;
  hasPassword: boolean;
  effective: { enabled: boolean; host: string; from: string; source: 'database' | 'environment' };
}

export function SmtpSettings() {
  const { currentUser } = useSession();
  const toast = useToast();
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['smtp'],
    queryFn: () => apiGet<SmtpConfig>('/settings/smtp'),
    enabled: currentUser?.role === 'ADMIN',
  });

  const [form, setForm] = useState({ enabled: false, host: '', port: 587, secure: false, user: '', from: '', pass: '' });
  const [testTo, setTestTo] = useState(currentUser?.email ?? '');
  useEffect(() => {
    if (data) setForm({ enabled: data.enabled, host: data.host, port: data.port, secure: data.secure, user: data.user, from: data.from, pass: '' });
  }, [data]);

  const save = useMutation({
    mutationFn: () => apiPatch<SmtpConfig>('/settings/smtp', { ...form, pass: form.pass || undefined }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['smtp'] }); toast.success('Pengaturan SMTP tersimpan'); },
    onError: (e) => toast.error(e instanceof ApiError ? e.messages[0] : 'Gagal menyimpan.'),
  });
  const test = useMutation({
    mutationFn: () => apiPost<{ delivered: boolean; mode: string; message: string }>('/settings/smtp/test', { to: testTo }),
    onSuccess: (r) => (r.mode === 'error' ? toast.error(r.message) : toast.success(r.message)),
    onError: (e) => toast.error(e instanceof ApiError ? e.messages[0] : 'Gagal mengirim email uji.'),
  });

  if (currentUser?.role !== 'ADMIN') {
    return <div className="page"><p className="muted">Halaman ini hanya untuk Admin.</p></div>;
  }

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <Link to="/settings" className="back-link"><ChevronLeft size={16} /> Pengaturan</Link>
          <h1>Email (SMTP)</h1>
        </div>
      </div>

      {isLoading ? (
        <p className="muted">Memuat…</p>
      ) : (
        <div className="card" style={{ maxWidth: 620, padding: '1.25rem' }}>
          <p className="muted small" style={{ marginTop: 0 }}>
            Notifikasi prioritas tinggi (penolakan tahap, QC gagal, overbudget, proyek ditutup) dikirim juga via email.
            Jika nonaktif atau host kosong, email hanya disusun (dry-run) tanpa dikirim.
          </p>

          <label className="switch-row" style={{ marginBottom: '0.75rem' }}>
            <input type="checkbox" checked={form.enabled} onChange={(e) => set('enabled', e.target.checked)} /> Aktifkan pengiriman email (SMTP)
          </label>

          <div className="field">
            <label className="field-label" htmlFor="smtp-host">Host SMTP</label>
            <input id="smtp-host" value={form.host} placeholder="smtp.example.com" onChange={(e) => set('host', e.target.value)} />
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <div className="field" style={{ flex: 1 }}>
              <label className="field-label" htmlFor="smtp-port">Port</label>
              <input id="smtp-port" type="number" value={form.port} onChange={(e) => set('port', Number(e.target.value))} />
            </div>
            <div className="field" style={{ flex: 1, justifyContent: 'flex-end' }}>
              <label className="switch-row">
                <input type="checkbox" checked={form.secure} onChange={(e) => set('secure', e.target.checked)} /> TLS/SSL (secure)
              </label>
            </div>
          </div>
          <div className="field">
            <label className="field-label" htmlFor="smtp-user">Username</label>
            <input id="smtp-user" value={form.user} autoComplete="off" onChange={(e) => set('user', e.target.value)} />
          </div>
          <div className="field">
            <label className="field-label" htmlFor="smtp-pass">Password</label>
            <input
              id="smtp-pass"
              type="password"
              value={form.pass}
              autoComplete="new-password"
              placeholder={data?.hasPassword ? '•••••••• (tersimpan — kosongkan untuk tetap)' : ''}
              onChange={(e) => set('pass', e.target.value)}
            />
          </div>
          <div className="field">
            <label className="field-label" htmlFor="smtp-from">Pengirim (From)</label>
            <input id="smtp-from" value={form.from} placeholder="Zahir PM <no-reply@zahir.local>" onChange={(e) => set('from', e.target.value)} />
          </div>

          <div className="toolbar" style={{ marginTop: '0.5rem' }}>
            <button className="btn-primary" onClick={() => save.mutate()} disabled={save.isPending}>
              {save.isPending ? 'Menyimpan…' : 'Simpan'}
            </button>
          </div>

          <hr style={{ border: 0, borderTop: '1px solid var(--border)', margin: '1rem 0' }} />
          <div className="field">
            <label className="field-label" htmlFor="smtp-testto"><Mail size={14} /> Kirim email uji ke</label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input id="smtp-testto" value={testTo} placeholder="email@anda.com" onChange={(e) => setTestTo(e.target.value)} style={{ flex: 1 }} />
              <button className="btn-ghost" onClick={() => test.mutate()} disabled={test.isPending || !testTo}>
                <Send size={15} /> {test.isPending ? 'Mengirim…' : 'Uji'}
              </button>
            </div>
          </div>

          {data && (
            <p className="muted small" style={{ marginBottom: 0 }}>
              Konfigurasi efektif: <strong>{data.effective.enabled ? 'aktif' : 'nonaktif (dry-run)'}</strong>
              {data.effective.host ? ` · ${data.effective.host}` : ''} · sumber: {data.effective.source === 'database' ? 'database' : 'environment'}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
