import { describe, it, expect } from 'vitest';
import { WEEKDAYS, buildRRule, dayKeyInTimezone, parseRRule } from './rrule';

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
