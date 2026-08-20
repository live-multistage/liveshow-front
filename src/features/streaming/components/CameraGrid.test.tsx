/**
 * Live seek commands are addressed to ONE camera. Each live camera is its own
 * media timeline, so an offset taken from camera A is meaningless on camera B —
 * and the primary role can move to B without any explicit promotion, e.g. when
 * the picker deselects the camera that is currently main.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { CameraGrid } from './CameraGrid';
import type { LiveCamera } from '../types/live.types';

const h = vi.hoisted(() => {
  class MockHls {
    static isSupported = () => true;
    static Events = {
      MANIFEST_PARSED: 'hlsManifestParsed',
      AUDIO_TRACKS_UPDATED: 'hlsAudioTracksUpdated',
      ERROR: 'hlsError',
    };
    static ErrorDetails = { BUFFER_STALLED_ERROR: 'bufferStalledError' };
    config: Record<string, unknown>;
    levels: { height: number }[] = [];
    audioTracks: { id: number; name: string }[] = [];
    audioTrack = -1;
    currentLevel = -1;
    liveSyncPosition: number | undefined = undefined;
    loadSource = vi.fn();
    attachMedia = vi.fn();
    destroy = vi.fn();
    on = vi.fn();
    constructor(config: Record<string, unknown>) {
      this.config = config;
    }
  }
  return { MockHls };
});

vi.mock('hls.js', () => ({ default: h.MockHls }));
vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));
vi.mock('@/lib/analytics/analytics-client', () => ({ track: vi.fn() }));
vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));

beforeEach(() => {
  Object.defineProperty(HTMLMediaElement.prototype, 'play', {
    configurable: true, writable: true, value: vi.fn(() => Promise.resolve()),
  });
  Object.defineProperty(HTMLMediaElement.prototype, 'pause', {
    configurable: true, writable: true, value: vi.fn(),
  });
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
});

const cam = (id: string): LiveCamera => ({
  cameraId: id,
  name: id,
  slug: id,
  priority: 1,
  manifestPath: `/origin/${id}/master.m3u8`,
  llPath: null,
});

const cameras = [cam('cam-a'), cam('cam-b')];

const baseProps = {
  cameras,
  globalMuted: true,
  onGlobalMutedChange: vi.fn(),
  audioCameraId: null,
  onAudioCameraChange: vi.fn(),
  volume: 1,
  viewMode: 'main-rail' as const,
  onViewModeChange: vi.fn(),
  onMainCameraChange: vi.fn(),
};

// [cam-a's <video>, cam-b's <video>] — CameraGrid renders one panel per stage
// camera, in `cameras` order, and never unmounts them.
const videos = (container: HTMLElement) =>
  Array.from(container.querySelectorAll('video')) as HTMLVideoElement[];

describe('CameraGrid — live seek command routing', () => {
  it('applies a live seek only to the camera it was issued for', () => {
    const { container } = render(
      <CameraGrid
        {...baseProps}
        activeCameraIds={['cam-a', 'cam-b']}
        mainCameraId="cam-a"
        seekCommand={{ time: 1200, token: 1, cameraId: 'cam-a' }}
      />,
    );
    const [a, b] = videos(container);
    expect(a.currentTime).toBe(1200);
    expect(b.currentTime).toBe(0);
  });

  it('does not replay a stale seek onto the camera promoted by DESELECTING the main one', () => {
    const seekCommand = { time: 1200, token: 1, cameraId: 'cam-a' };
    const { container, rerender } = render(
      <CameraGrid
        {...baseProps}
        activeCameraIds={['cam-a', 'cam-b']}
        mainCameraId="cam-a"
        seekCommand={seekCommand}
      />,
    );

    // The picker deselects cam-a. mainCameraId still names it (LivePlayer only
    // updates activeCameraIds here), so the primary falls through to cam-b —
    // with the seek command from cam-a's unrelated timeline still live.
    rerender(
      <CameraGrid
        {...baseProps}
        activeCameraIds={['cam-b']}
        mainCameraId="cam-a"
        seekCommand={seekCommand}
      />,
    );

    expect(videos(container)[1].currentTime).toBe(0);
  });

  it('replay still seeks every panel together', () => {
    const { container } = render(
      <CameraGrid
        {...baseProps}
        mode="replay"
        activeCameraIds={['cam-a', 'cam-b']}
        mainCameraId="cam-a"
        seekCommand={{ time: 42, token: 1 }}
      />,
    );
    expect(videos(container).map((v) => v.currentTime)).toEqual([42, 42]);
  });
});

// The camera drawer used to render inside CameraGrid's own `.stage` root,
// which sits inside LivePlayer/ReplayPlayer's `.stageArea` — an element with
// its own z-index (and therefore its own stacking context). A z-index on the
// drawer could never outrank the player header from in there (see
// LivePlayer.tsx / CameraGrid.module.scss). CameraGrid now portals the
// drawer into a `drawerContainer` supplied by the player, escaping that
// stacking context.
describe('CameraGrid — camera drawer placement', () => {
  it('portals the drawer into drawerContainer, out of the stage wrapper, when open', () => {
    const portalTarget = document.createElement('div');
    document.body.appendChild(portalTarget);

    const { container } = render(
      <CameraGrid
        {...baseProps}
        activeCameraIds={['cam-a', 'cam-b']}
        mainCameraId="cam-a"
        pickerOpen
        drawerContainer={portalTarget}
      />,
    );

    const stage = container.firstElementChild as HTMLElement;
    expect(stage.querySelector('[class*="drawer"]')).toBeNull();
    expect(portalTarget.querySelector('[class*="drawer"]')).not.toBeNull();

    document.body.removeChild(portalTarget);
  });

  it('renders nothing in drawerContainer, and nothing at all, when the picker is closed', () => {
    const portalTarget = document.createElement('div');
    document.body.appendChild(portalTarget);

    render(
      <CameraGrid
        {...baseProps}
        activeCameraIds={['cam-a', 'cam-b']}
        mainCameraId="cam-a"
        pickerOpen={false}
        drawerContainer={portalTarget}
      />,
    );

    expect(portalTarget.querySelector('[class*="drawer"]')).toBeNull();

    document.body.removeChild(portalTarget);
  });

  it('falls back to rendering the drawer inline when no drawerContainer is given', () => {
    const { container } = render(
      <CameraGrid
        {...baseProps}
        activeCameraIds={['cam-a', 'cam-b']}
        mainCameraId="cam-a"
        pickerOpen
      />,
    );

    expect(container.querySelector('[class*="drawer"]')).not.toBeNull();
  });
});
