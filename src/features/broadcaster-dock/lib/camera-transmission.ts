// src/features/broadcaster-dock/lib/camera-transmission.ts
import type { QueryClient } from '@tanstack/react-query';
import { streamsService } from '@/features/streams/services/streams.service';

export type CallVendorRequest = (
  requestType: string,
  requestData?: Record<string, unknown>,
) => Promise<Record<string, unknown>>;

export function cameraOutputStatusKey(cameraId: string) {
  return ['broadcaster-dock', 'camera-output-status', cameraId] as const;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// StartCameraOutput's response only confirms OBS accepted the start command —
// live testing during D4 Phase 3 found that an unreachable SRT target fails
// ASYNCHRONOUSLY, roughly 3 seconds after obs_output_start() already returned
// true. Poll GetCameraOutputStatus for a few seconds (5 checks, 1s apart —
// comfortably past the observed ~3s failure window) before trusting a start.
async function pollUntilSettled(cameraId: string, callVendorRequest: CallVendorRequest): Promise<boolean> {
  for (let i = 0; i < 5; i++) {
    await delay(1000);
    const data = await callVendorRequest('GetCameraOutputStatus', { cameraId }).catch(() => ({ active: false }));
    if (data.active !== true) return false;
  }
  return true;
}

export async function fetchCameraOutputStatus(
  cameraId: string,
  callVendorRequest: CallVendorRequest,
): Promise<boolean> {
  const data = await callVendorRequest('GetCameraOutputStatus', { cameraId }).catch(() => ({ active: false }));
  return data.active === true;
}

export async function fetchCameraSourceAttached(
  cameraId: string,
  callVendorRequest: CallVendorRequest,
): Promise<boolean> {
  const data = await callVendorRequest('GetCameraSourceStatus', { cameraId }).catch(() => ({ attached: false }));
  return data.attached === true;
}

// The only place StartCameraOutput is called. Writes the resulting status into
// the shared query cache at cameraOutputStatusKey(cameraId) so every reader
// (CameraRow's own display, and any bulk caller) sees the same truth — nobody
// else polls in the background.
export async function startCameraTransmission(
  cameraId: string,
  callVendorRequest: CallVendorRequest,
  queryClient: QueryClient,
): Promise<void> {
  const ingest = await streamsService.getCameraIngest(cameraId);
  const data = await callVendorRequest('StartCameraOutput', {
    cameraId,
    url: ingest.ingest.url,
    streamId: ingest.ingest.streamId,
    streamKey: ingest.streamKey,
  });
  if (data.active !== true) {
    throw new Error(typeof data.error === 'string' ? data.error : 'Falha ao iniciar transmissão.');
  }
  const settled = await pollUntilSettled(cameraId, callVendorRequest);
  if (!settled) {
    queryClient.setQueryData(cameraOutputStatusKey(cameraId), false);
    throw new Error('A transmissão parou logo após iniciar — verifique as credenciais de ingest.');
  }
  queryClient.setQueryData(cameraOutputStatusKey(cameraId), true);
}

// The only place StopCameraOutput is called.
export async function stopCameraTransmission(
  cameraId: string,
  callVendorRequest: CallVendorRequest,
  queryClient: QueryClient,
): Promise<void> {
  await callVendorRequest('StopCameraOutput', { cameraId });
  queryClient.setQueryData(cameraOutputStatusKey(cameraId), false);
}
