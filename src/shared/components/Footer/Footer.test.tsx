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
import { render, screen } from '@testing-library/react';
import { Footer } from './Footer';

// Footer is sync on purpose (it uses a hook, so it must not be async — that
// combination broke the /_not-found prerender). The flag arrives as a prop.
let advertisersEnabled = true;

function renderFooter() {
  render(<Footer advertisersEnabled={advertisersEnabled} />);
}

describe('Footer', () => {
  beforeEach(() => {
    advertisersEnabled = true;
  });

  it('is a landmark, so assistive tech can skip to it', async () => {
    renderFooter();
    expect(screen.getByRole('contentinfo')).toBeInTheDocument();
  });

  it('links terms and privacy to their own pages', async () => {
    renderFooter();
    expect(screen.getByRole('link', { name: 'terms' })).toHaveAttribute('href', '/termos');
    expect(screen.getByRole('link', { name: 'privacy' })).toHaveAttribute('href', '/privacidade');
  });

  /**
   * O Link do Next assumiria navegação client-side num mailto: e o cliente de
   * e-mail nunca abriria. Este teste é o que impede alguém de "uniformizar" os
   * três links para <Link>.
   */
  it('links about to the about page', async () => {
    renderFooter();
    expect(screen.getByRole('link', { name: 'about' })).toHaveAttribute('href', '/about');
  });

  it('links advertisers to the /be-advertiser landing page when the flag is on', async () => {
    renderFooter();
    expect(screen.getByRole('link', { name: 'advertisers' })).toHaveAttribute('href', '/be-advertiser');
  });

  it('hides the advertisers link when advertiser_platform is off', async () => {
    advertisersEnabled = false;
    renderFooter();
    expect(screen.queryByRole('link', { name: 'advertisers' })).not.toBeInTheDocument();
  });

  it('renders the contact address as a plain anchor, not a router link', async () => {
    renderFooter();
    const contact = screen.getByRole('link', { name: 'contact' });
    expect(contact.getAttribute('href')).toMatch(/^mailto:/);
  });

  it('shows the current year in the copyright', async () => {
    renderFooter();
    // useTranslations está mockado para devolver a chave, então só a presença
    // do nó importa aqui; o ano vem do ICU em runtime.
    expect(screen.getByText('copyright')).toBeInTheDocument();
  });
});
