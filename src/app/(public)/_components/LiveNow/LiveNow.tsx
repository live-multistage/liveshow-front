'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import type { Show } from '@/features/events/types/show';
import { ShowCard } from '@/features/events';
import { Carousel } from '../Carousel/Carousel';

interface LiveNowProps {
  shows: Show[];
}

export function LiveNow({ shows }: LiveNowProps) {
  const t = useTranslations('home');
  const router = useRouter();

  if (shows.length === 0) return null;

  return (
    <Carousel
      title={t('liveNow')}
      showLiveDot
      onSeeAll={() => router.push('/events?live=true')}
    >
      {shows.map((show) => (
        <Carousel.Item key={show.id}>
          <ShowCard show={show} />
        </Carousel.Item>
      ))}
    </Carousel>
  );
}
