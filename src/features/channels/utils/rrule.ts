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

// RRULE weekday (MO..SU) of an instant in the given timezone.
function weekdayInTimezone(instant: Date, timeZone: string): Weekday {
  const short = new Intl.DateTimeFormat('en-US', { timeZone, weekday: 'short' }).format(instant);
  return short.slice(0, 2).toUpperCase() as Weekday;
}

// UTC offset (minutes) the timezone observes at `instant`.
function offsetMinutesAt(instant: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(instant);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((p) => p.type === type)?.value ?? 0);
  const asUtc = Date.UTC(
    part('year'),
    part('month') - 1,
    part('day'),
    part('hour') === 24 ? 0 : part('hour'),
    part('minute'),
    part('second'),
  );
  return (asUtc - instant.getTime()) / 60_000;
}

// Wall-clock date + HH:mm in a timezone -> the UTC instant it represents.
// Standard two-pass offset lookup; good enough outside DST transition
// instants, which this feature never needs to be exact about.
function zonedTimeToUtc(dateKey: string, timeHHmm: string, timeZone: string): Date {
  const [year, month, day] = dateKey.split('-').map(Number);
  const [hour, minute] = timeHHmm.split(':').map(Number);
  const guess = new Date(Date.UTC(year, month - 1, day, hour, minute));
  const offset = offsetMinutesAt(guess, timeZone);
  return new Date(guess.getTime() - offset * 60_000);
}

// ponytail: checks only the calendar days the event itself spans (its start
// and end date in the channel timezone), not every day the recurrence could
// ever land on — a multi-week program only needs "would this Event's own
// dates line up", not a full occurrence search.
export function programOverlapsEvent(
  days: Weekday[],
  startTime: string,
  durationMin: number,
  timezone: string,
  event: { startsAt: string; endsAt: string },
): boolean {
  const eventStart = new Date(event.startsAt);
  const eventEnd = new Date(event.endsAt);
  if (Number.isNaN(eventStart.getTime()) || Number.isNaN(eventEnd.getTime())) return false;

  const startKey = dayKeyInTimezone(eventStart, timezone);
  const endKey = dayKeyInTimezone(eventEnd, timezone);
  const candidateKeys = new Set([startKey, endKey]);

  for (const dateKey of candidateKeys) {
    const anchor = new Date(`${dateKey}T12:00:00Z`);
    if (!days.includes(weekdayInTimezone(anchor, timezone))) continue;

    const occStart = zonedTimeToUtc(dateKey, startTime, timezone);
    const occEnd = new Date(occStart.getTime() + durationMin * 60_000);
    if (occStart < eventEnd && eventStart < occEnd) return true;
  }

  return false;
}
