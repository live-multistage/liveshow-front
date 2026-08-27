import { describe, it, expect } from 'vitest';
import { buildWeekGrid, ROW_HEIGHT } from './useWeekGrid';
import type { Program } from '../types/channel.types';

const program = (overrides: Partial<Program> = {}): Program => ({
  id: 'prg-1',
  channelId: 'ch-1',
  name: 'Jornal',
  description: null,
  startTime: '20:00',
  durationMin: 120,
  rrule: 'FREQ=WEEKLY;BYDAY=MO',
  latencyMode: 'STANDARD',
  recordingEnabled: true,
  ...overrides,
});

// Quarta-feira, 26/08/2026 às 15h UTC (meio-dia em São Paulo).
const NOW = new Date('2026-08-26T15:00:00.000Z');
const TZ = 'America/Sao_Paulo';

describe('buildWeekGrid', () => {
  it('opens the civil week on Sunday and marks today', () => {
    const grid = buildWeekGrid([], TZ, 0, NOW);

    expect(grid.days.map((day) => day.key)).toEqual([
      '2026-08-23',
      '2026-08-24',
      '2026-08-25',
      '2026-08-26',
      '2026-08-27',
      '2026-08-28',
      '2026-08-29',
    ]);
    expect(grid.days.filter((day) => day.isToday).map((day) => day.key)).toEqual(['2026-08-26']);
  });

  it('shifts a whole week per offset and marks no day as today', () => {
    const grid = buildWeekGrid([], TZ, 1, NOW);

    expect(grid.days[0].key).toBe('2026-08-30');
    expect(grid.days.some((day) => day.isToday)).toBe(false);
  });

  it('falls back to an 18h–02h window with no programs', () => {
    const grid = buildWeekGrid([], TZ, 0, NOW);

    expect(grid.rangeStartMin).toBe(18 * 60);
    expect(grid.hours).toHaveLength(8);
    expect(grid.bodyHeight).toBe(8 * ROW_HEIGHT);
  });

  it('places a block by start time and duration, one hour of slack above', () => {
    const grid = buildWeekGrid([program()], TZ, 0, NOW);

    // 20h com folga de uma hora -> a janela abre às 19h.
    expect(grid.rangeStartMin).toBe(19 * 60);

    const [block] = grid.blocks;
    expect(block.column).toBe(1); // segunda-feira
    expect(block.startMinutes).toBe(20 * 60);
    expect(block.top).toBe(ROW_HEIGHT); // uma hora abaixo do topo
    expect(block.height).toBe(2 * ROW_HEIGHT - 4);
  });

  it('gives one block per weekday of the recurrence', () => {
    const grid = buildWeekGrid([program({ rrule: 'FREQ=WEEKLY;BYDAY=SA,SU' })], TZ, 0, NOW);

    expect(grid.blocks.map((block) => block.column).sort()).toEqual([0, 6]);
  });

  it('keeps at least eight rows even for a single short program', () => {
    const grid = buildWeekGrid([program({ startTime: '20:00', durationMin: 30 })], TZ, 0, NOW);

    expect(grid.hours.length).toBeGreaterThanOrEqual(8);
  });

  it('clamps a block that runs past the visible window', () => {
    // 23h + 4h atravessa a meia-noite: o bloco é cortado no fim da janela.
    const grid = buildWeekGrid([program({ startTime: '23:00', durationMin: 240 })], TZ, 0, NOW);
    const [block] = grid.blocks;

    expect(block.top + block.height).toBeLessThanOrEqual(grid.bodyHeight);
  });

  it('reads today in the channel timezone, not the browser one', () => {
    // 26/08 15h UTC ainda é 27/08 em Tóquio (00h).
    const grid = buildWeekGrid([], 'Asia/Tokyo', 0, NOW);

    expect(grid.days.filter((day) => day.isToday).map((day) => day.key)).toEqual(['2026-08-27']);
  });
});
