'use client';

import { useTranslations } from 'next-intl';
import { Button, Skeleton } from '@live-show/design-system';
import { StreamBuilder, useProgramStreamsQuery, useCreateProgramStreamMutation } from '@/features/streams';
import { useProgramEpisodesQuery } from '../../queries/channel.queries';
import { useGoLiveNowMutation } from '../../mutations/channel.mutations';
import { ProgramEpisodesList } from './ProgramEpisodesList';
import styles from './ProgramTopologyTab.module.scss';

interface Props {
  channelId: string;
  slug: string;
  programId: string;
  programName: string;
}

// A program owns its own camera topology (streams -> stages -> feeds ->
// cameras), independent of any single occurrence. The stream is created
// lazily on first visit and never transitions LIVE itself — liveness belongs
// to the occurrence Event.
export function ProgramTopologyTab({ channelId, slug, programId, programName }: Props) {
  const t = useTranslations('channels.program');
  const { data: streams = [], isLoading } = useProgramStreamsQuery(programId);
  const create = useCreateProgramStreamMutation(programId);
  const { data: episodes = [] } = useProgramEpisodesQuery(channelId, programId);
  const goLiveNow = useGoLiveNowMutation(channelId);
  const hasLiveEpisode = episodes.some((episode) => episode.status === 'LIVE');

  const topology = isLoading ? (
    <Skeleton className={styles.skeleton} />
  ) : streams.length === 0 ? (
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
  ) : (
    <StreamBuilder stream={streams[0]} eventId={null} eventTitle={programName} />
  );

  return (
    <div className={styles.tabContent}>
      {topology}

      <div className={styles.goLiveRow}>
        <Button
          type="button"
          onClick={() => goLiveNow.mutate({ programId, slug })}
          disabled={hasLiveEpisode || goLiveNow.isPending}
        >
          {goLiveNow.isPending ? t('goLiveNowPending') : t('goLiveNow')}
        </Button>
      </div>

      <ProgramEpisodesList episodes={episodes} />
    </div>
  );
}
