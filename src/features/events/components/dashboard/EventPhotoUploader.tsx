'use client';

import { useRef, useState } from 'react';
import Image from 'next/image';
import { useUploadGalleryPhotoMutation } from '../../mutations/upload-event-asset.mutation';
import { useEventAssetUpload } from '../../hooks/use-event-asset-upload';
import type { AssetSlot } from '../../hooks/use-event-asset-upload';
import type { EventPhotoResponse, EventResponse } from '../../types/event.types';
import styles from './EventPhotoUploader.module.scss';

interface Props {
  event: EventResponse;
  onDone: () => void;
}

export function EventPhotoUploader({ event, onDone }: Props) {
  const { banner, thumbnail, teaser, handleAsset } = useEventAssetUpload(event);
  const [gallery, setGallery] = useState<EventPhotoResponse[]>([]);

  const bannerRef = useRef<HTMLInputElement>(null);
  const thumbnailRef = useRef<HTMLInputElement>(null);
  const teaserRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  const uploadPhoto = useUploadGalleryPhotoMutation(event.id);

  const handleGallery = async (files: FileList) => {
    for (const file of Array.from(files)) {
      try {
        const photo = await uploadPhoto.mutateAsync(file);
        setGallery((prev) => [...prev, photo]);
      } catch {
        // individual photo failure is silent — user can retry
      }
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.dot} />
        <h3 className={styles.title}>Fotos do Evento</h3>
      </div>
      <p className={styles.subtitle}>
        Evento criado com sucesso. Adicione as imagens agora ou pule para fazer isso depois.
      </p>

      <div className={styles.assets}>
        <AssetUpload
          label="Banner"
          hint="Imagem principal do evento (recomendado: 1920×600)"
          slot={banner}
          inputRef={bannerRef}
          onChange={(f) => handleAsset('banner', f)}
        />
        <AssetUpload
          label="Thumbnail"
          hint="Miniatura do card de evento (recomendado: 640×360)"
          slot={thumbnail}
          inputRef={thumbnailRef}
          onChange={(f) => handleAsset('thumbnail', f)}
        />
        <AssetUpload
          label="Teaser"
          hint="Vídeo curto de divulgação (máx. 30s, 50MB, MP4)"
          slot={teaser}
          inputRef={teaserRef}
          onChange={(f) => handleAsset('teaserVideo', f)}
          kind="video"
        />
      </div>

      <div className={styles.gallerySection}>
        <p className={styles.galleryLabel}>Galeria de Fotos</p>
        <p className={styles.galleryHint}>Selecione uma ou mais fotos para compor a galeria.</p>

        <div className={styles.gallery}>
          {gallery.map((photo) => (
            <div key={photo.id} className={styles.galleryItem}>
              <Image src={photo.url} alt="" fill style={{ objectFit: 'cover' }} sizes="140px" />
            </div>
          ))}

          <button
            type="button"
            className={styles.galleryAdd}
            onClick={() => galleryRef.current?.click()}
            disabled={uploadPhoto.isPending}
          >
            {uploadPhoto.isPending ? (
              <span className={styles.spinner} />
            ) : (
              <>
                <span className={styles.plusIcon}>+</span>
                <span>Adicionar</span>
              </>
            )}
          </button>
        </div>

        <input
          ref={galleryRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          className={styles.hidden}
          onChange={(e) => e.target.files && handleGallery(e.target.files)}
        />
      </div>

      <div className={styles.actions}>
        <button type="button" className={styles.done} onClick={onDone}>
          Concluir
        </button>
      </div>
    </div>
  );
}

interface AssetUploadProps {
  label: string;
  hint: string;
  slot: AssetSlot;
  inputRef: React.RefObject<HTMLInputElement | null>;
  onChange: (file: File) => void;
  kind?: 'image' | 'video';
}

function AssetUpload({ label, hint, slot, inputRef, onChange, kind = 'image' }: AssetUploadProps) {
  return (
    <div className={styles.assetSlot}>
      <p className={styles.assetLabel}>{label}</p>
      <button
        type="button"
        className={`${styles.assetPreview} ${slot.url ? styles.assetPreviewFilled : ''}`}
        onClick={() => inputRef.current?.click()}
        disabled={slot.uploading}
      >
        {slot.uploading ? (
          <span className={styles.spinner} />
        ) : slot.url ? (
          kind === 'video' ? (
            <video
              data-testid="teaser-video-preview"
              src={slot.url}
              muted
              loop
              playsInline
              autoPlay
              style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '8px' }}
            />
          ) : (
            <Image src={slot.url} alt={label} fill style={{ objectFit: 'cover', borderRadius: '8px' }} sizes="320px" />
          )
        ) : (
          <span className={styles.uploadPlaceholder}>
            <span className={styles.uploadIcon}>↑</span>
            <span>{kind === 'video' ? 'Selecionar vídeo' : 'Selecionar imagem'}</span>
          </span>
        )}
      </button>
      {slot.error && <p className={styles.assetError}>{slot.error}</p>}
      <p className={styles.assetHint}>{hint}</p>
      <input
        ref={inputRef}
        type="file"
        accept={kind === 'video' ? 'video/mp4' : 'image/jpeg,image/png,image/webp'}
        className={styles.hidden}
        onChange={(e) => e.target.files?.[0] && onChange(e.target.files[0])}
      />
    </div>
  );
}
