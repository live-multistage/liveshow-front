'use client';

import { Video } from 'lucide-react';
import { useFeedCamerasQuery } from '../queries/streams.queries';
import { useCreateCameraMutation, useToggleCameraMutation } from '../mutations/camera.mutations';
import type { FeedResponse } from '../types/stream.types';
import { InlineAddForm } from './InlineAddForm';
import styles from './StreamBuilder.module.scss';

interface Props {
  feed: FeedResponse;
  streamStatus: string;
}

export function FeedBody({ feed, streamStatus }: Props) {
  const { data: cameras = [], isLoading } = useFeedCamerasQuery(feed.id);
  const createCamera = useCreateCameraMutation(feed.id);
  const toggleCamera = useToggleCameraMutation(feed.id);
  const isLive = streamStatus === 'LIVE';

  return (
    <div className={styles.feedBody}>
      {isLoading && <p className={styles.loading}>Carregando...</p>}
      {cameras.length === 0 && !isLoading && (
        <p className={styles.emptyHint}>Nenhuma câmera</p>
      )}
      {cameras.map((cam) => (
        <div key={cam.id} className={styles.camera}>
          <span className={`${styles.cameraDot} ${cam.enabled ? styles.enabled : ''}`} />
          <span className={styles.cameraName}>{cam.name}</span>
          <span className={styles.cameraPriority}>p:{cam.priority}</span>
          {!isLive && (
            <button
              className={`${styles.iconBtn} ${cam.enabled ? styles.success : ''}`}
              onClick={() => toggleCamera.mutate({ cameraId: cam.id, enabled: !cam.enabled })}
              title={cam.enabled ? 'Desativar' : 'Ativar'}
            >
              <Video size={12} />
            </button>
          )}
        </div>
      ))}
      {!isLive && (
        <InlineAddForm
          buttonLabel="Câmera"
          placeholder="Nome da câmera"
          isPending={createCamera.isPending}
          withPriority
          onAdd={(name, priority) => createCamera.mutate({ name, priority: priority ?? 1 })}
        />
      )}
    </div>
  );
}
