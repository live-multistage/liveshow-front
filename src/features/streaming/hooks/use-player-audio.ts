'use client';

import { useEffect, useState } from 'react';
import type { LiveCamera } from '../types/live.types';

export interface PlayerAudioState {
  muted: boolean;
  volume: number;
}

interface UsePlayerAudioOptions {
  // Cameras the audio source may legally be — the viewer's explicit pick is
  // dropped the moment it leaves this set (e.g. a stage change).
  cameras: LiveCamera[];
  // Where audio goes when the viewer never picked (or their pick left the
  // set). Live follows the main camera; replay uses the first camera.
  fallbackCameraId: string | null;
  // Seed for mute/volume — lets a caller that remounts the player (e.g. the
  // channel player keying on its source) hand back what the viewer had
  // before the remount instead of resetting to defaults.
  initialMuted?: boolean;
  initialVolume?: number;
  // Fired whenever mute or volume changes, so a caller above the remount
  // boundary can hold onto it as the next mount's initial value.
  onChange?: (audio: PlayerAudioState) => void;
}

// Global audio state shared by the live and replay players: one mute switch
// and one volume for every tile, plus which camera's audio actually plays.
export function usePlayerAudio({
  cameras,
  fallbackCameraId,
  initialMuted = false,
  initialVolume = 1,
  onChange,
}: UsePlayerAudioOptions) {
  const [globalMuted, setGlobalMuted] = useState(initialMuted);
  const [volume, setVolume] = useState(initialVolume);
  const [audioCameraId, setAudioCameraId] = useState<string | null>(null);

  useEffect(() => {
    onChange?.({ muted: globalMuted, volume });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [globalMuted, volume]);

  const effectiveAudioCameraId =
    audioCameraId && cameras.some((c) => c.cameraId === audioCameraId)
      ? audioCameraId
      : fallbackCameraId;

  // Picking an audio source is an explicit "I want to hear this" — unmute.
  const handleAudioCameraChange = (id: string) => {
    setAudioCameraId(id);
    setGlobalMuted(false);
  };

  return {
    globalMuted,
    setGlobalMuted,
    volume,
    setVolume,
    effectiveAudioCameraId,
    handleAudioCameraChange,
  };
}
