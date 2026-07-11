'use client';

import { Plus } from 'lucide-react';
import { useStreamStagesQuery } from '@/features/streams/queries/streams.queries';
import { useCreateStageMutation, useDeleteStageMutation } from '@/features/streams/mutations/stage.mutations';
import type { StreamStatus } from '@/features/streams/types/stream.types';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { StageRow } from './StageRow';
import { useState } from 'react';

interface StageFeedManagerProps {
  streamId: string;
  streamStatus: StreamStatus;
  onContinue: () => void;
}

export function StageFeedManager({ streamId, streamStatus, onContinue }: StageFeedManagerProps) {
  const stagesQuery = useStreamStagesQuery(streamId);
  const createStage = useCreateStageMutation(streamId);
  const deleteStage = useDeleteStageMutation(streamId);
  const [creatingOpen, setCreatingOpen] = useState(false);
  const [newStageName, setNewStageName] = useState('');

  const canCreate = streamStatus !== 'ENDED' && streamStatus !== 'CANCELLED';
  const canDelete = streamStatus !== 'LIVE' && canCreate;

  function submitNewStage() {
    if (!newStageName.trim()) return;
    createStage.mutate({ name: newStageName.trim() });
    setNewStageName('');
    setCreatingOpen(false);
  }

  return (
    <div className="flex flex-col gap-2 p-4">
      <h2 className="text-sm font-semibold">Palcos e feeds</h2>
      {stagesQuery.isLoading && <p className="text-sm text-muted-foreground">Carregando...</p>}
      {!stagesQuery.isLoading && !stagesQuery.data?.length && (
        <p className="text-sm text-muted-foreground">Nenhum palco ainda</p>
      )}
      {stagesQuery.data?.map((stage) => (
        <StageRow
          key={stage.id}
          stage={stage}
          canCreate={canCreate}
          canDelete={canDelete}
          onDeleteStage={(id) => deleteStage.mutate(id)}
        />
      ))}
      {canCreate && !creatingOpen && (
        <Button variant="ghost" size="sm" onClick={() => setCreatingOpen(true)}>
          <Plus className="h-4 w-4" />
          Palco
        </Button>
      )}
      {canCreate && creatingOpen && (
        <div className="flex items-center gap-2">
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
      )}
      <Button className="mt-2" onClick={onContinue}>
        Continuar
      </Button>
    </div>
  );
}
