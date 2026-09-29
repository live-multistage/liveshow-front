import axios from 'axios';

/** Whole days between two `YYYY-MM-DD` dates (UTC, no DST drift). */
export function rangeDays(from: string, to: string): number {
  if (!from || !to) return 0;
  const fromMs = new Date(`${from}T00:00:00Z`).getTime();
  const toMs = new Date(`${to}T00:00:00Z`).getTime();
  return Math.round((toMs - fromMs) / 86_400_000);
}

/** Client mirror of the backend rule: from < to and range <= 90 days. */
export function isRangeValid(from: string, to: string): boolean {
  const days = rangeDays(from, to);
  return days > 0 && days <= 90;
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
