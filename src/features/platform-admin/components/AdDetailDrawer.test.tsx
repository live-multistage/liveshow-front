import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AdDetailDrawer } from './AdDetailDrawer';
import { platformAdminService } from '../services/platform-admin.service';
import type { AdDetail } from '../types/platform-admin.types';

vi.mock('../services/platform-admin.service', () => ({
  platformAdminService: {
    getAdDetail: vi.fn(),
  },
}));

const mockedService = vi.mocked(platformAdminService);

const baseAd: AdDetail['ad'] = {
  id: 'ad-1',
  advertiserAccountId: 'acc-1',
  destination: null,
  title: 'Campanha Teste',
  format: 'HORIZONTAL_728x90',
  status: 'REVIEW',
  placements: ['FEED'],
  targetDomains: [],
  targetCategories: [],
  bannerUrl: null,
  frequencyCapMax: null,
  frequencyCapWindow: null,
  billingModel: 'CPM',
  bidCents: 100,
  dailyBudgetCents: 1000,
  totalLimitCents: 10000,
  totalSpendCents: 0,
  startsAt: '2026-07-01T00:00:00.000Z',
  endsAt: '2026-08-01T00:00:00.000Z',
  createdBy: 'user-1',
  createdAt: '2026-06-01T00:00:00.000Z',
  updatedAt: '2026-06-01T00:00:00.000Z',
};

function renderWithDetail(ad: AdDetail['ad']) {
  mockedService.getAdDetail.mockResolvedValue({ ad, reviews: [] });
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <AdDetailDrawer adId={ad.id} onClose={() => {}} />
    </QueryClientProvider>,
  );
}

describe('AdDetailDrawer destination', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows the legacy badge for a null destination', async () => {
    renderWithDetail({ ...baseAd, destination: null });

    expect(await screen.findByText('sem destino (legado)')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Ver evento/i })).not.toBeInTheDocument();
  });

  it('renders an internal event link for an EVENT destination', async () => {
    renderWithDetail({ ...baseAd, destination: { type: 'EVENT', eventId: 'evt-1' } });

    const link = await screen.findByRole('link', { name: /Ver evento/i });
    expect(link).toHaveAttribute('href', '/events/evt-1');
  });

  it('renders a new-tab external link for an EXTERNAL_URL destination', async () => {
    renderWithDetail({ ...baseAd, destination: { type: 'EXTERNAL_URL', url: 'https://sponsor.example/promo' } });

    const link = await screen.findByRole('link', { name: 'https://sponsor.example/promo' });
    expect(link).toHaveAttribute('href', 'https://sponsor.example/promo');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link.getAttribute('rel') ?? '').toContain('noopener');
  });
});
