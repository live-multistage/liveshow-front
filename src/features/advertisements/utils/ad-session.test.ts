import { describe, it, expect, beforeEach } from 'vitest';
import { getAdSessionId } from './ad-session';

describe('getAdSessionId', () => {
  beforeEach(() => sessionStorage.clear());

  it('returns the same id across calls in one browser session', () => {
    expect(getAdSessionId()).toBe(getAdSessionId());
  });

  it('persists the id in sessionStorage', () => {
    const id = getAdSessionId();
    expect(sessionStorage.getItem('ads:sessionId')).toBe(id);
  });

  it('reuses an id already stored', () => {
    sessionStorage.setItem('ads:sessionId', 'abc');
    expect(getAdSessionId()).toBe('abc');
  });
});
