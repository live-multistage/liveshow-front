'use client';

import { useTranslations } from 'next-intl';
import type { Show } from '@/features/events/types/show';
import { ShowCard } from '@/features/events';
import { Carousel } from '../Carousel/Carousel';

interface LiveNowProps {
  shows: Show[];
}

export function LiveNow({ shows }: LiveNowProps) {
  const t = useTranslations('home');

  if (shows.length === 0) return null;

  return (
    <Carousel
      title={t('liveNow')}
      showLiveDot
      seeAllHref="/events?live=true"
    >
      {shows.map((show) => (
        <Carousel.Item key={show.id}>
          <ShowCard show={show} />
        </Carousel.Item>
      ))}
    </Carousel>
  );
}
