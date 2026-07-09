// EditorialHomeContent: new editorial layout (active)
// HomePageContent: kept for future A/B testing
import { EditorialHomeContent } from '@/features/events';
import { fetchFeed } from '@/features/events/queries/get-feed.server';
import { fetchRecommendedEvents } from '@/features/events/queries/get-recommended-events.server';

export default async function Home() {
  const [initialEvents, initialRecommended] = await Promise.all([
    fetchFeed(),
    fetchRecommendedEvents(),
  ]);
  return <EditorialHomeContent initialEvents={initialEvents} initialRecommended={initialRecommended} />;
}
