import { describe, expect, it } from 'vitest';
import { GENERATED_JSONLD_TYPES, SEO_PAGE_KEYS, SEO_PAGE_VARIABLES, normalizeSeoPath, pageKeyForPath } from './page-keys';

describe('SEO_PAGE_KEYS', () => {
  // Pin: the orchestrator mirror (src/seo/domain/seo-page-keys.spec.ts) asserts this exact list.
  it('is pinned', () => {
    expect(SEO_PAGE_KEYS).toEqual([
      'home', 'events.list', 'events.detail', 'artists.list', 'artists.detail', 'artists.apply',
      'organizations.detail', 'channels.list', 'channels.detail', 'about', 'help',
      'be-partner', 'be-partner.apply', 'be-advertiser', 'legal.privacy', 'legal.terms',
    ]);
  });

  it('every key has site.* variables and a generated-types entry', () => {
    for (const key of SEO_PAGE_KEYS) {
      expect(SEO_PAGE_VARIABLES[key]).toEqual(expect.arrayContaining(['site.name', 'site.url']));
      expect(Array.isArray(GENERATED_JSONLD_TYPES[key])).toBe(true);
    }
  });
});

describe('normalizeSeoPath', () => {
  it.each([
    ['/Events/Show-X/?utm=1', '/events/show-x'],
    ['/events/show-x#top', '/events/show-x'],
    ['/', '/'],
    ['', '/'],
    ['events', '/events'],
    ['//events//', '/events'],
  ])('%s → %s', (input, expected) => expect(normalizeSeoPath(input)).toBe(expected));
});

describe('pageKeyForPath', () => {
  it.each([
    ['/', 'home'],
    ['/events', 'events.list'],
    ['/events/show-x', 'events.detail'],
    ['/artists', 'artists.list'],
    ['/artists/apply', 'artists.apply'],
    ['/artists/anitta', 'artists.detail'],
    ['/o/acme', 'organizations.detail'],
    ['/channels', 'channels.list'],
    ['/channels/rock', 'channels.detail'],
    ['/about', 'about'],
    ['/help', 'help'],
    ['/be-partner', 'be-partner'],
    ['/be-partner/apply', 'be-partner.apply'],
    ['/be-advertiser', 'be-advertiser'],
    ['/privacidade', 'legal.privacy'],
    ['/termos', 'legal.terms'],
  ])('%s → %s', (path, key) => expect(pageKeyForPath(path)).toBe(key));

  it.each(['/dashboard', '/events/x/checkout', '/live/x', '/privacidade/versoes/2', '/o'])('%s → null', (path) =>
    expect(pageKeyForPath(path)).toBeNull(),
  );
});
