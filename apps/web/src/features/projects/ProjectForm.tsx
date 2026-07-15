import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ApiError } from '../../lib/api';
import { useToast } from '../../components/Toast';
import { SearchSelect } from '../../components/SearchSelect';
import { LocationEditor, weightSum } from './LocationEditor';
import {
  useContacts,
  useCreateProject,
  useProject,
  useUpdateProject,
  useUsersSearch,
} from './api';
import type { CreateProjectPayload, LocationInput } from '../../lib/types';

interface FormState {
  name: string;
  description: string;
  startDate: string;
  finishDate: string;
  clientId: string;
  clientLabel: string;
  picId: string;
  picLabel: string;
  contractValue: string;
  initialBudget: string;
  locations: LocationInput[];
}

const empty: FormState = {
  name: '',
  description: '',
  startDate: '',
  finishDate: '',
  clientId: '',
  clientLabel: '',
  picId: '',
  picLabel: '',
  contractValue: '',
  initialBudget: '',
  locations: [{ name: '' }],
};

export function ProjectForm() {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();
  const toast = useToast();

  const existing = useProject(id);
  const [form, setForm] = useState<FormState>(empty);
  const [loaded, setLoaded] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [banner, setBanner] = useState<string[]>([]);

  const [clientQuery, setClientQuery] = useState('');
  const [picQuery, setPicQuery] = useState('');
  const clients = useContacts('CLIENT', clientQuery);
  const users = useUsersSearch(picQuery);

  const create = useCreateProject();
  const update = useUpdateProject(id ?? '');

  // hydrate on edit
  if (isEdit && existing.data && !loaded) {
    const p = existing.data;
    setForm({
      name: p.name,
      description: p.description ?? '',
      startDate: p.startDate.slice(0, 10),
      finishDate: p.finishDate.slice(0, 10),
      clientId: p.client?.id ?? '',
      clientLabel: p.client?.name ?? '',
      picId: p.pic?.id ?? '',
      picLabel: p.pic?.name ?? '',
      contractValue: p.contractValue != null ? String(p.contractValue) : '',
      initialBudget: p.initialBudget != null ? String(p.initialBudget) : '',
      locations: p.locations.map((l) => ({
        id: l.id,
        name: l.name,
        city: l.city,
        province: l.province,
        weightPct: l.weightPct,
      })),
    });
    setLoaded(true);
  }

  const set = (patch: Partial<FormState>) => setForm((f) => ({ ...f, ...patch }));

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (form.name.trim().length < 3) e.name = 'Nama proyek minimal 3 karakter.';
    if (!form.startDate) e.startDate = 'Tanggal mulai wajib diisi.';
    if (!form.finishDate) e.finishDate = 'Tanggal selesai wajib diisi.';
    if (form.startDate && form.finishDate && form.finishDate < form.startDate)
      e.finishDate = 'Tanggal selesai harus ≥ tanggal mulai.';
    if (!form.clientId) e.clientId = 'Client wajib dipilih.';
    if (!form.picId) e.picId = 'PIC wajib dipilih.';
    if (form.locations.length === 0 || form.locations.some((l) => !l.name.trim()))
      e.locations = 'Setiap lokasi wajib punya nama (minimal 1 lokasi).';
    if (Math.abs(weightSum(form.locations) - 100) > 0.01)
      e.weights = 'Total bobot lokasi harus 100%.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async () => {
    setBanner([]);
    if (!validate()) {
      setBanner(['Periksa kembali isian yang ditandai.']);
      document.querySelector('.field-error')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    const payload: CreateProjectPayload = {
      name: form.name.trim(),
      description: form.description || undefined,
      startDate: form.startDate,
      finishDate: form.finishDate,
      clientId: form.clientId,
      picId: form.picId,
      contractValue: form.contractValue ? Number(form.contractValue) : undefined,
      initialBudget: form.initialBudget ? Number(form.initialBudget) : undefined,
      locations: form.locations,
    };
    try {
      const result = isEdit
        ? await update.mutateAsync(payload)
        : await create.mutateAsync(payload);
      toast.success(`${result.code} berhasil disimpan`);
      navigate(`/projects/${result.id}`);
    } catch (err) {
      const messages = err instanceof ApiError ? err.messages : ['Gagal menyimpan proyek.'];
      setBanner(messages);
      toast.error(messages[0]);
    }
  };

  const busy = create.isPending || update.isPending;

  return (
    <div className="page">
      <div className="page-head">
        <h1>{isEdit ? 'Ubah Proyek' : 'Proyek Baru'}</h1>
        <button className="btn-ghost" onClick={() => navigate(-1)}>
          Batal
        </button>
      </div>

      {banner.length > 0 && (
        <div className="banner banner-error" role="alert">
          <strong>Tidak dapat menyimpan:</strong>
          <ul>
            {banner.map((m, i) => (
              <li key={i}>{m}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="card form-grid">
        <div className="field span-2">
          <label className="field-label">Nama Proyek *</label>
          <input
            className={errors.name ? 'invalid' : ''}
            value={form.name}
            onFocus={(e) => e.target.select()}
            onChange={(e) => set({ name: e.target.value })}
          />
          {errors.name && <p className="field-error">{errors.name}</p>}
        </div>

        <div className="field span-2">
          <label className="field-label">Deskripsi</label>
          <textarea value={form.description} onChange={(e) => set({ description: e.target.value })} rows={2} />
        </div>

        <div className="field">
          <label className="field-label">Tanggal Mulai *</label>
          <input
            type="date"
            className={errors.startDate ? 'invalid' : ''}
            value={form.startDate}
            onChange={(e) => set({ startDate: e.target.value })}
          />
          {errors.startDate && <p className="field-error">{errors.startDate}</p>}
        </div>

        <div className="field">
          <label className="field-label">Tanggal Selesai *</label>
          <input
            type="date"
            className={errors.finishDate ? 'invalid' : ''}
            value={form.finishDate}
            onChange={(e) => set({ finishDate: e.target.value })}
          />
          {errors.finishDate && <p className="field-error">{errors.finishDate}</p>}
        </div>

        <div className="field">
          <label className="field-label">Client *</label>
          <SearchSelect
            value={form.clientId}
            valueLabel={form.clientLabel}
            placeholder="Cari client…"
            invalid={!!errors.clientId}
            options={(clients.data ?? []).map((c) => ({ id: c.id, name: c.name, sub: c.email }))}
            onSearch={setClientQuery}
            onSelect={(o) => set({ clientId: o.id, clientLabel: o.name })}
          />
          {errors.clientId && <p className="field-error">{errors.clientId}</p>}
        </div>

        <div className="field">
          <label className="field-label">Penanggung Jawab (PIC) *</label>
          <SearchSelect
            value={form.picId}
            valueLabel={form.picLabel}
            placeholder="Cari user…"
            invalid={!!errors.picId}
            options={(users.data ?? []).map((u) => ({ id: u.id, name: u.name, sub: u.role }))}
            onSearch={setPicQuery}
            onSelect={(o) => set({ picId: o.id, picLabel: o.name })}
          />
          {errors.picId && <p className="field-error">{errors.picId}</p>}
        </div>

        <div className="field">
          <label className="field-label">Nilai Kontrak</label>
          <input
            type="number"
            value={form.contractValue}
            onFocus={(e) => e.target.select()}
            onChange={(e) => set({ contractValue: e.target.value })}
          />
        </div>

        <div className="field">
          <label className="field-label">Estimasi Anggaran Awal</label>
          <input
            type="number"
            value={form.initialBudget}
            onFocus={(e) => e.target.select()}
            onChange={(e) => set({ initialBudget: e.target.value })}
          />
        </div>

        <div className="span-2">
          <LocationEditor locations={form.locations} onChange={(locations) => set({ locations })} />
          {errors.locations && <p className="field-error">{errors.locations}</p>}
          {errors.weights && <p className="field-error">{errors.weights}</p>}
        </div>
      </div>

      <div className="form-footer">
        <button className="btn-primary" onClick={submit} disabled={busy}>
          {busy ? 'Menyimpan…' : 'Simpan Proyek'}
        </button>
      </div>
    </div>
  );
}
