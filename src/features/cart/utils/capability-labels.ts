import type { AccessCapability } from '@/features/events';

export const CAPABILITY_LABELS: Record<AccessCapability, string> = {
  LIVE_VIEW: 'Ao vivo',
  REPLAY_VIEW: 'Reprise',
  CAMERA_VIEW: 'Multicâmera',
};
