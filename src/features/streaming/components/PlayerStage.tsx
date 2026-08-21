'use client';

import type { ReactNode } from 'react';
import { Play } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { PauseAdTakeover } from '@/features/advertisements/components/PauseAdTakeover';
import { SessionWatermark } from './SessionWatermark';
import styles from './PlayerStage.module.scss';

interface PlayerStageProps {
  mode: 'live' | 'replay';
  paused: boolean;
  onResume: () => void;
  // Owned by the player (its header also hides on it); fed by
  // PauseAdTakeover's onVisibleChange, which fires false on resume/unmount
  // so this can never get stuck shrunk without an ad actually on screen.
  pauseAdVisible: boolean;
  onPauseAdVisibleChange: (visible: boolean) => void;
  // The CameraGrid (already configured by the player).
  children: ReactNode;
}

// The video stage shared by the live and replay players: the pause-ad
// takeover (video shrinks into a floating card), the session watermark, the
// big center play overlay and the "paused" chip.
//
// Sem o overlay central, uma live pausada é indistinguível de uma transmissão
// travada: a imagem congela e nada na tela explica por quê.
export function PlayerStage({ mode, paused, onResume, pauseAdVisible, onPauseAdVisibleChange, children }: PlayerStageProps) {
  const t = useTranslations('player');

  return (
    <>
      <PauseAdTakeover
        paused={paused}
        onResume={onResume}
        onVisibleChange={onPauseAdVisibleChange}
      />

      <div className={`${styles.stageArea} ${pauseAdVisible ? styles.stageAreaShrunk : ''}`}>
        {children}

        <SessionWatermark />

        {paused && (
          <button
            type="button"
            className={styles.centerPlayOverlay}
            onClick={onResume}
            aria-label={mode === 'live' ? t('resume') : t('play')}
          >
            <span className={styles.centerPlayBtn}>
              <Play size={28} fill="currentColor" />
            </span>
          </button>
        )}

        {pauseAdVisible && (
          <span className={styles.pausedChip}>
            <span className={styles.pausedDot} />
            {mode === 'live' ? t('pausedChipLive') : t('pausedChip')}
          </span>
        )}
      </div>
    </>
  );
}
