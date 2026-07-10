# Event Creation Category + Tags — Design Spec

**Date:** 2026-07-09
**Status:** Approved (pending user review of this doc)

## Problem

Event creation already triggers the backend's feature-extraction pipeline
(`CreateEventUseCase` emits `event.created` → `EventCreatedHandler` →
`ExtractEventFeaturesUseCase` → `FeatureExtractionPipeline`), which powers
event positioning/recommendation scoring. But `FeatureAccumulatorStage`
weights signals very unevenly:

```ts
const WEIGHTS = { text: 1, tag: 8, category: 10, location: 3 };
```

`category` and `tags` are the two highest-weighted signals, and the
event-creation wizard (`live-show-react`) never sends either — the backend
DTO and use-case fully support `category?: EventCategory` and
`tags?: string[]`, but `createEventSchema` only has
`organizationId/title/description/startsAt/endsAt/venue/city/country/camerasCount`.
Every event created through the current UI is positioned almost entirely
off NLP auto-detection from free-text title/description (weight 1) plus
`country` (weight 3) — the two strongest, most reliable signals are simply
never supplied.

## Goal

Add `category` (required) and `tags` (optional) to the event-creation
wizard's step 1 (Informações), and wire both through to the create-event
request payload.

## Non-goals

- `domain` and `subtype` — backend/frontend types already support them, but
  out of scope for this pass (explicitly deferred by the user).
- No changes to `EventPreviewPanel` — the real public event page doesn't
  display category or tags anywhere today, so the preview correctly doesn't
  need to either.
- No backend changes — `CreateEventDto`/`CreateEventUseCase` already accept
  both fields.

## Design

### Schema (`createEventSchema`, Zod)

- `category`: **required** — `z.enum([...9 EventCategory values])`. Required
  (not optional) because the whole point of this feature is guaranteeing
  every new event carries the highest-weighted signal. Validation error
  styled identically to the existing required `organizationId` select.
- `tags`: **optional** — `z.array(z.string().min(1).max(80)).max(20)`,
  default `[]`. Limits mirror the backend DTO's `@ArrayMaxSize(20)` /
  `@MaxLength(80, { each: true })` exactly, so nothing the wizard allows can
  fail backend validation.

### Step gating

`use-create-event-wizard.ts`'s `STEP_FIELDS[1]` (currently
`['organizationId', 'title', 'description']`) gains `'category'`. This is
the actual enforcement point: `advance()` calls `trigger(fields)` for the
current step before allowing "Próximo," so this is what makes `category`
truly mandatory rather than just schema-required-but-skippable.

### `EventCategory` type (frontend)

The frontend has no `category` type anywhere today. Add to
`event.types.ts`, matching the existing convention there of plain string
union types (not TS enums) for enum-like backend values (see `domain`,
`visibility` on `EventResponse`):

```ts
export type EventCategory =
  | 'MUSIC' | 'COMEDY' | 'THEATER' | 'DANCE' | 'SPORTS'
  | 'TALK' | 'RELIGIOUS' | 'EDUCATION' | 'OTHER';

export const EVENT_CATEGORIES: EventCategory[] = [
  'MUSIC', 'COMEDY', 'THEATER', 'DANCE', 'SPORTS',
  'TALK', 'RELIGIOUS', 'EDUCATION', 'OTHER',
];
```

`CreateEventRequest` gains `category: EventCategory` (required) and
`tags?: string[]`.

### `TagsInput` component

New: `src/features/events/components/dashboard/TagsInput.tsx` +
`.module.scss`. Chip-based tag entry:

- Type text, press **Enter** or **,** to commit it as a chip. Trims
  whitespace, skips empty/duplicate strings, ignores input past 20 tags or
  the native input's own `maxLength={80}`.
- Click **×** on a chip to remove it.
- **Backspace** with an empty input removes the last chip (standard
  chip-input affordance — near-zero cost, matches user expectation for
  "chips com adicionar/remover").
- Wired into the form via `Controller` (value is `string[]`, not a native
  input change event) — same pattern already established by
  `DateTimePicker` earlier in this codebase.

### `EventInfoStep.tsx`

Gains two new fields and a `control` prop (needed for `TagsInput`'s
`Controller`):
- Category `<select>` — same native-select styling as the existing
  `organizationId` field — placed right after the title field.
- `TagsInput` — placed after description (last field in the step, since its
  height varies with chip count).

### Wiring

- `CreateEventForm.tsx` threads `control` into `EventInfoStep` (already has
  `control` in scope from prior work).
- `use-create-event-wizard.ts`'s `submit()` includes `category: values.category`
  and `tags: values.tags` in the payload passed to `eventsService.create()`.

### i18n

All three locale files (`pt.json`, `en.json`, `es.json`) gain, under
`createEvent.info`: `categoryLabel`, `categoryPlaceholder`, a `categories`
map (9 keys, one per `EventCategory` value) for the select's option labels,
plus `tagsLabel`, `tagsPlaceholder`, `tagsHint` (mentioning the 20-tag
limit), and a `categoryRequired` validation message.

## Edge cases

- **No category selected**: "Próximo" on step 1 is blocked (via
  `STEP_FIELDS[1]` gating), same UX as leaving `organizationId` or `title`
  empty today.
- **Duplicate tag typed twice**: silently ignored (exact-string match, no
  case-folding — kept simple, not a stated requirement).
- **21st tag typed**: input is ignored past the cap; no error shown (soft
  cap, matches how the existing `camerasCount` field's `min`/`max` HTML
  attributes work — a UI-level guard, not a hard validation error).
- **Tag longer than 80 chars**: can't be typed past that length (native
  `maxLength` on the chip-entry input).

## Testing / verification

Consistent with the rest of this wizard (`DateTimePicker`,
`EventPreviewPanel`): `npx tsc --noEmit` plus a manual browser checklist
(select a category, confirm "Próximo" is blocked without one; add/remove
tags via Enter, comma, ×, and backspace; confirm the created event's
request payload includes both fields; confirm 20-tag/80-char caps hold).
No new automated test framework — none exists for this component style
elsewhere in the codebase.
