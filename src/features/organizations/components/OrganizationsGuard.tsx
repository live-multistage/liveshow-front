'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/features/account';

export function OrganizationsGuard({ children }: { children: React.ReactNode }) {
  const { isLoading, isLoggedIn } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isLoggedIn) {
      router.replace('/login');
    }
  }, [isLoading, isLoggedIn, router]);

  if (isLoading) return null;
  if (!isLoggedIn) return null;

  return <>{children}</>;
}
