import { describe, it, expect } from 'vitest';
import { getRecurrenceParts, formatStartTime } from './recurrence';

describe('getRecurrenceParts', () => {
  it.each([
    ['FREQ=WEEKLY;BYDAY=TH', '20:00', 'pt-BR', { type: 'weekly', day: 'quinta-feira', time: '20:00' }],
    ['FREQ=WEEKLY;BYDAY=MO', '19:30', 'pt-BR', { type: 'weekly', day: 'segunda-feira', time: '19:30' }],
    ['FREQ=DAILY', '21:00', 'pt-BR', { type: 'daily', time: '21:00' }],
    [
      'FREQ=WEEKLY;BYDAY=TU,TH',
      '20:00',
      'pt-BR',
      { type: 'weekly', day: 'terça-feira e quinta-feira', time: '20:00' },
    ],
    ['FREQ=WEEKLY;BYDAY=TH', '20:00', 'en', { type: 'weekly', day: 'Thursday', time: '20:00' }],
    [
      'FREQ=WEEKLY;BYDAY=TU,TH',
      '20:00',
      'en',
      { type: 'weekly', day: 'Tuesday and Thursday', time: '20:00' },
    ],
  ] as const)('describes %s at %s (%s) as %j', (rrule, startTime, locale, expected) => {
    expect(getRecurrenceParts(rrule, startTime, locale)).toEqual(expected);
  });
});

describe('formatStartTime', () => {
  it('formats an ISO dtstart into HH:mm in the given timezone', () => {
    expect(formatStartTime('2026-01-01T23:00:00.000Z', 'America/Sao_Paulo')).toBe('20:00');
  });
});
