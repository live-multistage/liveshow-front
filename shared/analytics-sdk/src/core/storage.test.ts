import { describe, it, expect, vi, afterEach } from 'vitest';
import { browserStore } from './storage';

describe('browserStore', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('swallows a post-construction QuotaExceededError from set/get/remove', () => {
    const store = browserStore(); // construction probe succeeds (real jsdom localStorage)

    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('quota exceeded', 'QuotaExceededError');
    });
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('blocked', 'SecurityError');
    });
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
      throw new DOMException('blocked', 'SecurityError');
    });

    expect(() => store.set('k', 'v')).not.toThrow();
    expect(store.get('k')).toBeNull();
    expect(() => store.remove('k')).not.toThrow();
  });
});
