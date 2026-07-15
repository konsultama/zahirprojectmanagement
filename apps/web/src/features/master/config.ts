export type FieldType = 'text' | 'number' | 'currency' | 'boolean' | 'select' | 'reference' | 'textarea';

export interface Field {
  key: string;
  label: string;
  type: FieldType;
  required?: boolean;
  options?: { value: string; label: string }[];
  ref?: string; // entity key for reference options
}

export interface Column {
  key: string;
  label: string;
  kind?: 'text' | 'currency' | 'boolean' | 'ref';
}

export interface EntityConfig {
  key: string;
  label: string;
  icon: string; // lucide icon name
  accent: string;
  columns: Column[];
  fields: Field[];
}

export const MASTER_ENTITIES: EntityConfig[] = [
  {
    key: 'contact',
    label: 'Data Kontak',
    icon: 'Users',
    accent: 'rgba(46,179,236,0.15)',
    columns: [
      { key: 'name', label: 'Nama' },
      { key: 'type', label: 'Tipe' },
      { key: 'email', label: 'Email' },
      { key: 'phone', label: 'Telepon' },
    ],
    fields: [
      { key: 'name', label: 'Nama', type: 'text', required: true },
      {
        key: 'type',
        label: 'Tipe',
        type: 'select',
        options: [
          { value: 'CLIENT', label: 'Client' },
          { value: 'VENDOR', label: 'Vendor' },
          { value: 'BOTH', label: 'Client & Vendor' },
        ],
      },
      { key: 'email', label: 'Email', type: 'text' },
      { key: 'phone', label: 'Telepon', type: 'text' },
      { key: 'address', label: 'Alamat', type: 'textarea' },
    ],
  },
  {
    key: 'account',
    label: 'Daftar Akun',
    icon: 'BookOpen',
    accent: 'rgba(245,107,59,0.15)',
    columns: [
      { key: 'code', label: 'Kode' },
      { key: 'name', label: 'Nama Akun' },
      { key: 'category', label: 'Kategori' },
      { key: 'normalBalance', label: 'Saldo Normal' },
      { key: 'isActive', label: 'Aktif', kind: 'boolean' },
    ],
    fields: [
      { key: 'code', label: 'Kode Akun', type: 'text', required: true },
      { key: 'name', label: 'Nama Akun', type: 'text', required: true },
      {
        key: 'category',
        label: 'Kategori',
        type: 'select',
        options: ['ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE'].map((v) => ({ value: v, label: v })),
      },
      {
        key: 'normalBalance',
        label: 'Saldo Normal',
        type: 'select',
        options: [
          { value: 'DEBIT', label: 'Debit' },
          { value: 'CREDIT', label: 'Kredit' },
        ],
      },
      { key: 'isActive', label: 'Aktif', type: 'boolean' },
    ],
  },
  {
    key: 'product',
    label: 'Data Produk',
    icon: 'Boxes',
    accent: 'rgba(233,80,68,0.15)',
    columns: [
      { key: 'code', label: 'Kode' },
      { key: 'name', label: 'Nama Produk' },
      { key: 'type', label: 'Tipe', kind: 'ref' },
      { key: 'unit', label: 'Satuan', kind: 'ref' },
      { key: 'price', label: 'Harga Jual', kind: 'currency' },
      { key: 'cost', label: 'Harga Pokok', kind: 'currency' },
    ],
    fields: [
      { key: 'code', label: 'Kode Produk', type: 'text', required: true },
      { key: 'name', label: 'Nama Produk', type: 'text', required: true },
      { key: 'typeId', label: 'Tipe Produk', type: 'reference', ref: 'product-type' },
      { key: 'unitId', label: 'Satuan', type: 'reference', ref: 'unit' },
      { key: 'price', label: 'Harga Jual', type: 'currency' },
      { key: 'cost', label: 'Harga Pokok', type: 'currency' },
      { key: 'isActive', label: 'Aktif', type: 'boolean' },
      { key: 'description', label: 'Deskripsi', type: 'textarea' },
    ],
  },
  {
    key: 'unit',
    label: 'Satuan Pengukuran',
    icon: 'Ruler',
    accent: 'rgba(195,208,70,0.15)',
    columns: [
      { key: 'code', label: 'Kode' },
      { key: 'name', label: 'Nama' },
      { key: 'isActive', label: 'Aktif', kind: 'boolean' },
    ],
    fields: [
      { key: 'code', label: 'Kode Satuan', type: 'text', required: true },
      { key: 'name', label: 'Nama Satuan', type: 'text', required: true },
      { key: 'isActive', label: 'Aktif', type: 'boolean' },
    ],
  },
  {
    key: 'warehouse',
    label: 'Data Gudang',
    icon: 'Warehouse',
    accent: 'rgba(162,120,66,0.15)',
    columns: [
      { key: 'code', label: 'Kode' },
      { key: 'name', label: 'Nama Gudang' },
      { key: 'address', label: 'Alamat' },
      { key: 'isActive', label: 'Aktif', kind: 'boolean' },
    ],
    fields: [
      { key: 'code', label: 'Kode Gudang', type: 'text', required: true },
      { key: 'name', label: 'Nama Gudang', type: 'text', required: true },
      { key: 'address', label: 'Alamat', type: 'textarea' },
      { key: 'isActive', label: 'Aktif', type: 'boolean' },
    ],
  },
  {
    key: 'product-type',
    label: 'Product Type',
    icon: 'Tags',
    accent: 'rgba(5,150,105,0.15)',
    columns: [
      { key: 'name', label: 'Nama' },
      { key: 'description', label: 'Deskripsi' },
      { key: 'isActive', label: 'Aktif', kind: 'boolean' },
    ],
    fields: [
      { key: 'name', label: 'Nama Tipe', type: 'text', required: true },
      { key: 'description', label: 'Deskripsi', type: 'textarea' },
      { key: 'isActive', label: 'Aktif', type: 'boolean' },
    ],
  },
];

export const entityByKey = (key: string) => MASTER_ENTITIES.find((e) => e.key === key);
