# Event Creation Live Preview — Design Spec

**Date:** 2026-07-09
**Status:** Approved (pending user review of this doc)

## Problem

The event-creation wizard (`CreateEventForm`) has no way for an organizer to see
what the resulting public event page will look like while filling in the form.
They only find out after submitting (step 6, photo upload) and visiting the
real page.

## Goal

Add a live-updating preview panel beside the wizard that mirrors the real
event detail page's layout (hero, meta grid, organization card, description,
ticket list), populated directly from the form's current (unsaved) values —
updating on every keystroke, not just on step change or submit.

## Non-goals

- No backend changes, no draft-event concept.
- No live preview of photos/banner (uploaded only after creation, step 6) or
  camera grid (cameras don't exist until after creation either) — hero always
  shows the same gray placeholder the real page shows when there's no image.
- No interactive purchase flow in the ticket preview (see below).

## Architecture

A new presentational component, `EventPreviewPanel`, reads the wizard's live
form state via `useWatch({ control })` and renders a visual approximation of
`EventDetailPageContent` — but it is a **separate component**, not a
refactor of the real page. Reasons:

- The real `EventDetailPageContent` is production code driven by React Query
  hooks (`useGetEventQuery`, `useListTicketProductsQuery`, live/replay access
  checks, cart mutations) against a real event ID. None of that exists during
  the wizard. Refactoring it to also accept plain props would add complexity
  and regression risk to a page that already works.
- An iframe/embed of the real route pointed at a draft event was considered
  and rejected — it requires backend support for draft events that doesn't
  exist and isn't otherwise needed.

To keep the preview visually identical to the real page without duplicating
SCSS, `EventPreviewPanel` imports the **same** compiled
`EventDetailPageContent.module.scss` for the classes it can reuse as-is (hero,
meta grid, org card, description section). A new, small
`EventPreviewPanel.module.scss` holds only what doesn't exist there: the
sticky wrapper, the "PRÉVIA" badge variant, and the read-only ticket list.

## Component boundaries

**Create:**
- `src/features/events/components/dashboard/EventPreviewPanel.tsx`
- `src/features/events/components/dashboard/EventPreviewPanel.module.scss`

**Modify:**
- `src/features/events/components/dashboard/CreateEventForm.tsx` — split
  steps 1–5 into a two-column layout (form left, `EventPreviewPanel` right).
  Step 6 (photo upload, post-creation) stays single-column as today — a real
  event exists by then, so the "preview vs. real" distinction this feature
  solves no longer applies there.
- `src/features/events/components/dashboard/CreateEventForm.module.scss` —
  add layout classes for the two-column split, collapsing to a stacked
  single column under a max-width breakpoint (following this file's existing
  `@media (max-width: 560px)` convention, at a wider breakpoint suited to a
  two-column layout, e.g. `1100px`).
- `messages/pt.json`, `messages/en.json`, `messages/es.json` — add a small
  set of preview-only strings (badge label, empty-state placeholders). Where
  the real page already uses a translation key (`events.detail.date`,
  `.time`, `.venue`, `.cameras`, `.angles`, `.organization`), the preview
  reuses that exact key for label fidelity. Where the real page uses a
  hardcoded literal (e.g. `"SOBRE O SHOW"`), the preview copies the same
  literal rather than introducing an inconsistency the real page doesn't have.

## Data mapping

All values below come from `useWatch({ control })` on the same `control`
object `CreateEventForm` already threads through to `EventLocationStep`
(Task 3 of the prior DateTimePicker feature).

| Section | Source | Empty/invalid state |
|---|---|---|
| Hero title | `title` | Placeholder text "Título do evento" |
| Hero venue line | `venue` | Hidden (same as real page: `{event.venue && (...)}`) |
| Hero badge | — (no `status` exists pre-creation) | Always a static "PRÉVIA" badge, never LIVE/FINISHED/etc. |
| Hero image | — | Always the same gray placeholder the real page uses when `heroImage` is falsy |
| Date/time meta card | `startsAt`, `endsAt` via `formatDate`/`formatTime`/`formatDuration` | "—" unless both are non-empty and produce a valid `Date` (guard against `Invalid Date` from an empty string) |
| Venue meta card | `[city, country]` joined | "—" if both empty (same fallback the real page already uses) |
| Cameras meta card | `camerasCount` (default `1`) | Always has a value (schema default), never empty |
| Org card | `organizationId` resolved against the already-fetched `orgs` list (`useMyOrganizationsQuery`, already loaded in `CreateEventForm`) | "Selecione uma organização" placeholder card when no match |
| Description | `description` | Placeholder text "Descreva o evento para o público..." (reuses the existing field placeholder copy) |
| Tickets | Wizard's local `tickets` state (`TicketFormValues[]`, populated from step 5 onward) — **not** the real `TicketPanel` | Empty-state placeholder ("Nenhum ingresso configurado ainda") before step 5 or if the list is empty |

### Why not reuse `TicketPanel`

`TicketPanel` is wired directly into the real purchase flow: it fires
`useLiveAccessQuery`/`useReplayAccessQuery`/`useCartQuery` against a real
`event.id`, and its buy/cart buttons call real mutations. Feeding it a fake
event ID and unsaved ticket data would either error or, worse, silently let a
user "buy" a nonexistent ticket. Instead `EventPreviewPanel` renders its own
small read-only list: ticket name, `formatPrice(price)`, and description —
reusing the pure `formatPrice` formatter, nothing else from that component.

## Edge cases

- **Date fields empty or unparsable**: never render `Invalid Date` — guard
  with a validity check before calling the date formatters, same as the "—"
  fallback pattern the real page already uses for the venue meta card.
- **No organization selected yet (step 1, before choosing one)**: org card
  shows a placeholder, not a blank/missing section.
- **Ticket list before step 5**: empty-state placeholder, not an empty
  section that looks broken.
- **Very long title/description**: no new truncation logic — inherits
  whatever wrapping/overflow behavior the reused SCSS classes already define
  for the real page (already handles this today).

## Testing / verification

This is a presentational, read-only component with no business logic beyond
formatting and a few lookups — consistent with how the rest of this wizard
(and the recently-shipped `DateTimePicker`) is verified in this codebase: a
clean `npx tsc --noEmit` plus a manual browser click-through checklist (type
into each field, confirm the preview updates live; advance through steps and
confirm ticket/org sections populate at the right point; leave fields empty
and confirm placeholders instead of blank/broken sections). No new test
framework is introduced — none exists for this component style elsewhere in
the codebase.
