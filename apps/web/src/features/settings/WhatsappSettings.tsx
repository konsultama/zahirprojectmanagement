import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, Send } from 'lucide-react';
import { apiGet, apiPatch, apiPost, ApiError } from '../../lib/api';
import { useToast } from '../../components/Toast';
import { useSession } from '../../session';

interface WaConfig {
  enabled: boolean;
  phoneId: string;
  recipient: string;
  apiVersion: string;
  hasToken: boolean;
  effective: { enabled: boolean; source: 'database' | 'environment' };
}

export function WhatsappSettings() {
  const { currentUser } = useSession();
  const toast = useToast();
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['whatsapp'],
    queryFn: () => apiGet<WaConfig>('/settings/whatsapp'),
    enabled: currentUser?.role === 'ADMIN',
  });
  const [form, setForm] = useState({ enabled: false, phoneId: '', recipient: '', apiVersion: 'v21.0', token: '' });
  useEffect(() => {
    if (data) setForm({ enabled: data.enabled, phoneId: data.phoneId, recipient: data.recipient, apiVersion: data.apiVersion, token: '' });
  }, [data]);

  const save = useMutation({
    mutationFn: () => apiPatch<WaConfig>('/settings/whatsapp', { ...form, token: form.token || undefined }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['whatsapp'] }); toast.success('Pengaturan WhatsApp tersimpan'); },
    onError: (e) => toast.error(e instanceof ApiError ? e.messages[0] : 'Gagal menyimpan.'),
  });
  const test = useMutation({
    mutationFn: () => apiPost<{ mode: string; message: string }>('/settings/whatsapp/test', {}),
    onSuccess: (r) => (r.mode === 'error' ? toast.error(r.message) : toast.success(r.message)),
    onError: (e) => toast.error(e instanceof ApiError ? e.messages[0] : 'Gagal mengirim uji.'),
  });

  if (currentUser?.role !== 'ADMIN') return <div className="page"><p className="muted">Halaman ini hanya untuk Admin.</p></div>;
  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <Link to="/settings" className="back-link"><ChevronLeft size={16} /> Pengaturan</Link>
          <h1>Notifikasi WhatsApp</h1>
        </div>
      </div>
      {isLoading ? <p className="muted">Memuat…</p> : (
        <div className="card" style={{ maxWidth: 620, padding: '1.25rem' }}>
          <p className="muted small" style={{ marginTop: 0 }}>
            Kirim notifikasi prioritas tinggi via WhatsApp Cloud API (Meta). Butuh <em>Access Token</em>, <em>Phone Number ID</em>,
            dan nomor tujuan. Catatan: pengiriman teks bebas hanya berlaku dalam sesi 24 jam; untuk alert terjadwal Meta
            mensyaratkan template pesan yang disetujui.
          </p>
          <label className="switch-row" style={{ marginBottom: '0.75rem' }}>
            <input type="checkbox" checked={form.enabled} onChange={(e) => set('enabled', e.target.checked)} /> Aktifkan notifikasi WhatsApp
          </label>
          <div className="field">
            <label className="field-label" htmlFor="wa-token">Access Token</label>
            <input id="wa-token" type="password" autoComplete="new-password" value={form.token}
              placeholder={data?.hasToken ? '•••••••• (tersimpan — kosongkan untuk tetap)' : 'EAAG…'}
              onChange={(e) => set('token', e.target.value)} />
          </div>
          <div className="field">
            <label className="field-label" htmlFor="wa-phone">Phone Number ID</label>
            <input id="wa-phone" value={form.phoneId} placeholder="mis. 1029384756" onChange={(e) => set('phoneId', e.target.value)} />
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <div className="field" style={{ flex: 2 }}>
              <label className="field-label" htmlFor="wa-to">Nomor Tujuan</label>
              <input id="wa-to" value={form.recipient} placeholder="6281234567890" onChange={(e) => set('recipient', e.target.value)} />
            </div>
            <div className="field" style={{ flex: 1 }}>
              <label className="field-label" htmlFor="wa-ver">Versi API</label>
              <input id="wa-ver" value={form.apiVersion} onChange={(e) => set('apiVersion', e.target.value)} />
            </div>
          </div>
          <div className="toolbar" style={{ marginTop: '0.5rem' }}>
            <button className="btn-primary" onClick={() => save.mutate()} disabled={save.isPending}>{save.isPending ? 'Menyimpan…' : 'Simpan'}</button>
            <button className="btn-ghost" onClick={() => test.mutate()} disabled={test.isPending}><Send size={15} /> {test.isPending ? 'Mengirim…' : 'Uji kirim'}</button>
          </div>
          {data && (
            <p className="muted small" style={{ marginBottom: 0 }}>
              Status efektif: <strong>{data.effective.enabled ? 'aktif' : 'nonaktif (dry-run)'}</strong> · sumber: {data.effective.source === 'database' ? 'database' : 'environment'}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
