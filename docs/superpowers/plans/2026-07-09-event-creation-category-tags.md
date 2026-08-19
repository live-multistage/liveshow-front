# Event Creation Category + Tags Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add required `category` and optional `tags` fields to the event-creation wizard's step 1, wired through to the create-event request, so every new event carries the two highest-weighted signals (`category`=10x, `tag`=8x per `FeatureAccumulatorStage`'s `WEIGHTS`) for the backend's feature-extraction/positioning pipeline.

**Architecture:** A new `EventCategory` string-union type (frontend has none today, mirroring the backend's fixed 9-value enum), a required `z.enum` field in `createEventSchema`, a new chip-based `TagsInput` component wired via `Controller` (same pattern as the existing `DateTimePicker`), and step-gating so "Próximo" is blocked on step 1 without a category selected.

**Tech Stack:** Next.js, React, react-hook-form (`Controller`), Zod, next-intl.

## Global Constraints

- `category` is **required** — validation blocks step-1 advancement without one, same UX as the existing required `organizationId`.
- `tags` is **optional**, capped at 20 tags, 80 chars each — mirrors the backend DTO's `@ArrayMaxSize(20)` / `@MaxLength(80, { each: true })` exactly.
- No backend changes — `CreateEventDto`/`CreateEventUseCase` already accept both fields.
- No changes to `EventPreviewPanel` — the real public event page doesn't display category or tags, so the preview correctly doesn't need to either.
- Zod validation messages in this schema are hardcoded Portuguese strings (not i18n keys) — this is the existing convention in `create-event.schema.ts` (e.g. `'Selecione uma organização'`); the new `category` field's required-error message follows the same convention, not a new i18n key.
- All new UI-facing strings (labels, placeholders, hints, category option names) go in all three locale files: `messages/pt.json`, `messages/en.json`, `messages/es.json`.

---

### Task 1: `EventCategory` type, schema fields, i18n

**Files:**
- Modify: `src/features/events/types/event.types.ts`
- Modify: `src/features/events/schemas/create-event.schema.ts`
- Modify: `messages/pt.json`, `messages/en.json`, `messages/es.json`

**Interfaces:**
- Produces: `EventCategory` type + `EVENT_CATEGORIES` const array (from `event.types.ts`), `CreateEventFormValues.category: EventCategory` and `.tags: string[]` (from the updated schema). Consumed by Task 2 (n/a — `TagsInput` is generic) and Task 3 (`EventInfoStep`, `use-create-event-wizard.ts`).

- [ ] **Step 1: Add `EventCategory` type and update `CreateEventRequest`**

In `src/features/events/types/event.types.ts`, the file currently starts:

```ts
export type EventStatus = 'DRAFT' | 'PUBLISHED' | 'SCHEDULED' | 'LIVE' | 'FINISHED' | 'CANCELLED';

export type ListEventsFilter = 'upcoming' | 'live' | 'finished' | 'all';
```

Add, right after `ListEventsFilter`:

```ts
export type EventCategory =
  | 'MUSIC' | 'COMEDY' | 'THEATER' | 'DANCE' | 'SPORTS'
  | 'TALK' | 'RELIGIOUS' | 'EDUCATION' | 'OTHER';

export const EVENT_CATEGORIES: EventCategory[] = [
  'MUSIC', 'COMEDY', 'THEATER', 'DANCE', 'SPORTS',
  'TALK', 'RELIGIOUS', 'EDUCATION', 'OTHER',
];
```

`CreateEventRequest` currently is:

```ts
export interface CreateEventRequest {
  organizationId: string;
  title: string;
  description: string;
  startsAt: string;
  endsAt: string;
  venue?: string;
  city?: string;
  country?: string;
  venueName?: string;
  venueData?: {
    name: string;
    address?: string;
    city: string;
    country: string;
    timezone: string;
    coordinates?: { lat: number; lng: number };
  };
  camerasCount?: number;
  domain?: 'ENTERTAINMENT' | 'SPORTS' | 'CORPORATE' | 'EDUCATION' | 'RELIGIOUS' | 'OTHER';
  subtype?: string;
}
```

Add `category: EventCategory;` and `tags?: string[];` — right after `description`:

```ts
export interface CreateEventRequest {
  organizationId: string;
  title: string;
  description: string;
  category: EventCategory;
  tags?: string[];
  startsAt: string;
  endsAt: string;
  venue?: string;
  city?: string;
  country?: string;
  venueName?: string;
  venueData?: {
    name: string;
    address?: string;
    city: string;
    country: string;
    timezone: string;
    coordinates?: { lat: number; lng: number };
  };
  camerasCount?: number;
  domain?: 'ENTERTAINMENT' | 'SPORTS' | 'CORPORATE' | 'EDUCATION' | 'RELIGIOUS' | 'OTHER';
  subtype?: string;
}
```

- [ ] **Step 2: Update the Zod schema**

`src/features/events/schemas/create-event.schema.ts` currently is:

```ts
import { z } from 'zod';

export const ticketSchema = z
  .object({
    name: z.string().min(2, 'Mínimo 2 caracteres').max(255),
    description: z.string().min(5, 'Mínimo 5 caracteres'),
    price: z.coerce.number().min(0, 'Preço não pode ser negativo'),
    liveView: z.boolean().default(false),
    replayView: z.boolean().default(false),
    cameraView: z.boolean().default(false),
    camerasLimit: z
      .preprocess(
        (val) => (val === '' || val === undefined ? null : val),
        z.coerce.number().int('Deve ser número inteiro').min(1, 'Mínimo 1 câmera').nullable(),
      )
      .optional(),
    allowedStageIds: z.array(z.string().uuid()).optional(),
  })
  .refine((d) => d.liveView || d.replayView || d.cameraView, {
    message: 'Selecione ao menos um tipo de acesso',
    path: ['liveView'],
  });

export type TicketFormInput = z.input<typeof ticketSchema>;
export type TicketFormValues = z.output<typeof ticketSchema>;

export const createEventSchema = z
  .object({
    organizationId: z.string().uuid('Selecione uma organização'),
    title: z.string().min(3, 'Mínimo 3 caracteres').max(255),
    description: z.string().min(10, 'Mínimo 10 caracteres'),
    startsAt: z.string().min(1, 'Obrigatório'),
    endsAt: z.string().min(1, 'Obrigatório'),
    venue: z.string().max(255).optional(),
    city: z.string().max(100).optional(),
    country: z.string().max(100).optional(),
    camerasCount: z.coerce.number().int().min(1).max(32).default(1),
  })
  .refine((d) => new Date(d.endsAt) > new Date(d.startsAt), {
    message: 'Fim deve ser após o início',
    path: ['endsAt'],
  });

export type CreateEventFormValues = z.infer<typeof createEventSchema>;
```

Replace the `createEventSchema` block (keep `ticketSchema`/`TicketFormInput`/`TicketFormValues` exactly as-is) with:

```ts
export const EVENT_CATEGORY_VALUES = [
  'MUSIC', 'COMEDY', 'THEATER', 'DANCE', 'SPORTS',
  'TALK', 'RELIGIOUS', 'EDUCATION', 'OTHER',
] as const;

export const createEventSchema = z
  .object({
    organizationId: z.string().uuid('Selecione uma organização'),
    title: z.string().min(3, 'Mínimo 3 caracteres').max(255),
    description: z.string().min(10, 'Mínimo 10 caracteres'),
    category: z.enum(EVENT_CATEGORY_VALUES, {
      required_error: 'Selecione uma categoria',
      invalid_type_error: 'Selecione uma categoria',
    }),
    tags: z.array(z.string().min(1).max(80)).max(20).default([]),
    startsAt: z.string().min(1, 'Obrigatório'),
    endsAt: z.string().min(1, 'Obrigatório'),
    venue: z.string().max(255).optional(),
    city: z.string().max(100).optional(),
    country: z.string().max(100).optional(),
    camerasCount: z.coerce.number().int().min(1).max(32).default(1),
  })
  .refine((d) => new Date(d.endsAt) > new Date(d.startsAt), {
    message: 'Fim deve ser após o início',
    path: ['endsAt'],
  });

export type CreateEventFormValues = z.infer<typeof createEventSchema>;
```

Note: `EVENT_CATEGORY_VALUES` (the `as const` tuple `z.enum` needs) is intentionally a separate, schema-local constant from `EVENT_CATEGORIES` (the plain array in `event.types.ts` used for rendering `<option>`s) — both list the same 9 values, but `z.enum` requires a readonly tuple type (`as const`) that a plain `EventCategory[]`-typed array doesn't provide. Keeping them separate avoids coupling the schema file to the types file for this.

- [ ] **Step 3: Add translation keys**

In `messages/pt.json`, inside `createEvent.info`, add (as new siblings to the existing `orgLabel`/`titleLabel`/etc. keys):

```json
"categoryLabel": "Categoria *",
"categoryPlaceholder": "Selecione uma categoria",
"categories": {
  "MUSIC": "Música",
  "COMEDY": "Comédia",
  "THEATER": "Teatro",
  "DANCE": "Dança",
  "SPORTS": "Esportes",
  "TALK": "Palestra",
  "RELIGIOUS": "Religioso",
  "EDUCATION": "Educação",
  "OTHER": "Outro"
},
"tagsLabel": "Tags",
"tagsPlaceholder": "Digite e pressione Enter",
"tagsHint": "Até 20 tags. Ajudam a posicionar o evento nas recomendações.",
"tagsRemove": "Remover tag: {tag}"
```

In `messages/en.json`, inside its `createEvent.info`, add:

```json
"categoryLabel": "Category *",
"categoryPlaceholder": "Select a category",
"categories": {
  "MUSIC": "Music",
  "COMEDY": "Comedy",
  "THEATER": "Theater",
  "DANCE": "Dance",
  "SPORTS": "Sports",
  "TALK": "Talk",
  "RELIGIOUS": "Religious",
  "EDUCATION": "Education",
  "OTHER": "Other"
},
"tagsLabel": "Tags",
"tagsPlaceholder": "Type and press Enter",
"tagsHint": "Up to 20 tags. Helps position the event in recommendations.",
"tagsRemove": "Remove tag: {tag}"
```

In `messages/es.json`, inside its `createEvent.info`, add:

```json
"categoryLabel": "Categoría *",
"categoryPlaceholder": "Selecciona una categoría",
"categories": {
  "MUSIC": "Música",
  "COMEDY": "Comedia",
  "THEATER": "Teatro",
  "DANCE": "Danza",
  "SPORTS": "Deportes",
  "TALK": "Charla",
  "RELIGIOUS": "Religioso",
  "EDUCATION": "Educación",
  "OTHER": "Otro"
},
"tagsLabel": "Etiquetas",
"tagsPlaceholder": "Escribe y presiona Enter",
"tagsHint": "Hasta 20 etiquetas. Ayudan a posicionar el evento en las recomendaciones.",
"tagsRemove": "Eliminar etiqueta: {tag}"
```

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: some errors are expected and fine at this point — `EventInfoStep.tsx` doesn't yet register the `category`/`tags` fields (that's Task 3), so `CreateEventFormValues` now requires `category` but nothing sets it. Confirm the *only* new errors are about the `category`/`tags` fields being unhandled in `EventInfoStep.tsx` and `use-create-event-wizard.ts`'s `submit()` (missing properties on the object literal passed to `mutation.mutate`), nothing else.

- [ ] **Step 5: Commit**

```bash
git add src/features/events/types/event.types.ts src/features/events/schemas/create-event.schema.ts messages/pt.json messages/en.json messages/es.json
git commit -m "feat(events): add category and tags fields to create-event schema and types"
```

---

### Task 2: `TagsInput` component

**Files:**
- Create: `src/features/events/components/dashboard/TagsInput.tsx`
- Create: `src/features/events/components/dashboard/TagsInput.module.scss`

**Interfaces:**
- Produces: `TagsInput({ value: string[]; onChange: (tags: string[]) => void })` — a generic, self-contained chip input, no dependency on Task 1's types/schema. Consumed by Task 3's `EventInfoStep.tsx` via `Controller`.

- [ ] **Step 1: Create the component**

Create `src/features/events/components/dashboard/TagsInput.tsx`:

```tsx
'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import styles from './TagsInput.module.scss';

const MAX_TAGS = 20;
const MAX_TAG_LENGTH = 80;

interface Props {
  value: string[];
  onChange: (tags: string[]) => void;
}

export function TagsInput({ value, onChange }: Props) {
  const t = useTranslations('createEvent.info');
  const [draft, setDraft] = useState('');

  function commitDraft() {
    const tag = draft.trim();
    setDraft('');
    if (!tag) return;
    if (value.length >= MAX_TAGS) return;
    if (value.includes(tag)) return;
    onChange([...value, tag]);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      commitDraft();
    } else if (e.key === 'Backspace' && draft === '' && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  }

  function removeTag(tag: string) {
    onChange(value.filter((v) => v !== tag));
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.field}>
        {value.map((tag) => (
          <span key={tag} className={styles.chip}>
            {tag}
            <button
              type="button"
              onClick={() => removeTag(tag)}
              className={styles.chipRemove}
              aria-label={t('tagsRemove', { tag })}
            >
              <X size={12} />
            </button>
          </span>
        ))}
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          maxLength={MAX_TAG_LENGTH}
          placeholder={value.length === 0 ? t('tagsPlaceholder') : ''}
          className={styles.input}
          disabled={value.length >= MAX_TAGS}
        />
      </div>
      <p className={styles.hint}>{t('tagsHint')}</p>
    </div>
  );
}
```

- [ ] **Step 2: Create the stylesheet**

Create `src/features/events/components/dashboard/TagsInput.module.scss`:

```scss
@use '../../../../styles/_variables' as *;

.wrap {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.field {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.375rem;
  background-color: $bg;
  border: 1px solid $border;
  border-radius: 6px;
  padding: 0.5rem 0.625rem;
  min-height: 42px;

  &:focus-within {
    border-color: $action;
    box-shadow: 0 0 0 3px $action-dim;
  }
}

.chip {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  background-color: $surface-dark;
  border: 1px solid $border;
  border-radius: 999px;
  padding: 0.25rem 0.375rem 0.25rem 0.625rem;
  font-size: 0.8rem;
  color: $text-primary;
  white-space: nowrap;
}

.chipRemove {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  color: $text-muted;
  cursor: pointer;
  padding: 2px;
  border-radius: 50%;
  transition: color 0.15s, background-color 0.15s;

  &:hover {
    color: $text-primary;
    background-color: $bg-hover;
  }
}

.input {
  flex: 1;
  min-width: 120px;
  background: none;
  border: none;
  outline: none;
  color: $text-primary;
  font-size: 0.9rem;
  font-family: inherit;
  padding: 0.25rem 0;

  &::placeholder {
    color: $text-muted;
  }

  &:disabled {
    cursor: not-allowed;
  }
}

.hint {
  font-size: 0.72rem;
  color: $text-muted;
  margin: 0;
}
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: no new errors from this file itself (the pre-existing `category`/`tags`-related errors from Task 1 remain until Task 3 — only be concerned with errors referencing `TagsInput`).

- [ ] **Step 4: Commit**

```bash
git add src/features/events/components/dashboard/TagsInput.tsx src/features/events/components/dashboard/TagsInput.module.scss
git commit -m "feat(events): add TagsInput chip-based tag entry component"
```

---

### Task 3: Wire category + tags into the wizard

**Files:**
- Modify: `src/features/events/components/dashboard/steps/EventInfoStep.tsx`
- Modify: `src/features/events/components/dashboard/CreateEventForm.tsx`
- Modify: `src/features/events/hooks/use-create-event-wizard.ts`

**Interfaces:**
- Consumes: `EVENT_CATEGORIES` (Task 1, `src/features/events/types/event.types.ts`), `TagsInput` (Task 2, `src/features/events/components/dashboard/TagsInput.tsx`).

- [ ] **Step 1: Add category select and tags input to `EventInfoStep`**

`src/features/events/components/dashboard/steps/EventInfoStep.tsx` is currently:

```tsx
import { useTranslations } from 'next-intl';
import type { UseFormRegister, FieldErrors } from 'react-hook-form';
import type { OrganizationResponse } from '@/features/organizations/types/organization.types';
import type { CreateEventFormValues } from '../../../schemas/create-event.schema';
import styles from '../CreateEventForm.module.scss';

interface Props {
  register: UseFormRegister<CreateEventFormValues>;
  errors: FieldErrors<CreateEventFormValues>;
  orgs: OrganizationResponse[];
}

export function EventInfoStep({ register, errors, orgs }: Props) {
  const t = useTranslations('createEvent.info');

  return (
    <section className={styles.section}>
      <div className={styles.field}>
        <label className={styles.label}>{t('orgLabel')}</label>
        <select
          {...register('organizationId')}
          className={`${styles.input} ${errors.organizationId ? styles.inputError : ''}`}
        >
          <option value="">{t('orgPlaceholder')}</option>
          {orgs.map((org) => (
            <option key={org.id} value={org.id}>{org.name}</option>
          ))}
        </select>
        {errors.organizationId && <p className={styles.error}>{errors.organizationId.message}</p>}
        {orgs.length === 0 && (
          <p className={styles.hint}>{t('noOrgs')}</p>
        )}
      </div>

      <div className={styles.field}>
        <label className={styles.label}>{t('titleLabel')}</label>
        <input
          {...register('title')}
          className={`${styles.input} ${errors.title ? styles.inputError : ''}`}
          placeholder={t('titlePlaceholder')}
        />
        {errors.title && <p className={styles.error}>{errors.title.message}</p>}
      </div>

      <div className={styles.field}>
        <label className={styles.label}>{t('descLabel')}</label>
        <textarea
          {...register('description')}
          className={`${styles.textarea} ${errors.description ? styles.inputError : ''}`}
          placeholder={t('descPlaceholder')}
          rows={4}
        />
        {errors.description && <p className={styles.error}>{errors.description.message}</p>}
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
import type { OrganizationResponse } from '@/features/organizations/types/organization.types';
import type { CreateEventFormValues } from '../../../schemas/create-event.schema';
import { EVENT_CATEGORIES } from '../../../types/event.types';
import { TagsInput } from '../TagsInput';
import styles from '../CreateEventForm.module.scss';

interface Props {
  register: UseFormRegister<CreateEventFormValues>;
  errors: FieldErrors<CreateEventFormValues>;
  orgs: OrganizationResponse[];
  control: Control<CreateEventFormValues>;
}

export function EventInfoStep({ register, errors, orgs, control }: Props) {
  const t = useTranslations('createEvent.info');

  return (
    <section className={styles.section}>
      <div className={styles.field}>
        <label className={styles.label}>{t('orgLabel')}</label>
        <select
          {...register('organizationId')}
          className={`${styles.input} ${errors.organizationId ? styles.inputError : ''}`}
        >
          <option value="">{t('orgPlaceholder')}</option>
          {orgs.map((org) => (
            <option key={org.id} value={org.id}>{org.name}</option>
          ))}
        </select>
        {errors.organizationId && <p className={styles.error}>{errors.organizationId.message}</p>}
        {orgs.length === 0 && (
          <p className={styles.hint}>{t('noOrgs')}</p>
        )}
      </div>

      <div className={styles.field}>
        <label className={styles.label}>{t('titleLabel')}</label>
        <input
          {...register('title')}
          className={`${styles.input} ${errors.title ? styles.inputError : ''}`}
          placeholder={t('titlePlaceholder')}
        />
        {errors.title && <p className={styles.error}>{errors.title.message}</p>}
      </div>

      <div className={styles.field}>
        <label className={styles.label}>{t('categoryLabel')}</label>
        <select
          {...register('category')}
          className={`${styles.input} ${errors.category ? styles.inputError : ''}`}
        >
          <option value="">{t('categoryPlaceholder')}</option>
          {EVENT_CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>{t(`categories.${cat}`)}</option>
          ))}
        </select>
        {errors.category && <p className={styles.error}>{errors.category.message}</p>}
      </div>

      <div className={styles.field}>
        <label className={styles.label}>{t('descLabel')}</label>
        <textarea
          {...register('description')}
          className={`${styles.textarea} ${errors.description ? styles.inputError : ''}`}
          placeholder={t('descPlaceholder')}
          rows={4}
        />
        {errors.description && <p className={styles.error}>{errors.description.message}</p>}
      </div>

      <div className={styles.field}>
        <label className={styles.label}>{t('tagsLabel')}</label>
        <Controller
          control={control}
          name="tags"
          render={({ field }) => (
            <TagsInput value={field.value} onChange={field.onChange} />
          )}
        />
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Pass `control` into `EventInfoStep`**

In `src/features/events/components/dashboard/CreateEventForm.tsx`, the step-1 wiring is currently:

```tsx
    1: <EventInfoStep register={register} errors={errors} orgs={orgs} />,
```

Change it to:

```tsx
    1: <EventInfoStep register={register} errors={errors} orgs={orgs} control={control} />,
```

(`control` is already destructured from `useForm()` in this file — no other change needed here.)

- [ ] **Step 3: Gate step 1 on `category` and include it in the submit payload**

In `src/features/events/hooks/use-create-event-wizard.ts`, `STEP_FIELDS` is currently:

```ts
const STEP_FIELDS: Partial<Record<number, (keyof CreateEventFormValues)[]>> = {
  1: ['organizationId', 'title', 'description'],
  2: ['startsAt', 'endsAt'],
  3: ['camerasCount'],
  // step 4 (stream) has no required form fields
};
```

Change the `1:` entry to:

```ts
  1: ['organizationId', 'title', 'category', 'description'],
```

`submit()` is currently:

```ts
  function submit(values: CreateEventFormValues) {
    if (tickets.length === 0) {
      setTicketsError('Adicione ao menos um ingresso');
      return;
    }
    setTicketsError(null);
    mutation.mutate({
      event: {
        organizationId: values.organizationId,
        title: values.title,
        description: values.description,
        startsAt: new Date(values.startsAt).toISOString(),
        endsAt: new Date(values.endsAt).toISOString(),
        venue: values.venue || undefined,
        city: values.city || undefined,
        country: values.country || undefined,
        camerasCount: values.camerasCount,
      },
      tickets: tickets.map(({ _key: _, ...t }) => t),
    });
  }
```

Replace it with:

```ts
  function submit(values: CreateEventFormValues) {
    if (tickets.length === 0) {
      setTicketsError('Adicione ao menos um ingresso');
      return;
    }
    setTicketsError(null);
    mutation.mutate({
      event: {
        organizationId: values.organizationId,
        title: values.title,
        description: values.description,
        category: values.category,
        tags: values.tags,
        startsAt: new Date(values.startsAt).toISOString(),
        endsAt: new Date(values.endsAt).toISOString(),
        venue: values.venue || undefined,
        city: values.city || undefined,
        country: values.country || undefined,
        camerasCount: values.camerasCount,
      },
      tickets: tickets.map(({ _key: _, ...t }) => t),
    });
  }
```

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors — this is the task that resolves the `category`/`tags`-related errors expected (and confirmed) at the end of Task 1.

- [ ] **Step 5: Manual verification**

Start the dev server, log in as a seeded organizer (`organizer@rockfest.com` / `Seed@123`), navigate to the event-creation wizard.

1. On step 1, confirm the new "Categoria" select (with a "Selecione uma categoria" placeholder option and all 9 category labels) and "Tags" field (empty chip input with a hint below it) render after title and description respectively.
2. Try clicking "Próximo" without selecting a category — confirm it's blocked with a validation message under the select.
3. Select a category, confirm "Próximo" now advances.
4. Go back to step 1, type a tag and press Enter — confirm it becomes a removable chip and the input clears. Type another and press comma instead of Enter — confirm the same. Click a chip's × — confirm it's removed. Type a few characters then press Backspace with the input empty — confirm the last chip is removed.
5. Try adding a 21st tag — confirm the input is disabled/ignores further entries once 20 chips exist.
6. Complete the wizard through submission — confirm the created event's request payload (Network tab) includes `category` and `tags` with the values entered.
7. Confirm the existing wizard behavior (other steps, validation, submission) is otherwise unchanged.

- [ ] **Step 6: Commit**

```bash
git add src/features/events/components/dashboard/steps/EventInfoStep.tsx src/features/events/components/dashboard/CreateEventForm.tsx src/features/events/hooks/use-create-event-wizard.ts
git commit -m "feat(events): wire category and tags fields into the event-creation wizard"
```

---
