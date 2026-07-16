import { useRef, useState } from 'react';
import { X, Upload, FileSpreadsheet } from 'lucide-react';
import { ApiError } from '../../lib/api';
import { useToast } from '../../components/Toast';
import { useImportRab } from './api';
import { parseRabCsv, type ParsedRab } from './rabCsv';

export function RabImport({ projectId, hasRows, onClose }: { projectId: string; hasRows: boolean; onClose: () => void }) {
  const importRab = useImportRab(projectId);
  const toast = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [parsed, setParsed] = useState<ParsedRab | null>(null);
  const [replace, setReplace] = useState(false);

  const onFile = async (file?: File) => {
    if (!file) return;
    const text = await file.text();
    setParsed(parseRabCsv(text));
  };

  const confirm = async () => {
    if (!parsed || parsed.errors.length > 0 || parsed.rows.length === 0) return;
    try {
      await importRab.mutateAsync({ rows: parsed.rows, replace });
      toast.success(`${parsed.rows.length} baris RAB diimpor`);
      onClose();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.messages[0] : 'Gagal mengimpor.');
    }
  };

  const canImport = parsed && parsed.errors.length === 0 && parsed.rows.length > 0 && (!hasRows || replace);

  return (
    <div className="modal-overlay" onMouseDown={onClose}>
      <div className="modal-paper modal-wide" onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2>Impor RAB dari CSV/Excel</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Tutup"><X size={20} /></button>
        </div>
        <div className="modal-body">
          <p className="muted small">
            Format kolom: <code>No. WBS, Nama, Tipe, Satuan, Qty, Nilai Anggaran, Lokasi</code>. Baris induk (mis.
            "1", "2") cukup isi No. WBS + Nama; baris rincian isi Tipe (Task/Material), Qty, dan Nilai. Simpan
            Excel sebagai CSV.
          </p>
          <div className="rab-import-actions">
            <button className="btn-ghost" onClick={() => inputRef.current?.click()}>
              <Upload size={15} /> Pilih file CSV
            </button>
            <input ref={inputRef} type="file" accept=".csv,text/csv" hidden onChange={(e) => onFile(e.target.files?.[0])} />
            {parsed && <span className="muted">{parsed.rows.length} baris terbaca</span>}
          </div>

          {parsed && parsed.errors.length > 0 && (
            <div className="banner banner-error">
              <strong>{parsed.errors.length} kesalahan:</strong>
              <ul>{parsed.errors.slice(0, 8).map((e, i) => <li key={i}>{e}</li>)}</ul>
            </div>
          )}

          {parsed && parsed.rows.length > 0 && (
            <div className="table-wrap rab-preview">
              <table className="data-table">
                <thead>
                  <tr><th>No. WBS</th><th>Nama</th><th>Tipe</th><th>Satuan</th><th className="num">Qty</th><th className="num">Nilai</th></tr>
                </thead>
                <tbody>
                  {parsed.rows.map((r, i) => (
                    <tr key={i}>
                      <td className="wbs-num">{r.wbsNumber}</td>
                      <td>{r.name}</td>
                      <td>{r.itemType ?? '—'}</td>
                      <td>{r.uom ?? '—'}</td>
                      <td className="num">{r.qty ?? '—'}</td>
                      <td className="num">{r.unitBudget?.toLocaleString('id-ID') ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {hasRows && (
            <label className="switch-row" style={{ marginTop: '0.5rem' }}>
              <input type="checkbox" checked={replace} onChange={(e) => setReplace(e.target.checked)} />
              Ganti (timpa) RAB yang sudah ada
            </label>
          )}
        </div>
        <div className="modal-foot">
          <button className="btn-ghost" onClick={onClose}>Batal</button>
          <button className="btn-primary" onClick={confirm} disabled={!canImport || importRab.isPending}>
            <FileSpreadsheet size={16} /> {importRab.isPending ? 'Mengimpor…' : 'Impor'}
          </button>
        </div>
      </div>
    </div>
  );
}
