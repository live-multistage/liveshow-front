'use client';

import { useState } from 'react';
import { useCreateCameraMutation } from '@/features/streams/mutations/camera.mutations';
import { Input } from '@/shared/components/ui/input';
import { Button } from '@/shared/components/ui/button';
import styles from './Dock.module.scss';

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
      // API requires a valid integer priority >= 1 despite CreateCameraRequest's
      // priority being typed optional — the web dashboard's InlineAddForm always
      // sends priority ?? 1 for the same reason (FeedBody.tsx). Dock has no
      // priority UI (out of scope, single-camera-per-feed is the common case),
      // so it defaults to 1 the same way.
      { name: name.trim(), priority: 1 },
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
    <div className={styles.stackTight}>
      <div className={styles.row}>
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
      {createCamera.error?.message && <p className={styles.error}>{createCamera.error.message}</p>}
    </div>
  );
}
