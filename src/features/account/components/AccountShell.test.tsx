vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
vi.mock('next/link', () => ({
  default: ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) => (
    <a href={href} className={className}>{children}</a>
  ),
}));
vi.mock('@tanstack/react-query', () => ({ useQuery: vi.fn() }));
vi.mock('../hooks/use-auth', () => ({ useAuth: () => ({ logout: vi.fn() }) }));

let mockUnreadCount = 0;
vi.mock('@/features/notifications', () => ({
  useUnreadCountQuery: () => ({ data: mockUnreadCount }),
}));

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { useQuery } from '@tanstack/react-query';
import { AccountShell } from './AccountShell';

const me = {
  id: 'u1',
  displayName: 'Ysrael Moreno',
  email: 'ysrael@example.com',
  phone: null,
  taxDocument: null,
  bio: null,
  avatarUrl: null,
  role: 'USER',
  createdAt: '2026-01-01T00:00:00Z',
  analyticsConsent: null,
};

describe('AccountShell', () => {
  beforeEach(() => {
    mockUnreadCount = 0;
    vi.mocked(useQuery).mockReturnValue({ data: me, isLoading: false } as never);
  });

  it('shows the unread badge on the Notificações nav item when there are unread notifications', () => {
    mockUnreadCount = 3;
    render(<AccountShell sectionScroll>child</AccountShell>);

    const notificationsLink = screen.getByRole('link', { name: /Notificações/ });
    expect(notificationsLink).toHaveTextContent('3');
  });

  it('omits the badge when there are no unread notifications', () => {
    mockUnreadCount = 0;
    render(<AccountShell sectionScroll>child</AccountShell>);

    const notificationsLink = screen.getByRole('link', { name: /Notificações/ });
    expect(notificationsLink.textContent).not.toMatch(/\d/);
  });

  it('marks the Notificações nav item active on /account/notifications', () => {
    render(<AccountShell activeNav="notifications" sectionScroll={false}>child</AccountShell>);

    const notificationsLink = screen.getByRole('link', { name: /Notificações/ });
    expect(notificationsLink.className).toMatch(/navItemActive/);
  });

  it('does not mark it active elsewhere', () => {
    render(<AccountShell sectionScroll>child</AccountShell>);

    const notificationsLink = screen.getByRole('link', { name: /Notificações/ });
    expect(notificationsLink.className).not.toMatch(/navItemActive/);
  });

  it('renders Perfil as a scroll button when sectionScroll is true', () => {
    render(<AccountShell sectionScroll>child</AccountShell>);
    expect(screen.getByRole('button', { name: /Perfil/ })).toBeInTheDocument();
  });

  it('renders Perfil as a link to /account#perfil when sectionScroll is false', () => {
    render(<AccountShell sectionScroll={false}>child</AccountShell>);
    const link = screen.getByRole('link', { name: /Perfil/ });
    expect(link).toHaveAttribute('href', '/account#perfil');
  });

  it('renders the children inside the main area', () => {
    render(<AccountShell sectionScroll>hello world</AccountShell>);
    expect(screen.getByText('hello world')).toBeInTheDocument();
  });
});
