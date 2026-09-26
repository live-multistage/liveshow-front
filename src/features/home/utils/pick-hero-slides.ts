import type { HomeRail, HomeRailItem } from '@live-show/api-contracts';

// The hero shows the most "now" thing the server sent: the first of these
// rails that actually has items, in the order the server returned them.
const HERO_RAIL_KEYS = ['curated:live', 'curated:today', 'curated:weekend', 'recommended'];

export function pickHeroSlides(rails: HomeRail[]): HomeRailItem[] {
  const preferred = rails.find(
    (r) => HERO_RAIL_KEYS.includes(r.key) && r.items.length > 0,
  );
  // A whitelist alone leaves the page with no hero whenever none of those four
  // rails exist — a catalogue with nothing live or upcoming (the `catalog:all`
  // fallback), or one that only planned category rails. Any show beats a home
  // that starts at a bare carousel, and the hero degrades on its own: a show
  // that is not live links to its page instead of the player.
  const rail =
    preferred ?? rails.find((r) => r.kind === 'events' && r.items.length > 0);
  return rail ? rail.items.slice(0, 5) : [];
}
