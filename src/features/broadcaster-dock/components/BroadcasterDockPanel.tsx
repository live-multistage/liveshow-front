'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/features/account/hooks/use-auth';
import { useObsWebsocket } from '../hooks/use-obs-websocket';
import { DockLoginScreen } from './DockLoginScreen';
import { EventStreamPicker, type ActiveStreamSelection } from './EventStreamPicker';
import { ActiveStreamConfirmation } from './ActiveStreamConfirmation';

const ALLOWED_ROLES = ['ORGANIZER', 'ADMIN'];

export function BroadcasterDockPanel() {
  const { status, errorMessage, callVendorRequest } = useObsWebsocket();
  const { user, isLoggedIn, isLoading: authLoading } = useAuth();
  const [activeStream, setActiveStream] = useState<ActiveStreamSelection | null>(null);
  const [contextLoaded, setContextLoaded] = useState(false);

  const canBroadcast = isLoggedIn && !!user && ALLOWED_ROLES.includes(user.role);

  useEffect(() => {
    if (status !== 'connected' || !canBroadcast || contextLoaded) return;

    let cancelled = false;
    callVendorRequest('GetActiveStream')
      .then((data) => {
        if (cancelled) return;
        if (typeof data.eventId === 'string' && typeof data.streamId === 'string') {
          setActiveStream({ eventId: data.eventId, streamId: data.streamId });
        }
        setContextLoaded(true);
      })
      .catch(() => {
        if (!cancelled) setContextLoaded(true);
      });

    return () => {
      cancelled = true;
    };
  }, [status, canBroadcast, contextLoaded, callVendorRequest]);

  if (status === 'waiting-credentials') {
    return <p>Aguardando credenciais do OBS...</p>;
  }
  if (status === 'connecting') {
    return <p>Conectando ao OBS...</p>;
  }
  if (status === 'error') {
    return <p>{errorMessage}</p>;
  }

  if (authLoading) {
    return <p>Carregando sessão...</p>;
  }

  if (!isLoggedIn || !user) {
    return <DockLoginScreen />;
  }

  if (!canBroadcast) {
    return <p>Esta conta não pode transmitir.</p>;
  }

  if (!contextLoaded) {
    return <p>Carregando contexto...</p>;
  }

  if (!activeStream) {
    return <EventStreamPicker callVendorRequest={callVendorRequest} onSelected={setActiveStream} />;
  }

  return <ActiveStreamConfirmation eventId={activeStream.eventId} streamId={activeStream.streamId} />;
}
