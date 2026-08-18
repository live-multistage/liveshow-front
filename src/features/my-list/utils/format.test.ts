import { describe, it, expect } from 'vitest';
import { countdownLabel, durationLabel, watchedSummary } from './format';

describe('durationLabel', () => {
  it('formats hours and minutes', () => {
    expect(durationLabel('2026-08-01T20:00:00.000Z', '2026-08-01T21:52:00.000Z')).toBe('1h 52min');
  });

  it('drops the hour part under an hour', () => {
    expect(durationLabel('2026-08-01T20:00:00.000Z', '2026-08-01T20:45:00.000Z')).toBe('45min');
  });

  /** Sem fim definido, ou fim antes do início, é ausência de dado — não "0min". */
  it('returns null when there is no usable end', () => {
    expect(durationLabel('2026-08-01T20:00:00.000Z', null)).toBeNull();
    expect(durationLabel('2026-08-01T20:00:00.000Z', '2026-08-01T19:00:00.000Z')).toBeNull();
  });
});

describe('countdownLabel', () => {
  const now = new Date('2026-08-17T12:00:00.000Z');

  it('counts in days when the event is days away', () => {
    expect(countdownLabel('2026-09-04T12:00:00.000Z', 'pt-BR', now)).toBe('em 18 dias');
  });

  it('falls back to hours within the same day', () => {
    expect(countdownLabel('2026-08-17T15:00:00.000Z', 'pt-BR', now)).toBe('em 3 horas');
  });

  it('follows the requested locale', () => {
    expect(countdownLabel('2026-09-04T12:00:00.000Z', 'en-US', now)).toBe('in 18 days');
  });
});

describe('watchedSummary', () => {
  it('reports what is left and how much was seen', () => {
    expect(watchedSummary(3780, 6000)).toEqual({ remaining: '37min', percent: 63 });
  });

  it('spells hours out once there is more than one left', () => {
    expect(watchedSummary(1200, 6000)).toEqual({ remaining: '1h 20min', percent: 20 });
  });

  /** Anunciar 100% a quem ainda tem trecho pela frente é pior que anunciar 99%. */
  it('never rounds up to a finished-looking number', () => {
    expect(watchedSummary(5999, 6000)?.percent).toBe(99);
  });

  it('returns null when the runtime is unknown', () => {
    expect(watchedSummary(120, 0)).toBeNull();
  });
});
