import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockTrack, ctxLogout, mockCtx } = vi.hoisted(() => {
  const ctxLogout = vi.fn().mockResolvedValue(undefined);
  return {
    mockTrack: vi.fn(),
    ctxLogout,
    mockCtx: {
      user: { id: 'u1' },
      isLoggedIn: true,
      isLoading: false,
      isLoggingOut: false,
      login: vi.fn(),
      logout: ctxLogout,
    },
  };
});

vi.mock('@/lib/analytics/tracking', () => ({ useAnalytics: () => ({ track: mockTrack }) }));
vi.mock('../context/AuthProvider', () => ({ useAuthContextValue: () => mockCtx }));

import { renderHook } from '@testing-library/react';
import { useAuth } from './use-auth';

describe('useAuth — logged_out choke point', () => {
  beforeEach(() => vi.clearAllMocks());

  it('tracks logged_out before delegating to the context logout, so every caller (Navbar, DashboardUserMenu, AccountShell, …) emits exactly once through this single hook', async () => {
    const { result } = renderHook(() => useAuth());

    await result.current.logout();

    expect(mockTrack).toHaveBeenCalledWith('logged_out', {});
    expect(mockTrack).toHaveBeenCalledTimes(1);
    expect(ctxLogout).toHaveBeenCalledTimes(1);
    // tracked before the context clears the user (SDK identity reset only
    // fires once `user` turns null) — call order proves it ran first
    expect(mockTrack.mock.invocationCallOrder[0]).toBeLessThan(ctxLogout.mock.invocationCallOrder[0]);
  });
});
