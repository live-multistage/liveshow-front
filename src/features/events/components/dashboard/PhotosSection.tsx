'use client';

import { useRef, useState } from 'react';
import Image from 'next/image';
import { ImagePlus } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useUploadAssetMutation, useUploadGalleryPhotoMutation } from '../../mutations/upload-event-asset.mutation';
import { useListEventPhotosQuery, eventKeys } from '../../queries/get-event';
import type { EventPhotoResponse, EventResponse } from '../../types/event.types';
import { AssetSlotUpload } from './AssetSlotUpload';
import type { AssetSlot } from './AssetSlotUpload';
import styles from './EventDashboardDetailContent.module.scss';

interface Props {
  event: EventResponse;
}

export function PhotosSection({ event }: Props) {
  const queryClient = useQueryClient();

  const [banner, setBanner] = useState<AssetSlot>({ url: event.bannerUrl, uploading: false, error: null });
  const [thumbnail, setThumbnail] = useState<AssetSlot>({ url: event.thumbnailUrl, uploading: false, error: null });

  const bannerRef = useRef<HTMLInputElement>(null);
  const thumbnailRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  const uploadAsset = useUploadAssetMutation(event.id);
  const uploadPhoto = useUploadGalleryPhotoMutation(event.id);
  const { data: photos = [] } = useListEventPhotosQuery(event.id);

  async function handleAsset(assetType: 'banner' | 'thumbnail', file: File) {
    const setter = assetType === 'banner' ? setBanner : setThumbnail;
    setter((s) => ({ ...s, uploading: true, error: null }));
    try {
      const updated = await uploadAsset.mutateAsync({ assetType, file });
      setter({ url: assetType === 'banner' ? updated.bannerUrl : updated.thumbnailUrl, uploading: false, error: null });
      queryClient.setQueryData(eventKeys.detail(event.id), updated);
    } catch (err: unknown) {
      setter((s) => ({ ...s, uploading: false, error: err instanceof Error ? err.message : 'Erro no upload' }));
    }
  }

  async function handleGallery(files: FileList) {
    for (const file of Array.from(files)) {
      try {
        const photo = await uploadPhoto.mutateAsync(file);
        queryClient.setQueryData<EventPhotoResponse[]>(eventKeys.photos(event.id), (prev = []) => [...prev, photo]);
      } catch {
        // individual failure is silent
      }
    }
  }

  return (
    <div className={styles.photosSection}>
      <p className={styles.photosSectionTitle}><ImagePlus size={14} /> Fotos</p>

      <div className={styles.assetGrid}>
        <AssetSlotUpload
          label="Banner"
          hint="1920×600 recomendado"
          slot={banner}
          inputRef={bannerRef}
          onChange={(f) => handleAsset('banner', f)}
        />
        <AssetSlotUpload
          label="Thumbnail"
          hint="640×360 recomendado"
          slot={thumbnail}
          inputRef={thumbnailRef}
          onChange={(f) => handleAsset('thumbnail', f)}
        />
      </div>

      <div className={styles.galleryGrid}>
        {photos.map((photo) => (
          <div key={photo.id} className={styles.galleryItem}>
            <Image src={photo.url} alt="" fill style={{ objectFit: 'cover' }} sizes="120px" />
          </div>
        ))}
        <button
          type="button"
          className={styles.galleryAdd}
          onClick={() => galleryRef.current?.click()}
          disabled={uploadPhoto.isPending}
        >
          {uploadPhoto.isPending
            ? <span className={styles.spinner} />
            : <><span className={styles.plusIcon}>+</span><span>Galeria</span></>}
        </button>
        <input
          ref={galleryRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          className={styles.hiddenInput}
          onChange={(e) => e.target.files && handleGallery(e.target.files)}
        />
      </div>
    </div>
  );
}
