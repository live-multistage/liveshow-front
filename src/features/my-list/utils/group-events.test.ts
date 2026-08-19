import { describe, it, expect } from 'vitest';
import { groupAccessibleEvents, isEmptyGroup } from './group-events';
import type { AccessibleEvent } from '../types/my-list.types';
import type { PlaybackProgressEntry } from '@/features/playback-progress';

function make(overrides: Partial<AccessibleEvent> & { id: string }): AccessibleEvent {
  return {
    title: 'Evento',
    status: 'SCHEDULED',
    startsAt: '2026-09-04T21:00:00.000Z',
    endsAt: '2026-09-04T23:00:00.000Z',
    thumbnailUrl: null,
    bannerUrl: null,
    venue: null,
    city: null,
    capabilities: ['LIVE_VIEW'],
    canWatchLive: false,
    canWatchReplay: false,
    ...overrides,
  };
}

const LIVE = make({ id: 'live', status: 'LIVE', canWatchLive: true, title: 'StockCar' });
const REPLAY = make({ id: 'replay', status: 'FINISHED', canWatchReplay: true, title: 'Comedy' });
const UPCOMING = make({ id: 'soon', title: 'Rock in Rio', city: 'Rio de Janeiro' });
const VENUE = make({ id: 'venue', title: 'Campus Party', capabilities: ['PHYSICAL_ENTRY'] });

describe('groupAccessibleEvents', () => {
  it('routes each event to the section whose action it actually offers', () => {
    const grouped = groupAccessibleEvents([LIVE, REPLAY, UPCOMING, VENUE]);

    expect(grouped.live.map((e) => e.id)).toEqual(['live']);
    expect(grouped.replays.map((e) => e.id)).toEqual(['replay']);
    expect(grouped.upcoming.map((e) => e.id).sort()).toEqual(['soon', 'venue']);
  });

  /**
   * Um evento marcado como LIVE que o ingresso não cobre não pode cair na
   * seção "ao vivo agora": ela existe para oferecer o botão de assistir, e
   * esse botão seria recusado pelo playback.
   */
  it('keeps a live event the ticket does not cover out of the live section', () => {
    const grouped = groupAccessibleEvents([make({ id: 'x', status: 'LIVE', canWatchLive: false })]);

    expect(grouped.live).toHaveLength(0);
    expect(grouped.upcoming.map((e) => e.id)).toEqual(['x']);
  });

  it('matches the search against title, venue and city', () => {
    const grouped = groupAccessibleEvents([UPCOMING, VENUE], { query: '  RIO de ' });

    expect(grouped.upcoming.map((e) => e.id)).toEqual(['soon']);
  });

  it('shows only the requested section when a filter is active', () => {
    const grouped = groupAccessibleEvents([LIVE, REPLAY, UPCOMING], { filter: 'replays' });

    expect(grouped.replays.map((e) => e.id)).toEqual(['replay']);
    expect(grouped.live).toHaveLength(0);
    expect(grouped.upcoming).toHaveLength(0);
  });

  it('narrows to venue-only tickets under the venue filter', () => {
    const grouped = groupAccessibleEvents([UPCOMING, VENUE], { filter: 'venue' });

    expect(grouped.upcoming.map((e) => e.id)).toEqual(['venue']);
  });

  it('orders replays newest first and upcoming soonest first', () => {
    const older = make({ id: 'old', status: 'FINISHED', canWatchReplay: true, startsAt: '2026-07-01T00:00:00.000Z' });
    const newer = make({ id: 'new', status: 'FINISHED', canWatchReplay: true, startsAt: '2026-08-01T00:00:00.000Z' });
    const later = make({ id: 'later', startsAt: '2026-10-01T00:00:00.000Z' });

    const grouped = groupAccessibleEvents([older, newer, later, UPCOMING]);

    expect(grouped.replays.map((e) => e.id)).toEqual(['new', 'old']);
    expect(grouped.upcoming.map((e) => e.id)).toEqual(['soon', 'later']);
  });

  it('reports an empty result across every section', () => {
    expect(isEmptyGroup(groupAccessibleEvents([LIVE], { query: 'nada' }))).toBe(true);
    expect(isEmptyGroup(groupAccessibleEvents([LIVE]))).toBe(false);
  });
});

describe('groupAccessibleEvents — continuar assistindo', () => {
  const inProgress = (over: Partial<PlaybackProgressEntry> = {}): PlaybackProgressEntry => ({
    eventId: 'replay',
    positionSeconds: 1200,
    durationSeconds: 6000,
    resumeSeconds: 1200,
    completed: false,
    updatedAt: '2026-08-18T12:00:00.000Z',
    ...over,
  });

  const withProgress = (...entries: PlaybackProgressEntry[]) =>
    new Map(entries.map((e) => [e.eventId, e]));

  /**
   * O ponto central: um replay em andamento CONTINUA sendo um replay. Sem o
   * roteamento, o mesmo show apareceria em duas seções, com estados
   * diferentes, e o usuário veria dois cards do mesmo evento.
   */
  it('moves a started replay out of the replays section, never duplicating it', () => {
    const grouped = groupAccessibleEvents([REPLAY], { progress: withProgress(inProgress()) });

    expect(grouped.continueWatching.map((e) => e.id)).toEqual(['replay']);
    expect(grouped.replays).toHaveLength(0);
  });

  it('leaves an untouched replay where it was', () => {
    const grouped = groupAccessibleEvents([REPLAY]);

    expect(grouped.continueWatching).toHaveLength(0);
    expect(grouped.replays.map((e) => e.id)).toEqual(['replay']);
  });

  /** Concluído volta para "replays", que é onde se reassiste. */
  it('sends a finished replay back to the replays section', () => {
    const grouped = groupAccessibleEvents([REPLAY], {
      progress: withProgress(inProgress({ completed: true, resumeSeconds: 0 })),
    });

    expect(grouped.continueWatching).toHaveLength(0);
    expect(grouped.replays.map((e) => e.id)).toEqual(['replay']);
  });

  it('ignores progress the server judged too small to resume', () => {
    const grouped = groupAccessibleEvents([REPLAY], {
      progress: withProgress(inProgress({ resumeSeconds: 0, positionSeconds: 3 })),
    });

    expect(grouped.continueWatching).toHaveLength(0);
    expect(grouped.replays).toHaveLength(1);
  });

  it('orders by what was watched last, not by event date', () => {
    const older = make({ id: 'older', status: 'FINISHED', canWatchReplay: true, startsAt: '2026-01-01T00:00:00.000Z' });
    const newer = make({ id: 'newer', status: 'FINISHED', canWatchReplay: true, startsAt: '2026-07-01T00:00:00.000Z' });

    const grouped = groupAccessibleEvents([older, newer], {
      progress: withProgress(
        inProgress({ eventId: 'older', updatedAt: '2026-08-18T20:00:00.000Z' }),
        inProgress({ eventId: 'newer', updatedAt: '2026-08-18T08:00:00.000Z' }),
      ),
    });

    expect(grouped.continueWatching.map((e) => e.id)).toEqual(['older', 'newer']);
  });

  it('a live event still wins over its own progress', () => {
    const grouped = groupAccessibleEvents([LIVE], {
      progress: withProgress(inProgress({ eventId: 'live' })),
    });

    expect(grouped.live.map((e) => e.id)).toEqual(['live']);
    expect(grouped.continueWatching).toHaveLength(0);
  });

  it('counts towards the empty check like any other section', () => {
    const grouped = groupAccessibleEvents([REPLAY], { progress: withProgress(inProgress()) });
    expect(isEmptyGroup(grouped)).toBe(false);
  });
});
