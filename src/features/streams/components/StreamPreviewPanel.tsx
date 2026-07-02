'use client';

import { Radio } from 'lucide-react';
import { useViewerCount } from '@/features/streaming';
import { useOnAirCamera } from '../queries/ingest.queries';
import { HlsVideo } from './HlsVideo';
import type { StreamResponse } from '../types/stream.types';
import styles from './StreamPreviewPanel.module.scss';

interface Props {
  stream: StreamResponse;
  eventId: string;
  eventTitle?: string;
}

// Live monitoring panel — real-time thumbnail + info for a LIVE stream.
// Only renders fields backed by real data: on-air camera preview (HlsVideo,
// playing live, no click-to-open) and viewer count (useViewerCount, already
// powers LivePlayer's badge). No invented uptime/server/bitrate numbers —
// StreamHeader above already owns the Pausar/Encerrar lifecycle actions, so
// this panel doesn't duplicate them.
export function StreamPreviewPanel({ stream, eventId, eventTitle }: Props) {
  const isLive = stream.status === 'LIVE';
  const { onAir } = useOnAirCamera(stream.id, isLive);
  const { currentViewers } = useViewerCount(isLive ? eventId : undefined);

  if (!isLive) return null;

  return (
    <div className={styles.panel}>
      <div className={styles.grid}>
        <div className={styles.thumb}>
          {onAir ? (
            <HlsVideo packageId={onAir.packageId} className={styles.video} />
          ) : (
            <div className={styles.noSignal}>
              <Radio size={18} />
              Nenhuma câmera no ar
            </div>
          )}

          <div className={styles.liveBadge}>
            <span className={styles.dot} />
            AO VIVO
          </div>
          {onAir && (
            <div className={styles.pgmBadge}>
              PGM · {onAir.stageName.toUpperCase()}
            </div>
          )}
        </div>

        <div className={styles.info}>
          <div className={styles.eyebrow}>
            <span className={styles.dot} />
            NO AR
          </div>
          <h2 className={styles.title}>{stream.title}</h2>
          {eventTitle && (
            <div className={styles.subtitle}>{eventTitle} · stream principal</div>
          )}

          <div className={styles.stat}>
            <span className={styles.statLabel}>Espectadores</span>
            <span className={styles.statValue}>{currentViewers.toLocaleString('pt-BR')}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
