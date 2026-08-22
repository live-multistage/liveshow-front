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
    <Carousel title={t('railTitle')} seeAllHref="/series">
      {series.map((item) => (
        <Carousel.Item key={item.id}>
          <div className={styles.item}>
            <SeriesCard series={item} />
          </div>
        </Carousel.Item>
      ))}
    </Carousel>
  );
}
