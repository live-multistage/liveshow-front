import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { LiveGate } from './LiveGate';

vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));

const authState = { isLoggedIn: true, isLoading: false };
vi.mock('@/features/account/hooks/use-auth', () => ({
  useAuth: () => authState,
}));

const accessState = { data: true, isLoading: false };
const playbackState = {
  data: {
    live: true,
    stages: [],
    cameras: [],
    primaryCameraId: 'cam-1',
    librasCameraId: null,
  },
  isLoading: false,
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
});
