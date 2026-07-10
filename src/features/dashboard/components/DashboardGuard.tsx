'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/features/account';
import { useAuthCheck } from '@/features/account';
import { DashboardLoading } from './DashboardLoading';

export function DashboardGuard({ children }: { children: React.ReactNode }) {
  const { isLoading: authLoading, isLoggedIn } = useAuth();
  const pathname = usePathname();
  const { data, isLoading: checkLoading } = useAuthCheck('access_dashboard', undefined, {
    enabled: !authLoading && isLoggedIn,
  });
  const router = useRouter();

  useEffect(() => {
    if (authLoading) return;
    if (!isLoggedIn) {
      router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
      return;
    }
    if (checkLoading) return;
    if (!data?.allowed) router.replace('/');
  }, [authLoading, isLoggedIn, checkLoading, data, pathname, router]);

  if (authLoading) return <DashboardLoading />;
  if (!isLoggedIn) return null;
  if (checkLoading) return <DashboardLoading />;
  if (!data?.allowed) return null;

  return <>{children}</>;
}
