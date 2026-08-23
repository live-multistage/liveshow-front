import { describe, it, expect } from 'vitest';
import { useChannelReadiness } from './useChannelReadiness';

// Função pura (não usa hooks do React), então roda direto.
const readiness = (overrides: Partial<Parameters<typeof useChannelReadiness>[0]> = {}) =>
  useChannelReadiness({
    accessMode: 'FREE',
    pricingSynced: false,
    cameraCount: 0,
    programCount: 0,
    ...overrides,
  });

const doneOf = (id: 'cameras' | 'programs' | 'pricing', result: ReturnType<typeof readiness>) =>
  result.items.find((item) => item.id === id)!.done;

describe('useChannelReadiness', () => {
  it('counts a free channel with no cameras as one of three', () => {
    const result = readiness();

    expect(result.doneCount).toBe(1); // preços não se aplicam a canal gratuito
    expect(result.total).toBe(3);
    expect(result.ready).toBe(false);
  });

  it('lets a free channel publish as soon as it has cameras', () => {
    const result = readiness({ cameraCount: 2 });

    expect(result.ready).toBe(true);
    expect(doneOf('pricing', result)).toBe(true);
  });

  it('keeps a subscription channel blocked while pricing is unsynced', () => {
    const result = readiness({ accessMode: 'SUBSCRIPTION', cameraCount: 2 });

    expect(doneOf('pricing', result)).toBe(false);
    expect(result.ready).toBe(false);
  });

  it('releases a subscription channel once cameras and pricing are ready', () => {
    const result = readiness({ accessMode: 'SUBSCRIPTION', cameraCount: 1, pricingSynced: true });

    expect(result.ready).toBe(true);
    expect(result.doneCount).toBe(2);
  });

  it('treats the schedule as recommended — it never blocks publishing', () => {
    const withPrograms = readiness({ cameraCount: 1, programCount: 3 });

    expect(doneOf('programs', withPrograms)).toBe(true);
    expect(withPrograms.doneCount).toBe(3);
    expect(readiness({ cameraCount: 1 }).ready).toBe(true);
  });

  it('never releases a channel without cameras', () => {
    const result = readiness({ accessMode: 'SUBSCRIPTION', pricingSynced: true, programCount: 5 });

    expect(result.ready).toBe(false);
  });
});
