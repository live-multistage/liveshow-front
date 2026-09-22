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

  it('pins on a wide viewport with motion allowed', () => {
    mockMatchMedia({ narrow: false, reducedMotion: false });
    const { container } = render(<AdvertisersHero />);
    expect(container.querySelector('[data-testid="pinned-hero"]')).toBeInTheDocument();
  });

  it('falls back to the non-pinned stacked layout at <=900px', () => {
    mockMatchMedia({ narrow: true });
    const { container } = render(<AdvertisersHero />);
    expect(container.querySelector('[data-testid="pinned-hero"]')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /cta/ })).toHaveAttribute('href', ADS_SIGNUP_URL);
  });

  it('falls back to the non-pinned layout when the user prefers reduced motion', () => {
    mockMatchMedia({ reducedMotion: true });
    const { container } = render(<AdvertisersHero />);
    expect(container.querySelector('[data-testid="pinned-hero"]')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
  });
});

describe('ADS_LOGIN_URL', () => {
  it('points at the Ads Manager login route', () => {
    expect(ADS_LOGIN_URL.endsWith('/login')).toBe(true);
  });
});
