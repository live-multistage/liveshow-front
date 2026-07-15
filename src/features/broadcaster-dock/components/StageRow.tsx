'use client';

import { useState } from 'react';
import { ChevronRight, Plus, Trash2 } from 'lucide-react';
import { useStageFeedsQuery } from '@/features/streams/queries/streams.queries';
import { useCreateFeedMutation, useDeleteFeedMutation } from '@/features/streams/mutations/feed.mutations';
import type { StageResponse } from '@/features/streams/types/stream.types';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Card } from '@/shared/components/ui/card';
import styles from './Dock.module.scss';
import { FeedRow } from './FeedRow';

type CallVendorRequest = (requestType: string, requestData?: Record<string, unknown>) => Promise<Record<string, unknown>>;

interface InlineCreateRowProps {
  placeholder: string;
  isPending: boolean;
  error: string | null;
  onCreate: (name: string, onSuccess: () => void) => void;
}

function InlineCreateRow({ placeholder, isPending, error, onCreate }: InlineCreateRowProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');

  function submit() {
    if (!name.trim()) return;
    onCreate(name.trim(), () => {
      setName('');
      setOpen(false);
    });
  }

  if (!open) {
    return (
      <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
        <Plus />
        {placeholder}
      </Button>
    );
  }

  return (
    <div className={styles.stackTight}>
      <div className={styles.row}>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') submit();
            if (e.key === 'Escape') setOpen(false);
          }}
          placeholder={placeholder}
          autoFocus
          disabled={isPending}
        />
        <Button size="sm" onClick={submit} disabled={isPending || !name.trim()}>
          Adicionar
        </Button>
      </div>
      {error && <p className={styles.error}>{error}</p>}
    </div>
  );
}

interface StageRowProps {
  stage: StageResponse;
  canCreate: boolean;
  canDelete: boolean;
  onDeleteStage: (id: string) => void;
  callVendorRequest: CallVendorRequest;
}

export function StageRow({ stage, canCreate, canDelete, onDeleteStage, callVendorRequest }: StageRowProps) {
  const [expanded, setExpanded] = useState(false);
  const feedsQuery = useStageFeedsQuery(expanded ? stage.id : null);
  const createFeed = useCreateFeedMutation(stage.id);
  const deleteFeed = useDeleteFeedMutation(stage.id);

  return (
    <Card className={styles.stageCard}>
      <div className={styles.rowBetween}>
        <button
          type="button"
          className={styles.expandBtn}
          onClick={() => setExpanded((v) => !v)}
        >
          <ChevronRight className={`${styles.chevron} ${expanded ? styles.chevronOpen : ''}`} />
          <span className={styles.cardTitle}>{stage.name}</span>
        </button>
        {canDelete && (
          <button
            type="button"
            onClick={() => onDeleteStage(stage.id)}
            className={styles.deleteBtn}
          >
            <Trash2 className={styles.icon} />
          </button>
        )}
      </div>
      {expanded && (
        <div className={`${styles.stackTight} ${styles.mtSm}`}>
          {feedsQuery.isLoading && <p className={`${styles.muted} ${styles.indent}`}>Carregando...</p>}
          {!feedsQuery.isLoading && !feedsQuery.data?.length && (
            <p className={`${styles.muted} ${styles.indent}`}>Nenhum feed ainda</p>
          )}
          {feedsQuery.data?.map((feed) => (
            <FeedRow
              key={feed.id}
              feedId={feed.id}
              feedName={feed.name}
              canDelete={canDelete}
              onDelete={(id) => deleteFeed.mutate(id)}
              callVendorRequest={callVendorRequest}
            />
          ))}
          {canCreate && (
            <div className={styles.indent}>
              <InlineCreateRow
                placeholder="Feed"
                isPending={createFeed.isPending}
                error={createFeed.error?.message ?? null}
                onCreate={(name, onSuccess) => createFeed.mutate({ name }, { onSuccess })}
              />
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
