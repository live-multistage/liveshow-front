'use client';

import Link from 'next/link';
import { useLiveAccessQuery, useLivePlaybackQuery } from '../queries/live.queries';
import { LiveStreamPlayer } from './LiveStreamPlayer';

interface Props {
  eventId: string;
  eventTitle: string;
}

// Drives the viewer experience: entitlement → live readiness → player.
export function LiveGate({ eventId, eventTitle }: Props) {
  const access = useLiveAccessQuery(eventId);
  const authorized = access.data === true;
  const playback = useLivePlaybackQuery(eventId, authorized);

  if (access.isLoading) {
    return <p style={{ padding: 40, textAlign: 'center' }}>Verificando acesso…</p>;
  }

  if (!authorized) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <h2>Acesso necessário</h2>
        <p>Você precisa de um ingresso para assistir <strong>{eventTitle}</strong> ao vivo.</p>
        <Link href={`/events/${eventId}`}>Ver ingressos</Link>
      </div>
    );
  }

  if (playback.isLoading) {
    return <p style={{ padding: 40, textAlign: 'center' }}>Carregando transmissão…</p>;
  }

  if (!playback.data?.live || playback.data.cameras.length === 0) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <h2>{eventTitle}</h2>
        <p>A transmissão ainda não começou. Esta página atualiza sozinha quando o evento entrar ao ar.</p>
      </div>
    );
  }

  return (
    <LiveStreamPlayer
      cameras={playback.data.cameras}
      initialCameraId={playback.data.primaryCameraId ?? playback.data.cameras[0].cameraId}
    />
  );
}
