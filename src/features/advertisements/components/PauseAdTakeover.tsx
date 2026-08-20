'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import styles from './PauseAdTakeover.module.scss';
import { advertisementsService } from '../services/advertisements.service';
import { gradientFor } from '../utils/ad-gradient';

// Mostrar o anúncio só depois de uma pausa "de verdade": uma pausa de um
// segundo para ler o chat não deve virar impressão cobrada do anunciante.
const SHOW_DELAY_MS = 2000;

const PLACEMENT = 'PLAYER_PAUSE';

interface Props {
  paused: boolean;
  onResume: () => void;
  onVisibleChange: (visible: boolean) => void;
}

export function PauseAdTakeover({ paused, onResume, onVisibleChange }: Props) {
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

  const active = paused && visibleFor > 0;

  // Reports upward so the player can shrink the video card / hide its header.
  // Fires on every change (including unmount, via the cleanup) so the layout
  // never gets stuck shrunk if this component goes away mid-takeover.
  useEffect(() => {
    onVisibleChange(active);
    return () => onVisibleChange(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  return (
    <>
      {active && <TakeoverAd key={visibleFor} onResume={onResume} />}
    </>
  );
}

function TakeoverAd({ onResume }: { onResume: () => void }) {
  const impressionFired = useRef(false);

  const { data: ads } = useQuery({
    queryKey: ['ads', 'serve', PLACEMENT],
    queryFn: () => advertisementsService.serve(PLACEMENT, 1),
    staleTime: 5 * 60 * 1000,
    retry: 0,
  });

  const ad = ads?.[0] ?? null;

  useEffect(() => {
    if (ad && !impressionFired.current) {
      impressionFired.current = true;
      advertisementsService.recordImpression(ad.adId, PLACEMENT);
    }
  }, [ad]);

  if (!ad) return null;

  const bg = ad.bannerUrl ? `url(${ad.bannerUrl}) center/cover no-repeat` : gradientFor(ad.adId);

  function handleCtaClick() {
    advertisementsService.recordClick(ad!.adId, PLACEMENT);
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
