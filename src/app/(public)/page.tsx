import type { Metadata } from 'next';
import { getLocale } from 'next-intl/server';
import { EditorialHome } from '@/features/events/components/public/EditorialHome';
import { LOCALE_CODE } from '@/features/events/components/public/editorial/editorial-parts';
import { fetchFeed } from '@/features/events/queries/get-feed.server';
import { fetchRecommendedEvents } from '@/features/events/queries/get-recommended-events.server';
import { fetchReplayCatalog } from '@/features/events/queries/get-replay-catalog.server';
import { getInitialIsLoggedIn } from '@/features/account/queries/get-auth-state.server';
import { fetchChannels } from '@/features/channels/queries/get-channels.server';
import { fetchFeatureFlags } from '@/features/feature-flags';

// Home-specific <title>/description: the layout default is just "showon.io",
// which says nothing to a search result. `absolute` skips the "· showon.io"
// template so the brand is not repeated.
export const metadata: Metadata = {
  title: { absolute: 'showon.io · Shows ao vivo em múltiplas câmeras, ingressos e replays' },
  description:
    'Assista shows e festivais ao vivo escolhendo a câmera, compre ingressos digitais e reveja em replay no showon.io.',
  alternates: { canonical: '/' },
  openGraph: {
    title: 'showon.io · Shows ao vivo em múltiplas câmeras',
    description:
      'Assista shows e festivais ao vivo escolhendo a câmera, compre ingressos digitais e reveja em replay.',
  },
};

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
  // The channels rail skips its fetch entirely when the flag is off — it
  // renders nothing anyway (EditorialHome hides empty rails).
  const initialChannels = flags.linear_channels ? await fetchChannels() : [];
  return (
    <EditorialHome
      initialEvents={initialEvents}
      initialRecommended={initialRecommended}
      initialReplayCatalog={initialReplayCatalog}
      initialChannels={initialChannels}
      localeCode={LOCALE_CODE[locale] ?? 'pt-BR'}
      isLoggedIn={isLoggedIn}
    />
  );
}
