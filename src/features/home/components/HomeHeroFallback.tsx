'use client';

import type { HomeRailsResponse } from '@live-show/api-contracts';
import { eventToShow } from '@/features/events/utils/event-adapter';
import { EditorialHero } from '@/features/events/components/public/editorial/EditorialHero';
import { useHomeRailsQuery } from '../queries/get-home-rails';
import { pickHeroSlides } from '../utils/pick-hero-slides';
import { HomeHeroSkeleton } from './HomeHeroSkeleton';

// Only mounted when the server render had no rails to pick a hero from (the
// home fetch failed or timed out). It reads the same query HomeRails does, so
// it costs no extra request: skeleton while that first page is in flight, then
// the real hero, and nothing at all if the feed truly has no events.
export function HomeHeroFallback({ initialPage }: { initialPage?: HomeRailsResponse }) {
  const q = useHomeRailsQuery(initialPage);
  // First page only, like the server: the hero is the top of the feed, not
  // whatever the infinite scroll has appended since.
  const slides = pickHeroSlides(q.data?.pages[0]?.rails ?? []).map(eventToShow);

  if (slides.length > 0) return <EditorialHero slides={slides} />;
  if (q.isFetching) return <HomeHeroSkeleton />;
  return null;
}
