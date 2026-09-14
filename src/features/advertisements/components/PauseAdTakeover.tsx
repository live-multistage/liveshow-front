'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import styles from './PauseAdTakeover.module.scss';
import { advertisementsService } from '../services/advertisements.service';
import { SERVE_QUERY_CACHE } from '../queries/use-serve-ads';
import { gradientFor } from '../utils/ad-gradient';

// Mostrar o anúncio só depois de uma pausa "de verdade": uma pausa de um
// segundo para ler o chat não deve virar impressão cobrada do anunciante.
const SHOW_DELAY_MS = 2000;

const PLACEMENT = 'PLAYER_PAUSE';

interface Props {
  eventId: string;
  paused: boolean;
  onResume: () => void;
  onVisibleChange: (visible: boolean) => void;
}

export function PauseAdTakeover({ eventId, paused, onResume, onVisibleChange }: Props) {
  // Conta transições false→true. Zero = nunca pausou nesta sessão — cobre o
  // ReplayPlayer, que MONTA pausado e não deve mostrar anúncio na carga.
  const pauseCount = useRef(0);
  const prevPaused = useRef(paused);
  const [visibleFor, setVisibleFor] = useState(0);

  useEffect(() => {
    const was = prevPaused.current;
    prevPaused.current = paused;

    if (!paused) {
      setVisibleFor(0);
      return;
    }
    if (was) return;

    pauseCount.current += 1;
    const count = pauseCount.current;
    const timer = setTimeout(() => setVisibleFor(count), SHOW_DELAY_MS);
    return () => clearTimeout(timer);
  }, [paused]);

  // "Eligible to show" (real 2s+ pause), not "showing" — only TakeoverAd
  // knows whether the serve returned an ad, so it owns onVisibleChange.
  const eligible = paused && visibleFor > 0;

  if (!eligible) return null;
  return <TakeoverAd key={visibleFor} eventId={eventId} onResume={onResume} onVisibleChange={onVisibleChange} />;
}

interface TakeoverAdProps {
  eventId: string;
  onResume: () => void;
  onVisibleChange: (visible: boolean) => void;
}

function TakeoverAd({ eventId, onResume, onVisibleChange }: TakeoverAdProps) {
  const impressionFired = useRef(false);

  const { data: ads } = useQuery({
    queryKey: ['ads', 'serve', PLACEMENT, eventId],
    queryFn: () => advertisementsService.serve(PLACEMENT, 1, eventId),
    ...SERVE_QUERY_CACHE,
    retry: 0,
  });

  const ad = ads?.[0] ?? null;

  useEffect(() => {
    if (ad && !impressionFired.current) {
      impressionFired.current = true;
      advertisementsService.recordImpression(ad.servedId);
    }
  }, [ad]);

  // Shrink the video / hide the header only while a real ad is on screen —
  // an empty serve or a failed request must not touch the layout. Cleanup
  // fires false on resume/unmount so the player can never get stuck shrunk.
  const onVisibleChangeRef = useRef(onVisibleChange);
  useEffect(() => {
    onVisibleChangeRef.current = onVisibleChange;
  });
  useEffect(() => {
    onVisibleChangeRef.current(Boolean(ad));
    return () => onVisibleChangeRef.current(false);
  }, [ad]);

  if (!ad) return null;

  const bg = ad.bannerUrl ? `url(${ad.bannerUrl}) center/cover no-repeat` : gradientFor(ad.adId);

  function handleCtaClick() {
    advertisementsService.recordClick(ad!.servedId);
  }

  let cta: React.ReactNode = null;
  if (ad.destination?.type === 'EVENT') {
    cta = (
      <Link href={`/events/${ad.destination.eventId}`} className={styles.cta} onClick={handleCtaClick}>
        Saiba mais →
      </Link>
    );
  } else if (ad.destination?.type === 'EXTERNAL_URL') {
    cta = (
      <a
        href={ad.destination.url}
        target="_blank"
        rel="noopener sponsored"
        className={styles.cta}
        onClick={handleCtaClick}
      >
        Saiba mais →
      </a>
    );
  }

  return (
    <div className={styles.takeover} style={{ background: bg }}>
      <div className={styles.scrim} />
      <span className={styles.sponsored}>PATROCINADO</span>
      <div className={styles.copy}>
        <p className={styles.title}>{ad.title}</p>
        <div className={styles.actions}>
          {cta}
          <button type="button" className={styles.closeBtn} onClick={onResume}>
            Fechar anúncio
          </button>
        </div>
      </div>
    </div>
  );
}
