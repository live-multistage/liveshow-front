'use client';

import { useMemo } from 'react';
import type { Program } from '../types/channel.types';
import { WEEKDAYS, dayKeyInTimezone, parseRRule, type Weekday } from '../utils/rrule';

// Altura de uma hora na grade, em px. O componente posiciona os blocos com o
// mesmo número, então ele mora aqui e não no SCSS.
export const ROW_HEIGHT = 44;

const MINUTES_PER_DAY = 1440;
// Janela padrão quando o canal ainda não tem programa: 18h → 02h.
const DEFAULT_RANGE_START = 18 * 60;
const DEFAULT_RANGE_END = 26 * 60;
const MIN_ROWS = 8;

// A grade começa no domingo (coluna 0), como o cabeçalho DOM.–SÁB. do desenho.
const COLUMN_BY_WEEKDAY: Record<Weekday, number> = {
  SU: 0,
  MO: 1,
  TU: 2,
  WE: 3,
  TH: 4,
  FR: 5,
  SA: 6,
};

export interface WeekGridDay {
  /** Data civil YYYY-MM-DD no fuso do canal. */
  key: string;
  /** Meio-dia UTC dessa data civil — âncora segura para formatar em UTC. */
  anchor: Date;
  isToday: boolean;
}

export interface WeekGridBlock {
  programId: string;
  name: string;
  /** 0 = domingo. */
  column: number;
  /** Minutos desde 00:00 do dia da coluna. */
  startMinutes: number;
  durationMin: number;
  /** Programa vinculado a um evento — simulcast, pintado de violeta. */
  isSimulcast: boolean;
  /** Posição absoluta dentro do corpo da grade, em px. */
  top: number;
  height: number;
}

export interface WeekGrid {
  days: WeekGridDay[];
  blocks: WeekGridBlock[];
  /** Minutos desde 00:00 em que a primeira linha começa (pode passar de 24h). */
  rangeStartMin: number;
  /** Uma entrada por linha: minutos desde 00:00 do início daquela hora. */
  hours: number[];
  bodyHeight: number;
}

function toMinutes(startTime: string): number {
  const [hour, minute] = startTime.split(':').map(Number);
  return (hour || 0) * 60 + (minute || 0);
}

/**
 * Semana civil (domingo→sábado) que contém hoje no fuso do canal, deslocada por
 * `weekOffset` semanas, mais os blocos de cada programa posicionados nela.
 *
 * Só usa `programs` (regra crua) — a grade pública por dia responde 404 em
 * canal rascunho, e a recorrência semanal simples é resolvível aqui.
 */
export function buildWeekGrid(
  programs: Program[],
  timezone: string,
  weekOffset: number,
  now: Date = new Date(),
): WeekGrid {
  const todayKey = dayKeyInTimezone(now, timezone);
  const todayAnchor = new Date(`${todayKey}T12:00:00Z`);

  const sunday = new Date(todayAnchor);
  sunday.setUTCDate(sunday.getUTCDate() - todayAnchor.getUTCDay() + weekOffset * 7);

  const days = Array.from({ length: 7 }, (_, index) => {
    const anchor = new Date(sunday);
    anchor.setUTCDate(anchor.getUTCDate() + index);
    const key = anchor.toISOString().slice(0, 10);
    return { key, anchor, isToday: key === todayKey };
  });

  const placements = programs.flatMap((program) => {
    const startMinutes = toMinutes(program.startTime);
    return parseRRule(program.rrule)
      .filter((day) => WEEKDAYS.includes(day))
      .map((day) => ({
        programId: program.id,
        name: program.name,
        column: COLUMN_BY_WEEKDAY[day],
        startMinutes,
        durationMin: program.durationMin,
        isSimulcast: Boolean(program.eventId),
      }));
  });

  // A janela visível cobre todos os programas com uma hora de folga de cada
  // lado — um canal que só passa de madrugada não mostra 24 linhas vazias.
  let rangeStartMin = DEFAULT_RANGE_START;
  let rangeEndMin = DEFAULT_RANGE_END;

  if (placements.length > 0) {
    const earliest = Math.min(...placements.map((p) => p.startMinutes));
    const latest = Math.max(...placements.map((p) => p.startMinutes + p.durationMin));
    rangeStartMin = Math.max(0, Math.floor(earliest / 60) * 60 - 60);
    rangeEndMin = Math.min(2 * MINUTES_PER_DAY, Math.ceil(latest / 60) * 60 + 60);
  }

  if (rangeEndMin - rangeStartMin < MIN_ROWS * 60) {
    rangeEndMin = rangeStartMin + MIN_ROWS * 60;
  }

  const hours = Array.from(
    { length: Math.round((rangeEndMin - rangeStartMin) / 60) },
    (_, index) => rangeStartMin + index * 60,
  );
  const bodyHeight = hours.length * ROW_HEIGHT;

  const blocks = placements.map((placement) => {
    const top = ((placement.startMinutes - rangeStartMin) * ROW_HEIGHT) / 60;
    const rawHeight = (placement.durationMin * ROW_HEIGHT) / 60 - 4;
    return {
      ...placement,
      top,
      // Programa que atravessa o fim da janela é cortado nela em vez de vazar
      // por cima da legenda.
      height: Math.max(18, Math.min(rawHeight, bodyHeight - top - 4)),
    };
  });

  return { days, blocks, rangeStartMin, hours, bodyHeight };
}

export function useWeekGrid(programs: Program[], timezone: string, weekOffset: number): WeekGrid {
  return useMemo(
    () => buildWeekGrid(programs, timezone, weekOffset),
    [programs, timezone, weekOffset],
  );
}
