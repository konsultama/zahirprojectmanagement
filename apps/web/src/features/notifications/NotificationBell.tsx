import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, CheckCheck } from 'lucide-react';
import { apiGet, apiPatch, apiPost } from '../../lib/api';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  projectId: string | null;
  isRead: boolean;
  createdAt: string;
}
interface NotifResponse {
  data: Notification[];
  unread: number;
  total: number;
}

const TYPE_COLOR: Record<string, string> = {
  STAGE_APPROVED: '#059669',
  STAGE_REJECTED: '#e95044',
  QC_FAILED: '#e95044',
  PROJECT_CLOSED: '#7a5af8',
  OVERBUDGET: '#f56b3b',
};

function timeAgo(iso: string): string {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return 'baru saja';
  if (s < 3600) return `${Math.floor(s / 60)} mnt lalu`;
  if (s < 86400) return `${Math.floor(s / 3600)} jam lalu`;
  return `${Math.floor(s / 86400)} hr lalu`;
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const qc = useQueryClient();

  const count = useQuery({
    queryKey: ['notif-count'],
    queryFn: () => apiGet<{ unread: number }>('/notifications/unread-count'),
    refetchInterval: 30000,
  });
  const list = useQuery({
    queryKey: ['notif-list'],
    queryFn: () => apiGet<NotifResponse>('/notifications'),
    enabled: open,
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['notif-count'] });
    qc.invalidateQueries({ queryKey: ['notif-list'] });
  };
  const markRead = useMutation({ mutationFn: (id: string) => apiPatch(`/notifications/${id}/read`, {}), onSuccess: invalidate });
  const markAll = useMutation({ mutationFn: () => apiPost('/notifications/read-all', {}), onSuccess: invalidate });

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const unread = count.data?.unread ?? 0;

  const openItem = (n: Notification) => {
    if (!n.isRead) markRead.mutate(n.id);
    if (n.projectId) navigate(`/projects/${n.projectId}`);
    setOpen(false);
  };

  return (
    <div className="notif" ref={boxRef}>
      <button className="icon-btn" onClick={() => setOpen((o) => !o)} aria-label="Notifikasi">
        <Bell size={22} strokeWidth={2} />
        {unread > 0 && <span className="notif-badge">{unread > 9 ? '9+' : unread}</span>}
      </button>
      {open && (
        <div className="notif-panel">
          <div className="notif-head">
            <strong>Notifikasi</strong>
            {unread > 0 && (
              <button className="notif-mark" onClick={() => markAll.mutate()}>
                <CheckCheck size={14} /> Tandai semua dibaca
              </button>
            )}
          </div>
          <div className="notif-list">
            {list.isLoading && <p className="muted small notif-empty">Memuat…</p>}
            {list.data && list.data.data.length === 0 && <p className="muted small notif-empty">Belum ada notifikasi.</p>}
            {list.data?.data.map((n) => (
              <button key={n.id} className={`notif-item ${n.isRead ? '' : 'unread'}`} onClick={() => openItem(n)}>
                <span className="notif-dot" style={{ background: TYPE_COLOR[n.type] ?? '#98a2b3' }} />
                <span className="notif-body">
                  <span className="notif-title">{n.title}</span>
                  <span className="notif-msg">{n.message}</span>
                  <span className="notif-time muted">{timeAgo(n.createdAt)}</span>
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
