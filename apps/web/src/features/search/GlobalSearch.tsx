import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Search, CornerDownLeft } from 'lucide-react';
import { apiGet } from '../../lib/api';
import type { ProjectListResponse } from '../../lib/types';
import { StatusBadge } from '../../components/ui';

/** Debounce a changing value. */
function useDebounced<T>(value: T, ms: number): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

export function GlobalSearch() {
  const [term, setTerm] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const boxRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const debounced = useDebounced(term.trim(), 250);
  const enabled = debounced.length >= 2;

  const results = useQuery({
    queryKey: ['global-search', debounced],
    queryFn: () => apiGet<ProjectListResponse>(`/projects?search=${encodeURIComponent(debounced)}&pageSize=8`),
    enabled,
  });
  const rows = enabled ? results.data?.data ?? [] : [];

  useEffect(() => setActive(0), [debounced]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const go = (id: string) => {
    navigate(`/projects/${id}`);
    setOpen(false);
    setTerm('');
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!open) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, rows.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === 'Enter' && rows[active]) {
      e.preventDefault();
      go(rows[active].id);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  return (
    <div className="topbar-search gsearch" ref={boxRef}>
      <Search size={18} strokeWidth={2} />
      <input
        aria-label="Cari proyek"
        placeholder="Cari proyek (kode, nama, client)…"
        value={term}
        onChange={(e) => {
          setTerm(e.target.value);
          setOpen(true);
        }}
        onFocus={() => term.trim().length >= 2 && setOpen(true)}
        onKeyDown={onKeyDown}
      />
      {open && enabled && (
        <div className="gsearch-panel">
          {results.isLoading && <p className="muted small gsearch-empty">Mencari…</p>}
          {!results.isLoading && rows.length === 0 && (
            <p className="muted small gsearch-empty">Tidak ada proyek cocok.</p>
          )}
          {rows.map((p, i) => (
            <button
              key={p.id}
              className={`gsearch-item ${i === active ? 'active' : ''}`}
              onMouseEnter={() => setActive(i)}
              onClick={() => go(p.id)}
            >
              <span className="gsearch-code">{p.code}</span>
              <span className="gsearch-main">
                <span className="gsearch-name">{p.name}</span>
                <span className="gsearch-sub muted">{p.client?.name ?? 'Tanpa client'}</span>
              </span>
              <StatusBadge status={p.status} />
            </button>
          ))}
          {rows.length > 0 && (
            <div className="gsearch-hint muted small">
              <CornerDownLeft size={12} /> Enter untuk buka · ↑↓ navigasi
            </div>
          )}
        </div>
      )}
    </div>
  );
}
