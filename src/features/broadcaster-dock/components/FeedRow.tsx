'use client';

import { useState } from 'react';
import { ChevronRight, Trash2 } from 'lucide-react';
import { useFeedCamerasQuery } from '@/features/streams/queries/streams.queries';
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

  return (
    <div className="flex flex-col gap-1 py-1 pl-6">
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          className="flex flex-1 items-center gap-2 text-left text-sm"
          onClick={() => setExpanded((v) => !v)}
        >
          <ChevronRight className={`h-3.5 w-3.5 shrink-0 transition-transform ${expanded ? 'rotate-90' : ''}`} />
          <span className="truncate">{feedName}</span>
        </button>
        {canDelete && (
          <button
            type="button"
            onClick={() => onDelete(feedId)}
            className="text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      {expanded && (
        <div className="flex flex-col gap-1">
          {camerasQuery.isLoading && <p className="pl-6 text-xs text-muted-foreground">Carregando...</p>}
          {!camerasQuery.isLoading && !camerasQuery.data?.length && (
            <p className="pl-6 text-xs text-muted-foreground">Nenhuma câmera ainda</p>
          )}
          {camerasQuery.data?.map((camera) => (
            <CameraRow
              key={camera.id}
              cameraId={camera.id}
              cameraName={camera.name}
              callVendorRequest={callVendorRequest}
            />
          ))}
          <div className="pl-6">
            <CameraCreateForm feedId={feedId} callVendorRequest={callVendorRequest} />
          </div>
        </div>
      )}
    </div>
  );
}
