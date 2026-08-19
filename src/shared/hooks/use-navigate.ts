'use client';

import { useRouter } from 'next/navigation';
import { isCurrentUrl, useNavigationLoadingStore } from '@/shared/stores/navigation-loading.store';

export function useNavigate() {
  const router = useRouter();
  const start = useNavigationLoadingStore((s) => s.start);

  return {
    push: (href: string) => {
      if (!isCurrentUrl(href)) start();
      router.push(href);
    },
    replace: (href: string) => {
      if (!isCurrentUrl(href)) start();
      router.replace(href);
    },
  };
}
