import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, Send } from 'lucide-react';
import { apiGet, apiPatch, apiPost, ApiError } from '../../lib/api';
import { useToast } from '../../components/Toast';
import { useSession } from '../../session';

interface TgConfig {
  enabled: boolean;
  chatId: string;
  hasBotToken: boolean;
  effective: { enabled: boolean; source: 'database' | 'environment' };
}

export function TelegramSettings() {
  const { currentUser } = useSession();
  const toast = useToast();
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['telegram'],
    queryFn: () => apiGet<TgConfig>('/settings/telegram'),
    enabled: currentUser?.role === 'ADMIN',
  });
  const [form, setForm] = useState({ enabled: false, chatId: '', botToken: '' });
  useEffect(() => {
    if (data) setForm({ enabled: data.enabled, chatId: data.chatId, botToken: '' });
  }, [data]);

  const save = useMutation({
    mutationFn: () => apiPatch<TgConfig>('/settings/telegram', { ...form, botToken: form.botToken || undefined }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['telegram'] }); toast.success('Pengaturan Telegram tersimpan'); },
    onError: (e) => toast.error(e instanceof ApiError ? e.messages[0] : 'Gagal menyimpan.'),
  });
  const test = useMutation({
    mutationFn: () => apiPost<{ mode: string; message: string }>('/settings/telegram/test', {}),
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
          <h1>Notifikasi Telegram</h1>
        </div>
      </div>
      {isLoading ? <p className="muted">Memuat…</p> : (
        <div className="card" style={{ maxWidth: 620, padding: '1.25rem' }}>
          <p className="muted small" style={{ marginTop: 0 }}>
            Kirim notifikasi prioritas tinggi ke sebuah chat/grup Telegram lewat Bot API. Buat bot via @BotFather untuk
            mendapatkan <em>token</em>, lalu isi <em>Chat ID</em> tujuan.
          </p>
          <label className="switch-row" style={{ marginBottom: '0.75rem' }}>
            <input type="checkbox" checked={form.enabled} onChange={(e) => set('enabled', e.target.checked)} /> Aktifkan notifikasi Telegram
          </label>
          <div className="field">
            <label className="field-label" htmlFor="tg-token">Bot Token</label>
            <input id="tg-token" type="password" autoComplete="new-password" value={form.botToken}
              placeholder={data?.hasBotToken ? '•••••••• (tersimpan — kosongkan untuk tetap)' : '123456:ABC-DEF…'}
              onChange={(e) => set('botToken', e.target.value)} />
          </div>
          <div className="field">
            <label className="field-label" htmlFor="tg-chat">Chat ID</label>
            <input id="tg-chat" value={form.chatId} placeholder="mis. -1001234567890" onChange={(e) => set('chatId', e.target.value)} />
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
