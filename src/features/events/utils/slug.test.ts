import { describe, it, expect } from 'vitest';
import { slugify, isEventId, eventHref, SLUG_PATTERN } from './slug';

describe('slugify', () => {
  it('strips accents instead of collapsing them', () => {
    expect(slugify('Ação ao Vivo')).toBe('acao-ao-vivo');
  });

  it('collapses punctuation into single dashes and trims the edges', () => {
    expect(slugify('  Rock!! & Roll -- 2026  ')).toBe('rock-roll-2026');
  });

  it('never leaves a trailing dash after truncating mid-word', () => {
    expect(slugify('abcde fghij', 6)).toBe('abcde');
  });

  it('produces output the backend regex accepts', () => {
    expect(SLUG_PATTERN.test(slugify('Show do Ano — 100% Ao Vivo'))).toBe(true);
  });
});

describe('isEventId', () => {
  it('recognises a UUID', () => {
    expect(isEventId('9f8b1c2d-3e4f-4a5b-8c9d-0e1f2a3b4c5d')).toBe(true);
  });

  it('rejects a slug', () => {
    expect(isEventId('rock-in-rio-2026')).toBe(false);
  });
});

describe('eventHref', () => {
  it('prefers the slug', () => {
    expect(eventHref({ id: 'ev-1', slug: 'rock-in-rio' })).toBe('/events/rock-in-rio');
  });

  it('falls back to the id when the payload carries no slug', () => {
    expect(eventHref({ id: 'ev-1' })).toBe('/events/ev-1');
    expect(eventHref({ id: 'ev-1', slug: null })).toBe('/events/ev-1');
  });
});
