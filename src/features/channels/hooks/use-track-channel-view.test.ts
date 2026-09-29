import { describe, it, expect, vi, beforeEach } from 'vitest';

const trackMock = vi.fn();
vi.mock('@/lib/analytics/tracking', () => ({ useAnalytics: () => ({ track: trackMock }) }));

import { renderHook } from '@testing-library/react';
import { useTrackChannelView } from './use-track-channel-view';

beforeEach(() => trackMock.mockClear());

describe('useTrackChannelView', () => {
  it('tracks once when the channel is known from the start', () => {
    renderHook(({ channelId }) => useTrackChannelView(channelId), {
      initialProps: { channelId: 'chan-1' },
    });

    expect(trackMock).toHaveBeenCalledTimes(1);
    expect(trackMock).toHaveBeenCalledWith('channel_viewed', { channelId: 'chan-1' });
  });

  it('does not track while the id is undefined', () => {
    renderHook(({ channelId }: { channelId: string | undefined }) => useTrackChannelView(channelId), {
      initialProps: { channelId: undefined },
    });

    expect(trackMock).not.toHaveBeenCalled();
  });
});
