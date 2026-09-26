import { describe, it, expect } from 'vitest';
import type { HomeRail, HomeRailItem } from '@live-show/api-contracts';
import { pickHeroSlides } from './pick-hero-slides';

function item(id: string): HomeRailItem {
  return { id } as HomeRailItem;
}

function rail(key: string, items: HomeRailItem[]): HomeRail {
  return {
    key,
    dimension: 'curated',
    kind: 'events',
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

  it('returns nothing when no rail is eligible', () => {
    expect(pickHeroSlides([rail('city:sao-paulo', [item('x')])])).toEqual([]);
    expect(pickHeroSlides([])).toEqual([]);
  });
});
