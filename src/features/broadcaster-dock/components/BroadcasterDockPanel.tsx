'use client';

import { useObsWebsocket } from '../hooks/use-obs-websocket';

export function BroadcasterDockPanel() {
  const { status, errorMessage } = useObsWebsocket();

  if (status === 'waiting-credentials') {
    return <p>Aguardando credenciais do OBS...</p>;
  }
  if (status === 'connecting') {
    return <p>Conectando ao OBS...</p>;
  }
  if (status === 'error') {
    return <p>{errorMessage}</p>;
  }
  return <p>OBS conectado</p>;
}
