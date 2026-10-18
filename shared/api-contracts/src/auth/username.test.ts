import { describe, expect, it } from 'vitest';
import { RESERVED_USERNAMES, normalizeUsername, usernameFormatProblem } from './username';

describe('username format', () => {
  it('mirrors the server rules', () => {
    expect(usernameFormatProblem('joana.m')).toBeNull();
    expect(usernameFormatProblem('Joana Martins!')).toBe('INVALID');
    expect(usernameFormatProblem('ab')).toBe('INVALID');
    expect(usernameFormatProblem('.ana')).toBe('INVALID');
    expect(usernameFormatProblem('ana.')).toBe('INVALID');
    expect(usernameFormatProblem('jo..ao')).toBe('INVALID');
    expect(usernameFormatProblem('x'.repeat(31))).toBe('INVALID');
    expect(usernameFormatProblem('Admin')).toBe('RESERVED');
  });

  it('ships the 15 reserved names', () => {
    expect([...RESERVED_USERNAMES].sort()).toEqual(
      [
        'admin', 'administrador', 'showon', 'suporte', 'support', 'moderador', 'moderator', 'staff',
        'sistema', 'system', 'todos', 'everyone', 'organizacao', 'organization', 'here',
      ].sort(),
    );
  });

  it('normalizes case and spaces', () => {
    expect(normalizeUsername('  Ana.Silva ')).toBe('ana.silva');
  });
});
