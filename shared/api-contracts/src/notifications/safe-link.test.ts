import { describe, expect, it } from 'vitest';
import { isSafeNotificationLink, safeNotificationHref } from './safe-link';

describe('isSafeNotificationLink', () => {
  it('accepts a same-origin relative path and an https URL', () => {
    expect(isSafeNotificationLink('/events/123')).toBe(true);
    expect(isSafeNotificationLink('https://showon.io/events/123')).toBe(true);
  });

  it('rejects active schemes, protocol-relative and credentialed URLs', () => {
    expect(isSafeNotificationLink('javascript:alert(1)')).toBe(false);
    expect(isSafeNotificationLink('data:text/html,<script>')).toBe(false);
    expect(isSafeNotificationLink('//evil.com')).toBe(false);
    expect(isSafeNotificationLink('/\\evil.com')).toBe(false);
    expect(isSafeNotificationLink('http://showon.io/x')).toBe(false);
    expect(isSafeNotificationLink('https://user:pw@showon.io/x')).toBe(false);
    expect(isSafeNotificationLink(null)).toBe(false);
    expect(isSafeNotificationLink('')).toBe(false);
  });
});

describe('safeNotificationHref', () => {
  it('returns the path for every allowlisted prefix', () => {
    expect(safeNotificationHref('/events/123')).toBe('/events/123');
    expect(safeNotificationHref('/live/123')).toBe('/live/123');
    expect(safeNotificationHref('/replay/123')).toBe('/replay/123');
    expect(safeNotificationHref('/tickets/123')).toBe('/tickets/123');
    expect(safeNotificationHref('/purchases/o1')).toBe('/purchases/o1');
    expect(safeNotificationHref('  /events/123  ')).toBe('/events/123');
  });

  // The app has no browser: an https URL cannot become a router.push target,
  // and a path outside the allowlist would push a route that does not exist.
  it('returns null for anything outside the allowlist', () => {
    expect(safeNotificationHref('https://showon.io/events/123')).toBeNull();
    expect(safeNotificationHref('/dashboard/reports')).toBeNull();
    expect(safeNotificationHref('/events')).toBeNull();
    expect(safeNotificationHref('javascript:alert(1)')).toBeNull();
    expect(safeNotificationHref('//evil.com/events/1')).toBeNull();
    expect(safeNotificationHref('/events/1?a=1#b')).toBe('/events/1?a=1#b');
    expect(safeNotificationHref(undefined)).toBeNull();
    expect(safeNotificationHref('/events/' + 'x'.repeat(600))).toBeNull();
  });

  // Allowlisting the prefix is not enough: a path segment can still walk the
  // route back out of the app's five sections, or smuggle a traversal past a
  // naive string check via a backslash or a percent-encoded ".." segment.
  it('rejects path traversal, backslashes and encoded traversal segments', () => {
    expect(safeNotificationHref('/events/../../etc/passwd')).toBeNull();
    expect(safeNotificationHref('/events/..')).toBeNull();
    expect(safeNotificationHref('/events/123/../456')).toBeNull();
    expect(safeNotificationHref('/events/123\\456')).toBeNull();
    expect(safeNotificationHref('/events/%2e%2e/456')).toBeNull();
    expect(safeNotificationHref('/events/%2E%2E/456')).toBeNull();
  });
});
