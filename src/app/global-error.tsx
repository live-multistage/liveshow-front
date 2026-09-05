'use client';

import { useEffect } from 'react';
import { reportError } from '@/lib/error-reporting';

// Root-layout-level boundary: this replaces the ENTIRE <html>/<body>, so it
// renders outside NextIntlClientProvider — no useTranslations here, unlike
// error.tsx. Only reached when the root layout itself throws (error.tsx
// covers everything below it).
//
// Styles are inline, not SCSS Modules: a root-layout failure can be caused by
// the CSS pipeline itself, so this boundary can't assume its own stylesheet
// loaded. Inline styles are the only rendering this component can trust.
export default function GlobalError({ error, reset }: { error: Error; reset: () => void }) {
  const requestId = (error as Error & { requestId?: string }).requestId;

  useEffect(() => {
    reportError(error, requestId ? { requestId } : undefined);
  }, [error, requestId]);

  return (
    <html lang="en">
      <body style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', fontFamily: 'sans-serif' }}>
          <h2>Something went wrong</h2>
          <p>{error.message}</p>
          {requestId ? <p style={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>ID: {requestId}</p> : null}
          <button onClick={reset}>Try again</button>
        </div>
      </body>
    </html>
  );
}
