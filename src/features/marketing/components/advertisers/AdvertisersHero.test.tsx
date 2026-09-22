import { describe, it, expect, vi } from 'vitest';

vi.mock('next-intl', () => ({
  useTranslations: () => {
    const t = (key: string) => key;
    t.raw = (key: string) => (key === 'guarantees' ? ['SEM MENSALIDADE', 'A PARTIR DE R$ 50'] : []);
    t.rich = (key: string) => key;
    return t;
  },
}));

import { render, screen } from '@testing-library/react';
import { AdvertisersHero } from './AdvertisersHero';
import { ADS_SIGNUP_URL, ADS_LOGIN_URL } from '../../constants';

describe('AdvertisersHero', () => {
  it('renders the single h1', () => {
    render(<AdvertisersHero />);
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
  });

  it('sends the primary CTA to the Ads Manager signup', () => {
    render(<AdvertisersHero />);
    expect(screen.getByRole('link', { name: /cta/ })).toHaveAttribute('href', ADS_SIGNUP_URL);
  });

  it('anchors the secondary CTA to #posicoes', () => {
    render(<AdvertisersHero />);
    expect(screen.getByRole('link', { name: 'secondary' })).toHaveAttribute('href', '#posicoes');
  });
});

describe('ADS_LOGIN_URL', () => {
  it('points at the Ads Manager login route', () => {
    expect(ADS_LOGIN_URL.endsWith('/login')).toBe(true);
  });
});
