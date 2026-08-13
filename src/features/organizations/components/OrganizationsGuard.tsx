'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/features/account';

export function OrganizationsGuard({ children }: { children: React.ReactNode }) {
  const { isLoading, isLoggedIn } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoading && !isLoggedIn) {
      // Carry the destination so login returns the user to the org page they
      // asked for, same as DashboardGuard does.
      router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
    }
  }, [isLoading, isLoggedIn, pathname, router]);

  if (isLoading) return null;
  if (!isLoggedIn) return null;

  return <>{children}</>;
}
