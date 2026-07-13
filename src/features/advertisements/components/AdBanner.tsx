'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { X } from 'lucide-react';
import styles from './AdBanner.module.scss';
import { advertisementsService } from '../services/advertisements.service';
import type { AdPlacement } from '../types/advertisement.types';

interface Props {
  placement: AdPlacement;
  className?: string;
}

const GRADIENTS = [
  'linear-gradient(135deg,#ff2e9e 0%,#9b7bff 100%)',
  'linear-gradient(160deg,#ff7a4d 0%,#ffd166 100%)',
  'linear-gradient(135deg,#5fb4ff 0%,#9b7bff 100%)',
  'linear-gradient(135deg,#ffd166 0%,#ff7a4d 100%)',
  'linear-gradient(135deg,#bba6ff 0%,#5fb4ff 100%)',
  'linear-gradient(135deg,#7fe0a0 0%,#5fb4ff 100%)',
];

function gradientFor(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return GRADIENTS[h % GRADIENTS.length];
}

export function AdBanner({ placement, className }: Props) {
  const [dismissed, setDismissed] = useState(false);
  const impressionFired = useRef(false);

  const { data: ads } = useQuery({
    queryKey: ['ads', 'serve', placement],
    queryFn: () => advertisementsService.serve(placement, 1),
    staleTime: 5 * 60 * 1000,
    retry: 0,
  });

  const ad = ads?.[0] ?? null;

  useEffect(() => {
    if (ad && !impressionFired.current) {
      impressionFired.current = true;
      advertisementsService.recordImpression(ad.adId);
    }
  }, [ad]);

  if (!ad || dismissed) return null;

  const isVertical = ad.format === 'VERTICAL_300x600';
  const bg = ad.bannerUrl
    ? `url(${ad.bannerUrl}) center/cover no-repeat`
    : gradientFor(ad.adId);

  function handleClick() {
    advertisementsService.recordClick(ad!.adId);
  }

  const bannerClassName = `${styles.banner} ${isVertical ? styles.bannerV : styles.bannerH} ${className ?? ''}`;

  const content = (
    <>
      <span className={styles.sponsored}>PATROCINADO</span>

      <div className={styles.content}>
        <p className={styles.adTitle}>{ad.title}</p>
        {ad.eventId && (
          <span className={styles.cta}>SAIBA MAIS →</span>
        )}
      </div>

      <button
        className={styles.closeBtn}
        onClick={(e) => { e.stopPropagation(); setDismissed(true); }}
        aria-label="Fechar anúncio"
      >
        <X size={12} />
      </button>
    </>
  );

  if (ad.eventId) {
    return (
      <Link
        href={`/events/${ad.eventId}`}
        className={bannerClassName}
        style={{ background: bg }}
        onClick={handleClick}
        aria-label={`Anúncio: ${ad.title}`}
      >
        {content}
      </Link>
    );
  }

  return (
    <div
      className={bannerClassName}
      style={{ background: bg }}
      aria-label={`Anúncio: ${ad.title}`}
    >
      {content}
    </div>
  );
}
