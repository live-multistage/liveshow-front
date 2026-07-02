'use client';

import { useState } from 'react';
import { ChevronRight, Layers, Trash2 } from 'lucide-react';
import { useStageFeedsQuery } from '../queries/streams.queries';
import { useCreateFeedMutation, useDeleteFeedMutation } from '../mutations/feed.mutations';
import type { StageResponse } from '../types/stream.types';
import { FeedBody } from './FeedBody';
import { InlineAddForm } from './InlineAddForm';
import styles from './StreamBuilder.module.scss';

interface Props {
  stage: StageResponse;
  streamStatus: string;
}

export function StageBody({ stage, streamStatus }: Props) {
  const { data: feeds = [], isLoading } = useStageFeedsQuery(stage.id);
  const createFeed = useCreateFeedMutation(stage.id);
  const deleteFeed = useDeleteFeedMutation(stage.id);
  const [expandedFeeds, setExpandedFeeds] = useState<Set<string>>(new Set());
  const isLive = streamStatus === 'LIVE';
  const isTerminal = streamStatus === 'ENDED' || streamStatus === 'CANCELLED';
  const canCreate = !isTerminal;
  const canDelete = !isLive && !isTerminal;

  function toggleFeed(id: string) {
    setExpandedFeeds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  return (
    <div className={styles.stageBody}>
      {isLoading && <p className={styles.loading}>Carregando...</p>}
      {feeds?.length === 0 && !isLoading && <p className={styles.emptyHint}>Nenhum feed</p>}
      {feeds?.map((feed) => {
        const open = expandedFeeds.has(feed.id);
        return (
          <div key={feed.id} className={styles.feed}>
            <div className={styles.feedHeader} onClick={() => toggleFeed(feed.id)}>
              <ChevronRight size={13} className={`${styles.feedChevron} ${open ? styles.open : ''}`} />
              <p className={styles.feedName}>
                <Layers size={11} style={{ marginRight: 4, opacity: 0.6 }} />
                {feed.name}
              </p>
              {canDelete && (
                <button
                  className={`${styles.iconBtn} ${styles.danger}`}
                  onClick={(e) => { e.stopPropagation(); deleteFeed.mutate(feed.id); }}
                  title="Remover feed"
                >
                  <Trash2 size={11} />
                </button>
              )}
            </div>
            {open && <FeedBody feed={feed} streamStatus={streamStatus} />}
          </div>
        );
      })}
      {canCreate && (
        <InlineAddForm
          buttonLabel="Feed"
          placeholder="Nome do feed"
          isPending={createFeed.isPending}
          onAdd={(name) => createFeed.mutate({ name })}
        />
      )}
    </div>
  );
}
