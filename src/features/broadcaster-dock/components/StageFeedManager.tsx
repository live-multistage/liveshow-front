'use client';

import { ChevronLeft, Plus } from 'lucide-react';
import { useStreamStagesQuery } from '@/features/streams/queries/streams.queries';
import { useCreateStageMutation, useDeleteStageMutation } from '@/features/streams/mutations/stage.mutations';
import type { StreamStatus } from '@/features/streams/types/stream.types';
import { Button, Input } from '@live-show/design-system';
import styles from './Dock.module.scss';
import { StageRow } from './StageRow';
import { useState } from 'react';

interface StageFeedManagerProps {
  streamId: string;
  streamStatus: StreamStatus;
  onContinue?: () => void;
  onBack?: () => void;
  callVendorRequest: (requestType: string, requestData?: Record<string, unknown>) => Promise<Record<string, unknown>>;
}

export function StageFeedManager({ streamId, streamStatus, onContinue, onBack, callVendorRequest }: StageFeedManagerProps) {
  const stagesQuery = useStreamStagesQuery(streamId);
  const createStage = useCreateStageMutation(streamId);
  const deleteStage = useDeleteStageMutation(streamId);
  const [creatingOpen, setCreatingOpen] = useState(false);
  const [newStageName, setNewStageName] = useState('');

  const canCreate = streamStatus !== 'ENDED' && streamStatus !== 'CANCELLED';
  const canDelete = streamStatus !== 'LIVE' && canCreate;

  function submitNewStage() {
    if (!newStageName.trim()) return;
    createStage.mutate(
      { name: newStageName.trim() },
      {
        onSuccess: () => {
          setNewStageName('');
          setCreatingOpen(false);
        },
      }
    );
  }

  return (
    <div className={styles.stack}>
      {onBack && (
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ChevronLeft />
          Voltar
        </Button>
      )}
      <h2 className={styles.heading}>Palcos e feeds</h2>
      {stagesQuery.isLoading && <p className={styles.mutedSm}>Carregando...</p>}
      {!stagesQuery.isLoading && !stagesQuery.data?.length && (
        <p className={styles.mutedSm}>Nenhum palco ainda</p>
      )}
      {stagesQuery.data?.map((stage) => (
        <StageRow
          key={stage.id}
          stage={stage}
          canCreate={canCreate}
          canDelete={canDelete}
          onDeleteStage={(id) => deleteStage.mutate(id)}
          callVendorRequest={callVendorRequest}
        />
      ))}
      {canCreate && !creatingOpen && (
        <Button variant="ghost" size="sm" onClick={() => setCreatingOpen(true)}>
          <Plus />
          Palco
        </Button>
      )}
      {canCreate && creatingOpen && (
        <div className={styles.stackTight}>
          <div className={styles.row}>
            <Input
              value={newStageName}
              onChange={(e) => setNewStageName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') submitNewStage();
                if (e.key === 'Escape') setCreatingOpen(false);
              }}
              placeholder="Nome do palco"
              autoFocus
              disabled={createStage.isPending}
            />
            <Button size="sm" onClick={submitNewStage} disabled={createStage.isPending || !newStageName.trim()}>
              Adicionar
            </Button>
          </div>
          {createStage.error?.message && (
            <p className={styles.error}>{createStage.error.message}</p>
          )}
        </div>
      )}
      {onContinue && (
        <Button className={styles.mtSm} onClick={onContinue}>
          Continuar
        </Button>
      )}
    </div>
  );
}
