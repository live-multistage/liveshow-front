import {
  normalizeUsername,
  usernameFormatProblem,
  type UsernameAvailabilityResponse,
} from '@live-show/api-contracts';

export type UsernameFieldState =
  | { kind: 'current' }
  | { kind: 'checking' }
  | { kind: 'available' }
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
}): UsernameFieldState {
  const days = cooldownDays(input.changeAvailableAt, input.now);
  if (days > 0) return { kind: 'cooldown', days };

  const draft = normalizeUsername(input.draft);
  if (draft === (input.current ?? '')) return { kind: 'current' };

  const problem = usernameFormatProblem(draft);
  if (problem === 'INVALID') return { kind: 'invalid' };
  if (problem === 'RESERVED') return { kind: 'reserved' };

  const fromServer = stateFromErrorCode(input.serverError);
  if (fromServer) return fromServer;

  if (input.checking || !input.availability) return { kind: 'checking' };
  const { availability } = input;
  if (availability.available === true) return { kind: 'available' };
  if (availability.reason === 'TAKEN') return { kind: 'taken' };
  return availability.reason === 'RESERVED' ? { kind: 'reserved' } : { kind: 'invalid' };
}
