import { describe, it, expect } from 'vitest';
import { WEEKDAYS, buildRRule, dayKeyInTimezone, parseRRule, programOverlapsEvent } from './rrule';

describe('buildRRule', () => {
  it('builds a weekly rule with the picked days', () => {
    expect(buildRRule(['MO', 'WE'])).toBe('FREQ=WEEKLY;BYDAY=MO,WE');
  });

  it('normalizes the day order to MO..SU regardless of click order', () => {
    expect(buildRRule(['SU', 'WE', 'MO'])).toBe('FREQ=WEEKLY;BYDAY=MO,WE,SU');
  });

  it('collapses all seven days into a daily rule', () => {
    expect(buildRRule([...WEEKDAYS])).toBe('FREQ=DAILY');
  });

  // O backend rejeita FREQ=WEEKLY sem BYDAY — o formulário nunca deve chegar aqui
  // sem dias, mas o helper não pode devolver uma regra inválida se chegar.
  it('never emits a weekly rule with an empty BYDAY', () => {
    expect(buildRRule([])).toBe('FREQ=DAILY');
  });
});

describe('parseRRule', () => {
  it('is the inverse of buildRRule for a weekly rule', () => {
    expect(parseRRule('FREQ=WEEKLY;BYDAY=MO,WE')).toEqual(['MO', 'WE']);
  });

  it('expands a daily rule to every weekday', () => {
    expect(parseRRule('FREQ=DAILY')).toEqual([...WEEKDAYS]);
  });

  it('ignores unknown tokens inside BYDAY', () => {
    expect(parseRRule('FREQ=WEEKLY;BYDAY=MO,XX,FR')).toEqual(['MO', 'FR']);
  });

  it('returns no days for a rule it cannot read', () => {
    expect(parseRRule('FREQ=MONTHLY')).toEqual([]);
  });
});

describe('dayKeyInTimezone', () => {
  it('reads the civil date in the given timezone, not UTC', () => {
    // 23:00 UTC on 2026-08-21 is already 2026-08-22 in Tokyo (+9).
    expect(dayKeyInTimezone(new Date('2026-08-21T23:00:00Z'), 'Asia/Tokyo')).toBe('2026-08-22');
    expect(dayKeyInTimezone(new Date('2026-08-21T23:00:00Z'), 'UTC')).toBe('2026-08-21');
  });
});

describe('programOverlapsEvent', () => {
  const timezone = 'America/Sao_Paulo'; // UTC-3, no DST since 2019

  it('overlaps when the event window intersects the weekly occurrence', () => {
    const event = { startsAt: '2024-01-01T23:45:00.000Z', endsAt: '2024-01-02T00:45:00.000Z' };
    expect(programOverlapsEvent(['MO'], '21:30', 60, timezone, event)).toBe(true);
  });

  it('does not overlap when the event window falls outside the occurrence', () => {
    const event = { startsAt: '2024-01-01T15:00:00.000Z', endsAt: '2024-01-01T16:00:00.000Z' };
    expect(programOverlapsEvent(['MO'], '21:30', 60, timezone, event)).toBe(false);
  });

  it('does not overlap when the program never runs on the event weekday', () => {
    const event = { startsAt: '2024-01-01T23:45:00.000Z', endsAt: '2024-01-02T00:45:00.000Z' };
    expect(programOverlapsEvent(['TU'], '21:30', 60, timezone, event)).toBe(false);
  });
});
