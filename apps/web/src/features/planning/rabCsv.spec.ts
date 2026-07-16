import { describe, it, expect } from 'vitest';
import { parseRabCsv } from './rabCsv';

const HEADER = 'No. WBS,Nama,Tipe,Satuan,Qty,Nilai Anggaran,Lokasi';

describe('parseRabCsv', () => {
  it('skips the header row and parses items', () => {
    const csv = [HEADER, '1,Persiapan,,,,,', '1.1,Galian,TASK,m3,10,50000,Blok A'].join('\n');
    const { rows, errors } = parseRabCsv(csv);
    expect(errors).toEqual([]);
    expect(rows).toHaveLength(2);
    expect(rows[1]).toMatchObject({
      wbsNumber: '1.1',
      name: 'Galian',
      itemType: 'TASK',
      uom: 'm3',
      qty: 10,
      unitBudget: 50000,
      locationName: 'Blok A',
    });
  });

  it('accepts a file without a header (first cell is a WBS number)', () => {
    const { rows, errors } = parseRabCsv('1,Persiapan,,,,,');
    expect(errors).toEqual([]);
    expect(rows).toHaveLength(1);
  });

  it('strips a UTF-8 BOM', () => {
    const { rows } = parseRabCsv('﻿' + HEADER + '\n1,Persiapan,,,,,');
    expect(rows).toHaveLength(1);
  });

  it('honors quoted fields containing commas', () => {
    const csv = HEADER + '\n1,"Galian, urug",TASK,m3,5,1000,"Blok A, Lt.2"';
    const { rows } = parseRabCsv(csv);
    expect(rows[0].name).toBe('Galian, urug');
    expect(rows[0].locationName).toBe('Blok A, Lt.2');
  });

  it('flags an invalid WBS number', () => {
    const { errors } = parseRabCsv(HEADER + '\nABC,Salah,,,,,');
    expect(errors.some((e) => e.includes('tidak valid'))).toBe(true);
  });

  it('flags a missing name', () => {
    const { errors } = parseRabCsv(HEADER + '\n1,,,,,,');
    expect(errors.some((e) => e.includes('nama wajib'))).toBe(true);
  });

  it('flags a missing parent', () => {
    const { errors } = parseRabCsv(HEADER + '\n1.1,Anak tanpa induk,TASK,m3,1,1000,');
    expect(errors.some((e) => e.includes('Induk "1"'))).toBe(true);
  });

  it('flags WBS depth beyond 4 levels', () => {
    const csv = [HEADER, '1,A,,,,,', '1.1,B,,,,,', '1.1.1,C,,,,,', '1.1.1.1,D,,,,,', '1.1.1.1.1,E,TASK,m,1,1,'].join('\n');
    const { errors } = parseRabCsv(csv);
    expect(errors.some((e) => e.includes('melebihi 4 level'))).toBe(true);
  });

  it('reports an empty file', () => {
    expect(parseRabCsv('   ').errors).toContain('File kosong.');
  });
});
