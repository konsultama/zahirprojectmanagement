import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';

// Mock the API layer the component depends on.
const apiGet = vi.fn();
const apiPatch = vi.fn();
const apiPost = vi.fn();
vi.mock('../../lib/api', () => ({
  apiGet: (...a: unknown[]) => apiGet(...a),
  apiPatch: (...a: unknown[]) => apiPatch(...a),
  apiPost: (...a: unknown[]) => apiPost(...a),
}));

import { NotificationBell } from './NotificationBell';

function renderBell() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <NotificationBell />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const SAMPLE = {
  data: [
    { id: 'n1', type: 'STAGE_APPROVED', title: 'Initiating disetujui', message: 'oleh Admin', projectId: 'p1', isRead: false, createdAt: new Date().toISOString() },
    { id: 'n2', type: 'QC_FAILED', title: 'QC Gagal', message: 'temuan X', projectId: 'p1', isRead: true, createdAt: new Date().toISOString() },
  ],
  unread: 1,
  total: 2,
};

beforeEach(() => {
  apiGet.mockReset();
  apiPatch.mockReset().mockResolvedValue({ unread: 0 });
  apiPost.mockReset().mockResolvedValue({ unread: 0 });
  apiGet.mockImplementation((path: string) => {
    if (path === '/notifications/unread-count') return Promise.resolve({ unread: 1 });
    if (path === '/notifications') return Promise.resolve(SAMPLE);
    return Promise.resolve({});
  });
});

describe('NotificationBell', () => {
  it('shows the unread badge from the count endpoint', async () => {
    renderBell();
    expect(await screen.findByText('1')).toBeInTheDocument();
  });

  it('opens the panel and lists notifications on click', async () => {
    const user = userEvent.setup();
    renderBell();
    await screen.findByText('1');
    await user.click(screen.getByLabelText('Notifikasi'));
    expect(await screen.findByText('Initiating disetujui')).toBeInTheDocument();
    expect(screen.getByText('QC Gagal')).toBeInTheDocument();
  });

  it('calls read-all when "Tandai semua dibaca" is clicked', async () => {
    const user = userEvent.setup();
    renderBell();
    await screen.findByText('1');
    await user.click(screen.getByLabelText('Notifikasi'));
    await screen.findByText('Initiating disetujui');
    await user.click(screen.getByText(/Tandai semua dibaca/));
    await waitFor(() => expect(apiPost).toHaveBeenCalledWith('/notifications/read-all', {}));
  });
});
