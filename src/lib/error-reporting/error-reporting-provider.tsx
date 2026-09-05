'use client';

import { useEffect } from 'react';
import { reportError } from './index';

/**
 * Catches what a React error boundary (F1's app/error.tsx) never sees:
 * uncaught script errors and unhandled promise rejections outside the render
 * tree. Mount once near the root — it only registers window listeners, no UI.
 */
export function ErrorReportingProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const onError = (event: ErrorEvent) => reportError(event.error ?? event.message);
    const onRejection = (event: PromiseRejectionEvent) => reportError(event.reason);

    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onRejection);
    return () => {
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onRejection);
    };
  }, []);

  return children;
}
