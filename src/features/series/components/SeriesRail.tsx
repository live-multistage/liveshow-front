'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Carousel } from '@/app/(public)/_components/Carousel/Carousel';
import type { SeriesListItem } from '../types/series.types';
import { SeriesCard } from './SeriesCard';
import styles from './SeriesRail.module.scss';

interface Props {
  series: SeriesListItem[];
}

// Trilho de séries ("Programas") da home. Sem séries ativas o trilho some
// por completo, mesmo padrão do ChannelsRail — inclusive o cabeçalho no
// padrão das seções de eventos, alinhado ao gridSection.
export function SeriesRail({ series }: Props) {
  const t = useTranslations('series');
  const tCarousel = useTranslations('carousel');
  if (series.length === 0) return null;

  return (
    <div>
      <div className={styles.header}>
        <div>
          <div className={styles.eyebrow}>
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <path d="M17 2l3 3-3 3M20 5H8a4 4 0 0 0-4 4M7 22l-3-3 3-3M4 19h12a4 4 0 0 0 4-4" />
            </svg>
            {t('railEyebrow')}
          </div>
          <h2 className={styles.title}>{t('railTitle')}</h2>
        </div>
        <Link href="/series" className={styles.more}>
          {tCarousel('seeAll')}
        </Link>
      </div>

      <Carousel>
        {series.map((item) => (
          <Carousel.Item fit="content" key={item.id}>
            <div className={styles.item}>
              <SeriesCard series={item} />
            </div>
          </Carousel.Item>
        ))}
      </Carousel>
    </div>
  );
}
