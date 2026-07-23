'use client';

import { Radio } from 'lucide-react';
import { useViewerCount } from '@/features/streaming';
import { useOnAirCamera, useIngestPreviewCamera, useCameraPreviewQuery } from '../queries/ingest.queries';
import { HlsVideo } from './HlsVideo';
import type { StreamResponse } from '../types/stream.types';
import styles from './StreamPreviewPanel.module.scss';

interface Props {
  stream: StreamResponse;
  eventId: string;
  eventTitle?: string;
}

// Monitor panel — real-time thumbnail + info. LIVE plays the on-air origin
// package; READY plays the raw MediaMTX ingest of the primary camera receiving
// signal, so producers can frame cameras before going live. Hidden otherwise.
export function StreamPreviewPanel({ stream, eventId, eventTitle }: Props) {
  const isLive = stream.status === 'LIVE';
  const isReady = stream.status === 'READY';

  const { onAir } = useOnAirCamera(stream.id, isLive);
  const { currentViewers } = useViewerCount(isLive ? eventId : undefined);

  const previewCam = useIngestPreviewCamera(stream.id, isReady);
  const { data: ingestPreview } = useCameraPreviewQuery(previewCam?.cameraId ?? '', !!previewCam);

  if (!isLive && !isReady) return null;

  return (
    <div className={styles.panel}>
      <div className={styles.grid}>
        <div className={styles.thumb}>
          {isLive ? (
            onAir ? (
              <HlsVideo packageId={onAir.packageId} className={styles.video} />
            ) : (
              <div className={styles.noSignal}><Radio size={18} />Nenhuma câmera no ar</div>
            )
          ) : ingestPreview ? (
            <HlsVideo src={ingestPreview.llPath} className={styles.video} />
          ) : (
            <div className={styles.noSignal}>
              <Radio size={18} />
              {previewCam ? 'Carregando pré-visualização...' : 'Aguardando sinal da câmera'}
            </div>
          )}

          {isLive ? (
            <div className={styles.liveBadge}><span className={styles.dot} />AO VIVO</div>
          ) : (
            <div className={styles.previewBadge}>PRÉ-VISUALIZAÇÃO</div>
          )}

          {isLive && onAir && (
            <div className={styles.pgmBadge}>PGM · {onAir.stageName.toUpperCase()}</div>
          )}
          {isReady && previewCam && (
            <div className={styles.pgmBadge}>{previewCam.stageName.toUpperCase()} · {previewCam.cameraName.toUpperCase()}</div>
          )}
        </div>

        <div className={styles.info}>
          <div className={styles.eyebrow}>
            <span className={styles.dot} />
            {isLive ? 'NO AR' : 'PRONTO'}
          </div>
          <h2 className={styles.title}>{stream.title}</h2>
          {eventTitle && <div className={styles.subtitle}>{eventTitle} · stream principal</div>}

          {isLive && (
            <div className={styles.stat}>
              <span className={styles.statLabel}>Espectadores</span>
              <span className={styles.statValue}>{currentViewers.toLocaleString('pt-BR')}</span>
            </div>
          )}
          {isReady && (
            <div className={styles.stat}>
              <span className={styles.statLabel}>Sinal</span>
              <span className={styles.statValue}>{previewCam ? 'Recebendo' : 'Aguardando'}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
