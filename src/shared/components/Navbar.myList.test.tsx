import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
vi.mock('next/navigation', () => ({ usePathname: () => '/' }));
vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

const auth = { user: null as unknown, isLoggedIn: false, logout: vi.fn() };
vi.mock('@/features/account/hooks/use-auth', () => ({ useAuth: () => auth }));
vi.mock('@/features/account/hooks/use-auth-check', () => ({
  useAuthCheck: () => ({ data: { allowed: false } }),
}));
vi.mock('@/features/notifications/components/NotificationsDropdown', () => ({
  NotificationsDropdown: () => null,
}));
vi.mock('@/features/cart/hooks/use-cart-count', () => ({ useCartCount: () => ({ count: 0 }) }));
vi.mock('./LanguageSwitcher', () => ({ LanguageSwitcher: () => null }));

import { render, screen } from '@testing-library/react';
import { Navbar } from './Navbar';

beforeEach(() => {
  auth.isLoggedIn = false;
  auth.user = null;
});

describe('Navbar — Minha lista', () => {
  /**
   * A página inteira existe porque os eventos comprados eram difíceis de
   * achar. Um link só no dropdown repetiria esse problema, então ele fica na
   * faixa visível — e este teste é o que impede alguém de "limpar" a barra
   * movendo-o de volta para dentro do menu.
   */
  it('is reachable from the visible bar once signed in', () => {
    auth.isLoggedIn = true;
    auth.user = { email: 'a@b.com', displayName: 'Ana Silva' };

    render(<Navbar />);

    const links = screen.getAllByRole('link', { name: 'myList' });
    expect(links.length).toBeGreaterThan(0);
    expect(links[0]).toHaveAttribute('href', '/my-list');
  });

  it('is absent for a signed-out visitor', () => {
    render(<Navbar />);

    expect(screen.queryByRole('link', { name: 'myList' })).not.toBeInTheDocument();
  });
});

describe('Navbar — Wishlist', () => {
  it('is reachable from the visible bar once signed in', () => {
    auth.isLoggedIn = true;
    auth.user = { email: 'a@b.com', displayName: 'Ana Silva' };

    render(<Navbar />);

    const link = screen.getByRole('link', { name: 'wishlist' });
    expect(link).toHaveAttribute('href', '/wishlist');
  });

  it('is absent for a signed-out visitor', () => {
    render(<Navbar />);

    expect(screen.queryByRole('link', { name: 'wishlist' })).not.toBeInTheDocument();
  });
});
