'use client';

import { useEffect, useState } from 'react';
import { Video } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';

type CallVendorRequest = (requestType: string, requestData?: Record<string, unknown>) => Promise<Record<string, unknown>>;

interface CameraRowProps {
  cameraId: string;
  cameraName: string;
  callVendorRequest: CallVendorRequest;
}

export function CameraRow({ cameraId, cameraName, callVendorRequest }: CameraRowProps) {
  const [canvasExists, setCanvasExists] = useState<boolean | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <div className="flex flex-col gap-1 py-1 pl-6">
      <div className="flex items-center justify-between gap-2 text-sm">
        <span className="flex items-center gap-1.5 truncate">
          <Video className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          {cameraName}
        </span>
        {canvasExists === null && <span className="text-xs text-muted-foreground">Verificando...</span>}
        {canvasExists === true && <span className="text-xs text-primary">Canvas ativo</span>}
        {canvasExists === false && (
          <Button size="sm" variant="outline" onClick={handleCreateCanvas} disabled={creating}>
            {creating ? 'Criando...' : 'Criar canvas'}
          </Button>
        )}
      </div>
      {error && <p className="pl-5 text-xs text-destructive">{error}</p>}
    </div>
  );
}
