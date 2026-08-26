'use client';

import { useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import styles from './Carousel.module.scss';

interface CarouselProps {
  title?: string;
  eyebrow?: React.ReactNode;
  showLiveDot?: boolean;
  seeAllHref?: string;
  children: React.ReactNode;
}

export function Carousel({ title, eyebrow, showLiveDot = false, seeAllHref, children }: CarouselProps) {
  const t = useTranslations('carousel');
  const trackRef = useRef<HTMLDivElement>(null);

  const scroll = (dir: 'left' | 'right') => {
    const el = trackRef.current;
    if (!el) return;
    el.scrollBy({ left: dir === 'right' ? 600 : -600, behavior: 'smooth' });
  };

  return (
    <div className={styles.section}>
      {(title || seeAllHref) && (
        <div className={styles.header}>
          <div className={styles.titleColumn}>
            {eyebrow && <div className={styles.eyebrow}>{eyebrow}</div>}
            <div className={styles.titleRow}>
              {showLiveDot && <span className={styles.liveDot} />}
              {title && <h2 className={styles.title}>{title}</h2>}
            </div>
          </div>
          {seeAllHref && (
            <Link href={seeAllHref} className={styles.seeAll}>
              {t('seeAll')}
            </Link>
          )}
        </div>
      )}

      <button onClick={() => scroll('left')} className={styles.arrowLeft} aria-label={t('scrollLeft')}>
        <ChevronLeft size={18} />
      </button>

      <div ref={trackRef} className={styles.track}>
        {children}
      </div>

      <button onClick={() => scroll('right')} className={styles.arrowRight} aria-label={t('scrollRight')}>
        <ChevronRight size={18} />
      </button>
    </div>
  );
}

// `fit="content"` drops the fixed ShowCard-sized slot so shorter cards
// (channels, series) don't leave an empty band under the rail.
Carousel.Item = function CarouselItem({
  children,
  fit = 'card',
}: {
  children: React.ReactNode;
  fit?: 'card' | 'content';
}) {
  return <div className={fit === 'content' ? styles.itemContent : styles.item}>{children}</div>;
};
