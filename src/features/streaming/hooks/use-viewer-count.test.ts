import { describe, it, expect, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement, type ReactNode } from 'react';

vi.mock('../services/viewer-tracking.service', () => ({
  viewerTrackingService: { getViewers: vi.fn() },
}));

import { useViewerCount } from './use-viewer-count';
import { viewerTrackingService } from '../services/viewer-tracking.service';

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return createElement(QueryClientProvider, { client }, children);
}

describe('useViewerCount', () => {
  it("asks for one transmission's audience when a streamId is given", async () => {
    vi.mocked(viewerTrackingService.getViewers).mockResolvedValue({ currentViewers: 7, totalViews: 10 });

    const { result } = renderHook(() => useViewerCount('evt-1', 's-vip'), { wrapper });

    await waitFor(() => expect(result.current.currentViewers).toBe(7));
    expect(viewerTrackingService.getViewers).toHaveBeenCalledWith('evt-1', 's-vip');
  });

  it('keeps the event-wide count without one', async () => {
    vi.mocked(viewerTrackingService.getViewers).mockResolvedValue({ currentViewers: 3, totalViews: 4 });

    const { result } = renderHook(() => useViewerCount('evt-1'), { wrapper });

    await waitFor(() => expect(result.current.currentViewers).toBe(3));
    expect(viewerTrackingService.getViewers).toHaveBeenLastCalledWith('evt-1', null);
  });
});
