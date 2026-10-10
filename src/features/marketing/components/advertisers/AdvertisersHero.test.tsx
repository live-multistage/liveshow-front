import { describe, it, expect, vi } from 'vitest';

vi.mock('next-intl', () => ({
  useTranslations: () => {
    const t = (key: string) => key;
    t.raw = (key: string) => (key === 'guarantees' ? ['SEM MENSALIDADE', 'A PARTIR DE R$ 50'] : []);
    t.rich = (key: string) => key;
    return t;
  },
}));

import { render, screen, cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';
import { AdvertisersHero } from './AdvertisersHero';
import { ADS_SIGNUP_URL, ADS_LOGIN_URL } from '../../constants';

function mockMatchMedia({ reducedMotion = false, narrow = false } = {}) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: (query: string) => ({
      matches: query.includes('prefers-reduced-motion') ? reducedMotion : query.includes('900px') ? narrow : false,
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
    }),
  });
}

describe('AdvertisersHero', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('renders the single h1', () => {
    mockMatchMedia();
    render(<AdvertisersHero />);
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
  });

  it('sends the primary CTA to the Ads Manager signup', () => {
    mockMatchMedia();
    render(<AdvertisersHero />);
    expect(screen.getByRole('link', { name: /cta/ })).toHaveAttribute('href', ADS_SIGNUP_URL);
  });

  it('anchors the secondary CTA to #posicoes', () => {
    mockMatchMedia();
    render(<AdvertisersHero />);
    expect(screen.getByRole('link', { name: 'secondary' })).toHaveAttribute('href', '#posicoes');
  });

  it('renders the same tree whatever the viewport, so hydration never remounts the LCP heading', () => {
    mockMatchMedia({ narrow: false });
    const wide = render(<AdvertisersHero />).container.innerHTML;
    cleanup();
    mockMatchMedia({ narrow: true });
    const narrow = render(<AdvertisersHero />).container.innerHTML;
    cleanup();
    mockMatchMedia({ reducedMotion: true });
    const reduced = render(<AdvertisersHero />).container.innerHTML;
    expect(narrow).toBe(wide);
    expect(reduced).toBe(wide);
  });

  it('does not hide the hero copy behind a reveal fade (LCP)', () => {
    mockMatchMedia({ narrow: true });
    render(<AdvertisersHero />);
    expect(screen.getByRole('heading', { level: 1 }).closest('[style*="--reveal-delay"]')).toBeNull();
  });

  it('writes the scroll-driven mock scale to --hero-scale without re-rendering', () => {
    mockMatchMedia();
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
      cb(0);
      return 0;
    });
    const rectSpy = vi
      .spyOn(HTMLElement.prototype, 'getBoundingClientRect')
      .mockReturnValue({ top: 0, height: window.innerHeight * 2 } as DOMRect);
    const { container } = render(<AdvertisersHero />);
    const section = container.querySelector('section') as HTMLElement;
    expect(section.style.getPropertyValue('--hero-scale')).toBe('0.92');

    rectSpy.mockReturnValue({
      top: -window.innerHeight,
      height: window.innerHeight * 2,
    } as DOMRect);
    window.dispatchEvent(new Event('scroll'));
    expect(section.style.getPropertyValue('--hero-scale')).toBe('1');
  });
});

describe('ADS_LOGIN_URL', () => {
  it('points at the Ads Manager login route', () => {
    expect(ADS_LOGIN_URL.endsWith('/login')).toBe(true);
  });
});
