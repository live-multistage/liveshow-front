import { describe, it, expect, vi, beforeEach } from 'vitest';
vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { EventDetailDrawer } from './EventDetailDrawer';
import { platformAdminService } from '../services/platform-admin.service';
import { eventsService } from '@/features/events/services/events.service';
import type { PlatformEventRow, PlatformReport } from '../types/platform-admin.types';

vi.mock('../services/platform-admin.service', () => ({
  platformAdminService: {
    getEventReports: vi.fn(),
    resolveReport: vi.fn(),
    moderateEvent: vi.fn(),
  },
}));

vi.mock('@/features/events/services/events.service', () => ({
  eventsService: { getEvent: vi.fn() },
}));

const mockedPlatformAdmin = vi.mocked(platformAdminService);
const mockedEvents = vi.mocked(eventsService);

const baseRow: PlatformEventRow = {
  id: 'evt-1',
  title: 'Show da Banda X',
  orgId: 'org-1',
  orgName: 'Org X',
  status: 'PUBLISHED',
  startsAt: '2026-08-01T00:00:00.000Z',
  camerasCount: 2,
  category: 'MUSIC',
  thumbnailUrl: null,
  publiclyFunded: false,
  hasLibrasCamera: false,
  accessibilityApproved: false,
  moderationStatus: null,
  moderationReason: null,
  openReportsCount: 1,
};

const baseReport: PlatformReport = {
  id: 'report-1',
  reason: 'VIOLENCE',
  detail: 'Something bad happened',
  status: 'PENDING',
  createdAt: '2026-07-20T10:00:00.000Z',
  reporterKind: 'anonymous',
};

function renderDrawer(row: PlatformEventRow = baseRow) {
  mockedEvents.getEvent.mockResolvedValue(undefined as never);
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const onClose = vi.fn();
  render(
    <QueryClientProvider client={queryClient}>
      <EventDetailDrawer event={row} onClose={onClose} />
    </QueryClientProvider>,
  );
  return { onClose };
}

describe('EventDetailDrawer — reports panel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows the empty state when there are no pending reports', async () => {
    mockedPlatformAdmin.getEventReports.mockResolvedValue({ items: [], total: 0, page: 1, limit: 20 });
    renderDrawer();

    expect(await screen.findByText('reportsEmpty')).toBeInTheDocument();
    expect(mockedPlatformAdmin.getEventReports).toHaveBeenCalledWith('evt-1', 'PENDING');
  });

  it('lists a pending report with reason, detail and reporter kind', async () => {
    mockedPlatformAdmin.getEventReports.mockResolvedValue({ items: [baseReport], total: 1, page: 1, limit: 20 });
    renderDrawer();

    expect(await screen.findByText('reasons.VIOLENCE')).toBeInTheDocument();
    expect(screen.getByText('Something bad happened')).toBeInTheDocument();
    expect(screen.getByText('reporterKind.anonymous')).toBeInTheDocument();
  });

  it('calls resolveReport with REVIEWED when clicking Revisar', async () => {
    mockedPlatformAdmin.getEventReports.mockResolvedValue({ items: [baseReport], total: 1, page: 1, limit: 20 });
    mockedPlatformAdmin.resolveReport.mockResolvedValue({
      id: 'report-1', status: 'REVIEWED', resolvedBy: 'admin-1', resolvedAt: '2026-07-26T00:00:00.000Z',
    });
    const user = userEvent.setup();
    renderDrawer();

    await screen.findByText('reasons.VIOLENCE');
    await user.click(screen.getByRole('button', { name: 'resolveReviewed' }));

    await waitFor(() => {
      expect(mockedPlatformAdmin.resolveReport).toHaveBeenCalledWith('report-1', 'REVIEWED');
    });
  });

  it('calls resolveReport with DISMISSED when clicking Descartar', async () => {
    mockedPlatformAdmin.getEventReports.mockResolvedValue({ items: [baseReport], total: 1, page: 1, limit: 20 });
    mockedPlatformAdmin.resolveReport.mockResolvedValue({
      id: 'report-1', status: 'DISMISSED', resolvedBy: 'admin-1', resolvedAt: '2026-07-26T00:00:00.000Z',
    });
    const user = userEvent.setup();
    renderDrawer();

    await screen.findByText('reasons.VIOLENCE');
    await user.click(screen.getByRole('button', { name: 'resolveDismissed' }));

    await waitFor(() => {
      expect(mockedPlatformAdmin.resolveReport).toHaveBeenCalledWith('report-1', 'DISMISSED');
    });
  });
});
