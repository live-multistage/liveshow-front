'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { eventsService } from '../services/events.service';
import type { AccessibilityStatus } from '../types/event.types';

export const accessibilityKey = (eventId: string) =>
  ['events', 'accessibility', eventId] as const;

// Only publicly-funded events need this — callers pass `enabled` to skip the
// fetch entirely for ordinary events.
export function useAccessibilityQuery(eventId: string, enabled = true) {
  return useQuery({
    queryKey: accessibilityKey(eventId),
    queryFn: () => eventsService.getAccessibility(eventId),
    enabled: !!eventId && enabled,
    staleTime: 30_000,
  });
}

export function useSetLibrasCameraMutation(eventId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (cameraId: string) => eventsService.setLibrasCamera(eventId, cameraId),
    onSuccess: (status: AccessibilityStatus) => {
      qc.setQueryData(accessibilityKey(eventId), status);
    },
  });
}

export function useApproveAccessibilityMutation(eventId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => eventsService.approveAccessibility(eventId),
    onSuccess: (status: AccessibilityStatus) => {
      qc.setQueryData(accessibilityKey(eventId), status);
    },
  });
}
