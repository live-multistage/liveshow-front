'use client';

import { useState } from 'react';
import { ChevronRight, Tv, Trash2 } from 'lucide-react';
import { useStreamStagesQuery } from '../queries/streams.queries';
import { useCreateStageMutation, useDeleteStageMutation } from '../mutations/stage.mutations';
import { StageBody } from './StageBody';
import { InlineAddForm } from './InlineAddForm';
import styles from './StreamBuilder.module.scss';

interface Props {
  streamId: string;
  streamStatus: string;
}

export function StageList({ streamId, streamStatus }: Props) {
  const { data: stages = [], isLoading } = useStreamStagesQuery(streamId);
  const createStage = useCreateStageMutation(streamId);
  const deleteStage = useDeleteStageMutation(streamId);
  const [expandedStages, setExpandedStages] = useState<Set<string>>(new Set());

  const isLive = streamStatus === 'LIVE';
  const isTerminal = streamStatus === 'ENDED' || streamStatus === 'CANCELLED';
  const canEdit = !isLive && !isTerminal;

  function toggleStage(id: string) {
    setExpandedStages((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  return (
    <div className={styles.body}>
      <div className={styles.sectionHeader}>
        <span className={styles.sectionLabel}>
          <Tv size={12} style={{ marginRight: 4, verticalAlign: 'middle' }} />
          Palcos ({stages.length})
        </span>
        {canEdit && (
          <InlineAddForm
            buttonLabel="Palco"
            placeholder="Nome do palco"
            isPending={createStage.isPending}
            onAdd={(name) => createStage.mutate({ name })}
          />
        )}
      </div>

      {isLoading && <p className={styles.loading}>Carregando palcos...</p>}
      {stages.length === 0 && !isLoading && (
        <p className={styles.emptyHint}>Nenhum palco criado. Adicione um palco para começar.</p>
      )}

      {stages.map((stage) => {
        const open = expandedStages.has(stage.id);
        return (
          <div key={stage.id} className={styles.stage}>
            <div className={styles.stageHeader} onClick={() => toggleStage(stage.id)}>
              <ChevronRight size={14} className={`${styles.stageChevron} ${open ? styles.open : ''}`} />
              <p className={styles.stageName}>{stage.name}</p>
              {canEdit && (
                <button
                  className={`${styles.iconBtn} ${styles.danger}`}
                  onClick={(e) => { e.stopPropagation(); deleteStage.mutate(stage.id); }}
                  title="Remover palco"
                >
                  <Trash2 size={12} />
                </button>
              )}
            </div>
            {open && <StageBody stage={stage} streamStatus={streamStatus} />}
          </div>
        );
      })}
    </div>
  );
}
