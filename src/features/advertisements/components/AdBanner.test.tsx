import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AdBanner } from './AdBanner';
import { advertisementsService } from '../services/advertisements.service';
import type { ServedAd } from '../types/advertisement.types';

vi.mock('../services/advertisements.service', () => ({
  advertisementsService: {
    serve: vi.fn(),
    recordImpression: vi.fn(),
    recordClick: vi.fn(),
  },
}));

const mockedService = vi.mocked(advertisementsService);

function renderWithAd(ad: ServedAd | null) {
  mockedService.serve.mockResolvedValue(ad ? [ad] : []);
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <AdBanner placement="FEED" />
    </QueryClientProvider>,
  );
}

const baseAd: Omit<ServedAd, 'destination'> = {
  adId: 'ad-1',
  title: 'Great Ad',
  format: 'HORIZONTAL_728x90',
  advertiserAccountId: 'acc-1',
  bannerUrl: null,
};

describe('AdBanner', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders an internal Link for an EVENT destination', async () => {
    renderWithAd({ ...baseAd, destination: { type: 'EVENT', eventId: 'evt-1' } });

    const link = await screen.findByRole('link', { name: /Great Ad/i });
    expect(link).toHaveAttribute('href', '/events/evt-1');
    expect(screen.getByText('SAIBA MAIS →')).toBeInTheDocument();
  });

  it('renders an external anchor for an EXTERNAL_URL destination', async () => {
    renderWithAd({ ...baseAd, destination: { type: 'EXTERNAL_URL', url: 'https://sponsor.example' } });

    const link = await screen.findByRole('link', { name: /Great Ad/i });
    expect(link).toHaveAttribute('href', 'https://sponsor.example');
    expect(link).toHaveAttribute('target', '_blank');
    const rel = link.getAttribute('rel') ?? '';
    expect(rel).toContain('noopener');
    expect(rel).toContain('sponsored');
    expect(screen.getByText('SAIBA MAIS →')).toBeInTheDocument();
  });

  it('renders a non-clickable div with no CTA for a null destination', async () => {
    renderWithAd({ ...baseAd, destination: null });

    await screen.findByText('Great Ad');
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(screen.queryByText('SAIBA MAIS →')).not.toBeInTheDocument();
  });

  it('fires impression exactly once', async () => {
    renderWithAd({ ...baseAd, destination: { type: 'EVENT', eventId: 'evt-1' } });

    await screen.findByRole('link', { name: /Great Ad/i });
    await waitFor(() => expect(mockedService.recordImpression).toHaveBeenCalledTimes(1));
    expect(mockedService.recordImpression).toHaveBeenCalledWith('ad-1');
  });

  it('fires click handler for an EVENT link', async () => {
    renderWithAd({ ...baseAd, destination: { type: 'EVENT', eventId: 'evt-1' } });

    const link = await screen.findByRole('link', { name: /Great Ad/i });
    fireEvent.click(link);
    expect(mockedService.recordClick).toHaveBeenCalledWith('ad-1');
  });

  it('fires click handler for an EXTERNAL_URL link', async () => {
    renderWithAd({ ...baseAd, destination: { type: 'EXTERNAL_URL', url: 'https://sponsor.example' } });

    const link = await screen.findByRole('link', { name: /Great Ad/i });
    fireEvent.click(link);
    expect(mockedService.recordClick).toHaveBeenCalledWith('ad-1');
  });
});
