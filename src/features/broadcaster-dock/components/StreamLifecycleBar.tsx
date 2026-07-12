// src/features/broadcaster-dock/components/StreamLifecycleBar.tsx
'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { STATUS_LABEL } from '@/features/streams/components/StreamCard';
import {
  usePrepareStreamMutation,
  useStartStreamMutation,
  useEndStreamMutation,
  useCancelStreamMutation,
  useRollbackStreamMutation,
} from '@/features/streams/mutations/stream.mutations';
import { useStreamCamerasQuery } from '@/features/streams/queries/streams.queries';
import type { StreamResponse } from '@/features/streams/types/stream.types';
import { startAllCameras, stopAllCameras, type OrchestrationResult } from '../lib/stream-camera-orchestration';
import type { CallVendorRequest } from '../lib/camera-transmission';

interface StreamLifecycleBarProps {
  stream: StreamResponse;
  eventId: string;
  obsConnected: boolean;
  callVendorRequest: CallVendorRequest;
}

const STATUS_BADGE_VARIANT: Record<StreamResponse['status'], 'secondary' | 'destructive' | 'outline'> = {
  DRAFT: 'secondary',
  READY: 'secondary',
  LIVE: 'destructive',
  ENDED: 'outline',
  CANCELLED: 'outline',
};

function summarize(result: OrchestrationResult): string {
  const parts = [`${result.succeeded.length} câmera(s) ok`];
  if (result.failed.length) parts.push(`${result.failed.length} falharam`);
  if (result.skipped.length) parts.push(`${result.skipped.length} não configurada(s)`);
  return parts.join(', ');
}

export function StreamLifecycleBar({ stream, eventId, obsConnected, callVendorRequest }: StreamLifecycleBarProps) {
  const queryClient = useQueryClient();
  const { cameras, isLoading: camerasLoading } = useStreamCamerasQuery(stream.id);

  const prepare = usePrepareStreamMutation(stream.id, eventId);
  const start = useStartStreamMutation(stream.id, eventId);
  const end = useEndStreamMutation(stream.id, eventId);
  const cancel = useCancelStreamMutation(stream.id, eventId);
  const rollback = useRollbackStreamMutation(stream.id, eventId);

  const [orchestrating, setOrchestrating] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);

  async function handleStart() {
    setSummary(null);
    try {
      await start.mutateAsync();
    } catch {
      return; // start.error now holds it, rendered below
    }
    setOrchestrating(true);
    const result = await startAllCameras(cameras, callVendorRequest, queryClient);
    setOrchestrating(false);
    setSummary(summarize(result));
  }

  async function handleEnd() {
    setSummary(null);
    setOrchestrating(true);
    try {
      const result = await stopAllCameras(cameras, callVendorRequest, queryClient);
      setSummary(summarize(result));
      // Camera-stop failures never block ending the Stream itself — same
      // acceptance as an obs-websocket disconnect mid-transmission (D4 Phase 3).
      await end.mutateAsync().catch(() => {});
    } finally {
      setOrchestrating(false);
    }
  }

  async function handleRollback() {
    setSummary(null);
    setOrchestrating(true);
    try {
      const result = await stopAllCameras(cameras, callVendorRequest, queryClient);
      setSummary(summarize(result));
      await rollback.mutateAsync().catch(() => {});
    } finally {
      setOrchestrating(false);
    }
  }

  const disabled = !obsConnected || orchestrating;
  const lifecycleError = (prepare.error ?? start.error ?? end.error ?? cancel.error ?? rollback.error)?.message ?? null;

  return (
    <div className="flex flex-col gap-2 border-b p-3">
      <div className="flex items-center gap-2">
        <Badge variant={STATUS_BADGE_VARIANT[stream.status]}>{STATUS_LABEL[stream.status]}</Badge>
        <span className="truncate text-sm font-medium">{stream.title}</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {stream.status === 'DRAFT' && (
          <Button size="sm" variant="outline" onClick={() => prepare.mutate()} disabled={disabled || prepare.isPending}>
            {prepare.isPending ? 'Preparando...' : 'Preparar'}
          </Button>
        )}
        {stream.status === 'READY' && (
          <Button size="sm" onClick={handleStart} disabled={disabled || start.isPending || camerasLoading}>
            {start.isPending || orchestrating ? 'Iniciando...' : 'Iniciar transmissão'}
          </Button>
        )}
        {stream.status === 'LIVE' && (
          <>
            <Button size="sm" variant="destructive" onClick={handleEnd} disabled={disabled || end.isPending}>
              {end.isPending || orchestrating ? 'Encerrando...' : 'Encerrar transmissão'}
            </Button>
            <Button size="sm" variant="outline" onClick={handleRollback} disabled={disabled || rollback.isPending}>
              {rollback.isPending || orchestrating ? 'Pausando...' : 'Pausar'}
            </Button>
          </>
        )}
        {(stream.status === 'DRAFT' || stream.status === 'READY') && (
          <Button size="sm" variant="ghost" onClick={() => cancel.mutate()} disabled={disabled || cancel.isPending}>
            {cancel.isPending ? 'Cancelando...' : 'Cancelar'}
          </Button>
        )}
      </div>
      {summary && <p className="text-xs text-muted-foreground">{summary}</p>}
      {lifecycleError && <p className="text-xs text-destructive">{lifecycleError}</p>}
    </div>
  );
}
