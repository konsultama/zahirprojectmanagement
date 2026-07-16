import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft } from 'lucide-react';
import { apiGet, apiPatch, ApiError } from '../../lib/api';
import { useToast } from '../../components/Toast';
import { useSession } from '../../session';

interface Routing {
  available: { type: string; label: string }[];
  selected: string[];
}

export function NotificationRouting() {
  const { currentUser } = useSession();
  const toast = useToast();
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['notify-routing'],
    queryFn: () => apiGet<Routing>('/settings/notifications'),
    enabled: currentUser?.role === 'ADMIN',
  });
  const [selected, setSelected] = useState<Set<string>>(new Set());
  useEffect(() => {
    if (data) setSelected(new Set(data.selected));
  }, [data]);

  const save = useMutation({
    mutationFn: () => apiPatch<Routing>('/settings/notifications', { events: [...selected] }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['notify-routing'] }); toast.success('Routing notifikasi tersimpan'); },
    onError: (e) => toast.error(e instanceof ApiError ? e.messages[0] : 'Gagal menyimpan.'),
  });

  if (currentUser?.role !== 'ADMIN') return <div className="page"><p className="muted">Halaman ini hanya untuk Admin.</p></div>;
  const toggle = (t: string) => setSelected((s) => { const n = new Set(s); n.has(t) ? n.delete(t) : n.add(t); return n; });

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <Link to="/settings" className="back-link"><ChevronLeft size={16} /> Pengaturan</Link>
          <h1>Routing Notifikasi</h1>
        </div>
      </div>
      {isLoading ? <p className="muted">Memuat…</p> : (
        <div className="card" style={{ maxWidth: 620, padding: '1.25rem' }}>
          <p className="muted small" style={{ marginTop: 0 }}>
            Pilih jenis kejadian yang dikirim ke kanal eksternal (Email, Telegram, WhatsApp). Notifikasi dalam aplikasi
            (lonceng) tetap aktif untuk semua kejadian.
          </p>
          {data?.available.map((ev) => (
            <label key={ev.type} className="switch-row" style={{ padding: '0.4rem 0' }}>
              <input type="checkbox" checked={selected.has(ev.type)} onChange={() => toggle(ev.type)} /> {ev.label}
              <span className="muted small" style={{ marginLeft: '0.4rem' }}>({ev.type})</span>
            </label>
          ))}
          <div className="toolbar" style={{ marginTop: '0.75rem' }}>
            <button className="btn-primary" onClick={() => save.mutate()} disabled={save.isPending}>{save.isPending ? 'Menyimpan…' : 'Simpan'}</button>
          </div>
        </div>
      )}
    </div>
  );
}
