import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AxiosError, AxiosHeaders } from 'axios';
import { LiveGate } from './LiveGate';

function makeHttpError(status: number) {
  return new AxiosError('Request failed', undefined, { headers: new AxiosHeaders() } as never, undefined, {
    status,
    data: {},
  } as never);
}

vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => '/live/evt-1',
}));

const authState = { isLoggedIn: true, isLoading: false };
vi.mock('@/features/account/hooks/use-auth', () => ({
  useAuth: () => authState,
}));

const accessState = { data: true, isLoading: false };
const playbackState: { data: unknown; isLoading: boolean; error: unknown } = {
  data: {
    live: true,
    stages: [],
    cameras: [],
    primaryCameraId: 'cam-1',
    librasCameraId: null,
  },
  isLoading: false,
  error: undefined,
};
vi.mock('../queries/live.queries', () => ({
  useLiveAccessQuery: () => accessState,
  useLivePlaybackQuery: () => playbackState,
}));

const prerollState: { ad: unknown; pending: boolean; markSeen: () => void } = {
  ad: null,
  pending: false,
  markSeen: vi.fn(),
};
const usePrerollGateMock = vi.fn((_eventId: string, _adsEnabled?: boolean) => prerollState);
vi.mock('@/features/advertisements/hooks/use-preroll-gate', () => ({
  usePrerollGate: (eventId: string, adsEnabled?: boolean) => usePrerollGateMock(eventId, adsEnabled),
}));

vi.mock('@/features/advertisements/components/PreRollPlayer', () => ({
  PreRollPlayer: ({ onFinished }: { onFinished: () => void }) => (
    <button type="button" onClick={onFinished}>
      preroll-stub-finish
    </button>
  ),
}));

vi.mock('./LivePlayer', () => ({
  LivePlayer: () => <div>live-player-stub</div>,
}));

vi.mock('./LiveGateLoading', () => ({
  LiveGateLoading: () => <div>loading-stub</div>,
}));

vi.mock('./LiveNoAccess', () => ({
  LiveNoAccess: () => <div>no-access-stub</div>,
}));

describe('LiveGate — pre-roll ad gate', () => {
  beforeEach(() => {
    prerollState.ad = null;
    prerollState.pending = false;
    prerollState.markSeen = vi.fn();
    usePrerollGateMock.mockClear();
    playbackState.error = undefined;
  });

  it('renders PreRollPlayer instead of LivePlayer when an ad is served', () => {
    prerollState.ad = { adId: 'ad-1', videoUrl: 'https://example.com/ad.mp4' };

    render(<LiveGate eventId="evt-1" chatEnabled={false} />);

    expect(screen.getByText('preroll-stub-finish')).toBeInTheDocument();
    expect(screen.queryByText('live-player-stub')).not.toBeInTheDocument();
  });

  it('mounts LivePlayer after onFinished and marks seen', () => {
    prerollState.ad = { adId: 'ad-1', videoUrl: 'https://example.com/ad.mp4' };

    render(<LiveGate eventId="evt-1" chatEnabled={false} />);

    fireEvent.click(screen.getByText('preroll-stub-finish'));

    expect(prerollState.markSeen).toHaveBeenCalledTimes(1);
    expect(screen.getByText('live-player-stub')).toBeInTheDocument();
    expect(screen.queryByText('preroll-stub-finish')).not.toBeInTheDocument();
  });

  it('skips straight to LivePlayer when no ad', () => {
    prerollState.ad = null;
    prerollState.pending = false;

    render(<LiveGate eventId="evt-1" chatEnabled={false} />);

    expect(screen.getByText('live-player-stub')).toBeInTheDocument();
    expect(screen.queryByText('preroll-stub-finish')).not.toBeInTheDocument();
  });

  it('passes adsEnabled=false through to usePrerollGate, so no ad is served', () => {
    render(<LiveGate eventId="evt-1" chatEnabled={false} adsEnabled={false} />);

    expect(usePrerollGateMock).toHaveBeenCalledWith('evt-1', false);
    expect(screen.getByText('live-player-stub')).toBeInTheDocument();
    expect(screen.queryByText('preroll-stub-finish')).not.toBeInTheDocument();
  });
});

describe('LiveGate — revoked access on playback refresh', () => {
  beforeEach(() => {
    prerollState.ad = null;
    prerollState.pending = false;
  });

  it('unmounts the player and shows the no-access state on a 401 refresh', () => {
    playbackState.error = makeHttpError(401);

    render(<LiveGate eventId="evt-1" chatEnabled={false} />);

    expect(screen.getByText('no-access-stub')).toBeInTheDocument();
    expect(screen.queryByText('live-player-stub')).not.toBeInTheDocument();
  });

  it('unmounts the player and shows the no-access state on a 403 refresh', () => {
    playbackState.error = makeHttpError(403);

    render(<LiveGate eventId="evt-1" chatEnabled={false} />);

    expect(screen.getByText('no-access-stub')).toBeInTheDocument();
    expect(screen.queryByText('live-player-stub')).not.toBeInTheDocument();
  });

  it('keeps the player mounted when there is no error', () => {
    playbackState.error = undefined;

    render(<LiveGate eventId="evt-1" chatEnabled={false} />);

    expect(screen.getByText('live-player-stub')).toBeInTheDocument();
    expect(screen.queryByText('no-access-stub')).not.toBeInTheDocument();
  });
});
