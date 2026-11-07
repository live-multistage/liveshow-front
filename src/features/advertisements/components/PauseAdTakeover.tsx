'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import styles from './PauseAdTakeover.module.scss';
import { advertisementsService } from '../services/advertisements.service';
import { SERVE_QUERY_CACHE } from '../queries/use-serve-ads';
import { gradientFor } from '../utils/ad-gradient';
import { resolvePauseLayout, type PauseLayout } from '../utils/pause-layout';
import { useIsPhone } from '../hooks/use-is-phone';

// Mostrar o anúncio só depois de uma pausa "de verdade": uma pausa de um
// segundo para ler o chat não deve virar impressão cobrada do anunciante.
const SHOW_DELAY_MS = 2000;

const PLACEMENT = 'PLAYER_PAUSE';

interface Props {
  eventId: string;
  paused: boolean;
  onResume: () => void;
  // `layout` diz ao player como compor a tela: card encolhido (STANDARD) ou só o criativo (FULLSCREEN).
  onVisibleChange: (visible: boolean, layout: PauseLayout) => void;
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
  onVisibleChange: (visible: boolean, layout: PauseLayout) => void;
}

function TakeoverAd({ eventId, onResume, onVisibleChange }: TakeoverAdProps) {
  const t = useTranslations('ads');
  const impressionFired = useRef(false);
  const [imageFailed, setImageFailed] = useState(false);

  const { data: ads } = useQuery({
    queryKey: ['ads', 'serve', PLACEMENT, eventId],
    queryFn: () => advertisementsService.serve(PLACEMENT, 1, eventId),
    ...SERVE_QUERY_CACHE,
    retry: 0,
  });

  const ad = ads?.[0] ?? null;
  const isPhone = useIsPhone();
  const layout = resolvePauseLayout(ad?.pauseVariant, isPhone);

  // A impressão é cobrada: só conta quando o criativo realmente apareceu.
  // Com imagem, isso é o onLoad; sem imagem (gradiente), já está na tela.
  const recordImpressionOnce = useCallback(() => {
    if (!ad || impressionFired.current) return;
    impressionFired.current = true;
    advertisementsService.recordImpression(ad.servedId);
  }, [ad]);

  const hasImage = Boolean(ad?.bannerUrl) && !imageFailed;

  useEffect(() => {
    if (ad && !ad.bannerUrl) recordImpressionOnce();
  }, [ad, recordImpressionOnce]);

  // Shrink the video / hide the header only while a real ad is on screen —
  // an empty serve or a failed request must not touch the layout. Cleanup
  // fires false on resume/unmount so the player can never get stuck shrunk.
  const onVisibleChangeRef = useRef(onVisibleChange);
  useEffect(() => {
    onVisibleChangeRef.current = onVisibleChange;
  });
  useEffect(() => {
    onVisibleChangeRef.current(Boolean(ad), layout);
    return () => onVisibleChangeRef.current(false, layout);
  }, [ad, layout]);

  if (!ad) return null;


  function handleCtaClick() {
    advertisementsService.recordClick(ad!.servedId);
  }

  let cta: React.ReactNode = null;
  if (ad.destination?.type === 'EVENT') {
    cta = (
      <Link href={`/events/${ad.destination.eventId}`} className={styles.cta} onClick={handleCtaClick}>
        {t('learnMore')} →
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
        {t('learnMore')} →
      </a>
    );
  }

  return (
    <div
      className={`${styles.takeover} ${layout === 'FULLSCREEN' ? styles.fullscreen : ''}`}
      data-layout={layout}
      style={hasImage ? undefined : { background: gradientFor(ad.adId) }}
    >
      {hasImage && (
        // eslint-disable-next-line @next/next/no-img-element -- criativo externo, precisamos do onLoad para cobrar a impressão
        <img
          className={styles.media}
          src={ad.bannerUrl!}
          alt=""
          onLoad={recordImpressionOnce}
          onError={() => setImageFailed(true)}
        />
      )}
      <div className={styles.scrim} />
      <span className={styles.sponsored}>{t('sponsored')}</span>
      <div className={styles.copy}>
        <p className={styles.title}>{ad.title}</p>
        <div className={styles.actions}>
          {cta}
          <button type="button" className={styles.closeBtn} onClick={onResume}>
            {t('close')}
          </button>
        </div>
      </div>
    </div>
  );
}
