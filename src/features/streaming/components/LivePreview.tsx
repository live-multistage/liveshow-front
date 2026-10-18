'use client';

import Link from 'next/link';
import { Maximize2, Volume2, VolumeX } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { LivePlaybackResponse } from '../types/live.types';
import { usePlayerShell } from '../hooks/use-player-shell';
import { Player } from './player';
import styles from './LivePreview.module.scss';

interface Props {
  eventId: string;
  title: string;
  playback: LivePlaybackResponse;
}

// Event-page hero: the viewer's default granted transmission, muted (browsers
// only autoplay muted), no player chrome. Same shell as the real player, so
// the transmission tier picks the same stream.
export function LivePreview({ eventId, title, playback }: Props) {
  const t = useTranslations('events.detail');
  const shell = usePlayerShell({
    cameras: playback.cameras,
    stages: playback.stages,
    primaryCameraId: playback.primaryCameraId,
    librasCameraId: playback.librasCameraId,
    streams: playback.streams,
    defaultStreamId: playback.defaultStreamId,
    initialAudio: { muted: true, volume: 1 },
    hotkeysEnabled: false,
  });
  const { globalMuted, setGlobalMuted } = shell.audio;

  return (
    <div className={styles.preview}>
      <Player.Root shell={shell} mode="live" eventId={eventId} title={title} adsEnabled={false} className={styles.root}>
        <Player.Stage />
      </Player.Root>
      <div className={styles.actions}>
        <button
          type="button"
          className={styles.soundBtn}
          aria-label={globalMuted ? t('enableSound') : t('muteSound')}
          onClick={() => setGlobalMuted(!globalMuted)}
        >
          {globalMuted ? <VolumeX size={18} aria-hidden /> : <Volume2 size={18} aria-hidden />}
        </button>
        <Link href={`/live/${eventId}`} className={styles.openBtn}>
          <Maximize2 size={15} aria-hidden />
          {t('openPlayer')}
        </Link>
      </div>
    </div>
  );
}
