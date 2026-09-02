'use client';

import type { RefObject } from 'react';

// Toggles PiP on whichever <video> is currently the focused/main panel inside
// the player container (VideoPanel marks it with data-focused). Shared by the
// live and replay players.
export function usePictureInPicture(containerRef: RefObject<HTMLElement | null>) {
  const togglePictureInPicture = async () => {
    const video = containerRef.current?.querySelector<HTMLVideoElement>('video[data-focused="true"]');
    if (!video) return;
    try {
      if (document.pictureInPictureElement) await document.exitPictureInPicture();
      else await video.requestPictureInPicture();
    } catch {
      // PiP unsupported or blocked by the browser — no-op.
    }
  };

  return { togglePictureInPicture };
}
