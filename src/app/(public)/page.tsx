import type { Metadata } from 'next';
import { EditorialHome } from '@/features/events/components/public/EditorialHome';
import { fetchHomeRails } from '@/features/home';

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
  // One fetch: the rail feed decides what the home shows (live, channels,
  // recommendations, categories…) — including which rail headlines the hero.
  const initialPage = await fetchHomeRails();
  return <EditorialHome initialPage={initialPage} />;
}
