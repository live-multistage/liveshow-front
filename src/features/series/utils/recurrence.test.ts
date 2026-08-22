import { describe, it, expect } from 'vitest';
import { describeRecurrence, formatStartTime } from './recurrence';

describe('describeRecurrence', () => {
  it.each([
    ['FREQ=WEEKLY;BYDAY=TH', '20:00', 'Toda quinta-feira · 20:00'],
    ['FREQ=WEEKLY;BYDAY=MO', '19:30', 'Toda segunda-feira · 19:30'],
    ['FREQ=DAILY', '21:00', 'Todo dia · 21:00'],
    ['FREQ=WEEKLY;BYDAY=TU,TH', '20:00', 'terça-feira e quinta-feira · 20:00'],
  ])('describes %s at %s as %s', (rrule, startTime, expected) => {
    expect(describeRecurrence(rrule, startTime, 'pt-BR')).toBe(expected);
  });
});

describe('formatStartTime', () => {
  it('formats an ISO dtstart into HH:mm in the given timezone', () => {
    expect(formatStartTime('2026-01-01T23:00:00.000Z', 'America/Sao_Paulo')).toBe('20:00');
  });
});
