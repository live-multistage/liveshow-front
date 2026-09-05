// Pure helpers for DateTimePicker — no React, no i18n, unit-testable in
// isolation. Dates are always local time, day-granularity unless noted.

export interface MonthCell {
  date: Date;
  inMonth: boolean;
  selected: boolean;
  isToday: boolean;
  disabled: boolean;
}

/** Digits-only date mask: '' | 'dd' | 'dd/mm' | 'dd/mm/yyyy'. */
export function maskDate(text: string): string {
  const digits = text.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

/** Digits-only time mask: '' | 'hh' | 'hh:mm'. */
export function maskTime(text: string): string {
  const digits = text.replace(/\D/g, '').slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}:${digits.slice(2)}`;
}

/** Parses a masked date string into a real Date (midnight local), or null if invalid/incomplete. */
export function parseDate(text: string): Date | null {
  const digits = text.replace(/\D/g, '');
  if (digits.length < 6) return null;
  const dd = Number(digits.slice(0, 2));
  const mm = Number(digits.slice(2, 4));
  const yearDigits = digits.slice(4, 8);
  const yyyy = yearDigits.length === 2 ? 2000 + Number(yearDigits) : Number(yearDigits);
  if (!yyyy || yearDigits.length < 2) return null;
  const date = new Date(yyyy, mm - 1, dd);
  const isReal = date.getFullYear() === yyyy && date.getMonth() === mm - 1 && date.getDate() === dd;
  return isReal ? date : null;
}

/**
 * Normalizes a masked time string.
 * '' → '' (cleared); a complete valid time → 'HH:MM'; anything else → null (invalid).
 */
export function normalizeTime(text: string): string | null | '' {
  const digits = text.replace(/\D/g, '');
  if (digits.length === 0) return '';
  const hh = digits.length === 1 ? Number(digits) : Number(digits.slice(0, 2));
  const mm = digits.length > 2 ? Number(digits.slice(2, 4).padEnd(2, '0')) : 0;
  if (Number.isNaN(hh) || Number.isNaN(mm) || hh > 23 || mm > 59) return null;
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

/** 'dd/mm/yyyy' for a Date. */
export function formatDate(date: Date): string {
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yyyy = date.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

/** Combines a day and 'HH:MM' time into one Date, or null if either is missing. */
export function combine(date: Date | null, time: string): Date | null {
  if (!date || !time) return null;
  const [hh, mm] = time.split(':').map(Number);
  if (Number.isNaN(hh) || Number.isNaN(mm)) return null;
  const combined = new Date(date.getFullYear(), date.getMonth(), date.getDate(), hh, mm);
  return combined;
}

/** Formats a Date as a datetime-local value: 'YYYY-MM-DDTHH:mm'. */
export function toDateTimeLocal(date: Date): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const hh = String(date.getHours()).padStart(2, '0');
  const mi = String(date.getMinutes()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
}

/** Parses a datetime-local value back into its day (midnight) and 'HH:MM' time. */
export function fromDateTimeLocal(value: string): { date: Date | null; time: string } {
  if (!value) return { date: null, time: '' };
  const [datePart, timePart] = value.split('T');
  const [yyyy, mm, dd] = datePart.split('-').map(Number);
  if (!yyyy || !mm || !dd) return { date: null, time: '' };
  return { date: new Date(yyyy, mm - 1, dd), time: timePart ?? '' };
}

interface MonthGridOptions {
  selected: Date | null;
  today: Date;
  minDate: Date | null;
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

/** Builds the calendar grid for the month shown by `view`. Weeks start Sunday. */
export function buildMonthGrid(view: Date, { selected, today, minDate }: MonthGridOptions): MonthCell[] {
  const year = view.getFullYear();
  const month = view.getMonth();
  const startDow = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const rows = Math.ceil((startDow + daysInMonth) / 7);
  const cells: MonthCell[] = [];
  for (let i = 0; i < rows * 7; i++) {
    const dayNumber = i - startDow + 1;
    const date = new Date(year, month, dayNumber);
    cells.push({
      date,
      inMonth: date.getMonth() === month,
      selected: !!selected && isSameDay(date, selected),
      isToday: isSameDay(date, today),
      disabled: !!minDate && date < minDate,
    });
  }
  return cells;
}
