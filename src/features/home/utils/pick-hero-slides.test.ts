import { describe, it, expect } from 'vitest';
import type { HomeRail, HomeRailItem } from '@live-show/api-contracts';
import { pickHeroSlides } from './pick-hero-slides';

function item(id: string): HomeRailItem {
  return { id } as HomeRailItem;
}

function rail(key: string, items: HomeRailItem[], kind: HomeRail['kind'] = 'events'): HomeRail {
  return {
    key,
    dimension: 'curated',
    kind,
    title: key,
    items,
    seeAllHref: '/events',
  };
}

describe('pickHeroSlides', () => {
  it('returns the items of the first eligible rail in server order', () => {
    const slides = pickHeroSlides([
      rail('category:MUSIC', [item('cat-1')]),
      rail('curated:weekend', [item('weekend-1')]),
      rail('curated:live', [item('live-1')]),
    ]);

    expect(slides.map((s) => s.id)).toEqual(['weekend-1']);
  });

  it('skips an eligible rail that has no items', () => {
    const slides = pickHeroSlides([
      rail('curated:live', []),
      rail('recommended', [item('rec-1')]),
    ]);

    expect(slides.map((s) => s.id)).toEqual(['rec-1']);
  });

  it('caps the hero at 5 slides', () => {
    const slides = pickHeroSlides([
      rail('curated:today', ['a', 'b', 'c', 'd', 'e', 'f', 'g'].map(item)),
    ]);

    expect(slides).toHaveLength(5);
  });

  // A whitelist alone left the home with no hero at all whenever none of the
  // four preferred rails existed — which is every catalogue with nothing live
  // or upcoming.
  it('headlines any events rail rather than showing no hero', () => {
    expect(
      pickHeroSlides([rail('city:sao-paulo', [item('x')])]).map((s) => s.id),
    ).toEqual(['x']);
    expect(
      pickHeroSlides([rail('catalog:all', [item('a'), item('b')])]).map((s) => s.id),
    ).toEqual(['a', 'b']);
  });

  it('still prefers a live rail over whatever came first', () => {
    const slides = pickHeroSlides([
      rail('catalog:all', [item('catalogue-1')]),
      rail('curated:live', [item('live-1')]),
    ]);

    expect(slides.map((s) => s.id)).toEqual(['live-1']);
  });

  // Channels carry `channels`, not `items` — they cannot headline.
  it('never falls back to a channels rail', () => {
    expect(pickHeroSlides([rail('channels', [item('ch-1')], 'channels')])).toEqual([]);
  });

  it('returns nothing when there is nothing to show', () => {
    expect(pickHeroSlides([])).toEqual([]);
    expect(pickHeroSlides([rail('catalog:all', [])])).toEqual([]);
  });
});
