'use client';

import { useState } from 'react';
import { ChevronRight, Plus, Trash2 } from 'lucide-react';
import { useStageFeedsQuery } from '@/features/streams/queries/streams.queries';
import { useCreateFeedMutation, useDeleteFeedMutation } from '@/features/streams/mutations/feed.mutations';
import type { StageResponse } from '@/features/streams/types/stream.types';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Card } from '@/shared/components/ui/card';

interface InlineCreateRowProps {
  placeholder: string;
  isPending: boolean;
  onCreate: (name: string) => void;
}

function InlineCreateRow({ placeholder, isPending, onCreate }: InlineCreateRowProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');

  function submit() {
    if (!name.trim()) return;
    onCreate(name.trim());
    setName('');
    setOpen(false);
  }

  if (!open) {
    return (
      <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" />
        {placeholder}
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-2">
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
  );
}

function FeedRow({
  feedId,
  feedName,
  canDelete,
  onDelete,
}: {
  feedId: string;
  feedName: string;
  canDelete: boolean;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-2 py-1 pl-6 text-sm">
      <span className="truncate">{feedName}</span>
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
  );
}

interface StageRowProps {
  stage: StageResponse;
  canCreate: boolean;
  canDelete: boolean;
  onDeleteStage: (id: string) => void;
}

export function StageRow({ stage, canCreate, canDelete, onDeleteStage }: StageRowProps) {
  const [expanded, setExpanded] = useState(false);
  const feedsQuery = useStageFeedsQuery(expanded ? stage.id : null);
  const createFeed = useCreateFeedMutation(stage.id);
  const deleteFeed = useDeleteFeedMutation(stage.id);

  return (
    <Card className="p-3">
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          className="flex flex-1 items-center gap-2 text-left"
          onClick={() => setExpanded((v) => !v)}
        >
          <ChevronRight className={`h-4 w-4 shrink-0 transition-transform ${expanded ? 'rotate-90' : ''}`} />
          <span className="truncate text-sm font-medium">{stage.name}</span>
        </button>
        {canDelete && (
          <button
            type="button"
            onClick={() => onDeleteStage(stage.id)}
            className="text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      {expanded && (
        <div className="mt-2 flex flex-col gap-1">
          {feedsQuery.isLoading && <p className="pl-6 text-xs text-muted-foreground">Carregando...</p>}
          {!feedsQuery.isLoading && !feedsQuery.data?.length && (
            <p className="pl-6 text-xs text-muted-foreground">Nenhum feed ainda</p>
          )}
          {feedsQuery.data?.map((feed) => (
            <FeedRow
              key={feed.id}
              feedId={feed.id}
              feedName={feed.name}
              canDelete={canDelete}
              onDelete={(id) => deleteFeed.mutate(id)}
            />
          ))}
          {canCreate && (
            <div className="pl-6">
              <InlineCreateRow
                placeholder="Feed"
                isPending={createFeed.isPending}
                onCreate={(name) => createFeed.mutate({ name })}
              />
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
