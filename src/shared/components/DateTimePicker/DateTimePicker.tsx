'use client';

import { useState } from 'react';
import { DayPicker } from 'react-day-picker';
import { ptBR } from 'date-fns/locale';
import { Calendar as CalendarIcon, Clock, ChevronLeft, ChevronRight } from 'lucide-react';
import { Popover, PopoverTrigger, PopoverContent } from '@/shared/components/ui/popover';
import { ScrollWheelPicker } from './ScrollWheelPicker';
import styles from './DateTimePicker.module.scss';
import 'react-day-picker/dist/style.css';

interface Props {
  // datetime-local format: YYYY-MM-DDTHH:mm, local time, no timezone
  // suffix — matches exactly what the native <input type="datetime-local">
  // this replaces already produced, so the form schema and submit logic
  // this feeds into need no changes. '' means unset.
  value: string;
  onChange: (value: string) => void;
  error?: string;
  placeholder?: string;
}

interface Draft {
  date: Date | null;
  hour: number;
  minute: number;
}

function parseValue(value: string): Draft {
  if (!value) {
    const now = new Date();
    return { date: null, hour: now.getHours(), minute: now.getMinutes() };
  }
  const date = new Date(value);
  return { date, hour: date.getHours(), minute: date.getMinutes() };
}

function toDateTimeLocalString(date: Date, hour: number, minute: number): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const hh = String(hour).padStart(2, '0');
  const mi = String(minute).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
}

function formatTrigger(value: string): string | null {
  if (!value) return null;
  const date = new Date(value);
  const dateLabel = date.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });
  const timeLabel = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  return `${dateLabel}, ${timeLabel}`;
}

export function DateTimePicker({ value, onChange, error, placeholder = 'Selecionar data e horário' }: Props) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Draft>(() => parseValue(value));
  const [month, setMonth] = useState<Date>(() => parseValue(value).date ?? new Date());

  function handleOpenChange(next: boolean) {
    if (next) {
      const fresh = parseValue(value);
      setDraft(fresh);
      setMonth(fresh.date ?? new Date());
    }
    setOpen(next);
  }

  function handleConfirm() {
    if (!draft.date) return;
    onChange(toDateTimeLocalString(draft.date, draft.hour, draft.minute));
    setOpen(false);
  }

  const triggerLabel = formatTrigger(value);

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <button type="button" className={`${styles.trigger} ${error ? styles.triggerError : ''}`}>
          <CalendarIcon size={15} className={styles.triggerIcon} />
          <span className={triggerLabel ? styles.triggerValue : styles.triggerPlaceholder}>
            {triggerLabel ?? placeholder}
          </span>
        </button>
      </PopoverTrigger>

      <PopoverContent className={styles.content} align="start" collisionPadding={16}>
        <div className={styles.header}>
          <CalendarIcon size={15} />
          Selecionar data e horário
        </div>

        <DayPicker
          mode="single"
          locale={ptBR}
          month={month}
          onMonthChange={setMonth}
          selected={draft.date ?? undefined}
          onSelect={(d) => d && setDraft((prev) => ({ ...prev, date: d }))}
          showOutsideDays
          className={styles.calendar}
          classNames={{
            months: styles.months,
            month: styles.month,
            caption: styles.caption,
            caption_label: styles.captionLabel,
            nav: styles.nav,
            nav_button: styles.navButton,
            nav_button_previous: styles.navButtonPrev,
            nav_button_next: styles.navButtonNext,
            table: styles.table,
            head_row: styles.headRow,
            head_cell: styles.headCell,
            row: styles.calendarRow,
            cell: styles.cell,
            day: styles.day,
            day_selected: styles.daySelected,
            day_today: styles.dayToday,
            day_outside: styles.dayOutside,
            day_disabled: styles.dayDisabled,
          }}
          components={{
            IconLeft: () => <ChevronLeft size={16} />,
            IconRight: () => <ChevronRight size={16} />,
          }}
        />

        <div className={styles.divider} />

        <div className={styles.timeHeader}>
          <Clock size={13} />
          HORÁRIO
        </div>

        <div className={styles.timeRow}>
          <div className={styles.wheelGroup}>
            <span className={styles.wheelLabel}>HH</span>
            <ScrollWheelPicker
              value={draft.hour}
              min={0}
              max={23}
              onChange={(hour) => setDraft((prev) => ({ ...prev, hour }))}
              ariaLabel="Hora"
            />
          </div>
          <span className={styles.wheelSep}>:</span>
          <div className={styles.wheelGroup}>
            <span className={styles.wheelLabel}>MM</span>
            <ScrollWheelPicker
              value={draft.minute}
              min={0}
              max={59}
              onChange={(minute) => setDraft((prev) => ({ ...prev, minute }))}
              ariaLabel="Minuto"
            />
          </div>
          <div className={styles.liveReadout}>
            {String(draft.hour).padStart(2, '0')}:{String(draft.minute).padStart(2, '0')}
          </div>
        </div>

        <button type="button" className={styles.confirmBtn} onClick={handleConfirm} disabled={!draft.date}>
          Confirmar seleção
        </button>
      </PopoverContent>
    </Popover>
  );
}
