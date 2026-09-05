// One id per outgoing request, generated client-side so it survives a
// network error that never reaches the server (no response body to read a
// requestId back from). The API echoes the same value in its error bodies
// when it originates the id itself; nginx's $req_id map prefers this one
// over minting its own.
export function generateRequestId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // ponytail: Math.random fallback for environments without crypto.randomUUID
  // (very old browsers) — good enough for a correlation id, not for security.
  return `${Date.now().toString(16)}-${Math.random().toString(16).slice(2)}`;
}

/**
 * Merges an `X-Request-Id` header into a `fetch` RequestInit, generating a fresh id.
 *
 * Next's fetch Data Cache keys on request headers, so a header that's random on
 * every call (this one) makes the entry uncacheable — `next: { revalidate }` (or
 * the fetch's default caching) silently degenerates to a fresh network hit every
 * time. Only ever call this on `cache: 'no-store'` fetches, never a cached one.
 */
export function withRequestId(init: RequestInit = {}): RequestInit {
  if (init.next?.revalidate !== undefined || init.cache !== 'no-store') {
    const message =
      'withRequestId: only use on cache: "no-store" fetches — a random header defeats Next\'s Data Cache key.';
    if (process.env.NODE_ENV === 'production') {
      console.warn(message);
    } else {
      throw new Error(message);
    }
  }
  return {
    ...init,
    headers: { ...(init.headers as Record<string, string> | undefined), 'X-Request-Id': generateRequestId() },
  };
}
