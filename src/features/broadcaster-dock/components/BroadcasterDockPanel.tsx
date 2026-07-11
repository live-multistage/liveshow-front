'use client';

import { useEffect, useState } from 'react';

type ConnectionStatus = 'waiting-credentials' | 'connecting' | 'connected' | 'error';

async function sha256Base64(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashBytes = new Uint8Array(hashBuffer);
  let binary = '';
  for (const byte of hashBytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

// obs-websocket auth algorithm (protocol.md "Creating an authentication string"):
// base64Secret = base64(sha256(password + salt))
// authenticationString = base64(sha256(base64Secret + challenge))
async function buildAuthenticationString(password: string, salt: string, challenge: string): Promise<string> {
  const base64Secret = await sha256Base64(password + salt);
  return sha256Base64(base64Secret + challenge);
}

interface ObsWebsocketMessage {
  op: number;
  d: Record<string, unknown>;
}

export function BroadcasterDockPanel() {
  const [status, setStatus] = useState<ConnectionStatus>('waiting-credentials');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    function handleCredentials(event: Event) {
      const detail = (event as CustomEvent<{ password: string }>).detail;
      if (!detail?.password) {
        return;
      }
      connectToObs(detail.password);
    }

    // setStartupScript's dispatchEvent runs in CEF's OnLoadEnd, which can fire before
    // this listener is attached — check the durable stash it also writes first.
    const stashed = (window as unknown as { liveshowObsCredentials?: { password: string } })
      .liveshowObsCredentials;
    if (stashed?.password) {
      connectToObs(stashed.password);
      return;
    }

    window.addEventListener('liveshow-obs-credentials', handleCredentials);
    return () => window.removeEventListener('liveshow-obs-credentials', handleCredentials);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function connectToObs(password: string) {
    setStatus('connecting');
    const socket = new WebSocket('ws://127.0.0.1:4455');

    socket.onmessage = async (rawEvent) => {
      const message = JSON.parse(rawEvent.data as string) as ObsWebsocketMessage;

      if (message.op === 0) {
        const auth = message.d.authentication as { challenge: string; salt: string } | undefined;
        const identify: ObsWebsocketMessage = {
          op: 1,
          d: { rpcVersion: 1, eventSubscriptions: 0 },
        };
        if (auth) {
          identify.d.authentication = await buildAuthenticationString(password, auth.salt, auth.challenge);
        }
        socket.send(JSON.stringify(identify));
        return;
      }

      if (message.op === 2) {
        setStatus('connected');
      }
    };

    socket.onerror = () => {
      setStatus('error');
      setErrorMessage('Não foi possível conectar ao OBS.');
    };

    socket.onclose = (closeEvent) => {
      setStatus('error');
      setErrorMessage(`Conexão com o OBS encerrada (código ${closeEvent.code}).`);
    };
  }

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
