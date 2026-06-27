'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/features/account';
import { useAuthCheck } from '@/features/account';
import { DashboardLoading } from './DashboardLoading';

export function DashboardGuard({ children }: { children: React.ReactNode }) {
  const { isLoading: authLoading } = useAuth();
  const { data, isLoading: checkLoading } = useAuthCheck('access_dashboard', undefined, { enabled: !authLoading });
  const router = useRouter();

  useEffect(() => {
    if (authLoading || checkLoading) return;
    if (!data?.allowed) router.replace('/');
  }, [data, authLoading, checkLoading, router]);

  if (authLoading || checkLoading) return <DashboardLoading />;
  if (!data?.allowed) return null;

  return <>{children}</>;
}
