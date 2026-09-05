'use client';

import { useEffect, useRef, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { Popover, PopoverAnchor, PopoverContent, PopoverTrigger } from '@live-show/design-system';
import {
  buildMonthGrid,
  combine,
  formatDate,
  fromDateTimeLocal,
  maskDate,
  maskTime,
  normalizeTime,
  parseDate,
  toDateTimeLocal,
} from './date-time-input.utils';
import styles from './DateTimePicker.module.scss';

interface DateTimePickerProps {
  // datetime-local format: YYYY-MM-DDTHH:mm, local time, no timezone suffix —
  // matches exactly what the native <input type="datetime-local"> this
  // replaces already produced, so the form schema and submit logic this
  // feeds into need no changes. '' means unset.
  value: string;
  onChange: (value: string) => void;
  error?: string;
  // datetime-local string. Calendar days before this date are disabled (day
  // granularity — the min day itself stays selectable; the same-day earlier
  // time is caught by the form's endsAt > startsAt refine). Used to stop an
  // event's end from landing before its start.
  min?: string;
  label?: string;
  required?: boolean;
  allowPast?: boolean;
  defaultTime?: string;
  quickTimes?: string[];
  id?: string;
  disabled?: boolean;
}

const LOCALE_CODE: Record<string, string> = { pt: 'pt-BR', en: 'en-US', es: 'es-419' };

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function capitalize(text: string): string {
  return text.length ? text[0].toUpperCase() + text.slice(1) : text;
}

export function DateTimePicker({
  value,
  onChange,
  error,
  min,
  label,
  required,
  allowPast = false,
  defaultTime = '20:00',
  quickTimes = ['19:00', '20:00', '21:00', '22:00'],
  id,
  disabled = false,
}: DateTimePickerProps) {
  const t = useTranslations('dateTimeInput');
  const locale = useLocale();
  const localeCode = LOCALE_CODE[locale] ?? 'pt-BR';
  const weekdays = t.raw('weekdays') as string[];

  const initial = fromDateTimeLocal(value);
  const [dateText, setDateText] = useState(initial.date ? formatDate(initial.date) : '');
  const [timeText, setTimeText] = useState(initial.time);
  const [date, setDate] = useState<Date | null>(initial.date);
  const [time, setTime] = useState(initial.time);
  const [open, setOpen] = useState(false);
  const [dateFocused, setDateFocused] = useState(false);
  const [timeFocused, setTimeFocused] = useState(false);
  const [view, setView] = useState<Date>(initial.date ?? new Date());
  const [internalError, setInternalError] = useState('');

  // Re-sync from an external value change (e.g. form reset) instead of
  // reacting to our own onChange, which would just echo the same value back.
  const lastEmitted = useRef(value);
  useEffect(() => {
    if (value === lastEmitted.current) return;
    lastEmitted.current = value;
    const next = fromDateTimeLocal(value);
    setDate(next.date);
    setTime(next.time);
    setDateText(next.date ? formatDate(next.date) : '');
    setTimeText(next.time);
    setView(next.date ?? new Date());
  }, [value]);

  function emit(nextDate: Date | null, nextTime: string) {
    const combined = combine(nextDate, nextTime);
    if (combined) {
      const next = toDateTimeLocal(combined);
      lastEmitted.current = next;
      onChange(next);
      return;
    }
    if (!nextDate && !nextTime) {
      lastEmitted.current = '';
      onChange('');
    }
  }

  function handleDateChange(text: string) {
    setDateText(maskDate(text));
    setInternalError('');
  }

  function handleDateBlur() {
    setDateFocused(false);
    if (!dateText) {
      setDate(null);
      setInternalError('');
      emit(null, time);
      return;
    }
    const parsed = parseDate(dateText);
    if (!parsed) {
      setInternalError(t('invalidDate'));
      return;
    }
    setDate(parsed);
    setDateText(formatDate(parsed));
    setView(parsed);
    setInternalError('');
    emit(parsed, time);
  }

  function handleTimeChange(text: string) {
    setTimeText(maskTime(text));
    setInternalError('');
  }

  function handleTimeBlur() {
    setTimeFocused(false);
    const normalized = normalizeTime(timeText);
    if (normalized === null) {
      setInternalError(t('invalidTime'));
      return;
    }
    setTime(normalized);
    setTimeText(normalized);
    setInternalError('');
    emit(date, normalized);
  }

  function pickDay(day: Date) {
    const nextTime = time || defaultTime;
    setDate(day);
    setDateText(formatDate(day));
    setView(day);
    setTime(nextTime);
    setTimeText(nextTime);
    setInternalError('');
    emit(day, nextTime);
  }

  function pickQuickTime(quick: string) {
    setTime(quick);
    setTimeText(quick);
    setInternalError('');
    emit(date, quick);
  }

  function pickToday() {
    const today = startOfDay(new Date());
    pickDay(today);
  }

  const today = startOfDay(new Date());
  const minFromPast = allowPast ? null : today;
  const minFromProp = min ? startOfDay(fromDateTimeLocal(min).date ?? today) : null;
  const minDate =
    minFromProp && minFromPast ? (minFromProp > minFromPast ? minFromProp : minFromPast) : (minFromProp ?? minFromPast);
  const grid = buildMonthGrid(view, { selected: date, today, minDate });
  const monthLabel = capitalize(view.toLocaleDateString(localeCode, { month: 'long', year: 'numeric' }));

  const displayError = error || internalError;
  const active = open || dateFocused || timeFocused;
  const combined = combine(date, time);
  const summary =
    combined && !displayError
      ? `${capitalize(
          combined.toLocaleDateString(localeCode, { weekday: 'long', day: 'numeric', month: 'long' }),
        )} · ${time}`
      : '';

  return (
    <div className={styles.root}>
      {label && (
        <label className={styles.labelRow} htmlFor={id}>
          <span>
            {label} {required && <span className={styles.required}>*</span>}
          </span>
          <span className={styles.hint}>{t('hint')}</span>
        </label>
      )}

      <Popover open={open && !disabled} onOpenChange={(next) => !disabled && setOpen(next)}>
        <PopoverAnchor asChild>
          <div
            className={`${styles.field} ${active ? styles.fieldActive : ''} ${displayError ? styles.fieldError : ''} ${disabled ? styles.fieldDisabled : ''}`}
          >
            <PopoverTrigger asChild>
              <button type="button" className={styles.calendarButton} aria-label={t('openCalendar')} disabled={disabled}>
                <CalendarIcon size={17} />
              </button>
            </PopoverTrigger>
            <input
              id={id}
              className={styles.dateInput}
              value={dateText}
              placeholder={t('datePlaceholder')}
              inputMode="numeric"
              disabled={disabled}
              onChange={(e) => handleDateChange(e.target.value)}
              onFocus={() => setDateFocused(true)}
              onBlur={handleDateBlur}
            />
            <span className={styles.divider} />
            <input
              className={styles.timeInput}
              value={timeText}
              placeholder={t('timePlaceholder')}
              inputMode="numeric"
              disabled={disabled}
              onChange={(e) => handleTimeChange(e.target.value)}
              onFocus={() => setTimeFocused(true)}
              onBlur={handleTimeBlur}
            />
          </div>
        </PopoverAnchor>

        <PopoverContent className={styles.content} align="start" sideOffset={6} collisionPadding={16}>
          <div className={styles.monthHeader}>
            <button
              type="button"
              className={styles.navButton}
              onClick={() => setView(new Date(view.getFullYear(), view.getMonth() - 1, 1))}
            >
              <ChevronLeft size={15} />
            </button>
            <span className={styles.monthLabel}>{monthLabel}</span>
            <button
              type="button"
              className={styles.navButton}
              onClick={() => setView(new Date(view.getFullYear(), view.getMonth() + 1, 1))}
            >
              <ChevronRight size={15} />
            </button>
          </div>

          <div className={styles.weekdayRow}>
            {weekdays.map((w, i) => (
              // eslint-disable-next-line react/no-array-index-key
              <span key={i} className={styles.weekday}>
                {w}
              </span>
            ))}
          </div>

          <div className={styles.dayGrid}>
            {grid.map((cell) => (
              <button
                key={cell.date.toISOString()}
                type="button"
                disabled={cell.disabled}
                aria-pressed={cell.selected}
                className={[
                  styles.day,
                  cell.selected && styles.daySelected,
                  cell.isToday && !cell.selected && styles.dayToday,
                  !cell.inMonth && !cell.disabled && styles.dayOutside,
                  cell.disabled && styles.dayDisabled,
                ]
                  .filter(Boolean)
                  .join(' ')}
                onClick={() => pickDay(cell.date)}
              >
                {cell.date.getDate()}
              </button>
            ))}
          </div>

          <div className={styles.popoverDivider} />

          <div className={styles.timeRow}>
            <span className={styles.timeLabel}>{t('time')}</span>
            <input
              className={styles.popoverTimeInput}
              value={timeText}
              placeholder={t('timePlaceholder')}
              inputMode="numeric"
              onChange={(e) => handleTimeChange(e.target.value)}
              onFocus={() => setTimeFocused(true)}
              onBlur={handleTimeBlur}
            />
            <div className={styles.quickTimes}>
              {quickTimes.map((quick) => (
                <button
                  key={quick}
                  type="button"
                  className={`${styles.quickTime} ${time === quick ? styles.quickTimeActive : ''}`}
                  onClick={() => pickQuickTime(quick)}
                >
                  {quick}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.footer}>
            <button type="button" className={styles.todayButton} onClick={pickToday}>
              {t('today')}
            </button>
            <button type="button" className={styles.doneButton} onClick={() => setOpen(false)}>
              {t('done')}
            </button>
          </div>
        </PopoverContent>
      </Popover>

      {displayError && <p className={styles.error}>{displayError}</p>}
      {!displayError && summary && <p className={styles.summary}>{summary}</p>}
    </div>
  );
}
