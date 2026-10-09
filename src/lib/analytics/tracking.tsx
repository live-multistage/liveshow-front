'use client';

import { Suspense } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { AnalyticsProvider, useAnalyticsIdentity } from '@live-show/analytics-sdk/react';
import { useAnalyticsConsent } from './consent';
import { sanitizeTrackedUrl } from './sanitize-url';
import { useAuth } from '@/features/account/hooks/use-auth';
import { tokenStore } from '@/lib/auth/token-store';
import { useImpersonationStore } from '@/features/platform-admin/impersonation/impersonation.store';
import { config } from '@/config';

export { useAnalytics } from '@live-show/analytics-sdk/react';

const WRITE_KEY = process.env.NEXT_PUBLIC_TRACKING_WRITE_KEY;

function IdentitySync() {
  const { user } = useAuth();
  useAnalyticsIdentity(user ? { id: user.id } : null);
  return null;
}

// useSearchParams requires a Suspense boundary in App Router; keeps the rest
// of TrackingProvider (and its children) outside that boundary.
function TrackedProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const search = useSearchParams().toString();
  const { consent } = useAnalyticsConsent();
  const impersonating = useImpersonationStore((s) => s.active);

  // A support session browses as the target user: nothing may be attributed to either
  // identity. Unmounting (not setConsent('denied')) keeps the admin's own persisted
  // ids intact; a fresh instance mounts when the session ends.
  if (impersonating) return <>{children}</>;

  return (
    <AnalyticsProvider
      // TrackedProvider only renders when TrackingProvider's WRITE_KEY guard passed, so it's non-null here.
      options={{ writeKey: WRITE_KEY!, endpoint: config.apiUrl, getAuthToken: () => tokenStore.get(), sanitizeUrl: sanitizeTrackedUrl }}
      // consent is `undefined` before hydration (see useAnalyticsConsent) —
      // held in memory, never sent, until it resolves to granted/denied.
      consent={consent ?? null}
      pathname={pathname}
      search={search}
    >
      <IdentitySync />
      {children}
    </AnalyticsProvider>
  );
}

export function TrackingProvider({ children }: { children: React.ReactNode }) {
  if (!WRITE_KEY) return <>{children}</>; // no key configured → tracking off for this deploy

  return (
    <Suspense fallback={children}>
      <TrackedProvider>{children}</TrackedProvider>
    </Suspense>
  );
}
