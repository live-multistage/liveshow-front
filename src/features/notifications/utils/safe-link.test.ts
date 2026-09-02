import { describe, it, expect } from 'vitest';
import { isSafeNotificationLink } from './safe-link';

describe('isSafeNotificationLink', () => {
  it('accepts same-origin paths and https URLs', () => {
    expect(isSafeNotificationLink('/dashboard/events/1')).toBe(true);
    expect(isSafeNotificationLink('https://showon.io/x')).toBe(true);
  });

  it('rejects the XSS vectors', () => {
    expect(isSafeNotificationLink('javascript:alert(1)')).toBe(false);
    expect(isSafeNotificationLink('data:text/html,<script>')).toBe(false);
    expect(isSafeNotificationLink('//evil.com')).toBe(false);
    expect(isSafeNotificationLink('http://showon.io')).toBe(false);
    expect(isSafeNotificationLink(null)).toBe(false);
    expect(isSafeNotificationLink(undefined)).toBe(false);
  });
});
