let search = new URLSearchParams();
const replace = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace, push: vi.fn() }),
  useSearchParams: () => search,
  usePathname: () => '/dashboard/platform/ads',
}));

vi.mock('../queries/get-platform-directory', () => ({
  usePlatformAdsQuery: vi.fn(),
  usePauseResumeAdMutation: vi.fn(),
  useReviewConfigQuery: vi.fn(),
  useSetReviewStrategyMutation: vi.fn(),
}));

vi.mock('../house-ads/queries/house-ads.queries', () => ({ useHouseAdsQuery: vi.fn() }));
vi.mock('../house-ads/mutations/house-ads.mutations', () => ({ useChangeHouseAdStatusMutation: vi.fn() }));

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

// F3's wizard has its own test file and its own service dependencies (event
// search, uploads); stub it here so this file only tests PlatformAdsPage's
// own behaviour (tabs, filters, the review queue).
vi.mock('./house-ads-wizard/HouseAdWizardDialog', () => ({
  HouseAdWizardDialog: ({ open }: { open: boolean }) => (open ? <div data-testid="wizard-dialog" /> : null),
}));

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PlatformAdsPage } from './PlatformAdsPage';
import {
  usePlatformAdsQuery,
  usePauseResumeAdMutation,
  useReviewConfigQuery,
  useSetReviewStrategyMutation,
} from '../queries/get-platform-directory';
import { useHouseAdsQuery } from '../house-ads/queries/house-ads.queries';
import { useChangeHouseAdStatusMutation } from '../house-ads/mutations/house-ads.mutations';
import type { HouseAdListItem } from '../house-ads/types/house-ads.types';

const reviewAds = [{
  id: 'ad-1', name: 'Campanha X', orgName: 'Org X', status: 'REVIEW', impressions30d: 100, spend: 5000,
}];

const houseAd: HouseAdListItem = {
  id: 'ha-1',
  title: 'Estreia: Showon Sessions',
  destination: { type: 'EVENT', eventId: 'evt-1' },
  format: 'WIDE_16_9',
  placements: ['PLAYER_PAUSE'],
  startsAt: '2026-09-01T00:00:00.000Z',
  endsAt: '2026-09-30T00:00:00.000Z',
  status: 'ACTIVE',
  housePriority: 'PRIORITY',
  impressions30d: 4200,
  clicks30d: 84,
  ctr30d: 0.02,
};

beforeEach(() => {
  vi.clearAllMocks();
  search = new URLSearchParams();
  vi.mocked(usePlatformAdsQuery).mockReturnValue({ data: { items: reviewAds, total: 1, limit: 20 }, isLoading: false } as never);
  vi.mocked(useReviewConfigQuery).mockReturnValue({ data: { strategy: 'human', strategies: ['human'] } } as never);
  vi.mocked(useSetReviewStrategyMutation).mockReturnValue({ mutate: vi.fn(), isPending: false } as never);
  vi.mocked(usePauseResumeAdMutation).mockReturnValue({ mutate: vi.fn(), isPending: false } as never);
  vi.mocked(useHouseAdsQuery).mockReturnValue({ data: { items: [houseAd], total: 1 }, isLoading: false, isError: false, refetch: vi.fn() } as never);
  vi.mocked(useChangeHouseAdStatusMutation).mockReturnValue({ mutate: vi.fn(), isPending: false } as never);
});

describe('PlatformAdsPage — tabs', () => {
  it('defaults to the Revisão tab and keeps its queue unchanged', () => {
    render(<PlatformAdsPage />);
    expect(screen.getByRole('tab', { name: /Revisão/ })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText('Campanha X')).toBeInTheDocument();
  });

  it('switches to Anúncios da plataforma and updates the URL', async () => {
    const user = userEvent.setup();
    render(<PlatformAdsPage />);
    await user.click(screen.getByRole('tab', { name: /Anúncios da plataforma/ }));
    expect(replace).toHaveBeenCalledWith('/dashboard/platform/ads?tab=house-ads');
  });

  it('renders the house-ads tab content when ?tab=house-ads', () => {
    search = new URLSearchParams('tab=house-ads');
    render(<PlatformAdsPage />);
    expect(screen.getByRole('tab', { name: /Anúncios da plataforma/ })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText('Estreia: Showon Sessions')).toBeInTheDocument();
  });

  it('shows each tab item count', () => {
    render(<PlatformAdsPage />);
    expect(screen.getByRole('tab', { name: /Revisão/ })).toHaveTextContent('1');
    expect(screen.getByRole('tab', { name: /Anúncios da plataforma/ })).toHaveTextContent('1');
  });

  it('moves focus and selection with ArrowRight/ArrowLeft (roving tabindex)', async () => {
    const user = userEvent.setup();
    render(<PlatformAdsPage />);
    const reviewTab = screen.getByRole('tab', { name: /Revisão/ });
    const houseTab = screen.getByRole('tab', { name: /Anúncios da plataforma/ });
    expect(reviewTab).toHaveAttribute('tabindex', '0');
    expect(houseTab).toHaveAttribute('tabindex', '-1');

    reviewTab.focus();
    await user.keyboard('{ArrowRight}');
    expect(replace).toHaveBeenCalledWith('/dashboard/platform/ads?tab=house-ads');
  });

  it('opens the create wizard from the shell\'s "Novo anúncio" button', async () => {
    search = new URLSearchParams('tab=house-ads');
    const user = userEvent.setup();
    render(<PlatformAdsPage />);
    expect(screen.queryByTestId('wizard-dialog')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '+ Novo anúncio' }));
    expect(screen.getByTestId('wizard-dialog')).toBeInTheDocument();
  });

  it('drives the house-ads query with the status and priority filters', async () => {
    search = new URLSearchParams('tab=house-ads');
    const user = userEvent.setup();
    render(<PlatformAdsPage />);

    await user.selectOptions(screen.getByLabelText('Status'), 'PAUSED');
    await vi.waitFor(() => {
      expect(useHouseAdsQuery).toHaveBeenLastCalledWith(expect.objectContaining({ status: 'PAUSED' }));
    });

    await user.selectOptions(screen.getByLabelText('Prioridade'), 'PRIORITY');
    await vi.waitFor(() => {
      expect(useHouseAdsQuery).toHaveBeenLastCalledWith(expect.objectContaining({ status: 'PAUSED', priority: 'PRIORITY' }));
    });
  });
});
