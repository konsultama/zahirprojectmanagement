import { Prisma } from '@prisma/client';

type FieldType = 'string' | 'number' | 'boolean' | 'enum';

export interface MasterConfig {
  /** Prisma delegate name (key on PrismaService). */
  delegate: string;
  label: string;
  /** Fields writable via create/update, with coercion type. */
  fields: Record<string, FieldType>;
  required: string[];
  /** Fields matched by the free-text search. */
  search: string[];
  /** Optional relation include for list/detail (display of referenced names). */
  include?: Prisma.ProductInclude | Record<string, unknown>;
  orderBy?: Record<string, 'asc' | 'desc'>;
}

/**
 * Registry of "Data Master" entities. Adding an entity here + its Prisma model
 * is all that's needed — the generic service/controller handle CRUD.
 */
export const MASTER_REGISTRY: Record<string, MasterConfig> = {
  contact: {
    delegate: 'contact',
    label: 'Data Kontak',
    fields: { name: 'string', type: 'enum', email: 'string', phone: 'string', address: 'string' },
    required: ['name'],
    search: ['name', 'email', 'phone'],
    orderBy: { name: 'asc' },
  },
  account: {
    delegate: 'account',
    label: 'Daftar Akun',
    fields: { code: 'string', name: 'string', category: 'enum', normalBalance: 'enum', isActive: 'boolean' },
    required: ['code', 'name'],
    search: ['code', 'name'],
    orderBy: { code: 'asc' },
  },
  'product-type': {
    delegate: 'productType',
    label: 'Product Type',
    fields: { name: 'string', description: 'string', isActive: 'boolean' },
    required: ['name'],
    search: ['name'],
    orderBy: { name: 'asc' },
  },
  unit: {
    delegate: 'unit',
    label: 'Satuan Pengukuran',
    fields: { code: 'string', name: 'string', isActive: 'boolean' },
    required: ['code', 'name'],
    search: ['code', 'name'],
    orderBy: { code: 'asc' },
  },
  warehouse: {
    delegate: 'warehouse',
    label: 'Data Gudang',
    fields: { code: 'string', name: 'string', address: 'string', isActive: 'boolean' },
    required: ['code', 'name'],
    search: ['code', 'name', 'address'],
    orderBy: { code: 'asc' },
  },
  'checklist-template': {
    delegate: 'checklistTemplate',
    label: 'Checklist Persetujuan',
    fields: { text: 'string', isRequired: 'boolean', needsAttachment: 'boolean', sortOrder: 'number', isActive: 'boolean' },
    required: ['text'],
    search: ['text'],
    orderBy: { sortOrder: 'asc' },
  },
  persona: {
    delegate: 'persona',
    label: 'Persona',
    fields: { name: 'string', roleTitle: 'string', systemRole: 'enum', mainNeed: 'string', userId: 'string', isActive: 'boolean' },
    required: ['name', 'roleTitle'],
    search: ['name', 'roleTitle'],
    include: { user: { select: { id: true, name: true } } },
    orderBy: { name: 'asc' },
  },
  product: {
    delegate: 'product',
    label: 'Data Produk',
    fields: {
      code: 'string',
      name: 'string',
      typeId: 'string',
      unitId: 'string',
      price: 'number',
      cost: 'number',
      isActive: 'boolean',
      description: 'string',
    },
    required: ['code', 'name'],
    search: ['code', 'name'],
    include: { type: { select: { id: true, name: true } }, unit: { select: { id: true, name: true } } },
    orderBy: { code: 'asc' },
  },
};
