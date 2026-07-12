'use client';

import { useState } from 'react';
import { ChevronRight, Plus, Trash2 } from 'lucide-react';
import { useStageFeedsQuery } from '@/features/streams/queries/streams.queries';
import { useCreateFeedMutation, useDeleteFeedMutation } from '@/features/streams/mutations/feed.mutations';
import type { StageResponse } from '@/features/streams/types/stream.types';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Card } from '@/shared/components/ui/card';
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
        <Plus className="h-4 w-4" />
        {placeholder}
      </Button>
    );
  }

  return (
    <div className="flex flex-col gap-1">
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
      {error && <p className="text-xs text-destructive">{error}</p>}
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
              callVendorRequest={callVendorRequest}
            />
          ))}
          {canCreate && (
            <div className="pl-6">
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
