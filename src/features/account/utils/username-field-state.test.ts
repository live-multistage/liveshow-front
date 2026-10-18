import { describe, it, expect } from 'vitest';
import { cooldownDays, stateFromErrorCode, usernameFieldState } from './username-field-state';

const now = new Date('2026-10-18T12:00:00Z');
const base = { current: 'joana.m', changeAvailableAt: null, now, availability: undefined, checking: false };

describe('usernameFieldState', () => {
  it('cooldown wins over everything and counts whole days up', () => {
    expect(
      usernameFieldState({ ...base, draft: 'outra', changeAvailableAt: '2026-10-29T13:00:00Z' }),
    ).toEqual({ kind: 'cooldown', days: 12 });
  });

  it('the current handle (any case) is "current", not a change', () => {
    expect(usernameFieldState({ ...base, draft: ' Joana.M ' })).toEqual({ kind: 'current' });
  });

  it('local format problems never wait for the server', () => {
    expect(usernameFieldState({ ...base, draft: 'Joana Martins!' })).toEqual({ kind: 'invalid' });
    expect(usernameFieldState({ ...base, draft: 'admin' })).toEqual({ kind: 'reserved' });
  });

  it('checking until the server answers, then available or taken', () => {
    expect(usernameFieldState({ ...base, draft: 'joana.mar', checking: true })).toEqual({ kind: 'checking' });
    expect(usernameFieldState({ ...base, draft: 'joana.martins', availability: { available: true } })).toEqual({
      kind: 'available',
    });
    expect(
      usernameFieldState({ ...base, draft: 'marina.v', availability: { available: false, reason: 'TAKEN' } }),
    ).toEqual({ kind: 'taken' });
  });

  it('a save error code overrides a stale "available" answer', () => {
    expect(
      usernameFieldState({ ...base, draft: 'marina.v', availability: { available: true }, serverError: 'USERNAME_TAKEN' }),
    ).toEqual({ kind: 'taken' });
  });
});

describe('helpers', () => {
  it('cooldownDays is 0 when allowed now', () => {
    expect(cooldownDays(null, now)).toBe(0);
    expect(cooldownDays('2026-10-01T00:00:00Z', now)).toBe(0);
  });

  it('stateFromErrorCode maps only username codes', () => {
    expect(stateFromErrorCode('USERNAME_RESERVED')).toEqual({ kind: 'reserved' });
    expect(stateFromErrorCode('USERNAME_INVALID')).toEqual({ kind: 'invalid' });
    expect(stateFromErrorCode('SOMETHING_ELSE')).toBeNull();
    expect(stateFromErrorCode(undefined)).toBeNull();
  });
});
