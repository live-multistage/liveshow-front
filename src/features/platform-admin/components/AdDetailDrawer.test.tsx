import { describe, it, expect, vi, beforeEach } from 'vitest';
vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
import { render, screen, fireEvent } from '@testing-library/react';
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
  videoUrl: null,
  videoDurationSec: null,
  pauseVariant: null,
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
    expect(screen.queryByRole('link', { name: /viewEvent/i })).not.toBeInTheDocument();
  });

  it('renders an internal event link for an EVENT destination', async () => {
    renderWithDetail({ ...baseAd, destination: { type: 'EVENT', eventId: 'evt-1' } });

    const link = await screen.findByRole('link', { name: /viewEvent/i });
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

describe('AdDetailDrawer creative review', () => {
  beforeEach(() => vi.clearAllMocks());

  const videoAd = {
    ...baseAd,
    format: 'VIDEO_16_9',
    placements: ['PRE_ROLL'],
    videoUrl: 'https://cdn.example.com/ad.mp4',
    videoDurationSec: 20,
  };

  it('plays the submitted video instead of saying there is no creative', async () => {
    const { container } = renderWithDetail(videoAd);
    await screen.findByText('Vídeo · 16:9');
    const video = container.querySelector('video');
    expect(video).not.toBeNull();
    expect(video).toHaveAttribute('src', 'https://cdn.example.com/ad.mp4');
    expect(video).toHaveAttribute('controls');
    expect(screen.queryByText(/sem criativo/i)).toBeNull();
  });

  it('keeps Aprovar locked until the reviewer confirms watching the whole video with sound', async () => {
    renderWithDetail(videoAd);
    const approve = await screen.findByRole('button', { name: /approve/i });
    expect(approve).toBeDisabled();

    fireEvent.click(screen.getByRole('checkbox', { name: 'Assisti ao vídeo inteiro com som' }));
    expect(approve).toBeEnabled();
  });

  it('does not block Rejeitar on the watch confirmation', async () => {
    renderWithDetail(videoAd);
    fireEvent.change(await screen.findByLabelText('adReasonLabel'), { target: { value: 'Sem som' } });
    expect(screen.getByRole('button', { name: /reject/i })).toBeEnabled();
  });

  it('flags a video ad whose file is missing and never lets it be approved', async () => {
    renderWithDetail({ ...videoAd, videoUrl: null });
    expect(await screen.findByText(/vídeo não enviado/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /approve/i })).toBeDisabled();
  });

  it('banner ads need no watch confirmation', async () => {
    renderWithDetail(baseAd);
    expect(await screen.findByRole('button', { name: /approve/i })).toBeEnabled();
    expect(screen.queryByRole('checkbox')).toBeNull();
  });

  it('shows the pause variant and the creative of a pause ad', async () => {
    renderWithDetail({
      ...baseAd,
      format: 'WIDE_16_9',
      placements: ['PLAYER_PAUSE'],
      bannerUrl: 'https://cdn.example.com/pause.webp',
      pauseVariant: 'FULLSCREEN',
    });
    expect(await screen.findByText('Tela cheia')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Campanha Teste' })).toHaveAttribute('src', 'https://cdn.example.com/pause.webp');
  });

  it('treats a legacy pause ad without variant as Padrão', async () => {
    renderWithDetail({ ...baseAd, format: 'WIDE_16_9', placements: ['PLAYER_PAUSE'], bannerUrl: 'https://x/p.webp', pauseVariant: null });
    expect(await screen.findByText('Padrão')).toBeInTheDocument();
  });
});
