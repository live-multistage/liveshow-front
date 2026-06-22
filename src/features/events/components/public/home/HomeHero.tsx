'use client';

import { useRouter } from 'next/navigation';
import { Play, Calendar, Eye } from 'lucide-react';
import type { Show } from '../../../types/show';
import styles from './HomeHero.module.scss';

interface HomeHeroProps {
  show: Show;
}

export function HomeHero({ show }: HomeHeroProps) {
  const router = useRouter();

  const priceLabel =
    show.price === 0 ? 'Explorar evento' : `Comprar ingresso · R$ ${Math.round(show.price)}`;

  const formattedDate = (() => {
    try {
      return new Date(show.date + 'T00:00:00').toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return show.date;
    }
  })();

  return (
    <section className={styles.hero}>
      {/* background art */}
      <div className={styles.art} style={{ backgroundImage: `url(${show.image})` }} />
      <div className={styles.overlay} />

      {/* watermark */}
      <span className={styles.watermark} aria-hidden="true">
        {show.genre.toUpperCase()}
      </span>

      <div className={styles.content}>
        <span className={styles.badge}>
          EM DESTAQUE · {show.cameras.length} CÂMERA{show.cameras.length !== 1 ? 'S' : ''}
        </span>

        <p className={styles.venue}>
          {show.venue && show.city ? `${show.venue} · ${show.city}` : show.city || show.venue}
        </p>

        <h1 className={styles.title}>{show.title}</h1>

        <div className={styles.meta}>
          <span className={styles.metaItem}>
            <Calendar size={15} />
            {formattedDate} · {show.time}
          </span>
          {show.viewers != null && (
            <span className={styles.metaItem}>
              <Eye size={15} />
              {show.viewers.toLocaleString('pt-BR')} assistindo
            </span>
          )}
        </div>

        <div className={styles.ctas}>
          {show.isLive && (
            <button className={styles.btnPrimary} onClick={() => router.push(`/live/${show.id}`)}>
              <Play size={18} fill="currentColor" />
              Assistir ao vivo
            </button>
          )}
          <button className={styles.btnSecondary} onClick={() => router.push(`/events/${show.id}`)}>
            {show.price > 0 ? (
              <>
                Comprar ingresso ·{' '}
                <span className={styles.priceAccent}>R$ {Math.round(show.price)}</span>
              </>
            ) : (
              'Explorar evento'
            )}
          </button>
        </div>
      </div>
    </section>
  );
}
