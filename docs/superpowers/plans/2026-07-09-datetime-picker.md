# DateTime Picker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a calendar + scroll-wheel time picker matching the provided reference design, restyled to this app's own design system (colors, fonts — not the reference's violet accent), and use it for the event-creation wizard's `startsAt`/`endsAt` fields, replacing the current native `<input type="datetime-local">` pair.

**Architecture:** Two new components under `src/shared/components/DateTimePicker/`: `ScrollWheelPicker` (a reusable, dependency-free iOS-style scroll-snap number wheel, used twice — hours 0–23, minutes 0–59) and `DateTimePicker` (the composite: a `Popover` trigger, `react-day-picker`'s `DayPicker` for the calendar grid, two `ScrollWheelPicker`s, and a confirm button — all restyled via new SCSS modules). `EventLocationStep.tsx` swaps its two native inputs for two `DateTimePicker`s wired through react-hook-form's `Controller` (needed because the value isn't a native input event anymore).

**Tech Stack:** React, `react-day-picker` (already a dependency), `date-fns` (already a dependency, used only for its `ptBR` locale), Radix `Popover` (already used elsewhere in this app via `@/shared/components/ui/popover`), `react-hook-form`. No new dependencies.

## Global Constraints

- Colors/fonts follow **this app's** design system (`src/styles/_variables.scss`: `$action` pink/magenta for every selected/active state, `$surface-dark`/`$border` for the popover surface, `'Space Mono'` for numeric displays) — not the reference image's violet accent, which was a structural/UX reference only, not a literal color spec.
- `DateTimePicker`'s public value contract is a plain string in the exact same format the native `datetime-local` input already produced (`YYYY-MM-DDTHH:mm`, local time, no timezone suffix) — this means `create-event.schema.ts` (`startsAt`/`endsAt: z.string()`) and the wizard's submit logic need **zero changes**.
- Selection is staged in local draft state and only committed (calls `onChange`) when "Confirmar seleção" is clicked — dismissing the popover any other way (click outside, Escape) discards the draft and leaves the previously-committed value untouched.
- `react-day-picker`'s base stylesheet (`react-day-picker/dist/style.css`) is still imported — it provides grid/table layout structure that the `classNames` prop only adds theming classes on top of, not a replacement for. Reinventing that layout CSS from scratch would be pure waste.
- No test runner exists in this repo for this kind of file — verification is `npx tsc --noEmit` plus manual browser checks (this is a visual/interactive component, so the manual check matters more than usual here).

---

### Task 1: `ScrollWheelPicker`

**Files:**
- Create: `src/shared/components/DateTimePicker/ScrollWheelPicker.tsx`
- Create: `src/shared/components/DateTimePicker/ScrollWheelPicker.module.scss`

**Interfaces:**
- Produces: `ScrollWheelPicker({ value: number; min: number; max: number; onChange: (value: number) => void; ariaLabel: string })` — a controlled component. Consumed by Task 2's `DateTimePicker`.

- [ ] **Step 1: Create the component**

Create `src/shared/components/DateTimePicker/ScrollWheelPicker.tsx`:

```tsx
'use client';

import { useEffect, useRef, useCallback } from 'react';
import styles from './ScrollWheelPicker.module.scss';

const ROW_HEIGHT = 40;

interface Props {
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
  ariaLabel: string;
}

// iOS-style scroll wheel: a scroll-snap list with one row of invisible
// padding above/below so the first and last real values can still land in
// the centered (selected) slot. Scrolling settles on the nearest row via
// native scroll-snap; this only needs to read back which index that landed
// on, via the browser's 'scrollend' event (with a debounced 'scroll'
// fallback for engines that don't support it yet).
export function ScrollWheelPicker({ value, min, max, onChange, ariaLabel }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const values = Array.from({ length: max - min + 1 }, (_, i) => min + i);
  const isProgrammaticScroll = useRef(false);

  const scrollToValue = useCallback((v: number, smooth: boolean) => {
    const container = containerRef.current;
    if (!container) return;
    const index = v - min;
    isProgrammaticScroll.current = true;
    container.scrollTo({ top: index * ROW_HEIGHT, behavior: smooth ? 'smooth' : 'auto' });
  }, [min]);

  // Sync scroll position to `value` once, on mount — this component is
  // freshly mounted every time its parent Popover opens (Radix unmounts
  // closed content by default), so a mount-time sync is sufficient; there's
  // no need to react to `value` changing after that.
  useEffect(() => {
    scrollToValue(value, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleScrollEnd = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    if (isProgrammaticScroll.current) {
      isProgrammaticScroll.current = false;
      return;
    }
    const index = Math.round(container.scrollTop / ROW_HEIGHT);
    const clamped = Math.min(values.length - 1, Math.max(0, index));
    const next = min + clamped;
    if (next !== value) onChange(next);
  }, [min, value, values.length, onChange]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    let timeout: ReturnType<typeof setTimeout>;
    const onScroll = () => {
      clearTimeout(timeout);
      timeout = setTimeout(handleScrollEnd, 120);
    };
    container.addEventListener('scrollend', handleScrollEnd);
    container.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      clearTimeout(timeout);
      container.removeEventListener('scrollend', handleScrollEnd);
      container.removeEventListener('scroll', onScroll);
    };
  }, [handleScrollEnd]);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowUp' && value > min) {
      e.preventDefault();
      onChange(value - 1);
      scrollToValue(value - 1, true);
    } else if (e.key === 'ArrowDown' && value < max) {
      e.preventDefault();
      onChange(value + 1);
      scrollToValue(value + 1, true);
    }
  }

  return (
    <div
      ref={containerRef}
      className={styles.wheel}
      role="listbox"
      aria-label={ariaLabel}
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      <div className={styles.pad} aria-hidden />
      {values.map((v) => (
        <div
          key={v}
          role="option"
          aria-selected={v === value}
          className={`${styles.row} ${v === value ? styles.rowSelected : ''}`}
          onClick={() => { onChange(v); scrollToValue(v, true); }}
        >
          {String(v).padStart(2, '0')}
        </div>
      ))}
      <div className={styles.pad} aria-hidden />
    </div>
  );
}
```

- [ ] **Step 2: Create the stylesheet**

Create `src/shared/components/DateTimePicker/ScrollWheelPicker.module.scss`:

```scss
@use '../../../styles/_variables' as *;

.wheel {
  position: relative;
  height: 120px; // 3 rows × 40px — matches ROW_HEIGHT in the component
  overflow-y: auto;
  scroll-snap-type: y mandatory;
  scrollbar-width: none;
  outline: none;
  border-radius: 8px;

  &::-webkit-scrollbar {
    display: none;
  }

  // Highlight band for the centered (selected) slot — a fixed overlay, not
  // tied to scroll position, since the middle row is always the selection.
  &::before {
    content: '';
    position: absolute;
    top: 40px;
    left: 0;
    right: 0;
    height: 40px;
    background: $action-dim;
    border-radius: 6px;
    pointer-events: none;
    z-index: 0;
  }
}

.pad {
  height: 40px;
  scroll-snap-align: none;
}

.row {
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  scroll-snap-align: center;
  font-family: 'Space Mono', monospace;
  font-size: 1rem;
  color: $text-muted;
  cursor: pointer;
  position: relative;
  z-index: 1;
  transition: color 0.15s;

  &:hover {
    color: $text-secondary;
  }
}

.rowSelected {
  color: $action;
  font-weight: 700;

  &:hover {
    color: $action;
  }
}
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: no new errors (this repo may have pre-existing unrelated errors elsewhere from other in-progress work).

- [ ] **Step 4: Commit**

```bash
git add src/shared/components/DateTimePicker/ScrollWheelPicker.tsx src/shared/components/DateTimePicker/ScrollWheelPicker.module.scss
git commit -m "feat(shared): add ScrollWheelPicker (iOS-style scroll-snap number wheel)"
```

---

### Task 2: `DateTimePicker`

**Files:**
- Create: `src/shared/components/DateTimePicker/DateTimePicker.tsx`
- Create: `src/shared/components/DateTimePicker/DateTimePicker.module.scss`

**Interfaces:**
- Consumes: `ScrollWheelPicker` from Task 1. `Popover`/`PopoverTrigger`/`PopoverContent` from `@/shared/components/ui/popover` (existing).
- Produces: `DateTimePicker({ value: string; onChange: (value: string) => void; error?: string; placeholder?: string })` — `value`/`onChange` use the exact `YYYY-MM-DDTHH:mm` string format the native `datetime-local` input already produced. Consumed by Task 3's `EventLocationStep.tsx`.

- [ ] **Step 1: Create the component**

Create `src/shared/components/DateTimePicker/DateTimePicker.tsx`:

```tsx
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

      <PopoverContent className={styles.content} align="start">
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
```

- [ ] **Step 2: Create the stylesheet**

Create `src/shared/components/DateTimePicker/DateTimePicker.module.scss`:

```scss
@use '../../../styles/_variables' as *;

// ── Trigger ───────────────────────────────────────────────────────
.trigger {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
  background-color: $bg;
  border: 1px solid $border;
  border-radius: 6px;
  color: $text-primary;
  font-size: 0.9rem;
  font-family: inherit;
  padding: 0.625rem 0.75rem;
  cursor: pointer;
  text-align: left;
  transition: border-color 0.15s, box-shadow 0.15s;

  &:hover {
    border-color: $text-secondary;
  }

  &:focus-visible {
    outline: none;
    border-color: $action;
    box-shadow: 0 0 0 3px $action-dim;
  }
}

.triggerError {
  border-color: $error;
}

.triggerIcon {
  color: $text-muted;
  flex-shrink: 0;
}

.triggerValue {
  color: $text-primary;
}

.triggerPlaceholder {
  color: $text-muted;
}

// ── Popover surface ───────────────────────────────────────────────
.content {
  background-color: $surface-dark !important;
  border: 1px solid $border !important;
  border-radius: 10px !important;
  padding: 1rem !important;
  width: 320px !important;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4) !important;
  color: $text-primary;
}

.header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.8rem;
  color: $text-secondary;
  margin-bottom: 0.75rem;
}

// ── Calendar (react-day-picker theming) ────────────────────────────
.calendar {
  width: 100%;
  margin: 0;
}

.months {
  display: block;
}

.month {
  width: 100%;
}

.caption {
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  padding-bottom: 0.75rem;
}

.captionLabel {
  font-size: 0.95rem;
  font-weight: 700;
  color: $text-primary;
}

.nav {
  display: flex;
}

.navButton {
  background: transparent;
  border: none;
  color: $text-muted;
  cursor: pointer;
  padding: 0.25rem;
  border-radius: 4px;
  transition: color 0.15s, background-color 0.15s;

  &:hover {
    color: $text-primary;
    background-color: $bg-hover;
  }
}

.navButtonPrev {
  position: absolute;
  left: 0;
}

.navButtonNext {
  position: absolute;
  right: 0;
}

.table {
  width: 100%;
  border-collapse: collapse;
}

.headRow {
  display: flex;
}

.headCell {
  flex: 1;
  text-align: center;
  font-size: 0.7rem;
  font-weight: 500;
  color: $text-muted;
  text-transform: uppercase;
  padding-bottom: 0.5rem;
}

.calendarRow {
  display: flex;
  width: 100%;
}

.cell {
  flex: 1;
  text-align: center;
  padding: 2px;
}

.day {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: none;
  background: transparent;
  color: $text-primary;
  font-size: 0.85rem;
  cursor: pointer;
  transition: background-color 0.15s, color 0.15s;

  &:hover:not([disabled]) {
    background-color: $bg-hover;
  }
}

.daySelected {
  background-color: $action !important;
  color: white !important;
  font-weight: 700;
}

.dayToday {
  color: $action;
  font-weight: 700;
}

.dayOutside {
  color: $text-muted;
  opacity: 0.5;
}

.dayDisabled {
  color: $text-muted;
  opacity: 0.3;
  cursor: not-allowed;
}

// ── Divider ───────────────────────────────────────────────────────
.divider {
  height: 1px;
  background-color: $border;
  margin: 1rem 0;
}

// ── Time section ──────────────────────────────────────────────────
.timeHeader {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  font-size: 0.7rem;
  font-weight: 600;
  letter-spacing: 0.06em;
  color: $text-muted;
  margin-bottom: 0.625rem;
}

.timeRow {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.wheelGroup {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.375rem;
  flex: 1;
}

.wheelLabel {
  font-size: 0.65rem;
  color: $text-muted;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.wheelSep {
  color: $text-muted;
  font-weight: 700;
  padding-top: 1.25rem;
}

.liveReadout {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background-color: $bg;
  border: 1px solid $border;
  border-radius: 8px;
  padding: 0.75rem;
  font-family: 'Space Mono', monospace;
  font-size: 1.1rem;
  font-weight: 700;
  color: $action;
  min-width: 72px;
}

// ── Confirm ───────────────────────────────────────────────────────
.confirmBtn {
  width: 100%;
  margin-top: 1rem;
  background-color: $action;
  color: white;
  border: none;
  border-radius: 6px;
  padding: 0.625rem 1.25rem;
  font-size: 0.9rem;
  font-weight: 700;
  cursor: pointer;
  transition: opacity 0.15s;

  &:hover:not(:disabled) {
    opacity: 0.88;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 4: Commit**

```bash
git add src/shared/components/DateTimePicker/DateTimePicker.tsx src/shared/components/DateTimePicker/DateTimePicker.module.scss
git commit -m "feat(shared): add DateTimePicker (calendar + scroll-wheel time picker)"
```

---

### Task 3: Wire into the event-creation wizard

**Files:**
- Modify: `src/features/events/components/dashboard/CreateEventForm.tsx`
- Modify: `src/features/events/components/dashboard/steps/EventLocationStep.tsx`

**Interfaces:**
- Consumes: `DateTimePicker` from Task 2 (`src/shared/components/DateTimePicker/DateTimePicker.tsx`).

- [ ] **Step 1: Expose `control` from the form**

In `src/features/events/components/dashboard/CreateEventForm.tsx`, the current hook call and step-2 wiring are:

```tsx
  const { register, handleSubmit, trigger, formState: { errors } } = useForm<CreateEventFormValues>({
    resolver: zodResolver(createEventSchema),
    defaultValues: { camerasCount: 1 },
  });
```

and:

```tsx
    2: <EventLocationStep register={register} errors={errors} />,
```

Change the hook destructuring to also pull `control`:

```tsx
  const { register, control, handleSubmit, trigger, formState: { errors } } = useForm<CreateEventFormValues>({
    resolver: zodResolver(createEventSchema),
    defaultValues: { camerasCount: 1 },
  });
```

Change the step-2 wiring to pass it through:

```tsx
    2: <EventLocationStep register={register} errors={errors} control={control} />,
```

- [ ] **Step 2: Replace the two native inputs with `DateTimePicker`**

`src/features/events/components/dashboard/steps/EventLocationStep.tsx` is currently:

```tsx
import { useTranslations } from 'next-intl';
import type { UseFormRegister, FieldErrors } from 'react-hook-form';
import type { CreateEventFormValues } from '../../../schemas/create-event.schema';
import styles from '../CreateEventForm.module.scss';

interface Props {
  register: UseFormRegister<CreateEventFormValues>;
  errors: FieldErrors<CreateEventFormValues>;
}

export function EventLocationStep({ register, errors }: Props) {
  const t = useTranslations('createEvent.location');

  return (
    <section className={styles.section}>
      <div className={styles.field}>
        <label className={styles.label}>{t('venueLabel')}</label>
        <input
          {...register('venue')}
          className={styles.input}
          placeholder={t('venuePlaceholder')}
        />
      </div>

      <div className={styles.row}>
        <div className={styles.field}>
          <label className={styles.label}>{t('cityLabel')}</label>
          <input
            {...register('city')}
            className={styles.input}
            placeholder={t('cityPlaceholder')}
          />
        </div>
        <div className={styles.field}>
          <label className={styles.label}>{t('countryLabel')}</label>
          <input
            {...register('country')}
            className={styles.input}
            placeholder={t('countryPlaceholder')}
          />
        </div>
      </div>

      <div className={styles.row}>
        <div className={styles.field}>
          <label className={styles.label}>{t('startsAtLabel')}</label>
          <input
            type="datetime-local"
            {...register('startsAt')}
            className={`${styles.input} ${errors.startsAt ? styles.inputError : ''}`}
          />
          {errors.startsAt && <p className={styles.error}>{errors.startsAt.message}</p>}
        </div>
        <div className={styles.field}>
          <label className={styles.label}>{t('endsAtLabel')}</label>
          <input
            type="datetime-local"
            {...register('endsAt')}
            className={`${styles.input} ${errors.endsAt ? styles.inputError : ''}`}
          />
          {errors.endsAt && <p className={styles.error}>{errors.endsAt.message}</p>}
        </div>
      </div>
    </section>
  );
}
```

Replace it with:

```tsx
import { useTranslations } from 'next-intl';
import { Controller } from 'react-hook-form';
import type { UseFormRegister, FieldErrors, Control } from 'react-hook-form';
import type { CreateEventFormValues } from '../../../schemas/create-event.schema';
import { DateTimePicker } from '@/shared/components/DateTimePicker/DateTimePicker';
import styles from '../CreateEventForm.module.scss';

interface Props {
  register: UseFormRegister<CreateEventFormValues>;
  errors: FieldErrors<CreateEventFormValues>;
  control: Control<CreateEventFormValues>;
}

export function EventLocationStep({ register, errors, control }: Props) {
  const t = useTranslations('createEvent.location');

  return (
    <section className={styles.section}>
      <div className={styles.field}>
        <label className={styles.label}>{t('venueLabel')}</label>
        <input
          {...register('venue')}
          className={styles.input}
          placeholder={t('venuePlaceholder')}
        />
      </div>

      <div className={styles.row}>
        <div className={styles.field}>
          <label className={styles.label}>{t('cityLabel')}</label>
          <input
            {...register('city')}
            className={styles.input}
            placeholder={t('cityPlaceholder')}
          />
        </div>
        <div className={styles.field}>
          <label className={styles.label}>{t('countryLabel')}</label>
          <input
            {...register('country')}
            className={styles.input}
            placeholder={t('countryPlaceholder')}
          />
        </div>
      </div>

      <div className={styles.row}>
        <div className={styles.field}>
          <label className={styles.label}>{t('startsAtLabel')}</label>
          <Controller
            control={control}
            name="startsAt"
            render={({ field }) => (
              <DateTimePicker value={field.value} onChange={field.onChange} error={errors.startsAt?.message} />
            )}
          />
          {errors.startsAt && <p className={styles.error}>{errors.startsAt.message}</p>}
        </div>
        <div className={styles.field}>
          <label className={styles.label}>{t('endsAtLabel')}</label>
          <Controller
            control={control}
            name="endsAt"
            render={({ field }) => (
              <DateTimePicker value={field.value} onChange={field.onChange} error={errors.endsAt?.message} />
            )}
          />
          {errors.endsAt && <p className={styles.error}>{errors.endsAt.message}</p>}
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 4: Manual verification**

Start the dev server (`pnpm dev`) and navigate to the event-creation wizard (dashboard → create event → step 2, "Local e horário" or equivalent).

1. Confirm both date fields render as buttons showing "Selecionar data e horário" (not native inputs).
2. Click one — confirm the popover opens showing the calendar (current month, Portuguese weekday/month names), the HH/MM scroll wheels (defaulting to the current time), and a live "HH:MM" readout.
3. Click a day in the calendar — confirm it highlights in the app's pink/magenta accent (`$action`), not the reference image's violet.
4. Scroll (or drag) the HH wheel and the MM wheel — confirm the centered value updates the live readout, and that clicking a visible-but-not-centered row snaps it to center.
5. Click "Confirmar seleção" — confirm the popover closes and the trigger button now shows the formatted date/time (e.g. "9 de julho de 2026, 15:32").
6. Repeat for the second field, then confirm the wizard's own client-side validation (`endsAt` must be after `startsAt`, from the existing Zod schema) still fires correctly if you pick an earlier end time.
7. Complete the wizard through submission (or at least advance past step 2 with `trigger`-based validation) to confirm the underlying string value round-trips correctly into the form's `startsAt`/`endsAt` fields — no changes were made to the schema or submit handler, so this should already work if the value format matches.
8. Click outside the popover without confirming — confirm the previously-set value (if any) is unchanged, not cleared.

- [ ] **Step 5: Commit**

```bash
git add src/features/events/components/dashboard/CreateEventForm.tsx src/features/events/components/dashboard/steps/EventLocationStep.tsx
git commit -m "feat(events): use DateTimePicker for startsAt/endsAt in event creation"
```

---

## Post-implementation

`react-day-picker`'s base stylesheet import (`react-day-picker/dist/style.css`) is global-ish by nature (imported inside a client component file) — if this app's build ever complains about CSS-in-JS-file imports outside `_app`/root layout conventions, move it to a shared global stylesheet import instead; not expected to be an issue with Next.js's current bundler, called out here in case it is.
