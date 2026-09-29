import { describe, it, expect } from 'vitest';
import { sanitizeTrackedUrl } from './sanitize-url';

const path = (href: string) => sanitizeTrackedUrl(new URL(href, 'https://showon.io')).pathname;

describe('sanitizeTrackedUrl', () => {
  it('redacts the invitation token segment', () => {
    expect(path('/invitations/abc123')).toBe('/invitations/:token');
    expect(path('/invitations/abc123/accept')).toBe('/invitations/:token/accept');
  });

  it('redacts the broadcaster dock token segment', () => {
    expect(path('/broadcaster-dock/secret-tok')).toBe('/broadcaster-dock/:token');
  });

  it('leaves non-secret routes and the query untouched', () => {
    const out = sanitizeTrackedUrl(new URL('https://showon.io/events/evt-1?utm_source=x'));
    expect(out.href).toBe('https://showon.io/events/evt-1?utm_source=x');
  });
});
