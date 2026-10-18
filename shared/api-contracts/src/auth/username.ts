// Client-side mirror of the orchestrator's Username rules
// (src/account/domain/username.ts) — the server stays the one that enforces.
export const USERNAME_MAX_LENGTH = 30;

export const RESERVED_USERNAMES: readonly string[] = [
  'admin', 'administrador', 'showon', 'suporte', 'support', 'moderador', 'moderator', 'staff',
  'sistema', 'system', 'todos', 'everyone', 'organizacao', 'organization', 'here',
];

const USERNAME_SHAPE = /^[a-z0-9._]{3,30}$/;

export type UsernameUnavailableReason = 'TAKEN' | 'RESERVED' | 'INVALID';

/** `GET /auth/username-availability?u=` */
export type UsernameAvailabilityResponse =
  | { available: true }
  | { available: false; reason: UsernameUnavailableReason };

export function normalizeUsername(raw: string): string {
  return raw.trim().toLowerCase();
}

export function usernameFormatProblem(raw: string): 'INVALID' | 'RESERVED' | null {
  const value = normalizeUsername(raw);
  const wellFormed =
    USERNAME_SHAPE.test(value) && !value.startsWith('.') && !value.endsWith('.') && !value.includes('..');
  if (!wellFormed) return 'INVALID';
  return RESERVED_USERNAMES.includes(value) ? 'RESERVED' : null;
}
