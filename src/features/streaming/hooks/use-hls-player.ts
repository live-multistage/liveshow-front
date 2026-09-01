'use client';

import { useEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';
import Hls from 'hls.js';
import { config, mediaUrl } from '@/config';
import { tokenStore } from '@/lib/auth/token-store';
import type { LiveCamera } from '../types/live.types';
import { audioTrackIndexForCamera } from '../components/audio-track';

export interface QualityLevel {
  index: number;
  height: number;
}

// ── signed-URL (?pt) helpers ────────────────────────────────────────────────
// The live STANDARD manifests carry a short-lived signed token `?pt={JWT}`
// (90s TTL). The playback query refreshes it every 5s, so we must (a) NOT
// rebuild the player on every refresh and (b) inject the freshest token into
// every hls.js request. These are pure string ops so they unit-test without a
// real hls.js instance. JWT chars (base64url + '.') are never percent-encoded
// by URLSearchParams, so round-tripping the value is lossless.

// The current `pt` value from a manifest path/URL, or null when absent.
export function extractPt(url: string): string | null {
  const q = url.indexOf('?');
  if (q === -1) return null;
  return new URLSearchParams(url.slice(q + 1)).get('pt');
}

// A stable key that ignores the token: two URLs differing ONLY in `pt` produce
// the same base, so the build effect keys on real source changes (packageId /
// job rotation) and not 5s token refreshes.
export function stripPt(url: string): string {
  const q = url.indexOf('?');
  if (q === -1) return url;
  const params = new URLSearchParams(url.slice(q + 1));
  params.delete('pt');
  const rest = params.toString();
  return rest ? `${url.slice(0, q)}?${rest}` : url.slice(0, q);
}

// Rewrite an outgoing request URL's `pt` to `token`. Falls through unchanged
// when there is no token or the URL carries no `pt` (e.g. backend rolled the
// signed-URL scheme back) so playback degrades gracefully rather than breaking.
export function replacePtParam(url: string, token: string | null): string {
  if (!token) return url;
  const q = url.indexOf('?');
  if (q === -1) return url;
  const params = new URLSearchParams(url.slice(q + 1));
  if (!params.has('pt')) return url;
  params.set('pt', token);
  return `${url.slice(0, q)}?${params.toString()}`;
}

// How far behind the live edge hls.js tolerates before it force-seeks the
// element back to liveSyncPosition on the next playlist refresh (see
// stream-controller's synchronizeToLiveEdge). Expressed in target durations.
// While the viewer is scrubbed back in the DVR window this MUST be lifted, or
// hls.js yanks them forward again within ~16s of playback.
export function maxLatencyDurationCount(hasLl: boolean, dvrActive: boolean): number {
  if (dvrActive) return Infinity;
  return hasLl ? 5 : 8;
}

// Index of the smallest-height rendition in a parsed hls instance (-1 if none).
function lowestLevelIndex(hls: Hls): number {
  const levels = hls.levels;
  if (!levels || levels.length === 0) return -1;
  let min = 0;
  for (let i = 1; i < levels.length; i++) {
    if (levels[i].height < levels[min].height) min = i;
  }
  return min;
}

// Best-effort unmuted autoplay (YouTube-style): try to play with sound; if the
// browser blocks autoplay-with-sound, fall back to muted (always allowed) and
// notify the parent so its mute UI matches reality. Only attempts unmuted when
// the element started unmuted, so muted tiles are unaffected.
export function playBestEffort(video: HTMLVideoElement, onBlocked?: () => void) {
  video.play().catch(() => {
    if (!video.muted) {
      video.muted = true;
      onBlocked?.();
      void video.play().catch(() => {});
    }
  });
}

export interface UseHlsPlayerOptions {
  videoRef: RefObject<HTMLVideoElement | null>;
  camera: LiveCamera;
  mode: 'live' | 'replay';
  isFocused: boolean;
  // Live only: the viewer has scrubbed back into the DVR window. Relaxes
  // hls.js's forced catch-up to the live edge and suspends the focus snap, so
  // a rewound position actually holds (and survives a camera switch).
  dvrActive?: boolean;
  // Replay's shared paused state — read at MANIFEST_PARSED time to decide
  // whether a freshly-parsed panel may autoplay.
  paused?: boolean;
  selectedLevel?: number;
  lowQuality: boolean;
  selectedAudioCameraId?: string;
  onLevelsReady?: (levels: QualityLevel[]) => void;
  onAutoplayBlocked?: () => void;
  // Side-effect callbacks — the hook owns playback lifecycle only; analytics
  // and toasts stay with the caller.
  onLlFallback?: (reason: 'stalls' | 'fatal', detail?: string) => void;
  onFatalError?: () => void;
}

export interface UseHlsPlayerResult {
  // manifestPath is null while the camera is broadcasting but not yet
  // transcoding (WAITING_VIEWERS/QUEUED/STARTING on the backend) — this
  // viewer joining is what triggers the backend to start it. The parent's
  // live-playback query keeps polling every 5s, so this becomes non-null on
  // its own once the backend promotes the job to RUNNING.
  connecting: boolean;
  error: boolean;
  // Live hls instance (null on the Safari-native path). Exposed for
  // cross-panel coordination that needs playingDate/liveSyncPosition —
  // e.g. the wall-clock camera sync (use-clock-sync).
  hlsRef: RefObject<Hls | null>;
}

// The entire hls.js lifecycle for one camera panel: instance creation and
// tuning (STANDARD vs LL-HLS), Safari's native-HLS branch, manifest/levels,
// alternate audio selection, the LL→STANDARD fallback latch, quality pinning
// and the focus live-edge snap. Extracted from VideoPanel (see
// docs/review/video-panel-review.md) — behavior is characterized by
// VideoPanel.characterization.test.tsx.
export function useHlsPlayer({
  videoRef,
  camera,
  mode,
  isFocused,
  dvrActive = false,
  paused,
  selectedLevel,
  lowQuality,
  selectedAudioCameraId,
  onLevelsReady,
  onAutoplayBlocked,
  onLlFallback,
  onFatalError,
}: UseHlsPlayerOptions): UseHlsPlayerResult {
  const hlsRef = useRef<Hls | null>(null);
  // MANIFEST_PARSED's handler is created once per `src` (see the hls effect's
  // own deps below) and fires asynchronously — its closure would otherwise
  // see the `paused` value from whenever that effect last ran, not whatever
  // it is by the time the manifest actually finishes parsing.
  const pausedRef = useRef(paused);
  pausedRef.current = paused;
  // Refs so MANIFEST_PARSED (fires async, once per src) applies the current
  // quality choice rather than whatever it was when the load effect ran.
  const lowQualityRef = useRef(lowQuality);
  lowQualityRef.current = lowQuality;
  const selectedLevelRef = useRef(selectedLevel);
  selectedLevelRef.current = selectedLevel;
  // llPath carries a fresh ?token= on every 5s playback poll — a new string
  // each time. The build effect must NOT depend on it (that rebuilt the
  // player every poll); it depends on the stable hasLl boolean below and
  // reads the current URL through this ref at build time. Token refreshes
  // therefore apply on the next legitimate rebuild only; if the in-flight
  // token expires mid-session (1h TTL), the resulting fatal error lands on
  // the existing fallback latch — viewer degrades to STANDARD, by design.
  const llPathRef = useRef(camera.llPath);
  llPathRef.current = camera.llPath;
  // Read by the AUDIO_TRACKS_UPDATED handler below — tracks arrive after the
  // manifest parses, long after the mount-time selection effect already ran
  // against an empty track list.
  const selectedAudioCameraIdRef = useRef(selectedAudioCameraId);
  selectedAudioCameraIdRef.current = selectedAudioCameraId;
  // Callback refs: the callers pass inline lambdas; routing them through refs
  // keeps the build effect's dep list stable ([srcBase, hasLl]).
  const onLevelsReadyRef = useRef(onLevelsReady);
  onLevelsReadyRef.current = onLevelsReady;
  const onAutoplayBlockedRef = useRef(onAutoplayBlocked);
  onAutoplayBlockedRef.current = onAutoplayBlocked;
  const onLlFallbackRef = useRef(onLlFallback);
  onLlFallbackRef.current = onLlFallback;
  const onFatalErrorRef = useRef(onFatalError);
  onFatalErrorRef.current = onFatalError;

  const applyLevel = (hls: Hls) => {
    if (!hls.levels || hls.levels.length === 0) return;
    hls.currentLevel = lowQualityRef.current
      ? lowestLevelIndex(hls)
      : (selectedLevelRef.current ?? -1);
  };

  const [error, setError] = useState(false);
  const connecting = camera.manifestPath === null;
  const src = connecting ? null : mediaUrl(camera.manifestPath!);
  // The live STANDARD src now carries a `?pt` token refreshed every 5s poll,
  // so `src` changes every 5s. Keying the build effect on the token-STRIPPED
  // src rebuilds only on a REAL source change (packageId / job rotation), not
  // on a token refresh — same trick as llPathRef for the LL path. The build
  // reads the latest full src through srcRef, and every hls.js request rewrites
  // its `pt` to the freshest token via ptRef (see the effect's xhrSetup).
  const srcBase = src === null ? null : stripPt(src);
  const srcRef = useRef(src);
  srcRef.current = src;
  const ptRef = useRef<string | null>(null);
  ptRef.current = camera.manifestPath ? extractPt(camera.manifestPath) : null;
  // Latches once the LL-HLS path proves unreliable (repeated stalls or a
  // fatal hls.js error) for this camera's src — forces the STANDARD ABR
  // origin for the rest of this mount instead of flapping back to LL-HLS.
  const [forceStandard, setForceStandard] = useState(false);
  // Keyed on camera identity, not `src` — src's packageId can rotate mid-show
  // for the same STANDARD camera (job restart), which must NOT re-arm LL.
  // Only a genuine camera switch (this panel now shows a different camera)
  // should reset the latch.
  useEffect(() => {
    setForceStandard(false);
  }, [camera.cameraId]);
  // Stable selector for the build effect below — camera.llPath itself changes
  // on every 5s poll (fresh token), so it can't be a dep without rebuilding
  // the player every poll (see llPathRef above).
  const hasLl = mode === 'live' && !!camera.llPath && !forceStandard;

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src) return;
    setError(false);

    if (!Hls.isSupported()) {
      if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = srcRef.current!;
        const onErr = () => setError(true);
        video.addEventListener('error', onErr);
        // Live only: jump to the live edge once metadata loads. Replay is a
        // closed VOD timeline — starting at 0 (the browser default) is correct.
        if (mode === 'live') {
          const seekLive = () => {
            const s = video.seekable;
            if (s.length) video.currentTime = s.end(s.length - 1);
            // Safari won't autoplay unmuted via the attribute — kick it here.
            playBestEffort(video, onAutoplayBlockedRef.current);
          };
          video.addEventListener('loadedmetadata', seekLive);
          // ponytail: Safari native HLS has no request hook — it can't rewrite
          // `pt` per request like hls.js's xhrSetup above, so the token baked
          // into video.src at load still expires at 90s here. Re-point src to
          // the freshest token (srcRef, updated every 5s poll) at a cadence
          // safely under that TTL; the reassignment triggers Safari's native
          // reload, and the loadedmetadata listener above re-seeks to the live
          // edge and resumes playback — reusing the same recovery path as the
          // initial load. Costs a brief native stutter every ~60s, far gentler
          // than rebuilding the whole player every 5s (the old approach).
          let lastNativeSrc = srcRef.current;
          const REFRESH_MS = 60_000;
          const refresh = setInterval(() => {
            if (srcRef.current && srcRef.current !== lastNativeSrc) {
              lastNativeSrc = srcRef.current;
              video.src = srcRef.current;
            }
          }, REFRESH_MS);
          return () => {
            clearInterval(refresh);
            video.removeEventListener('loadedmetadata', seekLive);
            video.removeEventListener('error', onErr);
          };
        }
        return () => video.removeEventListener('error', onErr);
      }
      setError(true);
      return;
    }

    // LOW events: start on the LL-HLS path (real part-based playlists from
    // MediaMTX); fall back to the STANDARD transcoded ABR origin after
    // repeated stalls or a fatal error on that path — LL-HLS has no ABR
    // ladder, so bad bandwidth must degrade to it rather than freeze.
    // STANDARD events (llPath null) and replay always use the STANDARD
    // tuning below, unchanged from before this fallback existed.
    const activeSrc = hasLl ? mediaUrl(llPathRef.current!) : srcRef.current!;

    // ~3 segments (~6s) behind the live edge on the STANDARD tuning.
    // lowLatencyMode/tighter sync only makes sense against the LL-HLS
    // part-based playlist (activeSrc above) — our ffmpeg STANDARD origin
    // does not emit parts, so enabling it there only inherits aggressive
    // buffer tuning that stalls on any hiccup (TS transmux, late segment,
    // GC pause). No-ops for replay (VOD playlists ignore live sync tuning).
    const hls = new Hls({
      lowLatencyMode: hasLl,
      liveSyncDurationCount: hasLl ? 2 : 3,
      // Built at the non-DVR value; the effect below re-applies the relaxed one
      // in the same commit when the viewer is currently scrubbed back.
      liveMaxLatencyDurationCount: maxLatencyDurationCount(hasLl, false),
      backBufferLength: 10,
      maxLiveSyncPlaybackRate: 1.5,
      // Replay routes (manifest + segments) are JWT-gated, unlike live's
      // public /origin/* origin serving — attach the bearer token to every
      // request hls.js makes. No-op for live (mode default), so live's
      // network behavior is unchanged.
      ...(mode === 'replay' && {
        xhrSetup: (xhr: XMLHttpRequest) => {
          const token = tokenStore.get();
          if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        },
      }),
      // Live STANDARD: every request (master, rendition manifest, segment,
      // EXT-X-KEY) carries a `?pt` token baked in when its manifest was loaded;
      // that token expires at 90s. Rewrite each outgoing URL's `pt` to the
      // freshest token (refreshed every 5s poll via ptRef) so live playback
      // never 403s at the token boundary. hls.js 1.6's xhr-loader runs
      // xhrSetup BEFORE opening and only opens itself when `!xhr.readyState`,
      // so opening here with the rewritten URL wins. LL path is left untouched
      // (its token lifetime rides the existing LL→STANDARD fallback latch).
      ...(mode === 'live' && !hasLl && {
        xhrSetup: (xhr: XMLHttpRequest, url: string) => {
          const next = replacePtParam(url, ptRef.current);
          if (next !== url) xhr.open('GET', next, true);
        },
      }),
    });
    hls.loadSource(activeSrc);
    hls.attachMedia(video);
    hls.on(Hls.Events.MANIFEST_PARSED, () => {
      const sorted = hls.levels
        .map((l, i) => ({ index: i, height: l.height }))
        .sort((a, b) => b.height - a.height);
      onLevelsReadyRef.current?.(sorted);
      applyLevel(hls);
      // Live always autoplays; replay only if not currently paused (a fresh
      // camera thumbnail/tile shouldn't start itself just because its own
      // manifest happened to finish parsing after the shared paused state
      // was already set).
      if (mode !== 'replay' || !pausedRef.current) {
        playBestEffort(video, onAutoplayBlockedRef.current);
      }
    });
    // Apply the selected audio camera once the alternate tracks actually
    // exist — the selection effect below runs against an empty track list at
    // mount, so without this the initial choice was never applied and the
    // manifest's DEFAULT track played instead.
    hls.on(Hls.Events.AUDIO_TRACKS_UPDATED, () => {
      const idx = audioTrackIndexForCamera(
        hls.audioTracks.map((t) => ({ id: t.id, name: t.name })),
        selectedAudioCameraIdRef.current,
      );
      if (idx >= 0 && hls.audioTrack !== idx) hls.audioTrack = idx;
    });
    // Stalls within the last 30s on the LL path — 3 of them means the LL
    // origin can't keep this connection fed; drop the ABR-less LL path for
    // the STANDARD ladder instead of leaving the viewer frozen. The switch
    // is silent for the viewer (no visual signal by design) but reported via
    // onLlFallback, so ops can see how often LOW degrades and why.
    let stalls: number[] = [];
    let trackedFallback = false;
    const fallBackToStandard = (reason: 'stalls' | 'fatal', detail?: string) => {
      if (!trackedFallback) {
        trackedFallback = true;
        onLlFallbackRef.current?.(reason, detail);
      }
      setForceStandard(true); // re-runs this effect on the STANDARD src
    };
    hls.on(Hls.Events.ERROR, (_evt, data) => {
      if (hasLl && data.details === Hls.ErrorDetails.BUFFER_STALLED_ERROR) {
        const now = Date.now();
        stalls = [...stalls.filter((t) => now - t < 30_000), now];
        if (stalls.length >= 3) fallBackToStandard('stalls');
      }
      if (data.fatal) {
        if (hasLl) {
          fallBackToStandard('fatal', data.details); // LL path dead (MediaMTX down, token expired)
        } else {
          setError(true);
          onFatalErrorRef.current?.();
        }
      }
    });
    hlsRef.current = hls;

    return () => {
      hls.destroy();
      hlsRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [srcBase, hasLl]);

  // DVR: while the viewer sits behind the live edge, hls.js must stop dragging
  // them back to it. Applied to EVERY live panel, not just the primary — the
  // followers chase the primary's wall clock (use-clock-sync) and would
  // otherwise fight their own forced catch-up on each playlist refresh.
  useEffect(() => {
    const hls = hlsRef.current;
    if (!hls || mode !== 'live') return;
    hls.config.liveMaxLatencyDurationCount = maxLatencyDurationCount(hasLl, dvrActive);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dvrActive, hasLl, mode, srcBase]);

  // When this panel becomes the focused/main view (live), snap it to the live
  // edge. Background panels stay alive but can drift a second or two behind
  // live, so promoting one would otherwise reveal it slightly out of sync with
  // real time / the other tiles. Only nudges FORWARD, and only on a real gap.
  // Suspended during DVR playback: there, being behind live is the viewer's
  // explicit choice, and a camera switch must not silently cancel it.
  useEffect(() => {
    if (mode !== 'live' || !isFocused || dvrActive) return;
    const hls = hlsRef.current;
    const video = videoRef.current;
    if (!hls || !video) return;
    const live = hls.liveSyncPosition;
    if (typeof live === 'number' && Number.isFinite(live) && live - video.currentTime > 1) {
      video.currentTime = live;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFocused, mode, dvrActive]);

  useEffect(() => {
    if (hlsRef.current) applyLevel(hlsRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lowQuality, selectedLevel]);

  useEffect(() => {
    const hls = hlsRef.current;
    if (!hls) return;
    const idx = audioTrackIndexForCamera(
      hls.audioTracks.map((t) => ({ id: t.id, name: t.name })),
      selectedAudioCameraId,
    );
    if (idx >= 0 && hls.audioTrack !== idx) hls.audioTrack = idx;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAudioCameraId]);

  return { connecting, error, hlsRef };
}
