/**
 * F2 — replay position/scrubber moved from a camera's local time to the
 * event's absolute timeline. hls.js mocked (see VideoPanel.characterization
 * for the same pattern), next-intl echoes keys, media play/pause stubbed on
 * HTMLMediaElement.prototype.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, act, fireEvent } from '@testing-library/react';
import { ReplayPlayer } from './ReplayPlayer';
import type { ReplayCameraPlayback } from '../types/live.types';

// ── hls.js mock ──────────────────────────────────────────────────────────────
const h = vi.hoisted(() => {
  const instances: MockHls[] = [];
  class MockHls {
    static isSupported = () => true;
    static Events = {
      MANIFEST_PARSED: 'hlsManifestParsed',
      AUDIO_TRACKS_UPDATED: 'hlsAudioTracksUpdated',
      ERROR: 'hlsError',
    };
    static ErrorDetails = { BUFFER_STALLED_ERROR: 'bufferStalledError' };

    config: Record<string, unknown>;
    handlers = new Map<string, ((evt: string, data?: unknown) => void)[]>();
    levels: { height: number }[] = [];
    audioTracks: { id: number; name: string }[] = [];
    audioTrack = -1;
    currentLevel = -99;
    liveSyncPosition: number | undefined = undefined;
    loadSource = vi.fn();
    attachMedia = vi.fn();
    destroy = vi.fn();

    constructor(config: Record<string, unknown>) {
      this.config = config;
      instances.push(this);
    }
    on(evt: string, cb: (evt: string, data?: unknown) => void) {
      this.handlers.set(evt, [...(this.handlers.get(evt) ?? []), cb]);
    }
    emit(evt: string, data?: unknown) {
      for (const cb of this.handlers.get(evt) ?? []) cb(evt, data);
    }
  }
  return { MockHls, instances };
});

vi.mock('hls.js', () => ({ default: h.MockHls }));
vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));
vi.mock('@/lib/analytics/analytics-client', () => ({ track: vi.fn() }));
vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
vi.mock('@/features/reports', () => ({ ReportButton: () => null }));

const authState = { isLoggedIn: true };
vi.mock('@/features/account/hooks/use-auth', () => ({
  useAuth: () => authState,
}));

const reportMock = vi.fn();
vi.mock('@/features/playback-progress', () => ({
  useTrackPlaybackProgress: () => ({ report: reportMock }),
  usePlaybackProgressQuery: () => progressQueryState,
}));

let progressQueryState: { data: unknown } = { data: undefined };

// ── jsdom media stubs ────────────────────────────────────────────────────────
const playMock = vi.fn<() => Promise<void>>(() => Promise.resolve());
const pauseMock = vi.fn();

beforeEach(() => {
  // jsdom não implementa ResizeObserver, e o CameraGrid mede o palco com ele.
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
  h.instances.length = 0;
  reportMock.mockClear();
  progressQueryState = { data: undefined };
  authState.isLoggedIn = true;
  playMock.mockClear().mockImplementation(() => Promise.resolve());
  pauseMock.mockClear();
  Object.defineProperty(HTMLMediaElement.prototype, 'play', {
    configurable: true, writable: true, value: playMock,
  });
  Object.defineProperty(HTMLMediaElement.prototype, 'pause', {
    configurable: true, writable: true, value: pauseMock,
  });
});

function lastHls() {
  return h.instances[h.instances.length - 1];
}

const CAM_A_START_MS = 1_000_000; // event start
const CAM_B_START_MS = 1_000_000 + 300_000; // camera B joined 5 minutes late

const camA: ReplayCameraPlayback = {
  cameraId: 'cam-a',
  name: 'Câmera A',
  slug: 'camera-a',
  priority: 1,
  replayPath: '/packages/pkg-a/replay/master.m3u8',
  coverage: [{ startsAtMs: CAM_A_START_MS, endsAtMs: CAM_A_START_MS + 600_000, localStartSec: 0 }],
};

const camB: ReplayCameraPlayback = {
  cameraId: 'cam-b',
  name: 'Câmera B',
  slug: 'camera-b',
  priority: 2,
  replayPath: '/packages/pkg-b/replay/master.m3u8',
  coverage: [{ startsAtMs: CAM_B_START_MS, endsAtMs: CAM_B_START_MS + 300_000, localStartSec: 0 }],
};

const timeline = { startsAtMs: CAM_A_START_MS, endsAtMs: CAM_A_START_MS + 600_000 };

describe('ReplayPlayer — absolute timeline', () => {
  it('renders the unavailable state instead of throwing when timeline is null', () => {
    const { getByText, queryByRole } = render(
      <ReplayPlayer cameras={[camA]} title="Show" eventId="evt-1" timeline={null} />,
    );
    expect(getByText('Replay ainda não disponível para este evento.')).toBeTruthy();
    expect(queryByRole('slider')).toBeNull();
  });

  it('spans the scrubber over the event timeline, not a camera duration', () => {
    const { container } = render(
      <ReplayPlayer cameras={[camA]} title="Show" eventId="evt-1" timeline={timeline} />,
    );
    const slider = container.querySelector('input[type="range"][aria-label="Posição de reprodução"]') as HTMLInputElement;
    expect(slider.min).toBe(String(timeline.startsAtMs));
    expect(slider.max).toBe(String(timeline.endsAtMs));
  });

  it('seeking emits an absolute instant in seekCommand', () => {
    const { container } = render(
      <ReplayPlayer cameras={[camA]} title="Show" eventId="evt-1" timeline={timeline} />,
    );
    const slider = container.querySelector('input[type="range"][aria-label="Posição de reprodução"]') as HTMLInputElement;
    const seekTarget = CAM_A_START_MS + 120_000; // 2 minutes in, absolute ms
    fireEvent.change(slider, { target: { value: String(seekTarget) } });

    // O scrubber opera em instante ABSOLUTO (ms), mas quem chega ao elemento é
    // o tempo LOCAL da câmera, em segundos — o VideoPanel traduz pela cobertura
    // dela. É essa tradução que faz uma câmera que entrou atrasada parar num
    // ponto diferente do mesmo instante do evento.
    const video = container.querySelector('video')!;
    expect(video.currentTime).toBe(120);
  });

  it('converts the primary panel local progress to absolute before reporting, relative to the timeline start', () => {
    const { container } = render(
      <ReplayPlayer cameras={[camA]} title="Show" eventId="evt-1" timeline={timeline} />,
    );
    const video = container.querySelector('video')!;
    Object.defineProperty(video, 'currentTime', { value: 90, configurable: true });
    Object.defineProperty(video, 'duration', { value: 600, configurable: true });
    fireEvent(video, new Event('timeupdate'));

    // absoluteMs = CAM_A_START_MS + 90_000 → elapsed since timeline start = 90s.
    expect(reportMock).toHaveBeenCalledWith(90, 600);
  });

  it('resumes by seeking to timelineStart + resumeSeconds', () => {
    progressQueryState = {
      data: [{ eventId: 'evt-1', positionSeconds: 200, durationSeconds: 600, resumeSeconds: 150, completed: false, updatedAt: '' }],
    };
    const { container } = render(
      <ReplayPlayer cameras={[camA]} title="Show" eventId="evt-1" timeline={timeline} />,
    );
    const video = container.querySelector('video')!;
    // O progresso é gravado em segundos RELATIVOS ao início da timeline, então
    // retomar é `timelineStart + resumeSeconds` no eixo absoluto — que, na
    // câmera A (que cobre o evento desde o início), dá 150 segundos locais.
    // currentTime é sempre em segundos; comparar com milissegundos aqui pediria
    // 150 mil segundos de vídeo.
    expect(video.currentTime).toBe(150);
  });
});

// Regression: the camera drawer used to render inside CameraGrid's `.stage`
// root, nested inside `.stageArea` — an element with its own z-index/stacking
// context — so it could never legitimately outrank the player header (fixed
// z-index 20). CameraGrid now portals the drawer to a `.gridArea` sibling of
// `.stageArea` (see ReplayPlayer.tsx), which lets the drawer's z-index (25)
// compete with the header directly.
describe('ReplayPlayer — camera drawer stacking', () => {
  it('renders the drawer outside the stage/grid wrapper, not covered by the header', () => {
    const { container, getByTitle } = render(
      <ReplayPlayer cameras={[camA, camB]} title="Show" eventId="evt-1" timeline={timeline} />,
    );

    fireEvent.click(getByTitle('Alternar câmeras'));

    const drawer = container.querySelector('[class*="drawer"]');
    expect(drawer).not.toBeNull();

    // `.stageArea` is the wrapper with its own z-index (see
    // ReplayPlayer.module.scss / LivePlayer.module.scss) — the stacking
    // context that used to trap the drawer below the header.
    const stageArea = container.querySelector('[class*="stageArea"]');
    expect(stageArea).not.toBeNull();
    expect(stageArea!.contains(drawer)).toBe(false);
  });
});
