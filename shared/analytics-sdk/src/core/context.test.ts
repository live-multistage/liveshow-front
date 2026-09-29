import { describe, it, expect, afterEach } from 'vitest';
import { buildContext } from './context';

describe('buildContext page sanitization', () => {
  afterEach(() => {
    history.replaceState(null, '', '/');
    Object.defineProperty(document, 'referrer', { value: '', configurable: true });
  });

  it('strips non-utm query params (tokens) from url and search, keeps utm_*', () => {
    history.replaceState(null, '', '/reset-password?token=s3cret&utm_source=mail&utm_medium=email#frag');
    const { page } = buildContext('sid');
    expect(page?.url).toBe(`${location.origin}/reset-password?utm_source=mail&utm_medium=email`);
    expect(page?.search).toBe('?utm_source=mail&utm_medium=email');
    expect(page?.path).toBe('/reset-password');
    expect(JSON.stringify(page)).not.toContain('s3cret');
  });

  it('omits search when only secret params are present', () => {
    history.replaceState(null, '', '/verify-email?token=abc');
    const { page } = buildContext('sid');
    expect(page?.search).toBeUndefined();
    expect(page?.url).toBe(`${location.origin}/verify-email`);
  });

  it('applies a custom sanitizer to url and path', () => {
    history.replaceState(null, '', '/invitations/tok-123?utm_source=x');
    const sanitizeUrl = (url: URL) => {
      const out = new URL(url.href);
      out.pathname = out.pathname.replace(/^\/invitations\/[^/]+/, '/invitations/:token');
      return out;
    };
    const { page } = buildContext('sid', sanitizeUrl);
    expect(page?.path).toBe('/invitations/:token');
    expect(page?.url).toBe(`${location.origin}/invitations/:token?utm_source=x`);
    expect(JSON.stringify(page)).not.toContain('tok-123');
  });

  it('keeps only the referrer origin', () => {
    Object.defineProperty(document, 'referrer', { value: 'https://mail.example.com/inbox/unsubscribe?token=zzz', configurable: true });
    expect(buildContext('sid').page?.referrer).toBe('https://mail.example.com');
  });

  it('drops an unparseable referrer', () => {
    Object.defineProperty(document, 'referrer', { value: 'not a url', configurable: true });
    expect(buildContext('sid').page?.referrer).toBeUndefined();
  });
});
