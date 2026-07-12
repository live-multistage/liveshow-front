// src/features/broadcaster-dock/hooks/use-camera-output.ts
'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  cameraOutputStatusKey,
  fetchCameraOutputStatus,
  startCameraTransmission,
  stopCameraTransmission,
  type CallVendorRequest,
} from '../lib/camera-transmission';

export function useCameraOutputStatusQuery(
  cameraId: string,
  enabled: boolean,
  callVendorRequest: CallVendorRequest,
) {
  return useQuery({
    queryKey: cameraOutputStatusKey(cameraId),
    queryFn: () => fetchCameraOutputStatus(cameraId, callVendorRequest),
    enabled,
    staleTime: Infinity, // written by start/stop mutations, not refetched on a timer
  });
}

export function useStartCameraOutputMutation(cameraId: string, callVendorRequest: CallVendorRequest) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => startCameraTransmission(cameraId, callVendorRequest, queryClient),
  });
}

export function useStopCameraOutputMutation(cameraId: string, callVendorRequest: CallVendorRequest) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => stopCameraTransmission(cameraId, callVendorRequest, queryClient),
  });
}
