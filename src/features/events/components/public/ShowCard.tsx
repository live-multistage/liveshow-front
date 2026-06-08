'use client';

import { useRouter } from "next/navigation";
import { Calendar, Clock, MapPin, Camera } from "lucide-react";
import type { Show } from "../../types/show";
import { Chip } from "@/shared/components/ui/chip";
import styles from "./ShowCard.module.scss";

interface ShowCardProps {
  show: Show;
  purchased?: boolean;
  layout?: 'vertical' | 'horizontal';
}

export function ShowCard({ show, purchased = false, layout = 'vertical' }: ShowCardProps) {
  const router = useRouter();

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + "T00:00:00");
    return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
  };

  const formatPrice = (price: number) =>
    price.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  return (
    <div
      className={`${styles.card} ${layout === 'horizontal' ? styles.cardHorizontal : ''}`}
      onClick={() => router.push(`/events/${show.id}`)}
    >
      <div className={styles.imageWrapper}>
        <img src={show.image} alt={show.title} className={styles.image} />

        {show.isLive && (
          <div className={styles.badgeTopLeft}>
            <span className={styles.liveBadge}>
              <span className={styles.liveDot} />
              Ao Vivo
            </span>
          </div>
        )}

        {purchased && !show.isLive && (
          <div className={styles.badgeTopLeft}>
            <span className={styles.purchasedBadge}>Comprado</span>
          </div>
        )}

        <div className={styles.cameraCount}>
          <Camera size={12} />
          {show.cameras.length}
        </div>
      </div>

      <div className={styles.content}>
        <div className={styles.contentHeader}>
          <div className={styles.titleGroup}>
            <h3 className={styles.cardTitle}>{show.title}</h3>
            <p className={styles.cardArtist}>{show.artist}</p>
          </div>
          <span className={styles.cardPrice}>
            {purchased ? "—" : formatPrice(show.price)}
          </span>
        </div>

        <div className={styles.metaList}>
          <div className={styles.metaItem}>
            <MapPin size={12} />
            <span className={styles.metaItemTruncate}>{show.venue} · {show.city}</span>
          </div>
          <div className={styles.metaRow}>
            <div className={styles.metaItem}>
              <Calendar size={12} />
              <span>{formatDate(show.date)}</span>
            </div>
            <div className={styles.metaItem}>
              <Clock size={12} />
              <span>{show.time}</span>
            </div>
          </div>
        </div>

        <div className={styles.cardFooter}>
          <div className={styles.chips}>
            <Chip variant="tag" asChild><span>{show.genre}</span></Chip>
            {show.hasReplay && <Chip variant="tag" asChild><span>Reprise</span></Chip>}
          </div>

          {purchased ? (
            <button
              className={styles.btnAction}
              onClick={(e) => { e.stopPropagation(); router.push(`/live/${show.id}`); }}
            >
              Assistir
            </button>
          ) : (
            <button className={styles.btnDetails} onClick={(e) => e.stopPropagation()}>
              Ver Mais
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
