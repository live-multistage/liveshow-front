'use client';

import { useRef, useState } from 'react';
import { Image as ImageIcon, X } from 'lucide-react';
import { useUploadCameraThumbnailMutation, useClearCameraThumbnailMutation } from '../mutations/camera.mutations';
import ingestStyles from './IngestCredentials.module.scss';
import styles from './CameraThumbnail.module.scss';

interface Props {
  cameraId: string;
  feedId: string;
  thumbnailUrl?: string | null;
}

const MAX_SIZE_BYTES = 5 * 1024 * 1024;

// Optional per-camera fallback poster: shown while the camera has no live
// signal (showon's logo is used when none is set). Never required to save
// the camera.
export function CameraThumbnail({ cameraId, feedId, thumbnailUrl }: Props) {
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const upload = useUploadCameraThumbnailMutation(cameraId, feedId);
  const clear = useClearCameraThumbnailMutation(cameraId, feedId);

  const handleFile = (file: File | undefined) => {
    if (!file) return;
    if (file.size > MAX_SIZE_BYTES) return; // silently ignored — hint states the 5MB cap
    upload.mutate(file);
  };

  return (
    <div className={ingestStyles.wrap}>
      <button className={ingestStyles.toggle} onClick={() => setOpen((o) => !o)}>
        <ImageIcon size={12} /> {open ? 'Ocultar thumbnail' : 'Thumbnail'}
      </button>

      {open && (
        <div className={ingestStyles.panel}>
          <div className={`${ingestStyles.fieldRow} ${styles.pickRow}`} onClick={() => inputRef.current?.click()}>
            {thumbnailUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={thumbnailUrl} alt="Thumbnail da câmera" className={styles.preview} />
            ) : (
              <div className={styles.placeholder}>
                <ImageIcon size={14} />
              </div>
            )}
            <span className={ingestStyles.muted}>
              {upload.isPending ? 'Enviando...' : 'Clique para enviar (máx 5MB)'}
            </span>
            {thumbnailUrl && (
              <button
                className={ingestStyles.iconBtn}
                title="Remover thumbnail"
                disabled={clear.isPending}
                onClick={(e) => { e.stopPropagation(); clear.mutate(); }}
              >
                <X size={13} />
              </button>
            )}
          </div>
          <span className={ingestStyles.muted}>
            Usada como pôster enquanto a câmera está sem sinal ao vivo. Sem thumbnail, é exibida a logo da showon.
          </span>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className={styles.hiddenInput}
            onChange={(e) => handleFile(e.target.files?.[0])}
          />
        </div>
      )}
    </div>
  );
}
