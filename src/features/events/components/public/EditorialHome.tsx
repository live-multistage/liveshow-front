// Server component: the editorial home shell. It owns only the page's stable
// <h1> and the hero; every section below is the server-driven rail feed, which
// loads more as you scroll (HomeRails, the single client island here).
import { useTranslations } from 'next-intl';
import type { HomeRailsResponse } from '@live-show/api-contracts';
import { eventToShow } from '@/features/events/utils/event-adapter';
import { HomeRails } from '@/features/home/components/HomeRails';
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
      {heroSlides.length > 0 && <EditorialHero slides={heroSlides} />}
      <HomeRails initialPage={initialPage ?? undefined} />
    </div>
  );
}
