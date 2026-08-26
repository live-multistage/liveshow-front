'use client';

import { useTranslations } from 'next-intl';
import { Carousel } from '@/app/(public)/_components/Carousel/Carousel';
import type { SeriesListItem } from '../types/series.types';
import { SeriesCard } from './SeriesCard';
import styles from './SeriesRail.module.scss';

interface Props {
  series: SeriesListItem[];
}

// Trilho de séries ("Programas") da home. Sem séries ativas o trilho some
// por completo, mesmo padrão do ChannelsRail.
export function SeriesRail({ series }: Props) {
  const t = useTranslations('series');
  if (series.length === 0) return null;

  return (
    <Carousel
      title={t('railTitle')}
      seeAllHref="/series"
      eyebrow={
        <span className={styles.eyebrow}>
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
        </span>
      }
    >
      {series.map((item) => (
        <Carousel.Item fit="content" key={item.id}>
          <div className={styles.item}>
            <SeriesCard series={item} />
          </div>
        </Carousel.Item>
      ))}
    </Carousel>
  );
}
