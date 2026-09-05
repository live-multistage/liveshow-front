import { describe, it, expect, vi } from 'vitest';
vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
vi.mock('next/navigation', () => ({ usePathname: () => '/dashboard' }));
vi.mock('@/features/account', () => ({ useAuth: vi.fn() }));
vi.mock('@/features/notifications', () => ({ NotificationsDropdown: () => null }));
vi.mock('@live-show/design-system', () => ({ Logo: () => null }));
vi.mock('./DashboardUserMenu', () => ({ DashboardUserMenu: () => null }));
vi.mock('@/features/platform-admin/components/PendingOrgsBadge', () => ({ PendingOrgsBadge: () => null }));
import { render, screen } from '@testing-library/react';
import { DashboardSidebar } from './DashboardSidebar';
import { useAuth } from '@/features/account';
import { DEFAULT_FEATURE_FLAGS } from '@/features/feature-flags';

const mockedUseAuth = vi.mocked(useAuth);

describe('DashboardSidebar — feature flag gating', () => {
  it('shows channels when linear_channels is on', () => {
    mockedUseAuth.mockReturnValue({ user: { role: 'ADMIN' } } as ReturnType<typeof useAuth>);
    render(<DashboardSidebar flags={{ ...DEFAULT_FEATURE_FLAGS, linear_channels: true }} />);

    expect(screen.getByText('channels')).toBeInTheDocument();
  });

  it('hides channels when linear_channels is off', () => {
    mockedUseAuth.mockReturnValue({ user: { role: 'ADMIN' } } as ReturnType<typeof useAuth>);
    render(<DashboardSidebar flags={{ ...DEFAULT_FEATURE_FLAGS, linear_channels: false }} />);

    expect(screen.queryByText('channels')).not.toBeInTheDocument();
    expect(screen.getByText('events')).toBeInTheDocument();
  });

  it('hides coupons when coupons is off', () => {
    mockedUseAuth.mockReturnValue({ user: { role: 'ORGANIZER' } } as ReturnType<typeof useAuth>);
    render(<DashboardSidebar flags={{ ...DEFAULT_FEATURE_FLAGS, coupons: false }} />);

    expect(screen.queryByText('coupons')).not.toBeInTheDocument();
    expect(screen.getByText('events')).toBeInTheDocument();
  });

  it('hides platform coupons for super admin when coupons is off', () => {
    mockedUseAuth.mockReturnValue({ user: { role: 'SUPER_ADMIN' } } as ReturnType<typeof useAuth>);
    render(<DashboardSidebar flags={{ ...DEFAULT_FEATURE_FLAGS, coupons: false }} />);

    expect(screen.queryByText('platformCoupons')).not.toBeInTheDocument();
  });
});
