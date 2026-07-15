import type { LocationInput } from '../../lib/types';

interface Props {
  locations: LocationInput[];
  onChange: (locations: LocationInput[]) => void;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export function weightSum(locations: LocationInput[]): number {
  return round2(locations.reduce((s, l) => s + (l.weightPct ?? 0), 0));
}

/** Inline-editable location table (§7.1.2) with even-split helper. */
export function LocationEditor({ locations, onChange }: Props) {
  const update = (i: number, patch: Partial<LocationInput>) => {
    onChange(locations.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  };
  const add = () => onChange([...locations, { name: '' }]);
  const remove = (i: number) => onChange(locations.filter((_, idx) => idx !== i));

  const distribute = () => {
    const n = locations.length;
    if (n === 0) return;
    const base = Math.floor((100 / n) * 100) / 100;
    onChange(
      locations.map((l, i) => ({
        ...l,
        weightPct: i === n - 1 ? round2(100 - base * (n - 1)) : base,
      })),
    );
  };

  const sum = weightSum(locations);
  const sumOk = Math.abs(sum - 100) < 0.01;

  return (
    <div className="loc-editor">
      <div className="loc-head">
        <label className="field-label">Lokasi *</label>
        <div className="loc-actions">
          <span className={sumOk ? 'weight-ok' : 'weight-bad'}>Total bobot: {sum}%</span>
          <button type="button" className="btn-ghost" onClick={distribute}>
            Bagi rata
          </button>
          <button type="button" className="btn-ghost" onClick={add}>
            + Tambah lokasi
          </button>
        </div>
      </div>

      <table className="loc-table">
        <thead>
          <tr>
            <th>Nama Lokasi *</th>
            <th>Kota</th>
            <th>Provinsi</th>
            <th style={{ width: 110 }}>Bobot (%)</th>
            <th style={{ width: 40 }} />
          </tr>
        </thead>
        <tbody>
          {locations.map((l, i) => (
            <tr key={i}>
              <td>
                <input
                  value={l.name}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => update(i, { name: e.target.value })}
                  placeholder="mis. Gudang Bandung"
                />
              </td>
              <td>
                <input value={l.city ?? ''} onFocus={(e) => e.target.select()} onChange={(e) => update(i, { city: e.target.value })} />
              </td>
              <td>
                <input value={l.province ?? ''} onFocus={(e) => e.target.select()} onChange={(e) => update(i, { province: e.target.value })} />
              </td>
              <td>
                <input
                  type="number"
                  min={0}
                  max={100}
                  step="0.01"
                  value={l.weightPct ?? ''}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => update(i, { weightPct: e.target.value === '' ? undefined : Number(e.target.value) })}
                />
              </td>
              <td>
                {locations.length > 1 && (
                  <button type="button" className="btn-remove" aria-label="Hapus lokasi" onClick={() => remove(i)}>
                    ×
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {!sumOk && <p className="field-error">Total bobot harus 100%. Klik "Bagi rata" atau sesuaikan nilainya.</p>}
    </div>
  );
}
