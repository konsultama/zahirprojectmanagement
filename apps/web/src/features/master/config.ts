export type FieldType =
  | 'text'
  | 'number'
  | 'currency'
  | 'boolean'
  | 'select'
  | 'reference'
  | 'user-ref'
  | 'textarea';

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
  hidden?: boolean; // not shown on the Data Master landing (e.g. surfaced under Settings)
}

const SYSTEM_ROLES = ['ADMIN', 'PM', 'SUPERVISOR', 'QC', 'FINANCE', 'VIEWER'].map((r) => ({
  value: r,
  label: r,
}));

export const MASTER_ENTITIES: EntityConfig[] = [
  {
    key: 'persona',
    label: 'Persona',
    icon: 'UserCircle',
    accent: 'rgba(46,179,236,0.15)',
    hidden: true, // surfaced under Pengaturan, not Data Master
    columns: [
      { key: 'name', label: 'Nama' },
      { key: 'roleTitle', label: 'Peran' },
      { key: 'systemRole', label: 'Role Sistem' },
      { key: 'user', label: 'Akun User', kind: 'ref' },
      { key: 'mainNeed', label: 'Kebutuhan Utama' },
      { key: 'isActive', label: 'Aktif', kind: 'boolean' },
    ],
    fields: [
      { key: 'name', label: 'Nama Persona', type: 'text', required: true },
      { key: 'roleTitle', label: 'Peran', type: 'text', required: true },
      { key: 'systemRole', label: 'Role Sistem', type: 'select', options: SYSTEM_ROLES },
      { key: 'userId', label: 'Akun User (login "Masuk sebagai")', type: 'user-ref' },
      { key: 'mainNeed', label: 'Kebutuhan Utama', type: 'textarea' },
      { key: 'isActive', label: 'Aktif', type: 'boolean' },
    ],
  },
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
    key: 'checklist-template',
    label: 'Checklist Persetujuan',
    icon: 'ListChecks',
    accent: 'rgba(2,127,179,0.15)',
    columns: [
      { key: 'sortOrder', label: 'Urutan' },
      { key: 'text', label: 'Item Checklist' },
      { key: 'isRequired', label: 'Wajib', kind: 'boolean' },
      { key: 'needsAttachment', label: 'Perlu Lampiran', kind: 'boolean' },
      { key: 'isActive', label: 'Aktif', kind: 'boolean' },
    ],
    fields: [
      { key: 'text', label: 'Teks Item', type: 'text', required: true },
      { key: 'sortOrder', label: 'Urutan', type: 'number' },
      { key: 'isRequired', label: 'Wajib', type: 'boolean' },
      { key: 'needsAttachment', label: 'Perlu Lampiran', type: 'boolean' },
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
