'use client';

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { useTranslations } from 'next-intl';
import type { CSSProperties } from 'react';
import { advertisementsService } from '../services/advertisements.service';
import { useIsPhone } from '../hooks/use-is-phone';
import { useOverlayAdSchedule } from '../hooks/use-overlay-ad-schedule';
import { resolveOverlayPlacement } from '../utils/overlay-placement';
import type { ServedAd } from '../types/advertisement.types';
import styles from './OverlayAd.module.scss';

const FIRST_PAINT_MS = 50; // deixa o estado "fora" ser pintado antes da transição de entrada
const ENTER_MS = 450;
const EXIT_MS = 350;
const TICK_MS = 100;
// A impressão é cobrada: só conta com a logo inteira na tela por 2 s.
const IMPRESSION_MS = 2000;

export interface OverlayAdContext {
  chatOpen: boolean;
  chaptersOpen: boolean;
  cameraDrawerOpen: boolean;
  hasLibras: boolean;
  hasPip: boolean;
  fullscreen: boolean;
  paused: boolean;
  pauseAdVisible: boolean;
  // Transmissão fora do ar: não há o que patrocinar.
  offline: boolean;
}

interface Props {
  eventId: string;
  // false = anúncios desligados (ou preview da página do evento): nem pergunta.
  enabled?: boolean;
  context: OverlayAdContext;
}

function subscribeMedia(query: string) {
  return (onChange: () => void) => {
    const media = window.matchMedia?.(query);
    media?.addEventListener('change', onChange);
    return () => media?.removeEventListener('change', onChange);
  };
}
const REDUCED_MOTION = '(prefers-reduced-motion: reduce)';
const subscribeReducedMotion = subscribeMedia(REDUCED_MOTION);
const reducedMotionNow = () => window.matchMedia?.(REDUCED_MOTION).matches ?? false;

function subscribeVisibility(onChange: () => void) {
  document.addEventListener('visibilitychange', onChange);
  return () => document.removeEventListener('visibilitychange', onChange);
}
const tabVisibleNow = () => document.visibilityState !== 'hidden';

export function OverlayAd({ eventId, enabled = true, context }: Props) {
  const { ad, dismiss } = useOverlayAdSchedule(eventId, { enabled: enabled && !context.offline });
  if (!ad?.overlay || !ad.bannerUrl) return null;
  return <OverlayCreative key={ad.servedId} ad={ad} context={context} onDone={dismiss} />;
}

type Phase = 'off' | 'in' | 'hold' | 'out';

function OverlayCreative({ ad, context, onDone }: { ad: ServedAd; context: OverlayAdContext; onDone: () => void }) {
  const t = useTranslations('ads');
  const isPhone = useIsPhone();
  const reducedMotion = useSyncExternalStore(subscribeReducedMotion, reducedMotionNow, () => false);
  const tabVisible = useSyncExternalStore(subscribeVisibility, tabVisibleNow, () => true);
  const spec = ad.overlay!;

  const placement = resolveOverlayPlacement({
    position: spec.position,
    isPhone,
    chatOpen: context.chatOpen,
    chaptersOpen: context.chaptersOpen,
    cameraDrawerOpen: context.cameraDrawerOpen,
    hasLibras: context.hasLibras,
    hasPip: context.hasPip,
    fullscreen: context.fullscreen,
  });
  const blocked = placement.hidden || context.paused || context.pauseAdVisible || context.offline;

  const [phase, setPhase] = useState<Phase>('off');
  const heldMs = useRef(0);
  const seenMs = useRef(0);
  const impressionFired = useRef(false);
  const completeFired = useRef(false);

  // Some na hora e recomeça a contagem dos 2 s: a impressão é de logo inteira
  // e contínua. O tempo de permanência já cumprido é mantido.
  useEffect(() => {
    if (!blocked) return;
    setPhase('off');
    seenMs.current = 0;
  }, [blocked]);

  useEffect(() => {
    if (blocked) return;
    const delay = phase === 'off' ? FIRST_PAINT_MS : phase === 'in' ? ENTER_MS : phase === 'out' ? EXIT_MS : null;
    if (delay === null) return;
    const timer = setTimeout(() => {
      if (phase === 'off') setPhase('in');
      else if (phase === 'in') setPhase('hold');
      else onDone();
    }, delay);
    return () => clearTimeout(timer);
  }, [phase, blocked, onDone]);

  // Relógio da permanência e da impressão: só corre com a logo parada em
  // `hold`, sem bloqueio e com a aba visível.
  useEffect(() => {
    if (phase !== 'hold' || blocked || !tabVisible) return;
    const timer = setInterval(() => {
      heldMs.current += TICK_MS;
      seenMs.current += TICK_MS;
      if (!impressionFired.current && seenMs.current >= IMPRESSION_MS) {
        impressionFired.current = true;
        advertisementsService.recordImpression(ad.servedId);
      }
      if (!completeFired.current && heldMs.current >= spec.durationSec * 1000) {
        completeFired.current = true;
        advertisementsService.recordEvent(ad.servedId, 'overlay_complete');
        setPhase('out');
      }
    }, TICK_MS);
    return () => clearInterval(timer);
  }, [phase, blocked, tabVisible, ad.servedId, spec.durationSec]);

  if (blocked) return null;

  const href = ad.destination?.type === 'EVENT' ? `/events/${ad.destination.eventId}` : ad.destination?.url;

  return (
    <div className={styles.layer}>
      <a
        className={styles.item}
        href={href}
        target="_blank"
        rel="noopener sponsored"
        aria-label={t('overlayAriaLabel', { title: ad.title })}
        data-position={placement.position}
        data-animation={reducedMotion ? 'FADE' : spec.animation}
        data-phase={phase}
        data-raised={placement.raised || undefined}
        // Logo 2:3 da Lateral realocada para Topo/Rodapé: no celular ganha altura própria.
        data-portrait={(spec.position === 'SIDE' && placement.position !== 'SIDE') || undefined}
        // Largura dos painéis à direita (chat, capítulos, câmeras): valor dinâmico.
        style={{ '--vt-inset': `${placement.insetPx}px` } as CSSProperties}
        onClick={() => {
          advertisementsService.recordClick(ad.servedId);
          onDone();
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- logo externa com canal alfa, sem otimização de imagem */}
        <img className={styles.logo} src={ad.bannerUrl!} alt="" draggable={false} />
        <span className={styles.seal}>{t('sponsored')}</span>
      </a>
    </div>
  );
}
