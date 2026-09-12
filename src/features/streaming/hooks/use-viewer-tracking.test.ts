import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useViewerTracking } from './use-viewer-tracking';

const HEARTBEAT_INTERVAL_MS = 20_000;
import { viewerTrackingService } from '../services/viewer-tracking.service';

vi.mock('@/lib/analytics/session-id', () => ({ getSessionId: () => 'visit-1' }));
vi.mock('@/lib/analytics/analytics-client', () => ({ track: vi.fn() }));
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
});
