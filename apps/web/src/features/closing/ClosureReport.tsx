import { Printer, X } from 'lucide-react';
import { formatDate, formatRupiah } from '../../lib/format';
import { useClosureReport } from './api';

const DOC_STATUS: Record<string, string> = {
  BELUM: 'Belum',
  ADA: 'Ada',
  TERVERIFIKASI: 'Terverifikasi',
  TIDAK_BERLAKU: 'Tidak Berlaku',
};

export function ClosureReport({ projectId, onClose }: { projectId: string; onClose: () => void }) {
  const { data: r, isLoading } = useClosureReport(projectId, true);

  return (
    <div className="report-overlay">
      <div className="report-toolbar no-print">
        <button className="btn-primary" onClick={() => window.print()}>
          <Printer size={16} /> Cetak / Unduh PDF
        </button>
        <button className="btn-ghost" onClick={onClose}>
          <X size={16} /> Tutup
        </button>
      </div>

      <div className="report-page print-area">
        {isLoading || !r ? (
          <p className="muted">Memuat laporan…</p>
        ) : (
          <>
            <header className="report-head">
              <h1>Laporan Penutupan Proyek</h1>
              <p className="muted">Project Closure Report · dibuat {formatDate(r.generatedAt)}</p>
            </header>

            <section className="report-sec">
              <h2>Identitas Proyek</h2>
              <table className="report-kv">
                <tbody>
                  <tr><td>Kode</td><td>{r.project.code}</td></tr>
                  <tr><td>Nama</td><td>{r.project.name}</td></tr>
                  <tr><td>Client</td><td>{r.project.client ?? '—'}</td></tr>
                  <tr><td>PIC</td><td>{r.project.pic ?? '—'}</td></tr>
                  <tr><td>Status</td><td>{r.project.status}</td></tr>
                  <tr><td>Jadwal</td><td>{formatDate(r.project.startDate)} → {formatDate(r.project.finishDate)}</td></tr>
                  <tr><td>Selesai Aktual</td><td>{formatDate(r.project.actualFinishDate)}</td></tr>
                  <tr><td>Nilai Kontrak</td><td>{formatRupiah(r.project.contractValue)}</td></tr>
                </tbody>
              </table>
            </section>

            <section className="report-sec">
              <h2>Ringkasan Kinerja</h2>
              <table className="report-kv">
                <tbody>
                  <tr><td>Progres Akhir</td><td>{r.summary.progressPct}%</td></tr>
                  <tr><td>Anggaran Rencana</td><td>{formatRupiah(r.summary.budget.plan)}</td></tr>
                  <tr><td>Anggaran Terpakai</td><td>{formatRupiah(r.summary.budget.actual)}</td></tr>
                  <tr><td>Varians Anggaran</td><td>{formatRupiah(r.summary.budget.variance)}</td></tr>
                  <tr><td>Jadwal Rencana</td><td>{r.summary.schedule.plannedDays} hari</td></tr>
                  <tr><td>Jadwal Aktual</td><td>{r.summary.schedule.actualDays} hari ({r.summary.schedule.diffDays >= 0 ? '+' : ''}{r.summary.schedule.diffDays})</td></tr>
                  <tr><td>Temuan QC</td><td>{r.summary.qcFindings}</td></tr>
                  <tr><td>Risiko Terjadi</td><td>{r.summary.risksOccurred}</td></tr>
                </tbody>
              </table>
            </section>

            <section className="report-sec">
              <h2>Kelengkapan Dokumen ({r.completeness.requiredDone}/{r.completeness.requiredTotal} wajib)</h2>
              <table className="report-table">
                <thead>
                  <tr><th>Dokumen</th><th>Wajib</th><th>Status</th><th>No.</th></tr>
                </thead>
                <tbody>
                  {r.documents.map((d) => (
                    <tr key={d.id}>
                      <td>{d.name}</td>
                      <td>{d.isRequired ? 'Ya' : '—'}</td>
                      <td>{DOC_STATUS[d.status]}</td>
                      <td>{d.documentNo ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>

            <section className="report-sec">
              <h2>Evaluasi Akhir</h2>
              <p><strong>Lessons Learned:</strong> {r.evaluation.lessonsLearned ?? '—'}</p>
              <p><strong>Penilaian Vendor:</strong> {r.evaluation.vendorRating ?? '—'}/5</p>
              <p><strong>Kepuasan Client:</strong> {r.evaluation.clientRating ?? '—'}/5</p>
            </section>

            <footer className="report-foot muted">
              {r.approvedAt ? `Disetujui pada ${formatDate(r.approvedAt)}.` : 'Belum disetujui.'}
            </footer>
          </>
        )}
      </div>
    </div>
  );
}
