import type { WbsNode } from './types';
import type { ImportRabRow } from './api';

const HEADER = ['No. WBS', 'Nama', 'Tipe', 'Satuan', 'Qty', 'Nilai Anggaran', 'Lokasi'];

const esc = (s: string) => (/[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s);

/** Flatten the WBS tree to a CSV string (importable back). */
export function exportRabCsv(tree: WbsNode[]): string {
  const lines: string[] = [HEADER.join(',')];
  const walk = (nodes: WbsNode[]) => {
    for (const n of nodes) {
      const isGroup = n.itemType === 'GROUP' || n.children.length > 0;
      lines.push(
        [
          n.wbsNumber,
          esc(n.name),
          isGroup ? '' : n.itemType,
          isGroup ? '' : n.uom ?? '',
          isGroup ? '' : String(n.qty ?? ''),
          isGroup ? '' : String(n.unitBudget ?? ''),
          esc(n.locationName ?? ''),
        ].join(','),
      );
      walk(n.children);
    }
  };
  walk(tree);
  return '﻿' + lines.join('\n');
}

/** Parse a single CSV line honoring quoted fields. */
function parseLine(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQ) {
      if (c === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (c === '"') inQ = false;
      else cur += c;
    } else if (c === '"') inQ = true;
    else if (c === ',') {
      out.push(cur);
      cur = '';
    } else cur += c;
  }
  out.push(cur);
  return out;
}

export interface ParsedRab {
  rows: ImportRabRow[];
  errors: string[];
}

/** Parse CSV text into import rows + validation errors. */
export function parseRabCsv(text: string): ParsedRab {
  const clean = text.replace(/^﻿/, '').trim();
  const lines = clean.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length === 0) return { rows: [], errors: ['File kosong.'] };

  // skip header if the first cell isn't a WBS number
  const first = parseLine(lines[0]);
  const start = /^\d+(\.\d+)*$/.test(first[0]?.trim() ?? '') ? 0 : 1;

  const rows: ImportRabRow[] = [];
  const errors: string[] = [];
  const numbers = new Set<string>();

  for (let i = start; i < lines.length; i++) {
    const c = parseLine(lines[i]).map((x) => x.trim());
    const wbsNumber = c[0] ?? '';
    const name = c[1] ?? '';
    if (!wbsNumber && !name) continue;
    if (!/^\d+(\.\d+)*$/.test(wbsNumber)) {
      errors.push(`Baris ${i + 1}: No. WBS "${wbsNumber}" tidak valid.`);
      continue;
    }
    if (!name) errors.push(`Baris ${i + 1}: nama wajib diisi.`);
    numbers.add(wbsNumber);
    const typeRaw = (c[2] ?? '').toUpperCase();
    rows.push({
      wbsNumber,
      name,
      itemType: typeRaw === 'MATERIAL' ? 'MATERIAL' : typeRaw === 'TASK' ? 'TASK' : undefined,
      uom: c[3] || undefined,
      qty: c[4] ? Number(c[4]) : undefined,
      unitBudget: c[5] ? Number(c[5]) : undefined,
      locationName: c[6] || undefined,
    });
  }

  // parent existence + depth
  for (const r of rows) {
    if (r.wbsNumber.split('.').length > 4) errors.push(`No. WBS "${r.wbsNumber}" melebihi 4 level.`);
    if (r.wbsNumber.includes('.')) {
      const parent = r.wbsNumber.slice(0, r.wbsNumber.lastIndexOf('.'));
      if (!numbers.has(parent)) errors.push(`Induk "${parent}" untuk baris ${r.wbsNumber} tidak ada.`);
    }
  }

  return { rows, errors };
}

export function downloadCsv(filename: string, csv: string) {
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
