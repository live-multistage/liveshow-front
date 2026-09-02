'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { X } from 'lucide-react';
import styles from './AdBanner.module.scss';
import { advertisementsService } from '../services/advertisements.service';
import { SERVE_QUERY_CACHE } from '../queries/use-serve-ads';
import type { AdPlacement } from '../types/advertisement.types';
import { gradientFor } from '../utils/ad-gradient';

interface Props {
  placement: AdPlacement;
  className?: string;
}

export function AdBanner({ placement, className }: Props) {
  const [dismissed, setDismissed] = useState(false);
  const impressionFired = useRef(false);

  const { data: ads } = useQuery({
    queryKey: ['ads', 'serve', placement],
    queryFn: () => advertisementsService.serve(placement, 1),
    ...SERVE_QUERY_CACHE,
    retry: 0,
  });

  const ad = ads?.[0] ?? null;

  useEffect(() => {
    if (ad && !impressionFired.current) {
      impressionFired.current = true;
      advertisementsService.recordImpression(ad.servedId);
    }
  }, [ad, placement]);

  if (!ad || dismissed) return null;

  const isVertical = ad.format === 'VERTICAL_300x600';
  const isWide = ad.format === 'WIDE_16_9';
  const bg = ad.bannerUrl
    ? `url(${ad.bannerUrl}) center/cover no-repeat`
    : gradientFor(ad.adId);

  function handleClick() {
    advertisementsService.recordClick(ad!.servedId);
  }

  let bannerVariant = styles.bannerH;
  if (isVertical) bannerVariant = styles.bannerV;
  else if (isWide) bannerVariant = styles.bannerWide;

  const bannerClassName = `${styles.banner} ${bannerVariant} ${className ?? ''}`;

  const content = (
    <>
      <span className={styles.sponsored}>PATROCINADO</span>

      <div className={styles.content}>
        <p className={styles.adTitle}>{ad.title}</p>
        {ad.destination && (
          <span className={styles.cta}>SAIBA MAIS →</span>
        )}
      </div>

      <button
        className={styles.closeBtn}
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setDismissed(true); }}
        aria-label="Fechar anúncio"
      >
        <X size={12} />
      </button>
    </>
  );

  if (ad.destination?.type === 'EVENT') {
    return (
      <Link
        href={`/events/${ad.destination.eventId}`}
        className={bannerClassName}
        style={{ background: bg }}
        onClick={handleClick}
        aria-label={`Anúncio: ${ad.title}`}
      >
        {content}
      </Link>
    );
  }

  if (ad.destination?.type === 'EXTERNAL_URL') {
    return (
      <a
        href={ad.destination.url}
        target="_blank"
        rel="noopener sponsored"
        className={bannerClassName}
        style={{ background: bg }}
        onClick={handleClick}
        aria-label={`Anúncio: ${ad.title}`}
      >
        {content}
      </a>
    );
  }

  return (
    <div
      className={bannerClassName}
      style={{ background: bg }}
      onClick={handleClick}
      aria-label={`Anúncio: ${ad.title}`}
    >
      {content}
    </div>
  );
}
