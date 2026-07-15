'use client';

import { useState } from 'react';
import { ChevronRight, Trash2 } from 'lucide-react';
import { useFeedCamerasQuery } from '@/features/streams/queries/streams.queries';
import { streamsService } from '@/features/streams/services/streams.service';
import styles from './Dock.module.scss';
import { CameraRow } from './CameraRow';
import { CameraCreateForm } from './CameraCreateForm';

type CallVendorRequest = (requestType: string, requestData?: Record<string, unknown>) => Promise<Record<string, unknown>>;

interface FeedRowProps {
  feedId: string;
  feedName: string;
  canDelete: boolean;
  onDelete: (id: string) => void;
  callVendorRequest: CallVendorRequest;
}

export function FeedRow({ feedId, feedName, canDelete, onDelete, callVendorRequest }: FeedRowProps) {
  const [expanded, setExpanded] = useState(false);
  const camerasQuery = useFeedCamerasQuery(expanded ? feedId : null);

  async function handleDeleteFeed() {
    try {
      const cameras = await streamsService.listCameras(feedId);
      await Promise.allSettled(
        cameras.map((camera) => callVendorRequest('RemoveCameraCanvas', { cameraId: camera.id })),
      );
    } catch {
      // best-effort cleanup only — a failure here should never block deleting the feed itself
    }
    onDelete(feedId);
  }

  return (
    <div className={styles.nestedRow}>
      <div className={styles.rowBetween}>
        <button
          type="button"
          className={styles.expandBtn}
          onClick={() => setExpanded((v) => !v)}
        >
          <ChevronRight className={`${styles.chevron} ${expanded ? styles.chevronOpen : ''}`} />
          <span className={styles.truncate}>{feedName}</span>
        </button>
        {canDelete && (
          <button
            type="button"
            onClick={handleDeleteFeed}
            className={styles.deleteBtn}
          >
            <Trash2 className={styles.icon} />
          </button>
        )}
      </div>
      {expanded && (
        <div className={styles.stackTight}>
          {camerasQuery.isLoading && <p className={`${styles.muted} ${styles.indent}`}>Carregando...</p>}
          {!camerasQuery.isLoading && !camerasQuery.data?.length && (
            <p className={`${styles.muted} ${styles.indent}`}>Nenhuma câmera ainda</p>
          )}
          {camerasQuery.data?.map((camera) => (
            <CameraRow
              key={camera.id}
              cameraId={camera.id}
              cameraName={camera.name}
              callVendorRequest={callVendorRequest}
            />
          ))}
          <div className={styles.indent}>
            <CameraCreateForm feedId={feedId} callVendorRequest={callVendorRequest} />
          </div>
        </div>
      )}
    </div>
  );
}
