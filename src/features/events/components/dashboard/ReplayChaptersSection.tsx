'use client';

import { useTranslations } from 'next-intl';
import { useReplayChaptersEditorQuery } from '../../hooks/use-replay-chapters-editor';
import { ChaptersHeader, ChaptersSkeleton, ChaptersUnavailable } from './ChaptersShell';
import { ReplayChaptersEditor } from './ReplayChaptersEditor';
import styles from './ReplayChapters.module.scss';

interface Props {
  eventId: string;
  // Uploaded-video events have no live archive to chapter.
  isVod: boolean;
  readOnly: boolean;
}

export function ReplayChaptersSection({ eventId, isVod, readOnly }: Props) {
  return (
    <section className={styles.section}>
      {isVod ? (
        <>
          <ChaptersHeader />
          <ChaptersUnavailable kind="vod" />
        </>
      ) : (
        <LoadedChapters eventId={eventId} readOnly={readOnly} />
      )}
    </section>
  );
}

function LoadedChapters({ eventId, readOnly }: Pick<Props, 'eventId' | 'readOnly'>) {
  const t = useTranslations('replayChaptersEditor');
  const { data, isLoading, isError } = useReplayChaptersEditorQuery(eventId);

  if (isLoading) {
    return (
      <>
        <ChaptersHeader />
        <ChaptersSkeleton />
      </>
    );
  }

  if (isError || !data) {
    return (
      <>
        <ChaptersHeader />
        <p className={styles.loadError} role="alert">{t('loadError')}</p>
      </>
    );
  }

  if (!data.window) {
    return (
      <>
        <ChaptersHeader />
        <ChaptersUnavailable kind="processing" />
      </>
    );
  }

  return <ReplayChaptersEditor eventId={eventId} chapters={data.chapters} window={data.window} readOnly={readOnly} />;
}
