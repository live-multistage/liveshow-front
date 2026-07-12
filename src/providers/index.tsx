'use client';

import { useEffect } from 'react';
import { isServer, QueryClient, QueryClientProvider, HydrationBoundary, type DehydratedState } from '@tanstack/react-query';
import { captureAttribution } from '@/lib/analytics/attribution';
import { Toaster } from '@/shared/components/ui/sonner';
import { NavigationEvents } from '@/shared/components/NavigationEvents';
import { NavigationOverlay } from '@/shared/components/NavigationOverlay';
import { AuthProvider } from '@/features/account/context/AuthProvider';
import { NotificationsStreamListener } from '@/features/notifications/components/NotificationsStreamListener';
import type { AuthUser } from '@/features/account';

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { staleTime: 60 * 1000 },
    },
  });
}

let browserQueryClient: QueryClient | undefined;

function getQueryClient() {
  if (isServer) {
    return makeQueryClient();
  }
  if (!browserQueryClient) browserQueryClient = makeQueryClient();
  return browserQueryClient;
}

interface ProvidersProps {
  children: React.ReactNode;
  initialIsLoggedIn: boolean;
  initialUser: AuthUser | null;
  // Seeded by the root layout's server-side prefetch (see layout.tsx) —
  // mirrors the same dehydrate()/HydrationBoundary pattern already used in
  // src/app/(public)/events/[id]/page.tsx for live/replay access checks,
  // just applied at the app root for the one check every page needs
  // (access_dashboard, used by Navbar).
  dehydratedState: DehydratedState;
}

export function Providers({ children, initialIsLoggedIn, initialUser, dehydratedState }: ProvidersProps) {
  const queryClient = getQueryClient();

  useEffect(() => {
    captureAttribution();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <HydrationBoundary state={dehydratedState}>
        <AuthProvider initialIsLoggedIn={initialIsLoggedIn} initialUser={initialUser}>
          {children}
          <Toaster />
          <NavigationEvents />
          <NavigationOverlay />
          <NotificationsStreamListener />
        </AuthProvider>
      </HydrationBoundary>
    </QueryClientProvider>
  );
}
