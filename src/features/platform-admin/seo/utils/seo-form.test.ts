import { describe, expect, it } from 'vitest';
import type { SeoFields } from '@live-show/api-contracts';
import { EMPTY_FORM, isSeoCustomized, toFields, toForm } from './seo-form';
import { renderRobotsTxt, robotsRuleError } from './seo-robots';

const filled: SeoFields = {
  titleTemplate: 'T',
  descriptionTemplate: 'D',
  ogImageUrl: 'https://x.io/a.png',
  keywords: 'a, b',
  ogTitle: 'X',
  ogDescription: 'OD',
  twitterTitle: 'TT',
  twitterDescription: 'TD',
  canonicalUrl: 'https://showon.io/x',
  locale: 'en',
  jsonLdMode: 'REPLACE',
  robotsIndex: false,
  robotsFollow: true,
  disabledGeneratedJsonLd: ['Event'],
  extraJsonLd: ['{}'],
};

describe('seo form mapping', () => {
  it('round-trips every field', () => expect(toFields(toForm(filled))).toEqual(filled));
  it('sends null for cleared text and default tri-states', () => {
    expect(toFields(EMPTY_FORM)).toEqual({
      titleTemplate: null,
      descriptionTemplate: null,
      ogImageUrl: null,
      robotsIndex: null,
      robotsFollow: null,
      disabledGeneratedJsonLd: [],
      extraJsonLd: [],
      keywords: null, ogTitle: null, ogDescription: null, twitterTitle: null,
      twitterDescription: null, canonicalUrl: null, locale: null, jsonLdMode: null,
    });
  });
  it('keeps advanced fields untouched when the form is saved as loaded', () => {
    const loaded = toForm({ ...toFields(EMPTY_FORM), ogTitle: 'X' });
    expect(toFields(loaded).ogTitle).toBe('X');
  });
  it('detects customization', () => {
    expect(isSeoCustomized(toFields(EMPTY_FORM))).toBe(false);
    expect(isSeoCustomized(filled)).toBe(true);
  });
});

describe('robots helpers', () => {
  it('rejects newlines and paths without a leading slash', () => {
    expect(robotsRuleError({ userAgent: 'GPTBot', allow: [], disallow: ['/a'] })).toBeNull();
    expect(robotsRuleError({ userAgent: 'Bot\nX', allow: [], disallow: [] })).toBe('agent');
    expect(robotsRuleError({ userAgent: 'Bot', allow: [], disallow: ['a'] })).toBe('path');
    expect(robotsRuleError({ userAgent: 'Bot', allow: ['/a\nDisallow: /'], disallow: [] })).toBe('path');
  });
  it('renders fixed rules first, then extras', () => {
    const txt = renderRobotsTxt([{ userAgent: 'GPTBot', allow: [], disallow: ['/'] }]);
    expect(txt.startsWith('User-agent: *\nAllow: /\nDisallow: /api/')).toBe(true);
    expect(txt.endsWith('User-agent: GPTBot\nDisallow: /')).toBe(true);
  });
  it('previews crawler-specific groups with the fixed disallows, like the real file', () => {
    const txt = renderRobotsTxt([{ userAgent: 'Googlebot', allow: [], disallow: ['/foo'] }]);
    const group = txt.split('User-agent: Googlebot\n')[1];
    expect(group).toContain('Disallow: /dashboard/');
    expect(group).toContain('Disallow: /foo');
  });
});
