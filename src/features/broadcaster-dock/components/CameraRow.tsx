// src/features/broadcaster-dock/components/CameraRow.tsx
'use client';

import { useEffect, useState } from 'react';
import { Settings, Video } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import styles from './Dock.module.scss';
import {
  useCameraOutputStatusQuery,
  useStartCameraOutputMutation,
  useStopCameraOutputMutation,
} from '../hooks/use-camera-output';

type CallVendorRequest = (requestType: string, requestData?: Record<string, unknown>) => Promise<Record<string, unknown>>;

interface CameraRowProps {
  cameraId: string;
  cameraName: string;
  callVendorRequest: CallVendorRequest;
}

type SourceType = 'camera' | 'screen';

export function CameraRow({ cameraId, cameraName, callVendorRequest }: CameraRowProps) {
  const [canvasExists, setCanvasExists] = useState<boolean | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [sourceType, setSourceType] = useState<SourceType | null>(null);
  const [attaching, setAttaching] = useState<SourceType | null>(null);
  const [sourceError, setSourceError] = useState<string | null>(null);

  const outputStatus = useCameraOutputStatusQuery(cameraId, sourceType !== null, callVendorRequest);
  const startMutation = useStartCameraOutputMutation(cameraId, callVendorRequest);
  const stopMutation = useStopCameraOutputMutation(cameraId, callVendorRequest);

  const transmitting = outputStatus.data === true;
  const outputPending: 'start' | 'stop' | null = startMutation.isPending
    ? 'start'
    : stopMutation.isPending
      ? 'stop'
      : null;
  const outputError = (startMutation.error ?? stopMutation.error)?.message ?? null;

  useEffect(() => {
    let cancelled = false;
    callVendorRequest('GetCameraCanvasStatus', { cameraId })
      .then((data) => {
        if (!cancelled) setCanvasExists(data.exists === true);
      })
      .catch(() => {
        if (!cancelled) setCanvasExists(false);
      });
    return () => {
      cancelled = true;
    };
  }, [cameraId, callVendorRequest]);

  useEffect(() => {
    if (!canvasExists) return;
    let cancelled = false;
    callVendorRequest('GetCameraSourceStatus', { cameraId })
      .then((data) => {
        if (cancelled) return;
        if (data.attached === true && (data.sourceType === 'camera' || data.sourceType === 'screen')) {
          setSourceType(data.sourceType);
        }
      })
      .catch(() => {
        // leave sourceType as null — picker shows, worst case is re-picking
      });
    return () => {
      cancelled = true;
    };
  }, [cameraId, canvasExists, callVendorRequest]);

  async function handleCreateCanvas() {
    setCreating(true);
    setError(null);
    try {
      const data = await callVendorRequest('CreateCameraCanvas', { cameraId });
      if (typeof data.canvasName === 'string' && data.canvasName) {
        setCanvasExists(true);
      } else {
        setError('Falha ao criar canvas.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao criar canvas.');
    } finally {
      setCreating(false);
    }
  }

  async function handleAttachSource(type: SourceType) {
    setAttaching(type);
    setSourceError(null);
    try {
      const data = await callVendorRequest('AttachCameraSource', { cameraId, sourceType: type });
      if (data.sourceType === type) {
        setSourceType(type);
      } else {
        setSourceError('Falha ao anexar fonte.');
      }
    } catch (err) {
      setSourceError(err instanceof Error ? err.message : 'Falha ao anexar fonte.');
    } finally {
      setAttaching(null);
    }
  }

  async function handleOpenProperties() {
    await callVendorRequest('OpenCameraSourceProperties', { cameraId }).catch(() => {});
  }

  function handleStartTransmission() {
    stopMutation.reset();
    startMutation.mutate();
  }

  function handleStopTransmission() {
    startMutation.reset();
    stopMutation.mutate();
  }

  return (
    <div className={styles.nestedRow}>
      <div className={`${styles.rowBetween} ${styles.textSm}`}>
        <span className={`${styles.row} ${styles.truncate}`}>
          <Video className={styles.iconMuted} />
          {cameraName}
        </span>
        {canvasExists === null && <span className={styles.muted}>Verificando...</span>}
        {canvasExists === false && (
          <Button size="sm" variant="outline" onClick={handleCreateCanvas} disabled={creating}>
            {creating ? 'Criando...' : 'Criar canvas'}
          </Button>
        )}
      </div>
      {error && <p className={styles.error}>{error}</p>}

      {canvasExists === true && (
        <div className={styles.subRow}>
          {sourceType === null ? (
            <div className={styles.row}>
              <Button size="sm" variant="ghost" onClick={() => handleAttachSource('camera')} disabled={attaching !== null}>
                {attaching === 'camera' ? 'Anexando...' : 'Câmera'}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => handleAttachSource('screen')} disabled={attaching !== null}>
                {attaching === 'screen' ? 'Anexando...' : 'Tela'}
              </Button>
            </div>
          ) : (
            <>
              <span className={styles.mutedInline}>Fonte: {sourceType === 'camera' ? 'Câmera' : 'Tela'}</span>
              <div className={styles.row}>
                <Button size="sm" variant="ghost" onClick={handleOpenProperties}>
                  <Settings className={styles.icon} />
                  Configurar no OBS
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setSourceType(null)}>
                  Trocar
                </Button>
              </div>
            </>
          )}
        </div>
      )}
      {sourceError && <p className={styles.error}>{sourceError}</p>}

      {sourceType !== null && (
        <div className={styles.subRow}>
          {transmitting ? (
            <>
              <span className={styles.accent}>Transmitindo</span>
              <Button size="sm" variant="destructive" onClick={handleStopTransmission} disabled={outputPending !== null}>
                {outputPending === 'stop' ? 'Parando...' : 'Parar transmissão'}
              </Button>
            </>
          ) : (
            <Button size="sm" variant="outline" onClick={handleStartTransmission} disabled={outputPending !== null}>
              {outputPending === 'start' ? 'Iniciando...' : 'Iniciar transmissão'}
            </Button>
          )}
        </div>
      )}
      {outputError && <p className={styles.error}>{outputError}</p>}
    </div>
  );
}
