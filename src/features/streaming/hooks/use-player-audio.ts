'use client';

import { useState } from 'react';
import type { LiveCamera } from '../types/live.types';

interface UsePlayerAudioOptions {
  // Cameras the audio source may legally be — the viewer's explicit pick is
  // dropped the moment it leaves this set (e.g. a stage change).
  cameras: LiveCamera[];
  // Where audio goes when the viewer never picked (or their pick left the
  // set). Live follows the main camera; replay uses the first camera.
  fallbackCameraId: string | null;
}

// Global audio state shared by the live and replay players: one mute switch
// and one volume for every tile, plus which camera's audio actually plays.
export function usePlayerAudio({ cameras, fallbackCameraId }: UsePlayerAudioOptions) {
  const [globalMuted, setGlobalMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [audioCameraId, setAudioCameraId] = useState<string | null>(null);

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
