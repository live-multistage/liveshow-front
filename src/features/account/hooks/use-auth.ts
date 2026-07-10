'use client';

import { useAuthContextValue } from '../context/AuthProvider';

// Public shape unchanged: { user, isLoggedIn, isLoading, logout }. All
// existing call sites keep working with zero changes — the actual state
// now lives in a single AuthProvider (mounted once at the app root) instead
// of being independently re-hydrated by every component that calls this.
export function useAuth() {
  return useAuthContextValue();
}
