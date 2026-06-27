'use client';

import { useRouter } from 'next/navigation';
import { useNavigationLoadingStore } from '@/shared/stores/navigation-loading.store';

export function useNavigate() {
  const router = useRouter();
  const start = useNavigationLoadingStore((s) => s.start);

  return {
    push: (href: string) => {
      start();
      router.push(href);
    },
    replace: (href: string) => {
      start();
      router.replace(href);
    },
  };
}
