import { describe, it, expect } from 'vitest';
import { parseListParams, hrefForPage } from './list-params-from-search';

describe('parseListParams', () => {
  it('defaults to filter=all, page=1 with no params', () => {
    expect(parseListParams(new URLSearchParams(), 24)).toEqual({ filter: 'all', page: 1, pageSize: 24 });
  });

  it('reads a valid filter', () => {
    expect(parseListParams(new URLSearchParams('filter=live'), 24)).toEqual({
      filter: 'live', page: 1, pageSize: 24,
    });
  });

  it('drops an invalid filter, falling back to all', () => {
    expect(parseListParams(new URLSearchParams('filter=bogus'), 24)).toEqual({
      filter: 'all', page: 1, pageSize: 24,
    });
  });

  it('reads a valid category', () => {
    expect(parseListParams(new URLSearchParams('category=MUSIC'), 24)).toEqual({
      filter: 'all', category: 'MUSIC', page: 1, pageSize: 24,
    });
  });

  it('drops an invalid category', () => {
    expect(parseListParams(new URLSearchParams('category=NOT_REAL'), 24)).toEqual({
      filter: 'all', page: 1, pageSize: 24,
    });
  });

  it('reads subtype, tag, city, trimmed', () => {
    expect(parseListParams(new URLSearchParams('subtype=%20sertanejo%20&tag=rock&city=São+Paulo'), 24)).toEqual({
      filter: 'all', subtype: 'sertanejo', tag: 'rock', city: 'São Paulo', page: 1, pageSize: 24,
    });
  });

  it('drops an empty or overlong subtype/tag/city', () => {
    const overlong = 'a'.repeat(121);
    expect(parseListParams(new URLSearchParams(`subtype=%20%20&tag=${overlong}`), 24)).toEqual({
      filter: 'all', page: 1, pageSize: 24,
    });
  });

  it('reads free=1 and free=true as true, anything else as absent', () => {
    expect(parseListParams(new URLSearchParams('free=1'), 24)).toEqual({ filter: 'all', free: true, page: 1, pageSize: 24 });
    expect(parseListParams(new URLSearchParams('free=true'), 24)).toEqual({ filter: 'all', free: true, page: 1, pageSize: 24 });
    expect(parseListParams(new URLSearchParams('free=0'), 24)).toEqual({ filter: 'all', page: 1, pageSize: 24 });
  });

  it('reads page as a positive integer, defaulting to 1 otherwise', () => {
    expect(parseListParams(new URLSearchParams('page=3'), 24)).toEqual({ filter: 'all', page: 3, pageSize: 24 });
    expect(parseListParams(new URLSearchParams('page=0'), 24)).toEqual({ filter: 'all', page: 1, pageSize: 24 });
    expect(parseListParams(new URLSearchParams('page=abc'), 24)).toEqual({ filter: 'all', page: 1, pageSize: 24 });
  });

  it('combines every param', () => {
    expect(
      parseListParams(new URLSearchParams('filter=live&category=MUSIC&subtype=sertanejo&tag=rock&city=SP&free=1&page=2'), 24),
    ).toEqual({
      filter: 'live', category: 'MUSIC', subtype: 'sertanejo', tag: 'rock', city: 'SP', free: true, page: 2, pageSize: 24,
    });
  });
});

describe('hrefForPage', () => {
  it('omits page when navigating to page 1', () => {
    expect(hrefForPage(new URLSearchParams('category=MUSIC&page=3'), 1)).toBe('/events?category=MUSIC');
  });

  it('sets page while preserving other params', () => {
    expect(hrefForPage(new URLSearchParams('category=MUSIC&page=2'), 3)).toBe('/events?category=MUSIC&page=3');
  });

  it('adds page to a bare /events when none is present', () => {
    expect(hrefForPage(new URLSearchParams(), 2)).toBe('/events?page=2');
  });

  it('returns /events with no query when there are no params and target is page 1', () => {
    expect(hrefForPage(new URLSearchParams(), 1)).toBe('/events');
  });
});
