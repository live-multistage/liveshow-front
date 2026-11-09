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
    recordEvent: vi.fn(),
  },
}));

vi.mock('next-intl', () => {
  const messages: Record<string, string> = { sponsored: 'Patrocinado', learnMore: 'Saiba mais', close: 'Fechar anúncio' };
  return { useTranslations: () => (key: string) => messages[key] };
});

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
  pauseVariant: null,
  overlay: null,
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
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });
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

  it('does not request an ad before the 2s pause delay', () => {
    const { rerenderWith, onVisibleChange } = renderTakeover({ paused: false });
    rerenderWith(true);
    act(() => vi.advanceTimersByTime(1999));
    expect(mockedService.serve).not.toHaveBeenCalled();
    expect(onVisibleChange).not.toHaveBeenCalledWith(true, 'STANDARD');
    act(() => vi.advanceTimersByTime(1));
    expect(mockedService.serve).toHaveBeenCalledTimes(1);
  });

  it('hides immediately on resume', () => {
    const { rerenderWith, onVisibleChange } = renderTakeover({ paused: false });
    rerenderWith(true);
    act(() => vi.advanceTimersByTime(2000));
    rerenderWith(false);
    expect(onVisibleChange).toHaveBeenLastCalledWith(false, 'STANDARD');
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
    const { onVisibleChange } = await pauseAndWaitForAd();
    expect(screen.getByText('Great Ad')).toBeInTheDocument();
    expect(onVisibleChange).toHaveBeenLastCalledWith(true, 'STANDARD');
  }, 4000);

  // Replay with no PLAYER_PAUSE ad registered: the serve returns [] and the
  // player must not shrink the video / hide its header / show the chip.
  it('never reports visible when the serve returns no ad', async () => {
    const utils = renderTakeover({ paused: false });
    mockedService.serve.mockResolvedValue([]);
    utils.rerenderWith(true);
    await waitFor(() => expect(mockedService.serve).toHaveBeenCalledTimes(1), { timeout: 3000 });
    await act(() => new Promise((r) => setTimeout(r, 50)));
    expect(utils.onVisibleChange).not.toHaveBeenCalledWith(true, 'STANDARD');
    expect(screen.queryByText('Patrocinado')).toBeNull();
  }, 4000);

  it('labels the takeover Patrocinado', async () => {
    await pauseAndWaitForAd();
    expect(screen.getByText('Patrocinado')).toBeInTheDocument();
  }, 4000);

  it('"Fechar anúncio" reports pause_close', async () => {
    await pauseAndWaitForAd();
    fireEvent.click(screen.getByText('Fechar anúncio'));
    expect(mockedService.recordEvent).toHaveBeenCalledWith('srv-1', 'pause_close');
  }, 4000);

  it('"Fechar anúncio" calls onResume', async () => {
    const onResume = vi.fn();
    await pauseAndWaitForAd({ onResume });

    fireEvent.click(screen.getByText('Fechar anúncio'));
    expect(onResume).toHaveBeenCalledTimes(1);
  }, 4000);

  describe('layout', () => {
    const originalMatchMedia = window.matchMedia;
    afterEach(() => {
      window.matchMedia = originalMatchMedia;
    });
    const phone = (matches: boolean) => {
      window.matchMedia = ((query: string) => ({
        matches,
        media: query,
        addEventListener: () => {},
        removeEventListener: () => {},
      })) as unknown as typeof window.matchMedia;
    };

    it('reports the STANDARD layout for a STANDARD ad on desktop', async () => {
      phone(false);
      const { onVisibleChange, container } = await pauseAndWaitForAd({ ad: { ...baseAd, pauseVariant: 'STANDARD' } });
      expect(onVisibleChange).toHaveBeenLastCalledWith(true, 'STANDARD');
      expect(container.querySelector('[data-layout="STANDARD"]')).not.toBeNull();
    }, 4000);

    it('reports FULLSCREEN for a FULLSCREEN ad', async () => {
      phone(false);
      const { onVisibleChange, container } = await pauseAndWaitForAd({ ad: { ...baseAd, pauseVariant: 'FULLSCREEN' } });
      expect(onVisibleChange).toHaveBeenLastCalledWith(true, 'FULLSCREEN');
      expect(container.querySelector('[data-layout="FULLSCREEN"]')).not.toBeNull();
    }, 4000);

    it('a legacy ad without variant is STANDARD', async () => {
      phone(false);
      const { onVisibleChange } = await pauseAndWaitForAd({ ad: { ...baseAd, pauseVariant: null } });
      expect(onVisibleChange).toHaveBeenLastCalledWith(true, 'STANDARD');
    }, 4000);

    it('on a phone every variant is FULLSCREEN', async () => {
      phone(true);
      const { onVisibleChange } = await pauseAndWaitForAd({ ad: { ...baseAd, pauseVariant: 'STANDARD' } });
      expect(onVisibleChange).toHaveBeenLastCalledWith(true, 'FULLSCREEN');
    }, 4000);
  });

  it('fires impression exactly once per display', async () => {
    await pauseAndWaitForAd();
    await waitFor(() => expect(mockedService.recordImpression).toHaveBeenCalledTimes(1));
    expect(mockedService.recordImpression).toHaveBeenCalledWith('srv-1');
  }, 4000);

  describe('with an image creative', () => {
    const imageAd: ServedAd = { ...baseAd, bannerUrl: 'https://cdn.example.com/pause.webp' };

    it('waits for the image to load before recording the impression', async () => {
      const { container } = await pauseAndWaitForAd({ ad: imageAd });
      expect(mockedService.recordImpression).not.toHaveBeenCalled();

      fireEvent.load(container.querySelector('img')!);

      expect(mockedService.recordImpression).toHaveBeenCalledTimes(1);
      expect(mockedService.recordImpression).toHaveBeenCalledWith('srv-1');
    }, 4000);

    it('never records the impression when the image fails to load', async () => {
      const { container } = await pauseAndWaitForAd({ ad: imageAd });
      fireEvent.error(container.querySelector('img')!);
      fireEvent.load(container.querySelector('img') ?? document.createElement('img'));
      expect(mockedService.recordImpression).not.toHaveBeenCalled();
    }, 4000);

    it('records the impression once even if load fires twice', async () => {
      const { container } = await pauseAndWaitForAd({ ad: imageAd });
      const img = container.querySelector('img')!;
      fireEvent.load(img);
      fireEvent.load(img);
      expect(mockedService.recordImpression).toHaveBeenCalledTimes(1);
    }, 4000);
  });

  // A served record is billable once — the beacon consumes it server-side — so
  // a second pause reusing a cached servedId would show the ad for free.
  it('serves a fresh record on every takeover mount', async () => {
    const { rerenderWith } = await pauseAndWaitForAd();
    expect(mockedService.serve).toHaveBeenCalledTimes(1);

    rerenderWith(false);
    rerenderWith(true);
    await waitFor(() => expect(mockedService.serve).toHaveBeenCalledTimes(2), { timeout: 3000 });
  }, 8000);

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
