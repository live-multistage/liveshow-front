import { parseRRule, type Weekday } from '@/features/channels/utils/rrule';

// A Monday, used purely as a reference point to get a localized weekday name
// out of Intl.DateTimeFormat for any BYDAY code.
const REFERENCE_MONDAY = '2024-01-01T12:00:00Z';
const WEEKDAY_OFFSET: Record<Weekday, number> = { MO: 0, TU: 1, WE: 2, TH: 3, FR: 4, SA: 5, SU: 6 };

function weekdayName(day: Weekday, locale: string): string {
  const date = new Date(REFERENCE_MONDAY);
  date.setUTCDate(date.getUTCDate() + WEEKDAY_OFFSET[day]);
  return new Intl.DateTimeFormat(locale, { weekday: 'long', timeZone: 'UTC' }).format(date);
}

export type RecurrenceParts = { type: 'daily'; time: string } | { type: 'weekly'; day: string; time: string };

// RRULE + horário de início viram as partes (dia/horário) usadas pelas chaves
// `series.recurrence.weekly` / `series.recurrence.daily` (t('recurrence.weekly',
// { day, time })). Fica puro pra não depender de useTranslations — o
// componente monta a frase final.
export function getRecurrenceParts(rrule: string, startTime: string, locale = 'pt-BR'): RecurrenceParts {
  const days = parseRRule(rrule);
  const time = startTime.slice(0, 5);

  if (days.length === 0 || days.length === 7) return { type: 'daily', time };

  const names = days.map((day) => weekdayName(day, locale));
  const day =
    names.length === 1
      ? names[0]
      : new Intl.ListFormat(locale, { style: 'long', type: 'conjunction' }).format(names);

  return { type: 'weekly', day, time };
}

// `series.dtstart` is a UTC instant; the recurrence phrase needs the local
// clock time in the series' own timezone, not UTC.
export function formatStartTime(dtstart: string, timezone: string, locale = 'pt-BR'): string {
  return new Intl.DateTimeFormat(locale, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: timezone,
  }).format(new Date(dtstart));
}
