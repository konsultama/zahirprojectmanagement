import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { ApiError } from '../../lib/api';
import { useToast } from '../../components/Toast';
import { useMasterOptions, useUsers } from './api';
import type { EntityConfig, Field } from './config';

interface Props {
  config: EntityConfig;
  initial: Record<string, unknown> | null;
  onClose: () => void;
  onSave: (body: Record<string, unknown>) => Promise<unknown>;
}

function defaults(config: EntityConfig, initial: Record<string, unknown> | null): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const f of config.fields) {
    if (initial) {
      // reference fields map to <key>Id already present on the row
      out[f.key] = initial[f.key] ?? '';
    } else if (f.type === 'boolean') {
      out[f.key] = true;
    } else if (f.type === 'select') {
      // enum columns are non-nullable — start on a valid option, not blank
      out[f.key] = f.options?.[0]?.value ?? '';
    } else {
      out[f.key] = '';
    }
  }
  return out;
}

export function MasterForm({ config, initial, onClose, onSave }: Props) {
  const toast = useToast();
  const [form, setForm] = useState<Record<string, unknown>>(defaults(config, initial));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const set = (k: string, v: unknown) => setForm((f) => ({ ...f, [k]: v }));

  // ESC closes the dialog (standard modal behaviour).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const submit = async () => {
    const errs: Record<string, string> = {};
    for (const f of config.fields) {
      if (f.required && !String(form[f.key] ?? '').trim()) errs[f.key] = `${f.label} wajib diisi.`;
    }
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setBusy(true);
    try {
      await onSave(form);
      toast.success(`${config.label} tersimpan`);
      onClose();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.messages[0] : 'Gagal menyimpan.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="modal-overlay" onMouseDown={onClose}>
      <div
        className="modal-paper"
        role="dialog"
        aria-modal="true"
        aria-labelledby="master-form-title"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="modal-head">
          <h2 id="master-form-title">{initial ? 'Ubah' : 'Tambah'} {config.label}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Tutup">

            <X size={20} />
          </button>
        </div>
        <div className="modal-body">
          {config.fields.map((f) => (
            <FieldInput key={f.key} field={f} value={form[f.key]} error={errors[f.key]} onChange={(v) => set(f.key, v)} />
          ))}
        </div>
        <div className="modal-foot">
          <button className="btn-ghost" onClick={onClose}>Batal</button>
          <button className="btn-primary" onClick={submit} disabled={busy}>
            {busy ? 'Menyimpan…' : 'Simpan'}
          </button>
        </div>
      </div>
    </div>
  );
}

function FieldInput({ field, value, error, onChange }: { field: Field; value: unknown; error?: string; onChange: (v: unknown) => void }) {
  const refOptions = useMasterOptions(field.type === 'reference' ? field.ref : undefined);
  const users = useUsers(field.type === 'user-ref');
  const inputId = `mf-${field.key}`;
  const errorId = error ? `${inputId}-error` : undefined;
  // Shared a11y props for the control: name from the label, invalid + error link.
  const a11y = {
    id: inputId,
    'aria-invalid': error ? true : undefined,
    'aria-describedby': errorId,
  };

  return (
    <div className="field">
      {field.type === 'boolean' ? (
        <span className="field-label" id={`${inputId}-label`}>
          {field.label}
        </span>
      ) : (
        <label className="field-label" htmlFor={inputId}>
          {field.label}
          {field.required && ' *'}
        </label>
      )}
      {field.type === 'boolean' ? (
        <label className="switch-row">
          <input
            type="checkbox"
            checked={value === true}
            onChange={(e) => onChange(e.target.checked)}
            aria-labelledby={`${inputId}-label`}
          />{' '}
          Aktif
        </label>
      ) : field.type === 'textarea' ? (
        <textarea {...a11y} rows={2} value={String(value ?? '')} onChange={(e) => onChange(e.target.value)} />
      ) : field.type === 'select' ? (
        <select {...a11y} value={String(value ?? '')} onChange={(e) => onChange(e.target.value)}>
          {field.options?.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      ) : field.type === 'reference' ? (
        <select {...a11y} className={error ? 'invalid' : ''} value={String(value ?? '')} onChange={(e) => onChange(e.target.value)}>
          <option value="">—</option>
          {(refOptions.data?.data ?? []).map((o) => (
            <option key={o.id} value={o.id}>{String(o.name ?? o.code ?? o.id)}</option>
          ))}
        </select>
      ) : field.type === 'user-ref' ? (
        <select {...a11y} value={String(value ?? '')} onChange={(e) => onChange(e.target.value)}>
          <option value="">— tidak ditautkan —</option>
          {(users.data ?? []).map((u) => (
            <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
          ))}
        </select>
      ) : (
        <input
          {...a11y}
          type={field.type === 'number' || field.type === 'currency' ? 'number' : 'text'}
          className={error ? 'invalid' : ''}
          value={String(value ?? '')}
          onFocus={(e) => e.target.select()}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
      {error && <p className="field-error" id={errorId}>{error}</p>}
    </div>
  );
}
