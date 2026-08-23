import { getLocale } from 'next-intl/server';
import { EditorialHome } from '@/features/events/components/public/EditorialHome';
import { LOCALE_CODE } from '@/features/events/components/public/editorial/editorial-parts';
import { fetchFeed } from '@/features/events/queries/get-feed.server';
import { fetchRecommendedEvents } from '@/features/events/queries/get-recommended-events.server';
import { fetchReplayCatalog } from '@/features/events/queries/get-replay-catalog.server';
import { getInitialIsLoggedIn } from '@/features/account/queries/get-auth-state.server';
import { fetchChannels } from '@/features/channels/queries/get-channels.server';
import { fetchSeries } from '@/features/series/queries/get-series.server';
import { fetchFeatureFlags } from '@/features/feature-flags';

export default async function Home() {
  const [flags, initialEvents, initialRecommended, initialReplayCatalog, locale, isLoggedIn] =
    await Promise.all([
      fetchFeatureFlags(),
      fetchFeed(),
      fetchRecommendedEvents(),
      fetchReplayCatalog(),
      getLocale(),
      getInitialIsLoggedIn(),
    ]);
  // Channels + series rails skip their fetch entirely when the flag is off —
  // they render nothing anyway (EditorialHome hides empty rails).
  const [initialChannels, initialSeries] = flags.linear_channels
    ? await Promise.all([fetchChannels(), fetchSeries()])
    : [[], []];
  return (
    <EditorialHome
      initialEvents={initialEvents}
      initialRecommended={initialRecommended}
      initialReplayCatalog={initialReplayCatalog}
      initialChannels={initialChannels}
      initialSeries={initialSeries}
      localeCode={LOCALE_CODE[locale] ?? 'pt-BR'}
      isLoggedIn={isLoggedIn}
    />
  );
}
