import { normalizeError } from '@/lib/http/errors';
import { RefreshFailedError } from '@/lib/http/interceptors';

// True when a playback poll's error means "this viewer is no longer
// entitled" — a same-request 401/403, or a failed silent token refresh
// (RefreshFailedError rejects as a plain Error, not an AxiosError, so
// normalizeError alone maps it to status 0 and would miss it). Shared by
// LiveGate/ReplayGate so both drop the player the same way; does not change
// normalizeError's behavior for any other caller.
export function isPlaybackUnauthorized(error: unknown): boolean {
  if (error instanceof RefreshFailedError) return true;
  const status = normalizeError(error).status;
  return status === 401 || status === 403;
}
