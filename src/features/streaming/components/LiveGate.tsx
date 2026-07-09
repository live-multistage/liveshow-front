'use client';

import { useTranslations } from 'next-intl';
import { useAuth } from '@/features/account/hooks/use-auth';
import { useLiveAccessQuery, useLivePlaybackQuery } from '../queries/live.queries';
import { LivePlayer } from './LivePlayer';
import { LiveGateLoading } from './LiveGateLoading';
import { LiveNoAccess } from './LiveNoAccess';

interface Props {
  eventId: string;
  eventTitle?: string;
  chatEnabled: boolean;
}

export function LiveGate({ eventId, eventTitle, chatEnabled }: Props) {
  const t = useTranslations('liveGate');
  const { isLoggedIn, isLoading: authLoading } = useAuth();
  const access = useLiveAccessQuery(eventId, !authLoading);
  const authorized = access.data === true;
  const playback = useLivePlaybackQuery(eventId, authorized);

  if (authLoading || access.isLoading) {
    return <LiveGateLoading message={t('checkingAccess')} />;
  }

  if (!authorized) {
    return <LiveNoAccess eventId={eventId} eventTitle={eventTitle} isLoggedIn={isLoggedIn} />;
  }

  if (playback.isLoading) {
    return <LiveGateLoading message={t('loadingStream')} eventTitle={eventTitle} />;
  }

  const hasStages = (playback.data?.stages?.length ?? 0) > 0;
  if (!playback.data?.live && !hasStages) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <h2>{eventTitle}</h2>
        <p>{t('notStarted')}</p>
      </div>
    );
  }

  return (
    <LivePlayer
      cameras={playback.data.cameras}
      stages={playback.data.stages}
      primaryCameraId={playback.data.primaryCameraId}
      title={eventTitle}
      eventId={eventId}
      chatEnabled={chatEnabled}
    />
  );
}
