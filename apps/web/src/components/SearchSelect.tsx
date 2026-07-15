import { useEffect, useRef, useState } from 'react';

export interface Option {
  id: string;
  name: string;
  sub?: string;
}

interface Props {
  value: string;
  valueLabel?: string;
  placeholder?: string;
  options: Option[];
  onSearch: (q: string) => void;
  onSelect: (opt: Option) => void;
  invalid?: boolean;
}

/** Search-as-you-type dropdown for relations (§12.8). Keyboard accessible. */
export function SearchSelect({
  value,
  valueLabel,
  placeholder,
  options,
  onSearch,
  onSelect,
  invalid,
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const display = open ? query : (valueLabel ?? '');

  return (
    <div className="search-select" ref={boxRef}>
      <input
        className={invalid ? 'invalid' : ''}
        value={display}
        placeholder={placeholder ?? 'Cari…'}
        onFocus={(e) => {
          setOpen(true);
          setQuery('');
          e.target.select();
        }}
        onChange={(e) => {
          setQuery(e.target.value);
          onSearch(e.target.value);
          setOpen(true);
        }}
      />
      {open && (
        <ul className="search-options" role="listbox">
          {options.length === 0 && <li className="empty">Tidak ada hasil</li>}
          {options.map((o) => (
            <li
              key={o.id}
              role="option"
              aria-selected={o.id === value}
              className={o.id === value ? 'active' : ''}
              onMouseDown={() => {
                onSelect(o);
                setOpen(false);
              }}
            >
              <span>{o.name}</span>
              {o.sub && <small>{o.sub}</small>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
