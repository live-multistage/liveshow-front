import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ChannelOnAirPanel } from './ChannelOnAirPanel';
import type { ChannelSource, ChannelSourceOverride } from '../../types/channel.types';

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string, values?: Record<string, unknown>) =>
    values ? `${key}:${JSON.stringify(values)}` : key,
}));

const myEvents = [
  { id: 'evt-1', title: 'Jogo Final', organizationId: 'org-1', format: 'LIVE', status: 'SCHEDULED' },
  { id: 'evt-2', title: 'Outra Org', organizationId: 'org-2', format: 'LIVE', status: 'SCHEDULED' },
  { id: 'evt-3', title: 'VOD', organizationId: 'org-1', format: 'VOD', status: 'SCHEDULED' },
  { id: 'evt-4', title: 'Encerrado', organizationId: 'org-1', format: 'LIVE', status: 'FINISHED' },
];
vi.mock('@/features/events', () => ({
  useMyEventsQuery: () => ({ data: myEvents }),
}));

const setOverrideMutate = vi.fn();
const clearOverrideMutate = vi.fn();
vi.mock('../../mutations/channel.mutations', () => ({
  useSetChannelSourceOverrideMutation: () => ({ mutate: setOverrideMutate, isPending: false }),
  useClearChannelSourceOverrideMutation: () => ({ mutate: clearOverrideMutate, isPending: false }),
}));

const OWN_SOURCE: ChannelSource = { mode: 'own', reason: 'own', event: null };
const EVENT_SOURCE: ChannelSource = {
  mode: 'event',
  reason: 'override',
  event: {
    id: 'evt-1',
    title: 'Jogo Final',
    startsAt: '2026-08-21T20:00:00.000Z',
    endsAt: '2026-08-21T22:00:00.000Z',
  },
};

const renderPanel = (
  source: ChannelSource,
  sourceOverride: ChannelSourceOverride | null,
  isOnAir = false,
) =>
  render(
    <ChannelOnAirPanel
      channelId="ch-1"
      slug="canal-um"
      organizationId="org-1"
      source={source}
      sourceOverride={sourceOverride}
      isOnAir={isOnAir}
    />,
  );

describe('ChannelOnAirPanel', () => {
  beforeEach(() => {
    setOverrideMutate.mockReset();
    clearOverrideMutate.mockReset();
  });

  it('describes the own feed off air and waits for signal', () => {
    renderPanel(OWN_SOURCE, null);

    expect(screen.getByText('sourceOwn')).toBeInTheDocument();
    expect(screen.getByText('descriptionOwnOff')).toBeInTheDocument();
    expect(screen.getByText('healthWaiting')).toBeInTheDocument();
    expect(screen.getByText('previewOff')).toBeInTheDocument();
  });

  it('reports a stable signal and a live preview while the own feed is on air', () => {
    renderPanel(OWN_SOURCE, null, true);

    expect(screen.getByText('descriptionOwnOn')).toBeInTheDocument();
    expect(screen.getByText('healthStable')).toBeInTheDocument();
    expect(screen.getByText('liveBadge')).toBeInTheDocument();
  });

  it('flags a carried event as simulcast', () => {
    renderPanel(EVENT_SOURCE, { eventId: 'evt-1', until: '2026-08-21T22:00:00.000Z' }, true);

    expect(screen.getByText('sourceEvent')).toBeInTheDocument();
    expect(screen.getByText('descriptionEvent')).toBeInTheDocument();
  });

  it('names the program that is carrying the event', () => {
    renderPanel({ ...EVENT_SOURCE, reason: 'program' }, null, true);

    expect(screen.getByText('sourceProgram:{"name":"Jogo Final"}')).toBeInTheDocument();
  });

  it('shows the waiting state when an override is set but the event is not yet carried', () => {
    renderPanel(OWN_SOURCE, { eventId: 'evt-1', until: '2026-08-21T22:00:00.000Z' });

    expect(screen.getByText('waiting')).toBeInTheDocument();
  });

  it('does not show the waiting state once the event is actually carried', () => {
    renderPanel(EVENT_SOURCE, { eventId: 'evt-1', until: '2026-08-21T22:00:00.000Z' });

    expect(screen.queryByText('waiting')).toBeNull();
  });

  it('still shows waiting when the carry comes from the program window, not the override', () => {
    renderPanel({ ...EVENT_SOURCE, reason: 'program' }, {
      eventId: 'evt-1',
      until: '2026-08-21T22:00:00.000Z',
    });

    expect(screen.getByText('waiting')).toBeInTheDocument();
  });

  it('only lists linkable events (same org, LIVE format, SCHEDULED/LIVE status)', () => {
    renderPanel(OWN_SOURCE, null);

    const options = screen
      .getAllByRole('option')
      .map((option) => (option as HTMLOptionElement).value);
    expect(options).toEqual(['', 'evt-1']);
  });

  it('disables "put on air" until an event is selected', () => {
    renderPanel(OWN_SOURCE, null);

    expect(screen.getByText('putOnAir')).toBeDisabled();
  });

  it('puts the selected event on air via PUT source-override', () => {
    renderPanel(OWN_SOURCE, null);

    fireEvent.change(screen.getByLabelText('selectEvent'), { target: { value: 'evt-1' } });
    fireEvent.click(screen.getByText('putOnAir'));

    expect(setOverrideMutate).toHaveBeenCalledWith(
      { id: 'ch-1', slug: 'canal-um', organizationId: 'org-1', eventId: 'evt-1' },
      expect.anything(),
    );
  });

  it('hides "back to feed" while there is no override to clear', () => {
    renderPanel(OWN_SOURCE, null);

    expect(screen.queryByText('backToFeed')).toBeNull();
  });

  it('keeps the event selector next to "back to feed" so the operator can swap without clearing', () => {
    renderPanel(EVENT_SOURCE, { eventId: 'evt-1', until: '2026-08-21T22:00:00.000Z' });

    expect(screen.getByLabelText('selectEvent')).toBeInTheDocument();
    expect(screen.getByText('backToFeed')).toBeInTheDocument();
  });

  it('clears the override via DELETE source-override', () => {
    renderPanel(EVENT_SOURCE, { eventId: 'evt-1', until: '2026-08-21T22:00:00.000Z' });

    fireEvent.click(screen.getByText('backToFeed'));

    expect(clearOverrideMutate).toHaveBeenCalledWith({
      id: 'ch-1',
      slug: 'canal-um',
      organizationId: 'org-1',
    });
  });
});
