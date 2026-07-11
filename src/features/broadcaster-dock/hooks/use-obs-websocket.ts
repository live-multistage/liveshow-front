'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export type ObsConnectionStatus = 'waiting-credentials' | 'connecting' | 'connected' | 'error';

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

const VENDOR_NAME = 'liveshow';

interface PendingRequest {
  resolve: (data: Record<string, unknown>) => void;
  reject: (err: Error) => void;
}

export interface UseObsWebsocketResult {
  status: ObsConnectionStatus;
  errorMessage: string;
  callVendorRequest: (requestType: string, requestData?: Record<string, unknown>) => Promise<Record<string, unknown>>;
}

export function useObsWebsocket(): UseObsWebsocketResult {
  const [status, setStatus] = useState<ObsConnectionStatus>('waiting-credentials');
  const [errorMessage, setErrorMessage] = useState('');
  const socketRef = useRef<WebSocket | null>(null);
  const pendingRequests = useRef(new Map<string, PendingRequest>());

  const callVendorRequest = useCallback(
    (requestType: string, requestData: Record<string, unknown> = {}) => {
      return new Promise<Record<string, unknown>>((resolve, reject) => {
        const socket = socketRef.current;
        if (!socket || socket.readyState !== WebSocket.OPEN) {
          reject(new Error('OBS websocket not connected.'));
          return;
        }

        const requestId = crypto.randomUUID();
        pendingRequests.current.set(requestId, { resolve, reject });

        socket.send(JSON.stringify({
          op: 6,
          d: {
            requestType: 'CallVendorRequest',
            requestId,
            requestData: { vendorName: VENDOR_NAME, requestType, requestData },
          },
        }));
      });
    },
    [],
  );

  useEffect(() => {
    function connectToObs(password: string) {
      setStatus('connecting');
      const socket = new WebSocket('ws://127.0.0.1:4455');
      socketRef.current = socket;

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
          return;
        }

        if (message.op === 7) {
          const requestId = message.d.requestId as string;
          const pending = pendingRequests.current.get(requestId);
          if (!pending) return;
          pendingRequests.current.delete(requestId);

          const requestStatus = message.d.requestStatus as { result: boolean; code: number; comment?: string };
          if (!requestStatus.result) {
            pending.reject(new Error(requestStatus.comment ?? `Vendor request failed (code ${requestStatus.code}).`));
            return;
          }

          const responseData = message.d.responseData as { responseData?: Record<string, unknown> } | undefined;
          pending.resolve(responseData?.responseData ?? {});
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

    function handleCredentials(event: Event) {
      const detail = (event as CustomEvent<{ password: string }>).detail;
      if (!detail?.password) return;
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

  return { status, errorMessage, callVendorRequest };
}
