'use client';

import { useCallback } from 'react';
import { useAuthContextValue } from '../context/AuthProvider';
import { useAnalytics } from '@/lib/analytics/tracking';

// Public shape unchanged: { user, isLoggedIn, isLoading, logout }. All
// existing call sites keep working with zero changes — the actual state
// now lives in a single AuthProvider (mounted once at the app root) instead
// of being independently re-hydrated by every component that calls this.
//
// The single choke point for every logout button (Navbar, DashboardUserMenu,
// AccountShell, …): `logged_out` is tracked here, once, before the context's
// logout clears the user — so the event still carries the identity that was
// logged out (the SDK's own identity reset only fires once `user` turns
// null, on the next render after this call returns).
export function useAuth() {
  const ctx = useAuthContextValue();
  const analytics = useAnalytics();

  const logout = useCallback(async () => {
    analytics.track('logged_out', {});
    await ctx.logout();
  }, [analytics, ctx]);

  return { ...ctx, logout };
}
