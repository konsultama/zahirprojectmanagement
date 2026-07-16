import { useRef, useState } from 'react';
import { Upload, FileText, ExternalLink } from 'lucide-react';
import { ApiError, absoluteFileUrl, uploadFile } from '../lib/api';
import { useToast } from './Toast';

interface Props {
  value?: string | null; // current file url
  disabled?: boolean;
  onUploaded: (url: string, fileName: string) => void;
}

/** Compact file uploader: shows a link when a file exists, and an upload button. */
export function FileUpload({ value, disabled, onUploaded }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  const pick = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    try {
      const res = await uploadFile(file);
      onUploaded(res.url, res.fileName);
      toast.success('File terunggah');
    } catch (e) {
      toast.error(e instanceof ApiError ? e.messages[0] : 'Gagal mengunggah.');
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <div className="file-upload">
      {value && (
        <a href={absoluteFileUrl(value)} target="_blank" rel="noreferrer" className="file-link" title="Buka file">
          <FileText size={14} /> Lihat <ExternalLink size={11} />
        </a>
      )}
      {!disabled && (
        <>
          <button className="btn-ghost file-btn" disabled={busy} onClick={() => inputRef.current?.click()}>
            <Upload size={14} /> {busy ? 'Mengunggah…' : value ? 'Ganti' : 'Unggah'}
          </button>
          <input
            ref={inputRef}
            type="file"
            hidden
            accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
            onChange={(e) => pick(e.target.files?.[0])}
          />
        </>
      )}
    </div>
  );
}
