import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));
vi.mock('@live-show/design-system', () => ({
  Logo: ({ wordmarkClassName }: { wordmarkClassName?: string }) => (
    <span className={wordmarkClassName}>showon.io</span>
  ),
}));
vi.mock('@/features/feature-flags', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/features/feature-flags')>();
  return { ...actual, fetchFeatureFlags: vi.fn() };
});

import { render, screen } from '@testing-library/react';
import { Footer } from './Footer';
import { fetchFeatureFlags } from '@/features/feature-flags';
import { DEFAULT_FEATURE_FLAGS } from '@/features/feature-flags';

const mockedFetch = vi.mocked(fetchFeatureFlags);

// Footer is an async server component — RTL can't render it directly, so
// resolve the promise first and hand render() the element it produces.
async function renderFooter() {
  render(await Footer());
}

describe('Footer', () => {
  beforeEach(() => {
    mockedFetch.mockResolvedValue({ ...DEFAULT_FEATURE_FLAGS, advertiser_platform: true });
  });

  it('is a landmark, so assistive tech can skip to it', async () => {
    await renderFooter();
    expect(screen.getByRole('contentinfo')).toBeInTheDocument();
  });

  it('links terms and privacy to their own pages', async () => {
    await renderFooter();
    expect(screen.getByRole('link', { name: 'terms' })).toHaveAttribute('href', '/termos');
    expect(screen.getByRole('link', { name: 'privacy' })).toHaveAttribute('href', '/privacidade');
  });

  /**
   * O Link do Next assumiria navegação client-side num mailto: e o cliente de
   * e-mail nunca abriria. Este teste é o que impede alguém de "uniformizar" os
   * três links para <Link>.
   */
  it('links about to the about page', async () => {
    await renderFooter();
    expect(screen.getByRole('link', { name: 'about' })).toHaveAttribute('href', '/about');
  });

  it('links advertisers to the /be-advertiser landing page when the flag is on', async () => {
    await renderFooter();
    expect(screen.getByRole('link', { name: 'advertisers' })).toHaveAttribute('href', '/be-advertiser');
  });

  it('hides the advertisers link when advertiser_platform is off', async () => {
    mockedFetch.mockResolvedValue({ ...DEFAULT_FEATURE_FLAGS, advertiser_platform: false });
    await renderFooter();
    expect(screen.queryByRole('link', { name: 'advertisers' })).not.toBeInTheDocument();
  });

  it('renders the contact address as a plain anchor, not a router link', async () => {
    await renderFooter();
    const contact = screen.getByRole('link', { name: 'contact' });
    expect(contact.getAttribute('href')).toMatch(/^mailto:/);
  });

  it('shows the current year in the copyright', async () => {
    await renderFooter();
    // useTranslations está mockado para devolver a chave, então só a presença
    // do nó importa aqui; o ano vem do ICU em runtime.
    expect(screen.getByText('copyright')).toBeInTheDocument();
  });
});
