'use client';

import { useState } from 'react';
import { useUploadAssetMutation } from '../mutations/upload-event-asset.mutation';
import { validateTeaserVideo } from '../utils/validate-teaser-video';
import type { EventResponse } from '../types/event.types';

export interface AssetSlot {
  url: string | null;
  uploading: boolean;
  error: string | null;
}

export type EventAssetType = 'banner' | 'thumbnail' | 'teaserVideo';

// Shared by PhotosSection (event edit) and EventPhotoUploader (create
// wizard) — both drive the same three asset slots (banner/thumbnail/teaser)
// through the same validate-then-upload flow. Kept here once instead of
// duplicated per caller.
export function useEventAssetUpload(event: EventResponse, onUploaded?: (updated: EventResponse) => void) {
  const [banner, setBanner] = useState<AssetSlot>({ url: event.bannerUrl, uploading: false, error: null });
  const [thumbnail, setThumbnail] = useState<AssetSlot>({ url: event.thumbnailUrl, uploading: false, error: null });
  const [teaser, setTeaser] = useState<AssetSlot>({ url: event.teaserVideoUrl, uploading: false, error: null });

  const uploadAsset = useUploadAssetMutation(event.id);

  async function handleAsset(assetType: EventAssetType, file: File) {
    const setter = assetType === 'banner' ? setBanner : assetType === 'thumbnail' ? setThumbnail : setTeaser;

    // Flip to "uploading" before validation starts (not after) so the UI
    // shows feedback immediately on file selection — the teaser-video
    // duration probe can take a few seconds (or up to its timeout) before
    // resolving.
    setter((s) => ({ ...s, uploading: true, error: null }));

    if (assetType === 'teaserVideo') {
      const validationError = await validateTeaserVideo(file);
      if (validationError) {
        setter((s) => ({ ...s, uploading: false, error: validationError }));
        return;
      }
    }

    try {
      const updated = await uploadAsset.mutateAsync({ assetType, file });
      setter({
        url: assetType === 'banner' ? updated.bannerUrl : assetType === 'thumbnail' ? updated.thumbnailUrl : updated.teaserVideoUrl,
        uploading: false,
        error: null,
      });
      onUploaded?.(updated);
    } catch (err: unknown) {
      setter((s) => ({ ...s, uploading: false, error: err instanceof Error ? err.message : 'Erro no upload' }));
    }
  }

  return { banner, thumbnail, teaser, handleAsset };
}
