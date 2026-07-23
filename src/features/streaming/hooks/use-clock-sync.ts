'use client';

import { useEffect } from 'react';
import type { MutableRefObject, RefObject } from 'react';
import type Hls from 'hls.js';

// Wall-clock sync between camera panels. Every rendition carries
// EXT-X-PROGRAM-DATE-TIME (ffmpeg `program_date_time` flag), which hls.js
// surfaces as `playingDate` — the absolute wall-clock instant of what's on
// screen. The primary (audio) panel is the clock master: it plays freely,
// chasing its own live edge as always. Every other live panel is a follower
// that corrects its playback position until its playingDate matches the
// master's — so a guitarist on camera B stays in time with the audio coming
// from camera A, instead of each panel drifting up to a segment apart.

export interface ClockSample {
  // Master's playingDate at the moment of sampling.
  epochMs: number;
  // performance.now() when sampled — lets followers extrapolate "where the
  // master is NOW" between samples (master plays at ~1x).
  sampledAt: number;
}

export type ClockRole = 'master' | 'follower';

// Followers within this of the master are left alone — correcting inside the
// dead zone just makes the tile shimmer for no perceptual gain (musical sync
// perception starts breaking down past ~120ms).
const DEAD_ZONE_SEC = 0.12;
// Beyond this, rate-nudging would take too long — hard seek instead.
const SEEK_THRESHOLD_SEC = 1.5;
// Followers are always muted (audio comes only from the master's panel), so a
// 5% rate change is invisible — no pitch artifacts to worry about.
const NUDGE_RATE = 0.05;

const MASTER_PUBLISH_MS = 500;
const FOLLOWER_CHECK_MS = 1_000;

export type ClockCorrection =
  | { type: 'none' }
  | { type: 'rate'; rate: number }
  | { type: 'seek' };

// Pure decision: positive drift = follower is BEHIND the master.
export function resolveClockCorrection(driftSec: number): ClockCorrection {
  const abs = Math.abs(driftSec);
  if (abs <= DEAD_ZONE_SEC) return { type: 'none' };
  if (abs >= SEEK_THRESHOLD_SEC) return { type: 'seek' };
  return { type: 'rate', rate: driftSec > 0 ? 1 + NUDGE_RATE : 1 - NUDGE_RATE };
}

export interface UseClockSyncOptions {
  videoRef: RefObject<HTMLVideoElement | null>;
  hlsRef: RefObject<Hls | null>;
  mode: 'live' | 'replay';
  role?: ClockRole;
  clockRef?: MutableRefObject<ClockSample | null>;
}

export function useClockSync({ videoRef, hlsRef, mode, role, clockRef }: UseClockSyncOptions): void {
  useEffect(() => {
    if (mode !== 'live' || !role || !clockRef) return;

    if (role === 'master') {
      const publish = () => {
        const date = hlsRef.current?.playingDate;
        if (date) clockRef.current = { epochMs: date.getTime(), sampledAt: performance.now() };
      };
      publish();
      const interval = setInterval(publish, MASTER_PUBLISH_MS);
      return () => {
        clearInterval(interval);
        clockRef.current = null;
      };
    }

    // follower
    const interval = setInterval(() => {
      const video = videoRef.current;
      const hls = hlsRef.current;
      const sample = clockRef.current;
      const mine = hls?.playingDate;
      if (!video || !hls || !sample || !mine) return;

      const masterNowMs = sample.epochMs + (performance.now() - sample.sampledAt);
      const driftSec = (masterNowMs - mine.getTime()) / 1000;
      const correction = resolveClockCorrection(driftSec);

      if (correction.type === 'seek') {
        // A follower on a higher-latency path (e.g. latched to STANDARD while
        // the master rides LL) may not HAVE the master's instant yet — clamp
        // to its own live edge and get as close as the window allows.
        const target = video.currentTime + driftSec;
        const s = video.seekable;
        const edge = s.length ? s.end(s.length - 1) : target;
        video.currentTime = Math.min(target, edge);
        video.playbackRate = 1;
      } else if (correction.type === 'rate') {
        video.playbackRate = correction.rate;
      } else if (video.playbackRate !== 1) {
        video.playbackRate = 1;
      }
    }, FOLLOWER_CHECK_MS);

    return () => {
      clearInterval(interval);
      const video = videoRef.current;
      if (video && video.playbackRate !== 1) video.playbackRate = 1;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, role, clockRef]);
}
