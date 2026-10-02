import axios from 'axios';
import { isValidEventName, PATHS_MAX_RANGE_DAYS } from '@live-show/api-contracts';
import type { PathDirection } from '@live-show/api-contracts';

/**
 * Inclusive calendar days covered by a `YYYY-MM-DD` `from`/`to` pick (UTC, no
 * DST drift) — e.g. the same day picked twice is 1 day, not 0. Matches the
 * span the backend now sees once `toReportRangeBounds` makes the end day
 * inclusive (see below): `to`'s bound is midnight of the day *after* `to`.
 */
export function rangeDays(from: string, to: string): number {
  if (!from || !to) return 0;
  const fromMs = new Date(`${from}T00:00:00Z`).getTime();
  const toMs = new Date(`${to}T00:00:00Z`).getTime();
  return Math.round((toMs - fromMs) / 86_400_000) + 1;
}

/** Client mirror of the backend rule: from <= to and range <= maxDays (inclusive; 90 for most reports). */
export function isRangeValid(from: string, to: string, maxDays = 90): boolean {
  const days = rangeDays(from, to);
  return days >= 1 && days <= maxDays;
}

/**
 * Single place every report tab converts a date-only `from`/`to` pick into
 * the explicit ISO bounds the backend expects. `assertRange` (report-runner.ts)
 * does `new Date(to)` and queries `< to`, so a bare `to=YYYY-MM-DD` (midnight
 * UTC) excluded the whole end day — this makes the end day inclusive by
 * bounding at the *next* day's midnight instead.
 */
export function toReportRangeBounds(from: string, to: string): { from: string; to: string } {
  const toBound = new Date(`${to}T00:00:00.000Z`);
  toBound.setUTCDate(toBound.getUTCDate() + 1);
  return { from: `${from}T00:00:00.000Z`, to: toBound.toISOString() };
}

export function defaultRange(days = 30): { from: string; to: string } {
  const to = new Date();
  const from = new Date(to);
  from.setUTCDate(from.getUTCDate() - days);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  return { from: fmt(from), to: fmt(to) };
}

/** Backend returns 422 `report_timeout` when a query runs too long. */
export function isTimeoutError(error: unknown): boolean {
  return axios.isAxiosError(error) && error.response?.status === 422;
}

export type WindowUnit = 'min' | 'h' | 'dias';

const UNIT_MULTIPLIER: Record<WindowUnit, number> = { min: 1, h: 60, dias: 1440 };

export function toWindowMinutes(value: number, unit: WindowUnit): number {
  return value * UNIT_MULTIPLIER[unit];
}

/** Max input value for a unit so windowMinutes never exceeds the 43200 (30d) cap. */
export function maxWindowValue(unit: WindowUnit): number {
  return Math.floor(43_200 / UNIT_MULTIPLIER[unit]);
}

export function formatDuration(ms: number): string {
  const totalSeconds = Math.max(0, Math.round(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return minutes > 0 ? `${minutes}min ${seconds}s` : `${seconds}s`;
}

export function formatDayOrHour(at: string, interval: 'hour' | 'day'): string {
  const date = new Date(at);
  return interval === 'hour'
    ? new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC', hour: '2-digit', minute: '2-digit' }).format(date)
    : new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC', day: '2-digit', month: '2-digit' }).format(date);
}

export function formatCohortWeek(week: string): string {
  return new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC', day: '2-digit', month: '2-digit' }).format(new Date(week));
}

/** Paths anchor: a plan event name or a `page:/route` (the API's page-view node key). */
export function isValidAnchor(anchor: string): boolean {
  return isValidEventName(anchor) || /^page:\/\S{0,199}$/.test(anchor);
}

export interface PathsFormParams {
  anchor: string;
  direction: PathDirection;
  steps: number;
  from: string;
  to: string;
}

const PATH_DIRECTIONS: readonly string[] = ['after', 'before', 'both'];
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

/** Restores a submitted Caminhos query from the URL; null unless every param is present and valid. */
export function parsePathsParams(params: { get(name: string): string | null }): PathsFormParams | null {
  const anchor = params.get('anchor');
  const direction = params.get('direction');
  const steps = Number(params.get('steps'));
  const from = params.get('from');
  const to = params.get('to');
  if (!anchor || !direction || !from || !to) return null;
  if (!isValidAnchor(anchor) || !PATH_DIRECTIONS.includes(direction)) return null;
  if (!Number.isInteger(steps) || steps < 1 || steps > 5) return null;
  if (!DATE_ONLY.test(from) || !DATE_ONLY.test(to) || !isRangeValid(from, to, PATHS_MAX_RANGE_DAYS)) return null;
  return { anchor, direction: direction as PathDirection, steps, from, to };
}
