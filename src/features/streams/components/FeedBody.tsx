'use client';

import { useState } from 'react';
import { Video, Play } from 'lucide-react';
import { useFeedCamerasQuery } from '../queries/streams.queries';
import { useFeedIngestQuery, useActiveTranscodeJobQuery } from '../queries/ingest.queries';
import { useCreateCameraMutation, useToggleCameraMutation } from '../mutations/camera.mutations';
import type { CameraResponse, FeedResponse } from '../types/stream.types';
import { InlineAddForm } from './InlineAddForm';
import { IngestCredentials } from './IngestCredentials';
import { SignalBadge } from './SignalBadge';
import { HlsPreview } from './HlsPreview';
import styles from './StreamBuilder.module.scss';

interface Props {
  feed: FeedResponse;
  streamStatus: string;
}

// One camera row: name + priority + signal/transcode badges + live preview +
// OBS credentials + enable/disable (allowed live).
function CameraRow({
  cam, feedId, isLiveStream, onPreview,
}: {
  cam: CameraResponse;
  feedId: string;
  isLiveStream: boolean;
  onPreview: (packageId: string) => void;
}) {
  const toggleCamera = useToggleCameraMutation(feedId);
  const { data: ingest } = useFeedIngestQuery(feedId, isLiveStream);
  const { data: job } = useActiveTranscodeJobQuery(cam.id, isLiveStream);

  const live = ingest?.cameras.find((c) => c.id === cam.id)?.live ?? false;

  return (
    <div className={styles.camera}>
      <div className={styles.cameraTop}>
        <span className={`${styles.cameraDot} ${cam.enabled ? styles.enabled : ''}`} />
        <span className={styles.cameraName}>{cam.name}</span>
        <span className={styles.cameraPriority}>p:{cam.priority}</span>
        {isLiveStream && <SignalBadge live={live} jobStatus={job?.status} />}

        {isLiveStream && job?.status === 'RUNNING' && (
          <button
            className={styles.iconBtn}
            onClick={() => onPreview(job.packageId)}
            title="Pré-visualizar"
          >
            <Play size={12} />
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
    </div>
  );
}

export function FeedBody({ feed, streamStatus }: Props) {
  const { data: cameras = [], isLoading } = useFeedCamerasQuery(feed.id);
  const createCamera = useCreateCameraMutation(feed.id);
  const isLive = streamStatus === 'LIVE';
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
          isLiveStream={isLive}
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
