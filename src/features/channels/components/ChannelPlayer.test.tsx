import { useEffect } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { ChannelPlaybackResponse, PublicChannel } from '../types/channel.types';
import { ChannelPlayer } from './ChannelPlayer';

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

let mountCount = 0;
let lastInitialAudio: unknown;
let lastOnAudioChange: unknown;
vi.mock('@/features/streaming/components/LivePlayer', () => ({
  // Mirrors LivePlayer's shape just enough to observe remounts (via the
  // mount-only effect) and to render the overlay it's handed.
  LivePlayer: ({
    cameras,
    overlay,
    initialAudio,
    onAudioChange,
  }: {
    cameras: unknown[];
    overlay?: React.ReactNode;
    initialAudio?: unknown;
    onAudioChange?: unknown;
  }) => {
    useEffect(() => {
      mountCount += 1;
      lastInitialAudio = initialAudio;
      lastOnAudioChange = onAudioChange;
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    return (
      <div data-testid="live-player">
        <span data-testid="camera-count">{cameras.length}</span>
        {overlay}
      </div>
    );
  },
}));

const channel: PublicChannel = {
  id: 'ch-1',
  organizationId: 'org-1',
  slug: 'canal',
  name: 'Canal',
  description: null,
  coverUrl: null,
  accessMode: 'FREE',
  status: 'PUBLISHED',
  broadcastEventId: 'evt-channel',
  timezone: 'America/Sao_Paulo',
  createdAt: '2026-08-01T00:00:00.000Z',
  updatedAt: '2026-08-01T00:00:00.000Z',
  isOnAir: true,
  current: null,
  next: null,
  today: [],
  pricing: null,
  viewer: null,
  source: { mode: 'own', reason: 'own', event: null },
};

const ownPlayback: ChannelPlaybackResponse = {
  live: true,
  latencyMode: 'STANDARD',
  stages: [],
  cameras: [],
  primaryCameraId: null,
  librasCameraId: null,
  playbackEventId: 'evt-channel',
  channelEventId: 'evt-channel',
  source: { mode: 'own', reason: 'own', event: null },
};

const eventPlayback: ChannelPlaybackResponse = {
  live: true,
  latencyMode: 'STANDARD',
  stages: [],
  cameras: [{ cameraId: 'cam-1', name: 'Cam 1', slug: 'cam-1', priority: 0, manifestPath: null, llPath: null }],
  primaryCameraId: 'cam-1',
  librasCameraId: null,
  playbackEventId: 'evt-carried',
  channelEventId: 'evt-channel',
  source: {
    mode: 'event',
    reason: 'program',
    event: {
      id: 'evt-carried',
      title: 'Jogo Final',
      startsAt: '2026-08-22T20:00:00.000Z',
      endsAt: '2026-08-22T22:00:00.000Z',
    },
  },
};

describe('ChannelPlayer', () => {
  beforeEach(() => {
    mountCount = 0;
    lastInitialAudio = undefined;
  });

  it('does not show the now-playing badge when the channel plays its own feed', () => {
    render(<ChannelPlayer channel={channel} playback={ownPlayback} chatEnabled={false} />);

    expect(screen.queryByText('nowPlaying')).toBeNull();
  });

  it('shows the now-playing badge linking to the event page when carrying an event', () => {
    render(<ChannelPlayer channel={channel} playback={eventPlayback} chatEnabled={false} />);

    const badge = screen.getByText('nowPlaying');
    expect(badge.closest('a')).toHaveAttribute('href', '/events/evt-carried');
  });

  it('remounts the player when the resolved source changes', () => {
    const { rerender } = render(
      <ChannelPlayer channel={channel} playback={ownPlayback} chatEnabled={false} />,
    );
    expect(mountCount).toBe(1);

    rerender(<ChannelPlayer channel={channel} playback={eventPlayback} chatEnabled={false} />);

    expect(mountCount).toBe(2);
    expect(screen.getByTestId('camera-count')).toHaveTextContent('1');
  });

  it('does not remount the player when the source stays the same', () => {
    const { rerender } = render(
      <ChannelPlayer channel={channel} playback={eventPlayback} chatEnabled={false} />,
    );
    expect(mountCount).toBe(1);

    const refreshedSameSource: ChannelPlaybackResponse = {
      ...eventPlayback,
      cameras: [
        ...eventPlayback.cameras,
        { cameraId: 'cam-2', name: 'Cam 2', slug: 'cam-2', priority: 1, manifestPath: null, llPath: null },
      ],
    };
    rerender(
      <ChannelPlayer channel={channel} playback={refreshedSameSource} chatEnabled={false} />,
    );

    expect(mountCount).toBe(1);
    expect(screen.getByTestId('camera-count')).toHaveTextContent('2');
  });

  it('keeps the muted/volume state across a source remount', () => {
    const audio = { muted: true, volume: 0.4 };
    const { rerender } = render(
      <ChannelPlayer channel={channel} playback={ownPlayback} chatEnabled={false} initialAudio={audio} />,
    );
    expect(mountCount).toBe(1);
    expect(lastInitialAudio).toEqual(audio);

    rerender(
      <ChannelPlayer channel={channel} playback={eventPlayback} chatEnabled={false} initialAudio={audio} />,
    );

    // The player remounted (new source), but the fresh mount was seeded with
    // the same audio state instead of the LivePlayer default (unmuted/full
    // volume) — that seed lives in ChannelGate, above this remount boundary.
    expect(mountCount).toBe(2);
    expect(lastInitialAudio).toEqual(audio);
  });

  it('forwards onAudioChange through to LivePlayer', () => {
    const onAudioChange = vi.fn();
    render(
      <ChannelPlayer
        channel={channel}
        playback={ownPlayback}
        chatEnabled={false}
        onAudioChange={onAudioChange}
      />,
    );

    expect(lastOnAudioChange).toBe(onAudioChange);
  });
});
