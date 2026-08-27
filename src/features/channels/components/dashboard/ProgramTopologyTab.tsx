'use client';

import { Button, Skeleton } from '@live-show/design-system';
import { StreamBuilder, useProgramStreamsQuery, useCreateProgramStreamMutation } from '@/features/streams';
import styles from './ProgramTopologyTab.module.scss';

interface Props {
  programId: string;
  programName: string;
}

// A program owns its own camera topology (streams -> stages -> feeds ->
// cameras), independent of any single occurrence. The stream is created
// lazily on first visit and never transitions LIVE itself — liveness belongs
// to the occurrence Event.
export function ProgramTopologyTab({ programId, programName }: Props) {
  const { data: streams = [], isLoading } = useProgramStreamsQuery(programId);
  const create = useCreateProgramStreamMutation(programId);

  if (isLoading) return <Skeleton className={styles.skeleton} />;

  if (streams.length === 0) {
    return (
      <div className={styles.empty}>
        <p className={styles.emptyHint}>Nenhum estúdio configurado para este programa ainda.</p>
        <Button
          type="button"
          onClick={() => create.mutate({ title: programName })}
          disabled={create.isPending}
        >
          {create.isPending ? 'Criando...' : 'Criar estúdio'}
        </Button>
      </div>
    );
  }

  return <StreamBuilder stream={streams[0]} eventId={null} eventTitle={programName} />;
}
