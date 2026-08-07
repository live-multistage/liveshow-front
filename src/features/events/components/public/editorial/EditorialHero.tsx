// Full-width v2 hero for the editorial home. Presentational + server-renderable
// (no hooks, no 'use client') so it stays consistent with the rest of the
// editorial-parts components; extracted from EditorialHome for testability.
import Link from 'next/link';
import type { Show } from '@/features/events/types/show';
import { SmartImage } from './SmartImage';
import { fmtPrice, playHref, infoHref } from './editorial-parts';
import styles from '../EditorialHomeContent.module.scss';

interface Props {
  featured: Show;
  localeCode: string;
}

export function EditorialHero({ featured }: Props) {
  const priceLabel = fmtPrice(featured);
  const isFree = priceLabel === 'Grátis';

  return (
    <div className={styles.heroV2}>
      <SmartImage src={featured.image} alt={featured.title} className={styles.heroV2Image} />
      <div className={styles.heroV2Glow} aria-hidden="true" />
      <div className={styles.heroV2Scrim} aria-hidden="true" />

      <div className={styles.heroV2Content}>
        {featured.isLive && (
          <span className={styles.heroV2Badge}>
            <span className={styles.heroV2BadgeDot} aria-hidden="true" />
            AO VIVO
          </span>
        )}

        <h1 className={styles.heroV2Title}>{featured.title}</h1>

        {featured.viewers != null && (
          <div className={styles.heroV2Watching}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
              <path d="M4 12a8 8 0 0 1 16 0" />
              <path d="M7 12a5 5 0 0 1 10 0" />
              <circle cx="12" cy="12" r="1.6" fill="currentColor" />
            </svg>
            <span className={styles.heroV2WatchingCount}>{featured.viewers.toLocaleString('pt-BR')}</span>
            {' '}assistindo agora
          </div>
        )}

        <div className={styles.heroV2Meta}>
          <span>{featured.venue}</span>
          <span className={styles.heroV2MetaDot} aria-hidden="true" />
          <span>{featured.city}</span>
          <span className={styles.heroV2MetaDot} aria-hidden="true" />
          <span>{featured.cameras.length} câmeras</span>
          <span className={styles.heroV2MetaDot} aria-hidden="true" />
          <span>Dolby Atmos</span>
        </div>

        <div className={styles.heroV2Actions}>
          {featured.isLive ? (
            <>
              <Link href={playHref(featured)} className={styles.heroV2PrimaryBtn}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M8 5v14l11-7z" />
                </svg>
                Assistir agora
              </Link>
              <Link href={infoHref(featured)} className={styles.heroV2SecondaryBtn}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 16v-4M12 8h.01" />
                </svg>
                Detalhes
              </Link>
            </>
          ) : (
            <Link href={infoHref(featured)} className={styles.heroV2PrimaryBtn}>
              {isFree ? 'Explorar evento' : `Ingressos · ${priceLabel}`}
            </Link>
          )}
        </div>

        <div className={styles.heroV2Dots} aria-hidden="true">
          <span className={styles.heroV2DotActive} />
          <span className={styles.heroV2Dot} />
          <span className={styles.heroV2Dot} />
          <span className={styles.heroV2Dot} />
        </div>
      </div>
    </div>
  );
}
