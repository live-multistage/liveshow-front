import { describe, it, expect } from 'vitest';
import { hrefForMyEvents, parseMyEventsParams } from './my-events-params';

describe('parseMyEventsParams', () => {
  it('defaults to page 1 with no status', () => {
    expect(parseMyEventsParams(new URLSearchParams())).toEqual({ page: 1 });
  });

  it('reads a valid status and page', () => {
    expect(parseMyEventsParams(new URLSearchParams('status=live&page=3'))).toEqual({ status: 'live', page: 3 });
  });

  it('drops unknown statuses and invalid pages', () => {
    expect(parseMyEventsParams(new URLSearchParams('status=DRAFT&page=-2'))).toEqual({ page: 1 });
    expect(parseMyEventsParams(new URLSearchParams('page=abc'))).toEqual({ page: 1 });
  });

  it('floors fractional pages', () => {
    expect(parseMyEventsParams(new URLSearchParams('page=2.7'))).toEqual({ page: 2 });
  });
});

describe('hrefForMyEvents', () => {
  it('omits defaults for the canonical URL', () => {
    expect(hrefForMyEvents({ page: 1 })).toBe('/dashboard/events');
  });

  it('keeps status and page', () => {
    expect(hrefForMyEvents({ status: 'upcoming', page: 2 })).toBe('/dashboard/events?status=upcoming&page=2');
  });

  it('drops page 1 but keeps status', () => {
    expect(hrefForMyEvents({ status: 'finished', page: 1 })).toBe('/dashboard/events?status=finished');
  });
});
