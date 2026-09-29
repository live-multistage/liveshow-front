import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useViewerTracking } from './use-viewer-tracking';

const HEARTBEAT_INTERVAL_MS = 20_000;
import { viewerTrackingService } from '../services/viewer-tracking.service';

const mockTrack = vi.hoisted(() => vi.fn());
vi.mock('@/lib/analytics/session-id', () => ({ getSessionId: () => 'visit-1' }));
vi.mock('@/lib/analytics/tracking', () => ({ useAnalytics: () => ({ track: mockTrack }) }));
vi.mock('../services/viewer-tracking.service', () => ({
  viewerTrackingService: {
    join: vi.fn().mockResolvedValue(undefined),
    heartbeat: vi.fn(),
    leave: vi.fn().mockResolvedValue(undefined),
  },
}));

describe('useViewerTracking', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('re-joins with no userId when heartbeat 404s', async () => {
    vi.mocked(viewerTrackingService.heartbeat).mockResolvedValue(404);

    renderHook(() => useViewerTracking('event-1', ['cam-1'], 'user-1'));

    await vi.advanceTimersByTimeAsync(HEARTBEAT_INTERVAL_MS);

    expect(viewerTrackingService.join).toHaveBeenCalledTimes(2);
    const rejoinCall = vi.mocked(viewerTrackingService.join).mock.calls[1];
    expect(rejoinCall).toEqual(['event-1', 'visit-1:cam-1', 'cam-1', 'visit-1']);
  });

  it('does not re-join when heartbeat succeeds', async () => {
    vi.mocked(viewerTrackingService.heartbeat).mockResolvedValue(200);

    renderHook(() => useViewerTracking('event-1', ['cam-1'], 'user-1'));

    await vi.advanceTimersByTimeAsync(HEARTBEAT_INTERVAL_MS);

    expect(viewerTrackingService.join).toHaveBeenCalledTimes(1);
  });

  it('tracks camera_switched for a clean 1-for-1 swap, not for the initial join', () => {
    vi.mocked(viewerTrackingService.heartbeat).mockResolvedValue(200);

    const { rerender } = renderHook(({ cams }) => useViewerTracking('event-1', cams, 'user-1'), {
      initialProps: { cams: ['cam-1'] },
    });
    expect(mockTrack).not.toHaveBeenCalledWith('camera_switched', expect.anything());

    rerender({ cams: ['cam-2'] });
    expect(mockTrack).toHaveBeenCalledWith('camera_switched', { eventId: 'event-1', from: 'cam-1', to: 'cam-2' });
    expect(mockTrack).toHaveBeenCalledTimes(1);
  });
});
