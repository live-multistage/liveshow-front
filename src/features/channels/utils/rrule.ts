// RRULE em canais é sempre uma recorrência semanal simples: o editor mostra
// checkboxes de dias da semana e nunca a regra crua. Duas funções puras dão
// conta do contrato aceito pelo backend.
export const WEEKDAYS = ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'] as const;

export type Weekday = (typeof WEEKDAYS)[number];

// Sete dias marcados viram FREQ=DAILY. Semanal SEMPRE carrega BYDAY — o backend
// recusa FREQ=WEEKLY sem ele, então lista vazia também cai em DAILY.
export function buildRRule(days: Weekday[]): string {
  const picked = WEEKDAYS.filter((day) => days.includes(day));
  if (picked.length === 0 || picked.length === WEEKDAYS.length) return 'FREQ=DAILY';
  return `FREQ=WEEKLY;BYDAY=${picked.join(',')}`;
}

// Localized short weekday names (MO..SU order) with no translation key per
// day: 2024-01-01 was a Monday, so the week starting there gives the names
// in the same order as WEEKDAYS via Intl alone.
const REFERENCE_MONDAY = Date.UTC(2024, 0, 1);

export function weekdayLabels(locale: string): string[] {
  const format = new Intl.DateTimeFormat(locale, { weekday: 'short', timeZone: 'UTC' });
  return WEEKDAYS.map((_, index) => format.format(new Date(REFERENCE_MONDAY + index * 86_400_000)));
}

export function parseRRule(rrule: string): Weekday[] {
  if (/FREQ=DAILY/i.test(rrule)) return [...WEEKDAYS];

  const byDay = /BYDAY=([A-Za-z,]+)/.exec(rrule);
  if (!byDay) return [];

  const picked = new Set(byDay[1].toUpperCase().split(','));
  return WEEKDAYS.filter((day) => picked.has(day));
}

// Civil date (YYYY-MM-DD) of an instant in the given timezone. No
// toISOString: it always answers in UTC and can be off by up to 14 hours.
export function dayKeyInTimezone(instant: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(instant);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? '';
  return `${part('year')}-${part('month')}-${part('day')}`;
}

