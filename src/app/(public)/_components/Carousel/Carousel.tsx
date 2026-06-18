'use client';

import { useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslations } from 'next-intl';
import styles from './Carousel.module.scss';

interface CarouselProps {
  title?: string;
  showLiveDot?: boolean;
  onSeeAll?: () => void;
  children: React.ReactNode;
}

export function Carousel({ title, showLiveDot = false, onSeeAll, children }: CarouselProps) {
  const t = useTranslations('carousel');
  const trackRef = useRef<HTMLDivElement>(null);

  const scroll = (dir: 'left' | 'right') => {
    const el = trackRef.current;
    if (!el) return;
    el.scrollBy({ left: dir === 'right' ? 600 : -600, behavior: 'smooth' });
  };

  return (
    <div className={styles.section}>
      {(title || onSeeAll) && (
        <div className={styles.header}>
          <div className={styles.titleRow}>
            {showLiveDot && <span className={styles.liveDot} />}
            {title && <h2 className={styles.title}>{title}</h2>}
          </div>
          {onSeeAll && (
            <button onClick={onSeeAll} className={styles.seeAll}>
              {t('seeAll')}
            </button>
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

Carousel.Item = function CarouselItem({ children }: { children: React.ReactNode }) {
  return <div className={styles.item}>{children}</div>;
};
