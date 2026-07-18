import { getLocale } from 'next-intl/server';
import { EditorialHome } from '@/features/events/components/public/EditorialHome';
import { LOCALE_CODE } from '@/features/events/components/public/editorial/editorial-parts';
import { fetchFeed } from '@/features/events/queries/get-feed.server';
import { fetchRecommendedEvents } from '@/features/events/queries/get-recommended-events.server';
import { fetchReplayCatalog } from '@/features/events/queries/get-replay-catalog.server';
import { getInitialIsLoggedIn } from '@/features/account/queries/get-auth-state.server';

export default async function Home() {
  const [initialEvents, initialRecommended, initialReplayCatalog, locale, isLoggedIn] =
    await Promise.all([
      fetchFeed(),
      fetchRecommendedEvents(),
      fetchReplayCatalog(),
      getLocale(),
      getInitialIsLoggedIn(),
    ]);
  return (
    <EditorialHome
      initialEvents={initialEvents}
      initialRecommended={initialRecommended}
      initialReplayCatalog={initialReplayCatalog}
      localeCode={LOCALE_CODE[locale] ?? 'pt-BR'}
      isLoggedIn={isLoggedIn}
    />
  );
}
