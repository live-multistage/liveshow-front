'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Repeat } from 'lucide-react';
import styles from './SeriesBadge.module.scss';

interface Props {
  // Episode events only carry `seriesId` today, not `seriesSlug` — see
  // task-12 report for the backend gap. Without a slug the badge still
  // labels the episode as part of a series, just without a working link.
  seriesSlug?: string | null;
  className?: string;
}

export function SeriesBadge({ seriesSlug, className }: Props) {
  const t = useTranslations('series');
  const chip = (
    <span className={className ? `${styles.badge} ${className}` : styles.badge}>
      <Repeat size={11} aria-hidden="true" />
      {t('badge')}
    </span>
  );

  if (!seriesSlug) return chip;

  return (
    <Link href={`/series/${seriesSlug}`} className={styles.link} aria-label={t('badgeLinkLabel')}>
      {chip}
    </Link>
  );
}
