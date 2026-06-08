'use client';

import { useRouter } from 'next/navigation';
import type { Show } from '@/features/events/types/show';
import { ShowCard } from '@/features/events';
import { Carousel } from '../Carousel/Carousel';

interface LiveNowProps {
  shows: Show[];
}

export function LiveNow({ shows }: LiveNowProps) {
  const router = useRouter();

  if (shows.length === 0) return null;

  return (
    <Carousel
      title="Ao Vivo Agora"
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
