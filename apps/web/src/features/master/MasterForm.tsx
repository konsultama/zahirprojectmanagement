import { useState } from 'react';
import { X } from 'lucide-react';
import { ApiError } from '../../lib/api';
import { useToast } from '../../components/Toast';
import { useMasterOptions } from './api';
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
      <div className="modal-paper" onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2>{initial ? 'Ubah' : 'Tambah'} {config.label}</h2>
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

  return (
    <div className="field">
      <label className="field-label">
        {field.label}
        {field.required && ' *'}
      </label>
      {field.type === 'boolean' ? (
        <label className="switch-row">
          <input type="checkbox" checked={value === true} onChange={(e) => onChange(e.target.checked)} /> Aktif
        </label>
      ) : field.type === 'textarea' ? (
        <textarea rows={2} value={String(value ?? '')} onChange={(e) => onChange(e.target.value)} />
      ) : field.type === 'select' ? (
        <select value={String(value ?? '')} onChange={(e) => onChange(e.target.value)}>
          {field.options?.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      ) : field.type === 'reference' ? (
        <select className={error ? 'invalid' : ''} value={String(value ?? '')} onChange={(e) => onChange(e.target.value)}>
          <option value="">—</option>
          {(refOptions.data?.data ?? []).map((o) => (
            <option key={o.id} value={o.id}>{String(o.name ?? o.code ?? o.id)}</option>
          ))}
        </select>
      ) : (
        <input
          type={field.type === 'number' || field.type === 'currency' ? 'number' : 'text'}
          className={error ? 'invalid' : ''}
          value={String(value ?? '')}
          onFocus={(e) => e.target.select()}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
      {error && <p className="field-error">{error}</p>}
    </div>
  );
}
