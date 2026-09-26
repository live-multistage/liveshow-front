import type { HomeRail, HomeRailItem } from '@live-show/api-contracts';

// The hero shows the most "now" thing the server sent: the first of these
// rails that actually has items, in the order the server returned them.
// Every other rail (categories, cities, artists) is too arbitrary to headline.
const HERO_RAIL_KEYS = ['curated:live', 'curated:today', 'curated:weekend', 'recommended'];

export function pickHeroSlides(rails: HomeRail[]): HomeRailItem[] {
  const rail = rails.find((r) => HERO_RAIL_KEYS.includes(r.key) && r.items.length > 0);
  return rail ? rail.items.slice(0, 5) : [];
}
