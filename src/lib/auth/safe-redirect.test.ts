import { describe, it, expect } from 'vitest';
import { safeRedirect } from './safe-redirect';

describe('safeRedirect', () => {
  describe('accepts', () => {
    it('accepts /', () => {
      expect(safeRedirect('/')).toBe('/');
    });

    it('accepts /events/abc?x=1', () => {
      expect(safeRedirect('/events/abc?x=1')).toBe('/events/abc?x=1');
    });

    it('accepts /live/123#t', () => {
      expect(safeRedirect('/live/123#t')).toBe('/live/123#t');
    });

    it('accepts /path?q=1#hash', () => {
      expect(safeRedirect('/path?q=1#hash')).toBe('/path?q=1#hash');
    });

    it('accepts /checkout/success', () => {
      expect(safeRedirect('/checkout/success')).toBe('/checkout/success');
    });
  });

  describe('rejects protocol-relative', () => {
    it('rejects //evil.com', () => {
      expect(safeRedirect('//evil.com')).toBe('/');
    });

    it('rejects //', () => {
      expect(safeRedirect('//')).toBe('/');
    });

    it('rejects //x', () => {
      expect(safeRedirect('//x')).toBe('/');
    });
  });

  describe('rejects backslash variant of protocol-relative', () => {
    it('rejects /\\evil.com', () => {
      expect(safeRedirect('/\\evil.com')).toBe('/');
    });

    it('rejects /\\x', () => {
      expect(safeRedirect('/\\x')).toBe('/');
    });

    it('rejects /\\', () => {
      expect(safeRedirect('/\\')).toBe('/');
    });

    it('rejects /x (backslash as second char)', () => {
      const url = String.fromCharCode(47, 92); // /\
      expect(safeRedirect(url + 'evil')).toBe('/');
    });
  });

  describe('rejects tab-based bypasses', () => {
    it('rejects /%09/evil.com (tab escape)', () => {
      expect(safeRedirect('/%09/evil.com')).toBe('/');
    });

    it('rejects /\t/evil.com (raw tab)', () => {
      expect(safeRedirect('/\t/evil.com')).toBe('/');
    });

    it('rejects path with embedded raw tab', () => {
      expect(safeRedirect('/path\twith\ttabs')).toBe('/');
    });

    it('rejects path with embedded CR', () => {
      expect(safeRedirect('/path\rcrash')).toBe('/');
    });

    it('rejects path with embedded LF', () => {
      expect(safeRedirect('/path\ninjection')).toBe('/');
    });
  });

  describe('rejects other control characters', () => {
    it('rejects /%00/evil (null byte escape)', () => {
      expect(safeRedirect('/%00/evil')).toBe('/');
    });

    it('rejects path with raw ESC (\\x1b)', () => {
      expect(safeRedirect('/path\x1bevil')).toBe('/');
    });

    it('rejects /%7f/evil (DEL escape)', () => {
      expect(safeRedirect('/%7f/evil')).toBe('/');
    });

    it('rejects path with raw DEL (\\x7f)', () => {
      expect(safeRedirect('/path\x7fevil')).toBe('/');
    });
  });

  describe('rejects percent-encoded variants', () => {
    it('rejects /%2F/evil (percent-encoded slash)', () => {
      expect(safeRedirect('/%2F/evil')).toBe('/');
    });

    it('rejects /%5C/evil (percent-encoded backslash)', () => {
      expect(safeRedirect('/%5C/evil')).toBe('/');
    });
  });

  describe('rejects absolute URLs', () => {
    it('rejects https://evil.com', () => {
      expect(safeRedirect('https://evil.com')).toBe('/');
    });

    it('rejects http://localhost:3000/path (absolute)', () => {
      expect(safeRedirect('http://localhost:3000/path')).toBe('/');
    });

    it('rejects javascript: (pseudoprotocol)', () => {
      expect(safeRedirect('javascript:alert(1)')).toBe('/');
    });

    it('rejects data:', () => {
      expect(safeRedirect('data:text/html,<script>alert(1)</script>')).toBe('/');
    });
  });

  describe('edge cases', () => {
    it('returns / for undefined', () => {
      expect(safeRedirect(undefined)).toBe('/');
    });

    it('returns / for empty string', () => {
      expect(safeRedirect('')).toBe('/');
    });

    it('handles malformed percent-encoding', () => {
      // %ZZ is not valid encoding, should fall back to /
      expect(safeRedirect('/%ZZ/path')).toBe('/');
    });
  });
});
