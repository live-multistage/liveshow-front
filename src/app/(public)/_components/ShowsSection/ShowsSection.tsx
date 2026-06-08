'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Show } from '@/features/events/types/show';
import { ShowCard } from '@/features/events';
import { Chip } from '@/shared/components/ui/chip';
import { Carousel } from '../Carousel/Carousel';
import styles from './ShowsSection.module.scss';

const GENRES = ['All', 'Rock', 'Clássico', 'Eletrônica', 'Jazz', 'Ballet', 'Ópera', 'Hip-Hop', 'Pop'];

interface ShowsSectionProps {
  shows: Show[];
}

export function ShowsSection({ shows }: ShowsSectionProps) {
  const router = useRouter();
  const [selectedGenre, setSelectedGenre] = useState('All');

  const filtered =
    selectedGenre === 'All'
      ? shows
      : shows.filter((s) => s.genre === selectedGenre);

  return (
    <div className={styles.wrapper}>
      <div className={styles.genreFilter}>
        <span className={styles.genreLabel}>Find by{'\n'}genre</span>
        <div className={styles.genreBar}>
          {GENRES.map((genre) => (
            <Chip
              key={genre}
              variant={selectedGenre === genre ? 'active' : 'default'}
              onClick={() => setSelectedGenre(genre)}
            >
              {genre}
            </Chip>
          ))}
        </div>
      </div>

      <Carousel onSeeAll={() => router.push('/events')}>
        {filtered.map((show) => (
          <Carousel.Item key={show.id}>
            <ShowCard show={show} />
          </Carousel.Item>
        ))}
      </Carousel>
    </div>
  );
}
