// EditorialHomeContent: new editorial layout (active)
// HomePageContent: kept for future A/B testing
import { EditorialHomeContent } from '@/features/events';
import { fetchFeed } from '@/features/events/queries/get-feed.server';
import { fetchRecommendedEvents } from '@/features/events/queries/get-recommended-events.server';
import { fetchReplayCatalog } from '@/features/events/queries/get-replay-catalog.server';

export default async function Home() {
  const [initialEvents, initialRecommended, initialReplayCatalog] = await Promise.all([
    fetchFeed(),
    fetchRecommendedEvents(),
    fetchReplayCatalog(),
  ]);
  return (
    <EditorialHomeContent
      initialEvents={initialEvents}
      initialRecommended={initialRecommended}
      initialReplayCatalog={initialReplayCatalog}
    />
  );
}
