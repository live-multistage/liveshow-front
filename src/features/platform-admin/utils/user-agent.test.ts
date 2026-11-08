import { describe, expect, it } from 'vitest';
import { summarizeUserAgent } from './user-agent';

const CHROME_MAC =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';
const SAFARI_IOS =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';
const EDGE_WIN =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36 Edg/130.0.0.0';
const FIREFOX_LINUX = 'Mozilla/5.0 (X11; Linux x86_64; rv:132.0) Gecko/20100101 Firefox/132.0';
const CHROME_ANDROID =
  'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36';

describe('summarizeUserAgent', () => {
  it.each([
    [CHROME_MAC, 'Chrome · macOS'],
    [SAFARI_IOS, 'Safari · iOS'],
    [EDGE_WIN, 'Edge · Windows'],
    [FIREFOX_LINUX, 'Firefox · Linux'],
    [CHROME_ANDROID, 'Chrome · Android'],
  ])('summarizes %s', (ua, expected) => {
    expect(summarizeUserAgent(ua)).toBe(expected);
  });

  it('keeps only the browser when the OS is unknown', () => {
    expect(summarizeUserAgent('Mozilla/5.0 Firefox/132.0')).toBe('Firefox');
  });

  it('labels non-browser clients by their product token', () => {
    expect(summarizeUserAgent('curl/8.4.0')).toBe('curl');
  });

  it('returns null for empty input', () => {
    expect(summarizeUserAgent(null)).toBeNull();
    expect(summarizeUserAgent('  ')).toBeNull();
  });
});
