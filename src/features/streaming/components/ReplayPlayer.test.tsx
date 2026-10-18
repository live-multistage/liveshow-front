/**
 * F2 — replay position/scrubber moved from a camera's local time to the
 * event's absolute timeline. hls.js mocked (see VideoPanel.characterization
 * for the same pattern), next-intl echoes keys, media play/pause stubbed on
 * HTMLMediaElement.prototype.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, act, fireEvent, within, screen } from '@testing-library/react';
import { ReplayPlayer, toLiveCamera } from './ReplayPlayer';
import { DRAWER_W } from './CameraGrid';
import type { ReplayCameraPlayback, ReplayChapter, ReplayStagePlayback } from '../types/live.types';

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

vi.mock('../hooks/use-stream-unlock', () => ({ useStreamUnlock: () => ({ unlock: vi.fn(), pending: false }) }));
vi.mock('hls.js', () => ({ default: h.MockHls }));
vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));
vi.mock('@/lib/analytics/tracking', () => ({ useAnalytics: () => ({ track: vi.fn() }) }));
vi.mock('@live-show/analytics-sdk/react', () => ({ TrackFeature: ({ children }: { children: unknown }) => children }));
// Needs a React Query provider; not what these tests exercise.
vi.mock('./RecommendedOverlay', () => ({ RecommendedOverlay: () => null }));
vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
vi.mock('@/features/reports', () => ({ ReportButton: () => null }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));

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
  available: true,
  replayPath: '/packages/pkg-a/replay/master.m3u8',
  coverage: [{ startsAtMs: CAM_A_START_MS, endsAtMs: CAM_A_START_MS + 600_000, localStartSec: 0 }],
};

const camB: ReplayCameraPlayback = {
  cameraId: 'cam-b',
  name: 'Câmera B',
  slug: 'camera-b',
  priority: 2,
  available: true,
  replayPath: '/packages/pkg-b/replay/master.m3u8',
  coverage: [{ startsAtMs: CAM_B_START_MS, endsAtMs: CAM_B_START_MS + 300_000, localStartSec: 0 }],
};

const timeline = { startsAtMs: CAM_A_START_MS, endsAtMs: CAM_A_START_MS + 600_000 };

describe('ReplayPlayer — absolute timeline', () => {
  it('renders the unavailable state instead of throwing when timeline is null', () => {
    const { getByText, queryByRole } = render(
      <ReplayPlayer cameras={[camA]} title="Show" eventId="evt-1" timeline={null} />,
    );
    expect(getByText('replayNotAvailable')).toBeTruthy();
    expect(queryByRole('slider')).toBeNull();
  });

  it('spans the scrubber over the event timeline, not a camera duration', () => {
    const { container } = render(
      <ReplayPlayer cameras={[camA]} title="Show" eventId="evt-1" timeline={timeline} />,
    );
    const slider = container.querySelector('input[type="range"][aria-label="seekPosition"]') as HTMLInputElement;
    expect(slider.min).toBe(String(timeline.startsAtMs));
    expect(slider.max).toBe(String(timeline.endsAtMs));
  });

  it('seeking emits an absolute instant in seekCommand', () => {
    const { container } = render(
      <ReplayPlayer cameras={[camA]} title="Show" eventId="evt-1" timeline={timeline} />,
    );
    const slider = container.querySelector('input[type="range"][aria-label="seekPosition"]') as HTMLInputElement;
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

// The header's round buttons used to overlap the camera drawer's top-right
// corner and eat its clicks (the drawer sits at a fixed DRAWER_W strip on
// the right). A padding-only fix (tried and reverted) padded the header's
// CONTENTS but left its own (transparent) box full-width, still sitting
// over the drawer's close/mode buttons. Fix: while the picker is open, the
// header's own box is constrained with `right: DRAWER_W` (sourced from
// CameraGrid, not a duplicated pixel value) so it stops before the drawer's
// strip, AND the bar gets `pointer-events: none` with `auto` restored on its
// own buttons/links (see Header.module.scss's `.header`) so its transparent
// area can never swallow a click meant for whatever's underneath.
describe('ReplayPlayer — header stays clear of the camera drawer', () => {
  it('constrains the header box by DRAWER_W once the camera drawer opens, and clears it on close', () => {
    const { container, getByTitle } = render(
      <ReplayPlayer cameras={[camA, camB]} title="Show" eventId="evt-1" timeline={timeline} />,
    );
    const header = container.querySelector('header')!;
    expect(header.style.right).toBe('');

    fireEvent.click(getByTitle('toggleCameras'));
    expect(header.style.right).toBe(`${DRAWER_W}px`);

    fireEvent.click(getByTitle('toggleCameras'));
    expect(header.style.right).toBe('');
  });

  it('keeps the drawer close button reachable through the (offset) header bar', () => {
    const { container, getByTitle, getByLabelText, queryByLabelText } = render(
      <ReplayPlayer cameras={[camA, camB]} title="Show" eventId="evt-1" timeline={timeline} />,
    );

    fireEvent.click(getByTitle('toggleCameras'));
    expect(container.querySelector('[class*="drawer"]')).not.toBeNull();

    fireEvent.click(getByLabelText('closeCameras'));
    expect(queryByLabelText('closeCameras')).toBeNull();
  });
});

// Replay mirrors the live chrome: stage tabs + share, but no chat / viewers.
describe('ReplayPlayer — shared chrome', () => {
  it('renders stage tabs and swaps cameras on stage change', () => {
    const stages: ReplayStagePlayback[] = [
      { stageId: 's1', name: 'Palco A', slug: 'a', position: 0, cameras: [camA] },
      { stageId: 's2', name: 'Palco B', slug: 'b', position: 1, cameras: [camB] },
    ];
    const { getByRole, container } = render(
      <ReplayPlayer cameras={[camA, camB]} stages={stages} title="Show" eventId="evt-1" timeline={timeline} />,
    );
    expect(container.querySelectorAll('video')).toHaveLength(1);
    expect(lastHls().loadSource).toHaveBeenCalledWith(expect.stringContaining('pkg-a'));

    fireEvent.click(getByRole('tab', { name: /Palco B/ }));
    expect(lastHls().loadSource).toHaveBeenCalledWith(expect.stringContaining('pkg-b'));
  });

  it('carries the instant being watched to the camera that takes over', () => {
    const stages: ReplayStagePlayback[] = [
      { stageId: 's1', name: 'Palco A', slug: 'a', position: 0, cameras: [camA] },
      { stageId: 's2', name: 'Palco B', slug: 'b', position: 1, cameras: [camB] },
    ];
    const { getByRole, container } = render(
      <ReplayPlayer cameras={[camA, camB]} stages={stages} title="Show" eventId="evt-1" timeline={timeline} />,
    );
    const videoA = container.querySelector('video')!;
    Object.defineProperty(videoA, 'currentTime', { value: 400, configurable: true });
    Object.defineProperty(videoA, 'duration', { value: 600, configurable: true });
    fireEvent(videoA, new Event('timeupdate'));

    fireEvent.click(getByRole('tab', { name: /Palco B/ }));

    // A 400s is B 100s: B joined the event 300s late.
    expect(container.querySelector('video')!.currentTime).toBe(100);
  });

  it('exposes share and the REPLAY badge, with no chat or viewer chrome', () => {
    const { getByLabelText, getAllByText, queryByTitle, container } = render(
      <ReplayPlayer cameras={[camA]} title="Show" eventId="evt-1" timeline={timeline} />,
    );
    expect(getByLabelText('share')).toBeTruthy();
    expect(getAllByText('REPLAY').length).toBeGreaterThan(0);
    expect(queryByTitle('toggleChat')).toBeNull();
    expect(container.querySelector('svg.lucide-users')).toBeNull();
  });
});

// Chapters are optional replay data: no chapters → today's player; with
// chapters → segmented track, title, pill and drawer, all following the stage.
describe('ReplayPlayer — chapters', () => {
  const chapter = (id: string, title: string, startSec: number, endSec: number, stageId: string | null = null): ReplayChapter => ({
    id, stageId, title, description: null, artists: [],
    startsAtMs: CAM_A_START_MS + startSec * 1000,
    endsAtMs: CAM_A_START_MS + endSec * 1000,
  });
  const twoStages: ReplayStagePlayback[] = [
    { stageId: 's1', name: 'Palco A', slug: 'a', position: 0, cameras: [camA] },
    { stageId: 's2', name: 'Palco B', slug: 'b', position: 1, cameras: [camB] },
  ];
  const drawer = () => screen.getByRole('complementary', { name: 'chapters.label' });

  it('renders exactly as before when the event has no chapters', () => {
    const { queryByLabelText, container } = render(
      <ReplayPlayer cameras={[camA]} title="Show" eventId="evt-1" timeline={timeline} chapters={[]} />,
    );
    expect(queryByLabelText('chapters.open')).toBeNull();
    expect(container.querySelector('[data-chapter-track]')).toBeNull();
  });

  it('segments the scrubber and titles the chapter playing now', () => {
    const { container, getByText, getByLabelText } = render(
      <ReplayPlayer cameras={[camA]} title="Show" eventId="evt-1" timeline={timeline} chapters={[chapter('c1', 'Abertura', 0, 60), chapter('c2', 'Banda Aurora', 120, 300)]} />,
    );
    expect(container.querySelector('[data-chapter-track]')).not.toBeNull();
    expect(getByText('Abertura')).toBeTruthy(); // position seeds at the timeline start
    expect(getByLabelText('chapters.open').textContent).toContain('2');
  });

  it('jumps to a chapter from the drawer, keeps it open and moves the highlight', () => {
    const { getByLabelText, container } = render(
      <ReplayPlayer cameras={[camA]} title="Show" eventId="evt-1" timeline={timeline} chapters={[chapter('c1', 'Abertura', 0, 60), chapter('c2', 'Banda Aurora', 120, 300)]} />,
    );
    fireEvent.click(getByLabelText('chapters.open'));
    expect(container.querySelector('[data-chapters-open]')).not.toBeNull();

    fireEvent.click(within(drawer()).getByText('Banda Aurora').closest('button')!);

    expect(container.querySelector('video')!.currentTime).toBe(120);
    expect(within(drawer()).getByText('Banda Aurora').closest('button')).toHaveAttribute('aria-current', 'true');
    // The pill flips to its close label (the drawer's own close button shares it).
    expect(container.querySelector('header [aria-label="chapters.open"][aria-expanded="true"]')).not.toBeNull();
  });

  it('lists event-wide chapters plus the current stage, and follows a stage switch', () => {
    const chapters = [chapter('all', 'Abertura', 0, 60), chapter('a', 'Banda Aurora', 60, 180, 's1'), chapter('b', 'Trio Maré', 60, 180, 's2')];
    const { getByLabelText, getByRole } = render(
      <ReplayPlayer cameras={[camA, camB]} stages={twoStages} title="Show" eventId="evt-1" timeline={timeline} chapters={chapters} />,
    );
    fireEvent.click(getByLabelText('chapters.open'));
    expect(within(drawer()).getByText('Banda Aurora')).toBeTruthy();
    expect(within(drawer()).queryByText('Trio Maré')).toBeNull();
    expect(within(drawer()).getByText('Palco A')).toBeTruthy(); // stage tag

    fireEvent.click(getByRole('tab', { name: /Palco B/ }));

    expect(within(drawer()).getByText('Trio Maré')).toBeTruthy();
    expect(within(drawer()).queryByText('Banda Aurora')).toBeNull();
    expect(within(drawer()).getByText('Abertura')).toBeTruthy();
  });

  it('closes the drawer and drops the pill when a stage switch leaves nothing to list', () => {
    const { getByLabelText, getByRole, queryByRole, queryByLabelText, container } = render(
      <ReplayPlayer cameras={[camA, camB]} stages={twoStages} title="Show" eventId="evt-1" timeline={timeline} chapters={[chapter('a', 'Banda Aurora', 0, 60, 's1')]} />,
    );
    fireEvent.click(getByLabelText('chapters.open'));
    fireEvent.click(getByRole('tab', { name: /Palco B/ }));

    expect(queryByRole('complementary', { name: 'chapters.label' })).toBeNull();
    expect(queryByLabelText('chapters.open')).toBeNull();
    expect(container.querySelector('[data-chapters-open]')).toBeNull();
  });

  it('keeps one side drawer at a time: opening cameras closes chapters', () => {
    const { getByLabelText, getByTitle, queryByRole } = render(
      <ReplayPlayer cameras={[camA, camB]} title="Show" eventId="evt-1" timeline={timeline} chapters={[chapter('c1', 'Abertura', 0, 60)]} />,
    );
    fireEvent.click(getByLabelText('chapters.open'));
    fireEvent.click(getByTitle('toggleCameras'));
    expect(queryByRole('complementary', { name: 'chapters.label' })).toBeNull();
  });

  it('does not pull focus back to the pill when Câmeras closes the drawer', () => {
    const { getByLabelText, getByTitle } = render(
      <ReplayPlayer cameras={[camA, camB]} title="Show" eventId="evt-1" timeline={timeline} chapters={[chapter('c1', 'Abertura', 0, 60)]} />,
    );
    const pill = getByLabelText('chapters.open');
    pill.focus();
    fireEvent.click(pill);
    const cameras = getByTitle('toggleCameras');
    cameras.focus();
    fireEvent.click(cameras);
    expect(document.activeElement).not.toBe(pill);
    expect(document.activeElement).toBe(cameras);
  });

  it('keeps one side drawer at a time: opening chapters closes cameras', () => {
    const { getByLabelText, getByTitle, container } = render(
      <ReplayPlayer cameras={[camA, camB]} title="Show" eventId="evt-1" timeline={timeline} chapters={[chapter('c1', 'Abertura', 0, 60)]} />,
    );
    fireEvent.click(getByTitle('toggleCameras'));
    fireEvent.click(getByLabelText('chapters.open'));
    expect(container.querySelector('[data-chapters-open]')).not.toBeNull();
    expect(getByTitle('toggleCameras').className).not.toMatch(/drawerBtnActive/);
  });

  it('closes the drawer on Escape', () => {
    const { getByLabelText, queryByRole } = render(
      <ReplayPlayer cameras={[camA]} title="Show" eventId="evt-1" timeline={timeline} chapters={[chapter('c1', 'Abertura', 0, 60)]} />,
    );
    fireEvent.click(getByLabelText('chapters.open'));
    act(() => { fireEvent.keyDown(window, { key: 'Escape' }); });
    expect(queryByRole('complementary', { name: 'chapters.label' })).toBeNull();
  });
});

describe('ReplayPlayer — transmissions', () => {
  it("spans the scrubber over the active transmission's own window", () => {
    const vipTimeline = { startsAtMs: CAM_B_START_MS, endsAtMs: CAM_B_START_MS + 300_000 };
    const streams = [
      { id: 'main', title: 'Principal', position: 0, stages: [], cameras: [camA], primaryCameraId: 'cam-a', librasCameraId: null, timeline },
      { id: 'vip', title: 'VIP', position: 1, stages: [], cameras: [camB], primaryCameraId: 'cam-b', librasCameraId: null, timeline: vipTimeline },
    ];

    const { container } = render(
      <ReplayPlayer cameras={[camA]} title="Evento" eventId="evt-1" timeline={timeline} streams={streams} defaultStreamId="vip" />,
    );

    const slider = container.querySelector('input[type="range"][aria-label="seekPosition"]') as HTMLInputElement;
    expect(slider.min).toBe(String(vipTimeline.startsAtMs));
    expect(slider.max).toBe(String(vipTimeline.endsAtMs));
  });
});

describe('ReplayPlayer — transmissions, progress and switching', () => {
  // vip covers the second half of main's window; late starts after main ends.
  const vipTimeline = { startsAtMs: CAM_B_START_MS, endsAtMs: CAM_B_START_MS + 300_000 };
  const LATE_START_MS = CAM_A_START_MS + 700_000;
  const camLate: ReplayCameraPlayback = {
    ...camB,
    cameraId: 'cam-late',
    replayPath: '/packages/pkg-late/replay/master.m3u8',
    coverage: [{ startsAtMs: LATE_START_MS, endsAtMs: LATE_START_MS + 100_000, localStartSec: 0 }],
  };
  const lateTimeline = { startsAtMs: LATE_START_MS, endsAtMs: LATE_START_MS + 100_000 };
  const main = { id: 'main', title: 'Principal', position: 0, stages: [], cameras: [camA], primaryCameraId: 'cam-a', librasCameraId: null, timeline };
  const vip = { id: 'vip', title: 'VIP', position: 1, stages: [], cameras: [camB], primaryCameraId: 'cam-b', librasCameraId: null, timeline: vipTimeline };
  const late = { id: 'late', title: 'Late', position: 2, stages: [], cameras: [camLate], primaryCameraId: 'cam-late', librasCameraId: null, timeline: lateTimeline };
  const slider = (c: HTMLElement) => c.querySelector('input[type="range"][aria-label="seekPosition"]') as HTMLInputElement;
  const tick = (video: HTMLVideoElement, seconds: number) => {
    Object.defineProperty(video, 'currentTime', { value: seconds, configurable: true });
    fireEvent(video, new Event('timeupdate'));
  };

  it("reports progress relative to the default (flat) window while another transmission plays", () => {
    const { container } = render(
      <ReplayPlayer cameras={[camA]} title="Evento" eventId="evt-1" timeline={timeline} streams={[main, vip]} defaultStreamId="vip" />,
    );

    tick(container.querySelector('video')!, 90);

    // vip local 90s = absolute CAM_B_START_MS + 90s = 390s into main's window.
    expect(reportMock).toHaveBeenLastCalledWith(390, 600);
  });

  it('clamps reported progress to the default window when the playing transmission runs past it', () => {
    const { container } = render(
      <ReplayPlayer cameras={[camA]} title="Evento" eventId="evt-1" timeline={timeline} streams={[main, late]} defaultStreamId="late" />,
    );

    tick(container.querySelector('video')!, 10);

    expect(reportMock).toHaveBeenLastCalledWith(600, 600);
  });

  it('resumes relative to the default window, landed on the transmission on screen', () => {
    progressQueryState = {
      data: [{ eventId: 'evt-1', positionSeconds: 400, durationSeconds: 600, resumeSeconds: 400, completed: false, updatedAt: '' }],
    };
    const { container } = render(
      <ReplayPlayer cameras={[camA]} title="Evento" eventId="evt-1" timeline={timeline} streams={[main, vip]} defaultStreamId="vip" />,
    );

    // main start + 400s = CAM_B_START_MS + 100s → vip camera local 100s.
    expect(slider(container).value).toBe(String(CAM_A_START_MS + 400_000));
    expect(container.querySelector('video')!.currentTime).toBe(100);
  });

  it('clamps a resume point outside the active window to its nearest edge', () => {
    // main start + 700s is past vip's end (main start + 600s).
    progressQueryState = {
      data: [{ eventId: 'evt-1', positionSeconds: 700, durationSeconds: 800, resumeSeconds: 700, completed: false, updatedAt: '' }],
    };
    const { container } = render(
      <ReplayPlayer cameras={[camA]} title="Evento" eventId="evt-1" timeline={timeline} streams={[main, vip]} defaultStreamId="vip" />,
    );

    // The range input sanitizes its own value, so read the elapsed label: at
    // vip's end it equals the trailing duration label (5:00).
    expect(within(container).getAllByText('5:00')).toHaveLength(2);
    expect(container.querySelector('video')!.currentTime).toBe(300);
  });

  it('a switch keeps the same instant when the new transmission covers it', () => {
    const props = { cameras: [camA], title: 'Evento', eventId: 'evt-1', timeline, defaultStreamId: 'main' };
    const { container, rerender } = render(<ReplayPlayer {...props} streams={[main, vip]} defaultStreamId="vip" />);
    fireEvent.change(slider(container), { target: { value: String(CAM_A_START_MS + 500_000) } });

    rerender(<ReplayPlayer {...props} streams={[main]} />);

    expect(slider(container).value).toBe(String(CAM_A_START_MS + 500_000));
    expect(container.querySelector('video')!.currentTime).toBe(500);
  });

  it("a switch to a transmission that doesn't cover the instant lands on its nearest edge", () => {
    const props = { cameras: [camA], title: 'Evento', eventId: 'evt-1', timeline, defaultStreamId: 'main' };
    const { container, rerender } = render(<ReplayPlayer {...props} streams={[main, late]} defaultStreamId="late" />);
    fireEvent.change(slider(container), { target: { value: String(LATE_START_MS + 50_000) } });

    rerender(<ReplayPlayer {...props} streams={[main]} />);

    // At main's end: elapsed label = duration label (10:00), camera A local 600s.
    expect(within(container).getAllByText('10:00')).toHaveLength(2);
    expect(container.querySelector('video')!.currentTime).toBe(600);
  });

  it('opens on the first transmission with a replay when the default has none', () => {
    const noReplay = { ...main, cameras: [{ ...camA, replayPath: null }], timeline: null };
    const { container } = render(
      <ReplayPlayer cameras={[]} title="Evento" eventId="evt-1" timeline={null} streams={[noReplay, vip]} defaultStreamId="main" />,
    );

    expect(slider(container).min).toBe(String(vipTimeline.startsAtMs));
  });
});

describe('toLiveCamera', () => {
  it('forwards the audio tracks so replay offers the same selector as live', () => {
    const audioTracks = [
      { index: 0, language: 'por', label: null, default: true },
      { index: 1, language: 'eng', label: null, default: false },
    ];
    const live = toLiveCamera({
      cameraId: 'c1', name: 'Main', slug: 'main', priority: 1, replayPath: '/r.m3u8',
      coverage: [], available: true, thumbnailUrl: null, audioTracks,
    });
    expect(live.audioTracks).toEqual(audioTracks);
  });
});
