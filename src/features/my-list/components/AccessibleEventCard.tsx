'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Card, CardContent, Badge, Button } from '@live-show/design-system';
import { eventAction, isVenueOnly } from '../utils/event-action';
import type { AccessibleEvent } from '../types/my-list.types';
import styles from './AccessibleEventCard.module.scss';

const STATUS_VARIANT = {
  LIVE: 'destructive',
  FINISHED: 'secondary',
  CANCELLED: 'outline',
  SCHEDULED: 'default',
  PUBLISHED: 'default',
  DRAFT: 'outline',
} as const;

function formatDate(iso: string, locale: string): string {
  return new Date(iso).toLocaleDateString(locale, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function AccessibleEventCard({ event }: { event: AccessibleEvent }) {
  const t = useTranslations('myList');
  const action = eventAction(event);
  const cover = event.thumbnailUrl ?? event.bannerUrl;
  const place = [event.venue, event.city].filter(Boolean).join(' · ');

  return (
    <Card className={styles.card}>
      <div className={styles.cover}>
        {cover ? (
          <img src={cover} alt="" className={styles.image} />
        ) : (
          // Sem capa não é erro — muitos eventos não têm. Um bloco neutro lê
          // melhor que um ícone de imagem quebrada.
          <div className={styles.coverFallback} aria-hidden="true" />
        )}
        <Badge variant={STATUS_VARIANT[event.status]} className={styles.status}>
          {t(`status.${event.status}`)}
        </Badge>
      </div>

      <CardContent className={styles.body}>
        <h3 className={styles.title}>{event.title}</h3>
        <p className={styles.meta}>{formatDate(event.startsAt, 'pt-BR')}</p>
        {place && <p className={styles.meta}>{place}</p>}

        {/* Um ingresso presencial não dá playback. Dizer isso evita que a
            ausência do botão "Assistir" pareça um defeito da página. */}
        {isVenueOnly(event) && <p className={styles.note}>{t('venueOnly')}</p>}

        <Button
          asChild
          variant={action.primary ? 'default' : 'outline'}
          className={styles.action}
        >
          <Link href={action.href}>{t(action.labelKey)}</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
