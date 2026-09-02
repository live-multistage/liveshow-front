import { describe, it, expect, vi } from 'vitest';
vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
vi.mock('next/navigation', () => ({ usePathname: () => '/dashboard' }));
vi.mock('@/features/account', () => ({ useAuth: vi.fn() }));
vi.mock('@/features/notifications', () => ({ NotificationsDropdown: () => null }));
vi.mock('@live-show/design-system', () => ({ Logo: () => null }));
vi.mock('./DashboardUserMenu', () => ({ DashboardUserMenu: () => null }));
import { render, screen } from '@testing-library/react';
import { DashboardMobileNav } from './DashboardMobileNav';
import { useAuth } from '@/features/account';
import { DEFAULT_FEATURE_FLAGS } from '@/features/feature-flags';

const mockedUseAuth = vi.mocked(useAuth);

describe('DashboardMobileNav — feature flag gating', () => {
  it('shows channels when linear_channels is on', () => {
    mockedUseAuth.mockReturnValue({ user: { role: 'ADMIN' } } as ReturnType<typeof useAuth>);
    render(<DashboardMobileNav flags={{ ...DEFAULT_FEATURE_FLAGS, linear_channels: true }} />);

    expect(screen.getByText('channels')).toBeInTheDocument();
  });

  it('hides channels when linear_channels is off', () => {
    mockedUseAuth.mockReturnValue({ user: { role: 'ADMIN' } } as ReturnType<typeof useAuth>);
    render(<DashboardMobileNav flags={{ ...DEFAULT_FEATURE_FLAGS, linear_channels: false }} />);

    expect(screen.queryByText('channels')).not.toBeInTheDocument();
    expect(screen.getByText('events')).toBeInTheDocument();
  });
});
