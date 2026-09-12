import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AxiosError, AxiosHeaders } from 'axios';
import { ReplayGate } from './ReplayGate';

function makeHttpError(status: number) {
  return new AxiosError('Request failed', undefined, { headers: new AxiosHeaders() } as never, undefined, {
    status,
    data: {},
  } as never);
}

vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));

const authState = { isLoggedIn: true, isLoading: false };
vi.mock('@/features/account/hooks/use-auth', () => ({
  useAuth: () => authState,
}));

const accessState = { data: true, isLoading: false };
const playbackState: { data: unknown; isLoading: boolean; error: unknown } = {
  data: {
    available: true,
    cameras: [],
    librasCameraId: null,
    timeline: { startsAt: '2026-01-01T00:00:00.000Z', endsAt: '2026-01-01T01:00:00.000Z' },
  },
  isLoading: false,
  error: undefined,
};
vi.mock('../queries/live.queries', () => ({
  useReplayAccessQuery: () => accessState,
  useReplayPlaybackQuery: () => playbackState,
}));

const prerollState: { ad: unknown; pending: boolean; markSeen: () => void } = {
  ad: null,
  pending: false,
  markSeen: vi.fn(),
};
vi.mock('@/features/advertisements/hooks/use-preroll-gate', () => ({
  usePrerollGate: () => prerollState,
}));

vi.mock('@/features/advertisements/components/PreRollPlayer', () => ({
  PreRollPlayer: ({ onFinished }: { onFinished: () => void }) => (
    <button type="button" onClick={onFinished}>
      preroll-stub-finish
    </button>
  ),
}));

vi.mock('./ReplayPlayer', () => ({
  ReplayPlayer: () => <div>replay-player-stub</div>,
}));

vi.mock('./LiveGateLoading', () => ({
  LiveGateLoading: () => <div>loading-stub</div>,
}));

vi.mock('./ReplayComingSoon', () => ({
  ReplayComingSoon: () => <div>coming-soon-stub</div>,
}));

describe('ReplayGate — revoked access on playback refresh', () => {
  beforeEach(() => {
    prerollState.ad = null;
    prerollState.pending = false;
    playbackState.error = undefined;
  });

  it('unmounts the player and shows the no-access state on a 401 refresh', () => {
    playbackState.error = makeHttpError(401);

    render(<ReplayGate eventId="evt-1" eventTitle="Show" />);

    expect(screen.getByText('accessRequired')).toBeInTheDocument();
    expect(screen.queryByText('replay-player-stub')).not.toBeInTheDocument();
  });

  it('unmounts the player and shows the no-access state on a 403 refresh', () => {
    playbackState.error = makeHttpError(403);

    render(<ReplayGate eventId="evt-1" eventTitle="Show" />);

    expect(screen.getByText('accessRequired')).toBeInTheDocument();
    expect(screen.queryByText('replay-player-stub')).not.toBeInTheDocument();
  });

  it('keeps the player mounted when there is no error', () => {
    playbackState.error = undefined;

    render(<ReplayGate eventId="evt-1" eventTitle="Show" />);

    expect(screen.getByText('replay-player-stub')).toBeInTheDocument();
    expect(screen.queryByText('accessRequired')).not.toBeInTheDocument();
  });
});
