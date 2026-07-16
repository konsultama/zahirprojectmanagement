import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { axe } from 'jest-axe';
import { MasterForm } from './MasterForm';
import { ToastProvider } from '../../components/Toast';
import type { EntityConfig } from './config';

// A config exercising every non-networked field type (reference/user-ref would
// trigger queries; those aren't needed to validate labelling).
const CONFIG: EntityConfig = {
  key: 'demo',
  label: 'Demo',
  icon: 'Boxes',
  accent: '#eee',
  columns: [],
  fields: [
    { key: 'name', label: 'Nama', type: 'text', required: true },
    { key: 'qty', label: 'Jumlah', type: 'number' },
    { key: 'note', label: 'Catatan', type: 'textarea' },
    { key: 'kind', label: 'Jenis', type: 'select', options: [{ value: 'A', label: 'A' }, { value: 'B', label: 'B' }] },
    { key: 'isActive', label: 'Aktif', type: 'boolean' },
  ],
};

function renderForm() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <ToastProvider>
        <MasterForm config={CONFIG} initial={null} onClose={() => {}} onSave={async () => {}} />
      </ToastProvider>
    </QueryClientProvider>,
  );
}

describe('MasterForm accessibility', () => {
  it('has no axe violations (every control is labelled)', async () => {
    const { container } = renderForm();
    const results = await axe(container);
    expect(results.violations).toEqual([]);
  });

  it('exposes a labelled dialog', () => {
    const { getByRole } = renderForm();
    const dialog = getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    // name comes from the aria-labelledby title
    expect(dialog).toHaveAccessibleName('Tambah Demo');
  });

  it('associates each field label with its control', () => {
    const { getByLabelText } = renderForm();
    // getByLabelText throws if the accessible name isn't wired up
    expect(getByLabelText(/Nama/)).toBeInTheDocument();
    expect(getByLabelText('Jenis')).toBeInTheDocument();
    expect(getByLabelText('Aktif')).toBeInTheDocument();
  });
});
