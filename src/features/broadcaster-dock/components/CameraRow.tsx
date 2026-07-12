'use client';

import { useEffect, useState } from 'react';
import { Settings, Video } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';

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
    // Best-effort: the dialog is a native OBS window, not something this
    // component can reflect state from — a failure here just means the click
    // didn't open anything, retrying is the only recovery available.
    await callVendorRequest('OpenCameraSourceProperties', { cameraId }).catch(() => {});
  }

  return (
    <div className="flex flex-col gap-1 py-1 pl-6">
      <div className="flex items-center justify-between gap-2 text-sm">
        <span className="flex items-center gap-1.5 truncate">
          <Video className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          {cameraName}
        </span>
        {canvasExists === null && <span className="text-xs text-muted-foreground">Verificando...</span>}
        {canvasExists === false && (
          <Button size="sm" variant="outline" onClick={handleCreateCanvas} disabled={creating}>
            {creating ? 'Criando...' : 'Criar canvas'}
          </Button>
        )}
      </div>
      {error && <p className="pl-5 text-xs text-destructive">{error}</p>}

      {canvasExists === true && (
        <div className="flex items-center justify-between gap-2 pl-5 text-xs">
          {sourceType === null ? (
            <div className="flex gap-2">
              <Button size="sm" variant="ghost" onClick={() => handleAttachSource('camera')} disabled={attaching !== null}>
                {attaching === 'camera' ? 'Anexando...' : 'Câmera'}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => handleAttachSource('screen')} disabled={attaching !== null}>
                {attaching === 'screen' ? 'Anexando...' : 'Tela'}
              </Button>
            </div>
          ) : (
            <>
              <span className="text-muted-foreground">Fonte: {sourceType === 'camera' ? 'Câmera' : 'Tela'}</span>
              <div className="flex gap-2">
                <Button size="sm" variant="ghost" onClick={handleOpenProperties}>
                  <Settings className="h-3.5 w-3.5" />
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
      {sourceError && <p className="pl-5 text-xs text-destructive">{sourceError}</p>}
    </div>
  );
}
