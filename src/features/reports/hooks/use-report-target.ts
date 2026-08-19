'use client';

import { useCallback, useState } from 'react';
import { useAuth } from '@/features/account/hooks/use-auth';

const REPORTER_KEY_STORAGE = 'report:key';

export function useReportTarget() {
  const { isLoggedIn } = useAuth();
  const [open, setOpen] = useState(false);

  const openModal = useCallback(() => setOpen(true), []);
  const closeModal = useCallback(() => setOpen(false), []);

  // Anonymous dedupe only — logged-in reports are attributed via the JWT and
  // the backend ignores reporterKey anyway. Never touched during render
  // (SSR has no localStorage): only ever called from the submit handler.
  const getReporterKey = useCallback((): string | undefined => {
    if (isLoggedIn || typeof window === 'undefined') return undefined;
    const existing = localStorage.getItem(REPORTER_KEY_STORAGE);
    if (existing) return existing;
    const key = crypto.randomUUID();
    localStorage.setItem(REPORTER_KEY_STORAGE, key);
    return key;
  }, [isLoggedIn]);

  return { open, openModal, closeModal, getReporterKey };
}
