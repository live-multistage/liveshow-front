'use client';

import { useState } from 'react';
import { Video, Play, HandMetal } from 'lucide-react';
import { useFeedCamerasQuery } from '../queries/streams.queries';
import { useFeedIngestQuery, useActiveTranscodeJobQuery, useCameraPreviewQuery } from '../queries/ingest.queries';
import { useCreateCameraMutation, useToggleCameraMutation } from '../mutations/camera.mutations';
import { useAccessibilityQuery, useSetLibrasCameraMutation } from '@/features/events/queries/get-accessibility';
import type { CameraResponse, FeedResponse } from '../types/stream.types';
import { InlineAddForm } from './InlineAddForm';
import { IngestCredentials } from './IngestCredentials';
import { SignalBadge } from './SignalBadge';
import { HlsPreview } from './HlsPreview';
import styles from './StreamBuilder.module.scss';

interface Props {
  feed: FeedResponse;
  streamStatus: string;
  eventId: string;
}

// One camera row: name + priority + signal/transcode badges + live preview +
// OBS credentials + enable/disable (allowed live).
function CameraRow({
  cam, feedId, eventId, isLiveStream, canMonitor, publiclyFunded, isLibras, onPreview,
}: {
  cam: CameraResponse;
  feedId: string;
  eventId: string;
  isLiveStream: boolean;
  // READY or LIVE — the states where MediaMTX will serve the ingest.
  canMonitor: boolean;
  publiclyFunded: boolean;
  isLibras: boolean;
  onPreview: (packageId: string) => void;
}) {
  const toggleCamera = useToggleCameraMutation(feedId);
  const setLibras = useSetLibrasCameraMutation(eventId);
  const { data: ingest } = useFeedIngestQuery(feedId, canMonitor);
  const { data: job } = useActiveTranscodeJobQuery(cam.id, isLiveStream);
  const [ingestPreviewOpen, setIngestPreviewOpen] = useState(false);
  const { data: ingestPreview } = useCameraPreviewQuery(cam.id, ingestPreviewOpen);

  const live = ingest?.cameras.find((c) => c.id === cam.id)?.live ?? false;

  return (
    <div className={styles.camera}>
      <div className={styles.cameraTop}>
        <span className={`${styles.cameraDot} ${cam.enabled ? styles.enabled : ''}`} />
        <span className={styles.cameraName}>{cam.name}</span>
        <span className={styles.cameraPriority}>p:{cam.priority}</span>
        {canMonitor && <SignalBadge live={live} jobStatus={job?.status} />}

        {isLiveStream && job?.status === 'RUNNING' && (
          <button
            className={styles.iconBtn}
            onClick={() => onPreview(job.packageId)}
            title="Pré-visualizar"
          >
            <Play size={12} />
          </button>
        )}
        {/* Pre-live monitor: preview the raw OBS ingest straight from MediaMTX
            once the camera is receiving signal, before the stream goes live. */}
        {!isLiveStream && canMonitor && live && (
          <button
            className={styles.iconBtn}
            onClick={() => setIngestPreviewOpen(true)}
            title="Pré-visualizar sinal"
          >
            <Play size={12} />
          </button>
        )}
        {/* NBR 15290 — mark this camera as the mandatory Janela de Libras.
            Only relevant on publicly-funded events. */}
        {publiclyFunded && (
          <button
            className={`${styles.iconBtn} ${isLibras ? styles.success : ''}`}
            onClick={() => !isLibras && setLibras.mutate(cam.id)}
            disabled={setLibras.isPending}
            title={isLibras ? 'Janela de Libras (marcada)' : 'Marcar como Janela de Libras'}
            aria-pressed={isLibras}
          >
            <HandMetal size={12} />
          </button>
        )}
        <button
          className={`${styles.iconBtn} ${cam.enabled ? styles.success : ''}`}
          onClick={() => toggleCamera.mutate({ cameraId: cam.id, enabled: !cam.enabled })}
          title={cam.enabled ? 'Desativar' : 'Ativar'}
        >
          <Video size={12} />
        </button>
      </div>
      <IngestCredentials cameraId={cam.id} />
      {ingestPreviewOpen && ingestPreview && (
        <HlsPreview src={ingestPreview.llPath} onClose={() => setIngestPreviewOpen(false)} />
      )}
    </div>
  );
}

export function FeedBody({ feed, streamStatus, eventId }: Props) {
  const { data: cameras = [], isLoading } = useFeedCamerasQuery(feed.id);
  const { data: accessibility } = useAccessibilityQuery(eventId);
  const createCamera = useCreateCameraMutation(feed.id);
  const isLive = streamStatus === 'LIVE';
  // READY or LIVE: MediaMTX accepts the OBS push and serves the ingest, so the
  // signal badge + pre-live preview can work.
  const canMonitor = isLive || streamStatus === 'READY';
  const isTerminal = streamStatus === 'ENDED' || streamStatus === 'CANCELLED';
  const canAddCamera = !isTerminal;
  const [previewPkg, setPreviewPkg] = useState<string | null>(null);

  return (
    <div className={styles.feedBody}>
      {isLoading && <p className={styles.loading}>Carregando...</p>}
      {cameras.length === 0 && !isLoading && (
        <p className={styles.emptyHint}>Nenhuma câmera</p>
      )}
      {cameras.map((cam) => (
        <CameraRow
          key={cam.id}
          cam={cam}
          feedId={feed.id}
          eventId={eventId}
          isLiveStream={isLive}
          canMonitor={canMonitor}
          publiclyFunded={!!accessibility?.publiclyFunded}
          isLibras={accessibility?.librasCameraId === cam.id}
          onPreview={setPreviewPkg}
        />
      ))}
      {canAddCamera && (
        <InlineAddForm
          buttonLabel="Câmera"
          placeholder="Nome da câmera"
          isPending={createCamera.isPending}
          withPriority
          onAdd={(name, priority) => createCamera.mutate({ name, priority: priority ?? 1 })}
        />
      )}
      {previewPkg && <HlsPreview packageId={previewPkg} onClose={() => setPreviewPkg(null)} />}
    </div>
  );
}
