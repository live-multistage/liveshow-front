vi.mock('next-intl', () => ({
  useTranslations: () => {
    const t = (key: string, values?: Record<string, unknown>) =>
      values ? `${key}:${JSON.stringify(values)}` : key;
    t.rich = (key: string) => key;
    return t;
  },
  useFormatter: () => ({
    number: (n: number) => String(n),
    relativeTime: () => 'agora',
    dateTime: () => '21:14:08',
  }),
}));
vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a>,
}));

const searchParams = new URLSearchParams();
vi.mock('next/navigation', () => ({
  usePathname: () => '/dashboard/platform/tracking/debugger',
  useSearchParams: () => searchParams,
}));
vi.mock('../hooks/use-tracking-live-stream', () => ({ useTrackingLiveStream: vi.fn() }));
vi.mock('../queries/get-sources', () => ({ useTrackingSourcesQuery: vi.fn() }));

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TrackingDebuggerPage } from './TrackingDebuggerPage';
import { useTrackingLiveStream, type LiveStreamFrame } from '../hooks/use-tracking-live-stream';
import { useTrackingSourcesQuery } from '../queries/get-sources';

const mockedStream = vi.mocked(useTrackingLiveStream);
const mockedSources = vi.mocked(useTrackingSourcesQuery);

const acceptedFrame: LiveStreamFrame = {
  kind: 'message',
  status: 'accepted',
  message: {
    type: 'track', event: 'player_started', messageId: 'm1', anonymousId: 'anon1', userId: 'usr1',
    timestamp: '2026-09-28T21:14:08.101Z', sourceId: 'web',
    context: { library: { name: 'showon-web', version: '1.0' }, sessionId: 's1' },
    violations: [{ kind: 'wrong_type', property: 'properties.latencyMs', detail: 'esperado number' }],
  },
  receivedAt: '2026-09-28T21:14:08.200Z',
  key: 'm1',
};

const rejectedFrame: LiveStreamFrame = {
  kind: 'message', status: 'rejected', reason: 'JSON malformado', raw: '{"broken"', sourceId: 'server',
  receivedAt: '2026-09-28T21:14:09.000Z',
  key: '2026-09-28T21:14:09.000Z-0',
};

function mockStream(frames: LiveStreamFrame[], overrides: Partial<ReturnType<typeof useTrackingLiveStream>> = {}) {
  mockedStream.mockReturnValue({ frames, dropped: 0, status: 'open', clear: vi.fn(), ...overrides });
}

beforeEach(() => {
  vi.clearAllMocks();
  searchParams.forEach((_v, k) => searchParams.delete(k));
  mockedSources.mockReturnValue({ data: [{ id: 'src-web', name: 'web', kind: 'web', writeKeyPrefix: null, enabled: true, createdAt: '' }] } as never);
});

describe('TrackingDebuggerPage', () => {
  it('calls useTrackingLiveStream with an updated filter when the event field changes', () => {
    mockStream([]);
    render(<TrackingDebuggerPage trackingEnabled />);

    fireEvent.change(screen.getByPlaceholderText('debugger.filters.eventPlaceholder'), { target: { value: 'order_paid' } });

    const lastCall = mockedStream.mock.calls.at(-1)!;
    expect(lastCall[0]).toEqual(expect.objectContaining({ event: 'order_paid' }));
  });

  it('toggles paused when the pause button is clicked', () => {
    mockStream([]);
    render(<TrackingDebuggerPage trackingEnabled />);

    fireEvent.click(screen.getByText('debugger.pause'));

    const lastCall = mockedStream.mock.calls.at(-1)!;
    expect(lastCall[1]).toEqual({ paused: true });
  });

  it('shows JSON for an accepted message and a violation badge when a row is clicked', () => {
    mockStream([acceptedFrame]);
    render(<TrackingDebuggerPage trackingEnabled />);

    expect(screen.getByText('debugger.badges.violation')).toBeInTheDocument();
    fireEvent.click(screen.getByText('player_started'));

    expect(screen.getByText('debugger.inspector.messageTitle')).toBeInTheDocument();
    expect(screen.getByText(/"event": "player_started"/)).toBeInTheDocument();
  });

  it('shows a rejected badge and the raw body for a rejected message', () => {
    mockStream([rejectedFrame]);
    render(<TrackingDebuggerPage trackingEnabled />);

    expect(screen.getByText('debugger.badges.rejected')).toBeInTheDocument();
    fireEvent.click(screen.getByText('JSON malformado'));

    expect(screen.getByText('debugger.inspector.rawTitle')).toBeInTheDocument();
    expect(screen.getByText('{"broken"')).toBeInTheDocument();
  });

  it('pre-fills the anonymousId filter from the ?anonymousId= query param', () => {
    searchParams.set('anonymousId', 'anon_b71e0d92');
    mockStream([]);
    render(<TrackingDebuggerPage trackingEnabled />);

    expect(screen.getByPlaceholderText('debugger.filters.anonymousIdPlaceholder')).toHaveValue('anon_b71e0d92');
    const lastCall = mockedStream.mock.calls.at(-1)!;
    expect(lastCall[0]).toEqual(expect.objectContaining({ anonymousId: 'anon_b71e0d92' }));
  });

  it('shows connecting / error connection states', () => {
    mockStream([], { status: 'error' });
    render(<TrackingDebuggerPage trackingEnabled />);
    expect(screen.getByText('debugger.connectionLost')).toBeInTheDocument();
  });
});
