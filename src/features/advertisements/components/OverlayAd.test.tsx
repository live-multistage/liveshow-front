import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { OverlayAd, type OverlayAdContext } from './OverlayAd';
import { advertisementsService } from '../services/advertisements.service';
import { useIsPhone } from '../hooks/use-is-phone';
import type { ServedAd } from '../types/advertisement.types';

vi.mock('../services/advertisements.service', () => ({
  advertisementsService: {
    serveOverlay: vi.fn(),
    recordImpression: vi.fn(),
    recordClick: vi.fn(),
    recordEvent: vi.fn(),
  },
}));
vi.mock('../hooks/use-is-phone', () => ({ useIsPhone: vi.fn(() => false) }));
vi.mock('next-intl', () => {
  const messages: Record<string, string> = { sponsored: 'Patrocinado' };
  return {
    useTranslations: () => (key: string, vars?: { title?: string }) =>
      key === 'overlayAriaLabel' ? `Patrocinado: ${vars?.title} (abre em nova aba)` : messages[key],
  };
});

const service = vi.mocked(advertisementsService);

const ad: ServedAd = {
  servedId: 'srv-1',
  adId: 'ad-1',
  title: 'Aurora Bebidas',
  format: 'LOGO_4x1',
  advertiserAccountId: 'acc-1',
  destination: { type: 'EXTERNAL_URL', url: 'https://aurora.example/promo' },
  bannerUrl: 'https://cdn.example/aurora.png',
  videoUrl: null,
  videoDurationSec: null,
  pauseVariant: null,
  overlay: { position: 'TOP', animation: 'SLIDE', durationSec: 8 },
};

const free: OverlayAdContext = {
  chatOpen: false,
  chaptersOpen: false,
  cameraDrawerOpen: false,
  hasLibras: false,
  hasPip: false,
  fullscreen: false,
  paused: false,
  pauseAdVisible: false,
  offline: false,
};

function mockReducedMotion(reduce: boolean) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: query.includes('prefers-reduced-motion') ? reduce : false,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })) as unknown as typeof window.matchMedia;
}

function setTabVisible(visible: boolean) {
  Object.defineProperty(document, 'visibilityState', { value: visible ? 'visible' : 'hidden', configurable: true });
  document.dispatchEvent(new Event('visibilitychange'));
}

// 50 ms until the first frame is painted, 450 ms of entrance: the 2 s start after that.
const ENTRANCE_MS = 500;

// Small steps, each in its own act(): the phases chain through effects, and React
// only flushes them between acts, not between the timers of one big advance.
async function advance(ms: number) {
  if (ms === 0) {
    await act(async () => { await vi.advanceTimersByTimeAsync(0); });
    return;
  }
  for (let left = ms; left > 0; left -= 50) {
    await act(async () => { await vi.advanceTimersByTimeAsync(Math.min(50, left)); });
  }
}

async function renderAd(context: Partial<OverlayAdContext> = {}, served: ServedAd = ad) {
  service.serveOverlay.mockResolvedValue({ ad: served, retryAfterSec: 600 });
  const utils = render(<OverlayAd eventId="e1" context={{ ...free, ...context }} />);
  await advance(0);
  const rerenderWith = (next: Partial<OverlayAdContext>) =>
    utils.rerender(<OverlayAd eventId="e1" context={{ ...free, ...next }} />);
  return { ...utils, rerenderWith };
}

beforeEach(() => {
  vi.useFakeTimers();
  mockReducedMotion(false);
  vi.mocked(useIsPhone).mockReturnValue(false);
  setTabVisible(true);
  Object.values(service).forEach((fn) => fn.mockReset());
});
afterEach(() => vi.useRealTimers());

describe('OverlayAd — rendering', () => {
  it('renders nothing when the server has no ad', async () => {
    service.serveOverlay.mockResolvedValue({ ad: null, retryAfterSec: 600 });
    const { container } = render(<OverlayAd eventId="e1" context={free} />);
    await advance(0);
    expect(container).toBeEmptyDOMElement();
  });

  it('shows the logo as an accessible new-tab link with the Patrocinado seal', async () => {
    await renderAd();
    const link = screen.getByRole('link', { name: 'Patrocinado: Aurora Bebidas (abre em nova aba)' });
    expect(link).toHaveAttribute('href', 'https://aurora.example/promo');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener sponsored');
    expect(link.querySelector('img')).toHaveAttribute('src', 'https://cdn.example/aurora.png');
    expect(link).toHaveTextContent('Patrocinado');
  });

  it('opens an event destination in a new tab too, so nobody leaves the live', async () => {
    await renderAd({}, { ...ad, destination: { type: 'EVENT', eventId: 'evt-9' } });
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/events/evt-9');
    expect(link).toHaveAttribute('target', '_blank');
  });

  it('exposes position and animation from the ad', async () => {
    await renderAd({}, { ...ad, overlay: { position: 'BOTTOM', animation: 'FADE', durationSec: 5 } });
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('data-position', 'BOTTOM');
    expect(link).toHaveAttribute('data-animation', 'FADE');
  });

  it('forces the fade animation under prefers-reduced-motion', async () => {
    mockReducedMotion(true);
    await renderAd();
    expect(screen.getByRole('link')).toHaveAttribute('data-animation', 'FADE');
  });

  it('enters (off → in → hold)', async () => {
    await renderAd();
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('data-phase', 'off');
    await advance(60);
    expect(link).toHaveAttribute('data-phase', 'in');
    await advance(450);
    expect(link).toHaveAttribute('data-phase', 'hold');
  });

  it('ignores an ad with no image or no overlay spec', async () => {
    const { container } = await renderAd({}, { ...ad, bannerUrl: null });
    expect(container).toBeEmptyDOMElement();
  });
});

describe('OverlayAd — geometry', () => {
  it('stops at the chat edge', async () => {
    await renderAd({ chatOpen: true });
    expect(screen.getByRole('link').style.getPropertyValue('--vt-inset')).toBe('340px');
  });

  it('moves the lateral logo to the top when Libras and PiP are stacked', async () => {
    await renderAd({ hasLibras: true, hasPip: true }, { ...ad, format: 'LOGO_2x3', overlay: { position: 'SIDE', animation: 'SLIDE', durationSec: 8 } });
    expect(screen.getByRole('link')).toHaveAttribute('data-position', 'TOP');
  });

  it('shows the lateral logo at the bottom on a phone', async () => {
    vi.mocked(useIsPhone).mockReturnValue(true);
    await renderAd({}, { ...ad, format: 'LOGO_2x3', overlay: { position: 'SIDE', animation: 'SLIDE', durationSec: 8 } });
    expect(screen.getByRole('link')).toHaveAttribute('data-position', 'BOTTOM');
  });

  it('raises the bottom logo in fullscreen', async () => {
    await renderAd({ fullscreen: true }, { ...ad, overlay: { position: 'BOTTOM', animation: 'SLIDE', durationSec: 8 } });
    expect(screen.getByRole('link')).toHaveAttribute('data-raised', 'true');
  });
});

describe('OverlayAd — hides at once', () => {
  it.each([
    ['paused', { paused: true }],
    ['the pause ad is showing', { pauseAdVisible: true }],
    ['the transmission is offline', { offline: true }],
  ])('when %s', async (_label, ctx) => {
    await renderAd(ctx);
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('while the chat covers the phone screen', async () => {
    vi.mocked(useIsPhone).mockReturnValue(true);
    await renderAd({ chatOpen: true });
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('as soon as the player pauses', async () => {
    const { rerenderWith } = await renderAd();
    expect(screen.getByRole('link')).toBeInTheDocument();
    rerenderWith({ paused: true });
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('does not ask the server while offline', async () => {
    service.serveOverlay.mockResolvedValue({ ad: null, retryAfterSec: 600 });
    render(<OverlayAd eventId="e1" context={{ ...free, offline: true }} />);
    await advance(0);
    expect(service.serveOverlay).not.toHaveBeenCalled();
  });

  it('does not ask the server when ads are disabled', async () => {
    render(<OverlayAd eventId="e1" enabled={false} context={free} />);
    await advance(0);
    expect(service.serveOverlay).not.toHaveBeenCalled();
  });
});

describe('OverlayAd — impression (2 s fully on screen, tab visible)', () => {
  it('does not bill before 2 s in hold', async () => {
    await renderAd();
    await advance(ENTRANCE_MS + 1900);
    expect(service.recordImpression).not.toHaveBeenCalled();
  });

  it('bills once after 2 s in hold', async () => {
    await renderAd();
    await advance(ENTRANCE_MS + 2100);
    expect(service.recordImpression).toHaveBeenCalledTimes(1);
    expect(service.recordImpression).toHaveBeenCalledWith('srv-1');
    await advance(3000);
    expect(service.recordImpression).toHaveBeenCalledTimes(1);
  });

  it('sends no beacon if it disappears before 2 s', async () => {
    const { rerenderWith } = await renderAd();
    await advance(ENTRANCE_MS + 1500);
    rerenderWith({ paused: true });
    await advance(10_000);
    expect(service.recordImpression).not.toHaveBeenCalled();
  });

  it('restarts the 2 s when it comes back after a pause', async () => {
    const { rerenderWith } = await renderAd();
    await advance(ENTRANCE_MS + 1500);
    rerenderWith({ paused: true });
    rerenderWith({ paused: false });
    await advance(ENTRANCE_MS + 1500);
    expect(service.recordImpression).not.toHaveBeenCalled();
    await advance(600);
    expect(service.recordImpression).toHaveBeenCalledTimes(1);
  });

  it('freezes the clock while the tab is hidden', async () => {
    await renderAd();
    await advance(ENTRANCE_MS + 1000);
    setTabVisible(false);
    await advance(30_000);
    expect(service.recordImpression).not.toHaveBeenCalled();
    expect(service.recordEvent).not.toHaveBeenCalled();

    setTabVisible(true);
    await advance(1100);
    expect(service.recordImpression).toHaveBeenCalledTimes(1);
  });
});

describe('OverlayAd — end of the display', () => {
  it('records overlay_complete after durationSec in hold, then leaves', async () => {
    await renderAd();
    await advance(ENTRANCE_MS + 7_900);
    expect(service.recordEvent).not.toHaveBeenCalled();

    await advance(200);
    expect(service.recordEvent).toHaveBeenCalledWith('srv-1', 'overlay_complete');
    expect(service.recordEvent).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('link')).toHaveAttribute('data-phase', 'out');

    await advance(400);
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('does not record overlay_complete when the viewer clicks first', async () => {
    await renderAd();
    await advance(ENTRANCE_MS + 1000);
    fireEvent.click(screen.getByRole('link'));
    await advance(20_000);
    expect(service.recordEvent).not.toHaveBeenCalled();
  });
});

describe('OverlayAd — click', () => {
  it('records the click right away and the logo leaves', async () => {
    await renderAd();
    fireEvent.click(screen.getByRole('link'));
    expect(service.recordClick).toHaveBeenCalledWith('srv-1');
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });
});
