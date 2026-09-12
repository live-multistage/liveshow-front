import axios from 'axios';
import { RefreshFailedError } from '@/lib/http/interceptors';

// True when a playback poll's error means "this viewer is no longer
// entitled" — a same-request 401/403, or a failed silent token refresh
// (RefreshFailedError rejects as a plain Error, not an AxiosError). Checks
// the axios error directly rather than going through normalizeError: that
// helper console.errors on every call, and the gates call this predicate on
// every render while the error persists — routing through it here would spam
// the console for as long as the viewer sits on the no-access screen. Shared
// by LiveGate/ReplayGate so both drop the player the same way.
export function isPlaybackUnauthorized(error: unknown): boolean {
  if (error instanceof RefreshFailedError) return true;
  if (!axios.isAxiosError(error)) return false;
  const status = error.response?.status;
  return status === 401 || status === 403;
}
