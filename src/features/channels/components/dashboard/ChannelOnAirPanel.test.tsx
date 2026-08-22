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
  event: { id: 'evt-1', title: 'Jogo Final', startsAt: '2026-08-21T20:00:00.000Z', endsAt: '2026-08-21T22:00:00.000Z' },
};

const renderPanel = (source: ChannelSource, sourceOverride: ChannelSourceOverride | null) =>
  render(
    <ChannelOnAirPanel
      channelId="ch-1"
      slug="canal-um"
      organizationId="org-1"
      source={source}
      sourceOverride={sourceOverride}
    />,
  );

describe('ChannelOnAirPanel', () => {
  beforeEach(() => {
    setOverrideMutate.mockReset();
    clearOverrideMutate.mockReset();
  });

  it('shows the channel own feed as the current source', () => {
    renderPanel(OWN_SOURCE, null);

    expect(screen.getByText('currentOwn')).toBeInTheDocument();
  });

  it('shows the carried event title as the current source', () => {
    renderPanel(EVENT_SOURCE, { eventId: 'evt-1', until: '2026-08-21T22:00:00.000Z' });

    expect(screen.getByText('currentEvent:{"title":"Jogo Final"}')).toBeInTheDocument();
  });

  it('shows the waiting state when an override is set but the event is not yet live', () => {
    renderPanel(OWN_SOURCE, { eventId: 'evt-1', until: '2026-08-21T22:00:00.000Z' });

    expect(screen.getByText('waiting')).toBeInTheDocument();
  });

  it('does not show the waiting state once the event is actually carried', () => {
    renderPanel(EVENT_SOURCE, { eventId: 'evt-1', until: '2026-08-21T22:00:00.000Z' });

    expect(screen.queryByText('waiting')).toBeNull();
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

  it('hides the selector once an override is active', () => {
    renderPanel(EVENT_SOURCE, { eventId: 'evt-1', until: '2026-08-21T22:00:00.000Z' });

    expect(screen.queryByLabelText('selectEvent')).toBeNull();
  });

  it('clears the override via DELETE source-override', () => {
    renderPanel(EVENT_SOURCE, { eventId: 'evt-1', until: '2026-08-21T22:00:00.000Z' });

    fireEvent.click(screen.getByText('backToChannel'));

    expect(clearOverrideMutate).toHaveBeenCalledWith({
      id: 'ch-1',
      slug: 'canal-um',
      organizationId: 'org-1',
    });
  });
});
