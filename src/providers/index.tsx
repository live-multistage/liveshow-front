'use client';

import { isServer, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/shared/components/ui/sonner';
import { NavigationEvents } from '@/shared/components/NavigationEvents';
import { NavigationOverlay } from '@/shared/components/NavigationOverlay';
import { AuthProvider } from '@/features/account/context/AuthProvider';

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
}

export function Providers({ children, initialIsLoggedIn }: ProvidersProps) {
  const queryClient = getQueryClient();
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider initialIsLoggedIn={initialIsLoggedIn}>
        {children}
        <Toaster />
        <NavigationEvents />
        <NavigationOverlay />
      </AuthProvider>
    </QueryClientProvider>
  );
}
