'use client';

import { useState } from 'react';
import { useCreateCameraMutation } from '@/features/streams/mutations/camera.mutations';
import { Input } from '@/shared/components/ui/input';
import { Button } from '@/shared/components/ui/button';

type CallVendorRequest = (requestType: string, requestData?: Record<string, unknown>) => Promise<Record<string, unknown>>;

interface CameraCreateFormProps {
  feedId: string;
  callVendorRequest: CallVendorRequest;
}

export function CameraCreateForm({ feedId, callVendorRequest }: CameraCreateFormProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');

  const createCamera = useCreateCameraMutation(feedId);

  function submit() {
    if (!name.trim()) return;
    createCamera.mutate(
      { name: name.trim() },
      {
        onSuccess: (camera) => {
          // Fire-and-forget: CreateCameraCanvas is idempotent, and if it fails
          // here the camera's own CameraRow will show "Canvas não criado" with a
          // retry button once the feed's camera list re-renders — no need to
          // block this form on it or roll back the already-created camera.
          callVendorRequest('CreateCameraCanvas', { cameraId: camera.id }).catch(() => {});
          setName('');
          setOpen(false);
        },
      },
    );
  }

  if (!open) {
    return (
      <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
        Câmera
      </Button>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') submit();
            if (e.key === 'Escape') setOpen(false);
          }}
          placeholder="Nome da câmera"
          autoFocus
          disabled={createCamera.isPending}
        />
        <Button size="sm" onClick={submit} disabled={createCamera.isPending || !name.trim()}>
          Adicionar
        </Button>
      </div>
      {createCamera.error?.message && <p className="text-xs text-destructive">{createCamera.error.message}</p>}
    </div>
  );
}
