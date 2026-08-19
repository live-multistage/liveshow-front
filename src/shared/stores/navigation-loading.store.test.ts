import { describe, expect, it } from 'vitest';
import { isCurrentUrl } from './navigation-loading.store';

describe('isCurrentUrl', () => {
  it('matches the current pathname', () => {
    window.history.pushState({}, '', '/events');
    expect(isCurrentUrl('/events')).toBe(true);
  });

  it('differs on pathname', () => {
    window.history.pushState({}, '', '/events');
    expect(isCurrentUrl('/events/abc')).toBe(false);
  });

  it('differs on search params', () => {
    window.history.pushState({}, '', '/events?filter=live');
    expect(isCurrentUrl('/events')).toBe(false);
    expect(isCurrentUrl('/events?filter=live')).toBe(true);
  });

  it('ignores hash-only differences', () => {
    window.history.pushState({}, '', '/events');
    expect(isCurrentUrl('/events#top')).toBe(true);
  });
});
