import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PauseAdTakeover } from './PauseAdTakeover';
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

const baseAd: ServedAd = {
  servedId: 'srv-1',
  adId: 'ad-1',
  title: 'Great Ad',
  format: 'WIDE_16_9',
  advertiserAccountId: 'acc-1',
  destination: { type: 'EVENT', eventId: 'evt-1' },
  bannerUrl: null,
  videoUrl: null,
  videoDurationSec: null,
};

function renderTakeover(props: Partial<Parameters<typeof PauseAdTakeover>[0]> & { ad?: ServedAd } = {}) {
  mockedService.serve.mockResolvedValue([props.ad ?? baseAd]);
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const onResume = props.onResume ?? vi.fn();
  const onVisibleChange = props.onVisibleChange ?? vi.fn();
  const utils = render(
    <QueryClientProvider client={queryClient}>
      <PauseAdTakeover eventId="e1" paused={props.paused ?? false} onResume={onResume} onVisibleChange={onVisibleChange} />
    </QueryClientProvider>,
  );
  return {
    ...utils,
    onResume,
    onVisibleChange,
    rerenderWith: (paused: boolean) =>
      utils.rerender(
        <QueryClientProvider client={queryClient}>
          <PauseAdTakeover eventId="e1" paused={paused} onResume={onResume} onVisibleChange={onVisibleChange} />
        </QueryClientProvider>,
      ),
  };
}

// Pure timing/visibility semantics — ported from the old PauseAdOverlay
// suite. Fake timers keep these instant; none of them need the served ad's
// content to have loaded, only whether the takeover mounts at all.
describe('PauseAdTakeover timing', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('shows nothing while playing', () => {
    renderTakeover({ paused: false });
    expect(screen.queryByText('Great Ad')).toBeNull();
  });

  it('shows nothing when mounted already paused (replay initial state)', () => {
    renderTakeover({ paused: true });
    act(() => vi.advanceTimersByTime(5000));
    expect(screen.queryByText('Great Ad')).toBeNull();
  });

  it('shows the takeover 2s after a pause transition, not before', () => {
    const { rerenderWith, onVisibleChange } = renderTakeover({ paused: false });
    rerenderWith(true);
    act(() => vi.advanceTimersByTime(1999));
    expect(onVisibleChange).not.toHaveBeenCalledWith(true);
    act(() => vi.advanceTimersByTime(1));
    expect(onVisibleChange).toHaveBeenLastCalledWith(true);
  });

  it('hides immediately on resume', () => {
    const { rerenderWith, onVisibleChange } = renderTakeover({ paused: false });
    rerenderWith(true);
    act(() => vi.advanceTimersByTime(2000));
    rerenderWith(false);
    expect(onVisibleChange).toHaveBeenLastCalledWith(false);
  });
});

// Content/CTA/impression behaviour needs the mocked service's promise to
// actually resolve, so these run on real timers (the 2s show-delay is a
// real wait, kept short enough to stay well under the test timeout).
describe('PauseAdTakeover content', () => {
  beforeEach(() => vi.clearAllMocks());

  async function pauseAndWaitForAd(overrides: Partial<Parameters<typeof PauseAdTakeover>[0]> & { ad?: ServedAd } = {}) {
    const utils = renderTakeover({ paused: false, ...overrides });
    utils.rerenderWith(true);
    await waitFor(() => expect(screen.getByText('Great Ad')).toBeInTheDocument(), { timeout: 3000 });
    return utils;
  }

  it('renders the takeover after the pause delay with the served ad', async () => {
    await pauseAndWaitForAd();
    expect(screen.getByText('Great Ad')).toBeInTheDocument();
  }, 4000);

  it('"Fechar anúncio" calls onResume', async () => {
    const onResume = vi.fn();
    await pauseAndWaitForAd({ onResume });

    fireEvent.click(screen.getByText('Fechar anúncio'));
    expect(onResume).toHaveBeenCalledTimes(1);
  }, 4000);

  it('fires impression exactly once per display', async () => {
    await pauseAndWaitForAd();
    await waitFor(() => expect(mockedService.recordImpression).toHaveBeenCalledTimes(1));
    expect(mockedService.recordImpression).toHaveBeenCalledWith('srv-1');
  }, 4000);

  it('renders an internal Link CTA for an EVENT destination', async () => {
    await pauseAndWaitForAd();
    const link = screen.getByRole('link', { name: /Saiba mais/i });
    expect(link).toHaveAttribute('href', '/events/evt-1');
  }, 4000);

  it('renders an external anchor CTA for an EXTERNAL_URL destination', async () => {
    await pauseAndWaitForAd({ ad: { ...baseAd, destination: { type: 'EXTERNAL_URL', url: 'https://sponsor.example' } } });
    const link = screen.getByRole('link', { name: /Saiba mais/i });
    expect(link).toHaveAttribute('href', 'https://sponsor.example');
    expect(link).toHaveAttribute('target', '_blank');
    const rel = link.getAttribute('rel') ?? '';
    expect(rel).toContain('noopener');
    expect(rel).toContain('sponsored');
  }, 4000);

  it('renders no CTA link for a null destination', async () => {
    await pauseAndWaitForAd({ ad: { ...baseAd, destination: null } });
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  }, 4000);
});
