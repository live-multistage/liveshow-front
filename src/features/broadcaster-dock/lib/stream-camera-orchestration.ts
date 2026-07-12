// src/features/broadcaster-dock/lib/stream-camera-orchestration.ts
import type { QueryClient } from '@tanstack/react-query';
import type { CameraResponse } from '@/features/streams/types/stream.types';
import {
  fetchCameraSourceAttached,
  startCameraTransmission,
  stopCameraTransmission,
  type CallVendorRequest,
} from './camera-transmission';

export interface OrchestrationResult {
  succeeded: string[];
  failed: { cameraId: string; error: string }[];
  skipped: string[];
}

// Only enabled cameras with a source already attached (checked live via
// GetCameraSourceStatus) are started — cameras with nothing attached are
// "skipped", not "failed": D4 Phase 2 deliberately delegates all device
// selection to OBS's native Properties dialog, so there is no way to
// auto-configure a camera here. Never a bare Promise.all: one camera's
// failure must never block the others or the caller's own next step.
export async function startAllCameras(
  cameras: CameraResponse[],
  callVendorRequest: CallVendorRequest,
  queryClient: QueryClient,
): Promise<OrchestrationResult> {
  const enabledCameras = cameras.filter((c) => c.enabled);
  const attachedChecks = await Promise.all(
    enabledCameras.map(async (camera) => ({
      camera,
      attached: await fetchCameraSourceAttached(camera.id, callVendorRequest),
    })),
  );

  const skipped = attachedChecks.filter((c) => !c.attached).map((c) => c.camera.id);
  const toStart = attachedChecks.filter((c) => c.attached).map((c) => c.camera);

  const results = await Promise.allSettled(
    toStart.map((camera) => startCameraTransmission(camera.id, callVendorRequest, queryClient)),
  );

  const succeeded: string[] = [];
  const failed: { cameraId: string; error: string }[] = [];
  results.forEach((result, index) => {
    const cameraId = toStart[index].id;
    if (result.status === 'fulfilled') {
      succeeded.push(cameraId);
    } else {
      failed.push({
        cameraId,
        error: result.reason instanceof Error ? result.reason.message : 'Falha desconhecida.',
      });
    }
  });

  return { succeeded, failed, skipped };
}

// StopCameraOutput is a confirmed no-op when nothing is running (verified in
// D4 Phase 3's final review: the C++ handler returns cleanly if the camera
// has no entry in its output map) — no need to check attachment first, so
// every enabled camera is targeted directly. skipped is always empty; kept
// in the return shape only so callers can treat both results uniformly.
export async function stopAllCameras(
  cameras: CameraResponse[],
  callVendorRequest: CallVendorRequest,
  queryClient: QueryClient,
): Promise<OrchestrationResult> {
  const enabledCameras = cameras.filter((c) => c.enabled);

  const results = await Promise.allSettled(
    enabledCameras.map((camera) => stopCameraTransmission(camera.id, callVendorRequest, queryClient)),
  );

  const succeeded: string[] = [];
  const failed: { cameraId: string; error: string }[] = [];
  results.forEach((result, index) => {
    const cameraId = enabledCameras[index].id;
    if (result.status === 'fulfilled') {
      succeeded.push(cameraId);
    } else {
      failed.push({
        cameraId,
        error: result.reason instanceof Error ? result.reason.message : 'Falha desconhecida.',
      });
    }
  });

  return { succeeded, failed, skipped: [] };
}
