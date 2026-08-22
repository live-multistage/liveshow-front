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

function joinWeekdayNames(names: string[]): string {
  if (names.length === 1) return names[0];
  return `${names.slice(0, -1).join(', ')} e ${names[names.length - 1]}`;
}

// RRULE + horário de início viram uma frase curta ("Toda quinta-feira ·
// 20:00") pro badge de recorrência da série. Só pt-BR por enquanto — i18n
// completo é tarefa 14 (o `locale` já entra aqui só pro nome do dia da
// semana, via Intl).
export function describeRecurrence(rrule: string, startTime: string, locale = 'pt-BR'): string {
  const days = parseRRule(rrule);
  const time = startTime.slice(0, 5);

  if (days.length === 0 || days.length === 7) return `Todo dia · ${time}`;

  if (days.length === 1) return `Toda ${weekdayName(days[0], locale)} · ${time}`;

  const names = days.map((day) => weekdayName(day, locale));
  return `${joinWeekdayNames(names)} · ${time}`;
}

// `series.dtstart` is a UTC instant; the recurrence phrase needs the local
// clock time in the series' own timezone, not UTC.
export function formatStartTime(dtstart: string, timezone: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: timezone,
  }).format(new Date(dtstart));
}
