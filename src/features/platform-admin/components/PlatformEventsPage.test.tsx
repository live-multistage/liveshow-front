import { describe, it, expect, vi, beforeEach } from 'vitest';
vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PlatformEventsPage } from './PlatformEventsPage';
import { platformAdminService } from '../services/platform-admin.service';
import type { PlatformEventRow } from '../types/platform-admin.types';

vi.mock('../services/platform-admin.service', () => ({
  platformAdminService: {
    getPlatformEvents: vi.fn(),
    getEventReports: vi.fn(),
  },
}));

const mockedService = vi.mocked(platformAdminService);

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
  openReportsCount: 0,
};

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <PlatformEventsPage />
    </QueryClientProvider>,
  );
}

describe('PlatformEventsPage — reports', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders a report-count badge when openReportsCount > 0', async () => {
    mockedService.getPlatformEvents.mockResolvedValue({
      items: [{ ...baseRow, openReportsCount: 3 }],
      total: 1,
      page: 1,
      limit: 20,
    });
    renderPage();

    expect(await screen.findByText('3')).toBeInTheDocument();
  });

  it('does not render a badge when openReportsCount is 0', async () => {
    mockedService.getPlatformEvents.mockResolvedValue({
      items: [baseRow],
      total: 1,
      page: 1,
      limit: 20,
    });
    renderPage();

    expect(await screen.findByText('Show da Banda X')).toBeInTheDocument();
    expect(screen.queryByTitle('reportsBadgeTitle')).not.toBeInTheDocument();
  });

  it('drives the query with moderation=REPORTED when the REPORTED filter is selected', async () => {
    mockedService.getPlatformEvents.mockResolvedValue({ items: [baseRow], total: 1, page: 1, limit: 20 });
    const user = userEvent.setup();
    renderPage();

    await screen.findByText('Show da Banda X');
    // The REPORTED chip resolves its label via the i18n mock to the raw key, uppercased for display.
    const chip = screen.getByRole('button', { name: /reportedfilter/i });
    await user.click(chip);

    await vi.waitFor(() => {
      expect(mockedService.getPlatformEvents).toHaveBeenCalledWith(
        expect.objectContaining({ moderation: 'REPORTED' }),
      );
    });
  });
});
