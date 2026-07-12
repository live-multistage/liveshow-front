'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, useAuthCheck } from '@/features/account';
import { DashboardContentLoading } from '@/features/dashboard';

export function PlatformAdminGuard({ children }: { children: React.ReactNode }) {
  const { isLoading: authLoading, isLoggedIn } = useAuth();
  const { data, isLoading: checkLoading } = useAuthCheck('access_platform_admin', undefined, {
    enabled: !authLoading && isLoggedIn,
  });
  const router = useRouter();

  useEffect(() => {
    if (authLoading || checkLoading) return;
    if (!isLoggedIn || !data?.allowed) router.replace('/dashboard');
  }, [authLoading, isLoggedIn, checkLoading, data, router]);

  if (authLoading || checkLoading) return <DashboardContentLoading />;
  if (!isLoggedIn || !data?.allowed) return null;

  return <>{children}</>;
}
