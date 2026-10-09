// Server component: the editorial home shell. It owns only the page's stable
// <h1> and the hero; every section below is the server-driven rail feed, which
// loads more as you scroll (HomeRails, the single client island here).
import { Suspense } from 'react';
import { useTranslations } from 'next-intl';
import type { HomeRailsResponse } from '@live-show/api-contracts';
import { eventToShow } from '@/features/events/utils/event-adapter';
import { HomeRails } from '@/features/home/components/HomeRails';
import { HomeHeroFallback } from '@/features/home/components/HomeHeroFallback';
import { pickHeroSlides } from '@/features/home/utils/pick-hero-slides';
import { EditorialHero } from './editorial/EditorialHero';
import styles from './EditorialHomeContent.module.scss';

interface Props {
  initialPage: HomeRailsResponse | null;
}

export function EditorialHome({ initialPage }: Props) {
  const t = useTranslations('home');
  const heroSlides = pickHeroSlides(initialPage?.rails ?? []).map(eventToShow);

  return (
    <div className={styles.page}>
      <h1 className={styles.visuallyHidden}>{t('headline')}</h1>
      {/* Neither boundary ever suspends (both render from server data); they
          exist for hydration. Without them a hydration mismatch anywhere makes
          React 19 discard and client-render the whole root, re-creating the
          already-painted hero <img> (the LCP) after all the JS has run; and
          the two islands hydrate as one long task instead of two. */}
      <Suspense fallback={null}>
        {heroSlides.length > 0 ? (
          <EditorialHero slides={heroSlides} />
        ) : (
          <HomeHeroFallback initialPage={initialPage ?? undefined} />
        )}
      </Suspense>
      <Suspense fallback={null}>
        <HomeRails initialPage={initialPage ?? undefined} />
      </Suspense>
    </div>
  );
}
