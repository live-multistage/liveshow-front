import { describe, expect, it } from 'vitest';
import { messages } from '@live-show/i18n-messages';

const { pt, en, es } = messages;

// The home page keys must exist with the same shape in every locale catalog.
// A missing key silently falls back to raw key names in production.
function keySet(obj: unknown, prefix = ''): Set<string> {
  const out = new Set<string>();
  if (obj && typeof obj === 'object') {
    for (const [key, value] of Object.entries(obj)) {
      const path = prefix ? `${prefix}.${key}` : key;
      out.add(path);
      for (const nested of keySet(value, path)) out.add(nested);
    }
  }
  return out;
}

describe('home page message catalogs', () => {
  it('pt/en/es share the same home, carousel, showCard, and ads keys', () => {
    const sections = ['home', 'carousel', 'showCard', 'ads'] as const;
    for (const section of sections) {
      const [ptKeys, enKeys, esKeys] = [pt, en, es].map((c) =>
        keySet((c as any)[section])
      );
      expect(enKeys, `${section} en vs pt key mismatch`).toEqual(ptKeys);
      expect(esKeys, `${section} es vs pt key mismatch`).toEqual(ptKeys);
    }
  });

  it('all required keys from the design spec exist and are non-empty strings', () => {
    const requiredKeys = [
      // New keys
      'nav.artists',
      'home.headline',
      'home.allShows',
      'home.filterByCategory',
      'home.moreGenres',
      'home.noShowsInCategory',
      'home.hero.live',
      'home.hero.watching',
      'home.hero.watchNow',
      'home.hero.details',
      'home.hero.exploreEvent',
      'home.hero.tickets',
      'home.hero.goToSlide',
      'showCard.showTag',
      'channels.watchNow',
      'channels.viewSchedule',
      'ads.learnMore',
      'ads.close',
      'ads.ariaLabel',
      // Modified keys (must still exist)
      'home.liveNow',
      'home.cameras',
      'carousel.seeAll',
      'showCard.details',
    ];

    for (const key of requiredKeys) {
      const [ptValue, enValue, esValue] = [pt, en, es].map((c) => {
        const parts = key.split('.');
        let current: any = c;
        for (const part of parts) {
          current = current?.[part];
        }
        return current;
      });

      expect(ptValue, `pt.${key} exists`).toBeDefined();
      expect(enValue, `en.${key} exists`).toBeDefined();
      expect(esValue, `es.${key} exists`).toBeDefined();

      expect(typeof ptValue, `pt.${key} is a string`).toBe('string');
      expect(typeof enValue, `en.${key} is a string`).toBe('string');
      expect(typeof esValue, `es.${key} is a string`).toBe('string');

      expect(ptValue.length > 0, `pt.${key} is non-empty`).toBe(true);
      expect(enValue.length > 0, `en.${key} is non-empty`).toBe(true);
      expect(esValue.length > 0, `es.${key} is non-empty`).toBe(true);
    }
  });

  it('carousel.seeAll does not contain the arrow character (→)', () => {
    expect(pt.carousel.seeAll).not.toContain('→');
    expect(en.carousel.seeAll).not.toContain('→');
    expect(es.carousel.seeAll).not.toContain('→');
  });
});
