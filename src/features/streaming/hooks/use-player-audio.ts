'use client';

import { useEffect, useRef, useState } from 'react';
import { pickAudioTrackIndex } from '@live-show/api-contracts';
import type { AudioTrackInfo } from '@live-show/api-contracts';
import type { LiveCamera } from '../types/live.types';

// Per-viewer audio language (ISO 639 code). A convenience, not state anyone
// else reads: storage can be missing or throw (private mode), and the choice
// then simply lasts for this session.
const AUDIO_LANGUAGE_KEY = 'ls_audio_language';

function readStoredLanguage(): string | null {
  try {
    return localStorage.getItem(AUDIO_LANGUAGE_KEY);
  } catch {
    return null;
  }
}

function storeLanguage(language: string): void {
  try {
    localStorage.setItem(AUDIO_LANGUAGE_KEY, language);
  } catch {
    // session-only choice, see above
  }
}

const NO_TRACKS: AudioTrackInfo[] = [];

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

  // Skip the mount-time firing — `onChange` reporting back its own seed
  // (`initialMuted`/`initialVolume`) is a no-op for the caller, but a
  // caller that uses it to update state (e.g. ChannelGate, held above the
  // player's remount boundary) would otherwise re-render on every mount.
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    onChange?.({ muted: globalMuted, volume });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [globalMuted, volume]);

  const effectiveAudioCameraId =
    audioCameraId && cameras.some((c) => c.cameraId === audioCameraId)
      ? audioCameraId
      : fallbackCameraId;

  // The language follows the viewer, not the camera: it survives camera (and
  // transmission) switches and applies wherever that language exists; a
  // camera without it plays its default track.
  const [preferredLanguage, setPreferredLanguage] = useState<string | null>(readStoredLanguage);
  const audioTracks =
    cameras.find((c) => c.cameraId === effectiveAudioCameraId)?.audioTracks ?? NO_TRACKS;
  const effectiveAudioTrackIndex = pickAudioTrackIndex(audioTracks, preferredLanguage);
  const handleAudioLanguageChange = (language: string) => {
    setPreferredLanguage(language);
    storeLanguage(language);
  };

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
    audioTracks,
    effectiveAudioTrackIndex,
    preferredLanguage,
    handleAudioLanguageChange,
  };
}
