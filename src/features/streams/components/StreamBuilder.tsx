'use client';

import {
  usePrepareStreamMutation,
  useStartStreamMutation,
  useEndStreamMutation,
  useCancelStreamMutation,
} from '../mutations/stream.mutations';
import type { StreamResponse } from '../types/stream.types';
import { StreamHeader } from './StreamHeader';
import { StageList } from './StageList';
import styles from './StreamBuilder.module.scss';

interface Props {
  stream: StreamResponse;
  eventId: string;
  onStreamUpdated?: (s: StreamResponse) => void;
}

export function StreamBuilder({ stream, eventId, onStreamUpdated }: Props) {
  const prepare = usePrepareStreamMutation(stream.id, eventId);
  const start = useStartStreamMutation(stream.id, eventId);
  const end = useEndStreamMutation(stream.id, eventId);
  const cancel = useCancelStreamMutation(stream.id, eventId);

  function makeAction(mut: typeof prepare) {
    return {
      onClick: () => mut.mutate(undefined, { onSuccess: onStreamUpdated }),
      isPending: mut.isPending,
    };
  }

  return (
    <div className={styles.builder}>
      <StreamHeader
        stream={stream}
        prepare={makeAction(prepare)}
        start={makeAction(start)}
        end={makeAction(end)}
        cancel={makeAction(cancel)}
      />
      <StageList streamId={stream.id} streamStatus={stream.status} />
    </div>
  );
}
