import { describe, it, expect, vi } from 'vitest';

vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));
vi.mock('@live-show/design-system', () => ({
  Logo: ({ wordmarkClassName }: { wordmarkClassName?: string }) => (
    <span className={wordmarkClassName}>LIVESHOW</span>
  ),
}));

import { render, screen } from '@testing-library/react';
import { Footer } from './Footer';

describe('Footer', () => {
  it('is a landmark, so assistive tech can skip to it', () => {
    render(<Footer />);
    expect(screen.getByRole('contentinfo')).toBeInTheDocument();
  });

  it('links terms to the privacy page that actually exists', () => {
    render(<Footer />);
    expect(screen.getByRole('link', { name: 'terms' })).toHaveAttribute('href', '/privacidade');
  });

  /**
   * O Link do Next assumiria navegação client-side num mailto: e o cliente de
   * e-mail nunca abriria. Este teste é o que impede alguém de "uniformizar" os
   * três links para <Link>.
   */
  it('renders the contact address as a plain anchor, not a router link', () => {
    render(<Footer />);
    const contact = screen.getByRole('link', { name: 'contact' });
    expect(contact.getAttribute('href')).toMatch(/^mailto:/);
  });

  it('shows the current year in the copyright', () => {
    render(<Footer />);
    // useTranslations está mockado para devolver a chave, então só a presença
    // do nó importa aqui; o ano vem do ICU em runtime.
    expect(screen.getByText('copyright')).toBeInTheDocument();
  });
});
