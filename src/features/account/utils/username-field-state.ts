import {
  normalizeUsername,
  usernameFormatProblem,
  type UsernameAvailabilityResponse,
} from '@live-show/api-contracts';

export type UsernameFieldState =
  | { kind: 'current' }
  | { kind: 'checking' }
  | { kind: 'available' }
  // availability lookup failed (429/network): no status shown, the PATCH decides
  | { kind: 'unverified' }
  | { kind: 'taken' }
  | { kind: 'reserved' }
  | { kind: 'invalid' }
  | { kind: 'cooldown'; days: number };

const DAY_MS = 86_400_000;

export function cooldownDays(changeAvailableAt: string | null, now: Date): number {
  if (!changeAvailableAt) return 0;
  const ms = Date.parse(changeAvailableAt) - now.getTime();
  return ms > 0 ? Math.ceil(ms / DAY_MS) : 0;
}

// Only this code is the 30-day rename cooldown. A bare 429 is the request
// throttle (no code) and must not lock the field.
export const USERNAME_COOLDOWN_CODE = 'USERNAME_CHANGE_TOO_SOON';

export function stateFromErrorCode(code?: string): UsernameFieldState | null {
  switch (code) {
    case 'USERNAME_TAKEN':
      return { kind: 'taken' };
    case 'USERNAME_RESERVED':
      return { kind: 'reserved' };
    case 'USERNAME_INVALID':
      return { kind: 'invalid' };
    default:
      return null;
  }
}

export function usernameFieldState(input: {
  current: string | null;
  draft: string;
  changeAvailableAt: string | null;
  now: Date;
  availability: UsernameAvailabilityResponse | undefined;
  checking: boolean;
  serverError?: string;
  availabilityFailed?: boolean;
  // PATCH answered 429 before `changeAvailableAt` is known: still a cooldown
  rateLimited?: boolean;
}): UsernameFieldState {
  const days = cooldownDays(input.changeAvailableAt, input.now) || (input.rateLimited ? 1 : 0);
  if (days > 0) return { kind: 'cooldown', days };

  const draft = normalizeUsername(input.draft);
  if (draft === (input.current ?? '')) return { kind: 'current' };

  const problem = usernameFormatProblem(draft);
  if (problem === 'INVALID') return { kind: 'invalid' };
  if (problem === 'RESERVED') return { kind: 'reserved' };

  const fromServer = stateFromErrorCode(input.serverError);
  if (fromServer) return fromServer;

  if (input.availabilityFailed) return { kind: 'unverified' };
  if (input.checking || !input.availability) return { kind: 'checking' };
  const { availability } = input;
  if (availability.available === true) return { kind: 'available' };
  if (availability.reason === 'TAKEN') return { kind: 'taken' };
  return availability.reason === 'RESERVED' ? { kind: 'reserved' } : { kind: 'invalid' };
}
