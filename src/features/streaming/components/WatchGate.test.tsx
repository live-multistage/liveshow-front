import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { EventResponse } from '@/features/events/types/event.types';
import { WatchGate } from './WatchGate';

vi.mock('./LiveGate', () => ({ LiveGate: () => <div>live-gate</div> }));
vi.mock('./ReplayGate', () => ({
  ReplayGate: ({ startAtSeconds }: { startAtSeconds?: number | null }) => (
    <div data-start={startAtSeconds ?? 'none'}>replay-gate</div>
  ),
}));

const liveState: { data: { live: boolean } | undefined } = { data: undefined };
vi.mock('../queries/live.queries', () => ({ useLivePlaybackQuery: () => liveState }));

const eventQuery = vi.hoisted(() => ({ data: undefined as EventResponse | undefined, options: undefined as unknown }));
vi.mock('@/features/events/queries/get-event', () => ({
  useGetEventQuery: (_id: string, initial: EventResponse, options: unknown) => {
    eventQuery.options = options;
    return { data: eventQuery.data ?? initial };
  },
}));

const event = (status: EventResponse['status']) =>
  ({ id: 'evt-1', title: 'Show', status, format: 'LIVE', thumbnailUrl: null, bannerUrl: null }) as EventResponse;

const renderGate = (status: EventResponse['status'], startAtSeconds: number | null = null) =>
  render(<WatchGate event={event(status)} chatEnabled adsEnabled startAtSeconds={startAtSeconds} />);

describe('WatchGate', () => {
  beforeEach(() => {
    liveState.data = undefined;
    eventQuery.data = undefined;
  });

  it('mounts the live gate for an event that has not finished', () => {
    renderGate('SCHEDULED');
    expect(screen.getByText('live-gate')).toBeInTheDocument();
  });

  it('mounts the replay gate for a finished event, with the ?t= start', () => {
    renderGate('FINISHED', 90);
    expect(screen.getByText('replay-gate')).toHaveAttribute('data-start', '90');
  });

  it('switches to the replay gate when the event finishes while watching', () => {
    const { rerender } = renderGate('LIVE');
    expect(screen.getByText('live-gate')).toBeInTheDocument();

    eventQuery.data = event('FINISHED');
    rerender(<WatchGate event={event('LIVE')} chatEnabled adsEnabled startAtSeconds={null} />);

    expect(screen.getByText('replay-gate')).toBeInTheDocument();
  });

  // The poll's only job is to notice FINISHED; while the stream plays it stays off.
  const interval = (data: EventResponse) =>
    (eventQuery.options as { refetchInterval: (q: { state: { data: EventResponse } }) => number | false })
      .refetchInterval({ state: { data } });

  it('polls the event only while nothing is live', () => {
    liveState.data = { live: true };
    const { rerender } = renderGate('LIVE');
    expect(interval(event('LIVE'))).toBe(false);

    liveState.data = { live: false };
    rerender(<WatchGate event={event('LIVE')} chatEnabled adsEnabled startAtSeconds={null} />);
    expect(interval(event('LIVE'))).toBe(15_000);
  });

  it('stops polling once the event is a replay', () => {
    renderGate('LIVE');
    expect(interval(event('FINISHED'))).toBe(false);
  });
});
