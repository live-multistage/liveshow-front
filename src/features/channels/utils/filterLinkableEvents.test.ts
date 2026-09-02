import { describe, it, expect } from 'vitest';
import type { EventResponse } from '@/features/events/types/event.types';
import { filterLinkableEvents } from './filterLinkableEvents';

const event = (overrides: Partial<EventResponse> = {}): EventResponse =>
  ({
    id: 'evt-1',
    title: 'Jogo Final',
    organizationId: 'org-1',
    format: 'LIVE',
    status: 'SCHEDULED',
    ...overrides,
  }) as EventResponse;

describe('filterLinkableEvents', () => {
  it('keeps a scheduled live event from the same org', () => {
    const result = filterLinkableEvents([event()], 'org-1');
    expect(result).toEqual([event()]);
  });

  it('keeps a live-status event too', () => {
    const result = filterLinkableEvents([event({ id: 'evt-2', status: 'LIVE' })], 'org-1');
    expect(result).toHaveLength(1);
  });

  it('drops events from a different organization', () => {
    const result = filterLinkableEvents([event({ organizationId: 'org-2' })], 'org-1');
    expect(result).toEqual([]);
  });

  it('drops non-LIVE formats (e.g. VOD)', () => {
    const result = filterLinkableEvents([event({ format: 'VOD' as EventResponse['format'] })], 'org-1');
    expect(result).toEqual([]);
  });

  it('drops events that are neither SCHEDULED nor LIVE', () => {
    const result = filterLinkableEvents(
      [event({ status: 'FINISHED' as EventResponse['status'] })],
      'org-1',
    );
    expect(result).toEqual([]);
  });
});
