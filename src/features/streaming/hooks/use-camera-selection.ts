'use client';

import { useState } from 'react';

interface UseCameraSelectionOptions {
  initialActiveIds?: string[] | (() => string[]);
  // NBR 15290 — the Libras window is mandatory and never removable.
  librasCameraId?: string | null;
  // Fired when toggling OFF the camera that was the effective main — the next
  // one is promoted implicitly, so intent tied to the old main (e.g. a live
  // DVR rewind) no longer applies.
  onMainDeselected?: () => void;
}

// Which cameras are in the composition and which one is the main view.
// Shared by the live and replay players; CameraGrid stays presentational.
export function useCameraSelection({ initialActiveIds, librasCameraId = null, onMainDeselected }: UseCameraSelectionOptions = {}) {
  const [activeCameraIds, setActiveCameraIds] = useState<string[]>(initialActiveIds ?? []);
  const [mainCameraId, setMainCameraId] = useState<string | null>(null);

  // The viewer's pick only while it is still active; otherwise the first
  // active camera is promoted.
  const effectiveMainCameraId =
    mainCameraId && activeCameraIds.includes(mainCameraId)
      ? mainCameraId
      : (activeCameraIds[0] ?? null);

  const toggleCamera = (cameraId: string) => {
    if (cameraId === librasCameraId) return;
    if (activeCameraIds.includes(cameraId)) {
      // Never empty the composition.
      if (activeCameraIds.length > 1) {
        setActiveCameraIds(activeCameraIds.filter((id) => id !== cameraId));
        if (cameraId === effectiveMainCameraId) onMainDeselected?.();
      }
    } else {
      setActiveCameraIds([...activeCameraIds, cameraId]);
    }
  };

  return {
    activeCameraIds,
    setActiveCameraIds,
    mainCameraId,
    setMainCameraId,
    effectiveMainCameraId,
    toggleCamera,
  };
}
