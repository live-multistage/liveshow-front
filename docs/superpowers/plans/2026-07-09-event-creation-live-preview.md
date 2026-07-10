# Event Creation Live Preview Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a live-updating preview panel beside the event-creation wizard that mirrors the real event detail page's layout, populated directly from the form's current (unsaved) values.

**Architecture:** A new presentational component, `EventPreviewPanel`, reads the wizard's live form state via `useWatch({ control })` and renders a scaled-down visual approximation of `EventDetailPageContent` — reusing that page's own compiled SCSS classes for hero/meta/org/description sections (imported directly, not duplicated), with a small set of override classes to fit a narrow sidebar column, plus a bespoke read-only ticket list (the real `TicketPanel` is wired into live purchase/cart queries and cannot be reused safely against a nonexistent event).

**Tech Stack:** Next.js, React, react-hook-form (`useWatch`), next-intl, SCSS Modules.

## Global Constraints

- No backend changes; no draft-event concept.
- No preview of photos/banner or camera grid — these don't exist until after the event is created (step 6). Hero always shows the same gray placeholder gradient the real page shows when there's no image.
- Do not reuse the real `TicketPanel` component — it fires live cart/access queries against a real event ID.
- Step 6 (photo upload, post-creation) is unaffected — a real event exists by then, out of scope for this feature.
- Reuse `EventDetailPageContent.module.scss`'s existing classes for hero/meta/org/description instead of duplicating styles; only add override classes for the sizing changes a narrow sidebar needs.
- Where the real page already uses a translation key (`events.detail.date/time/venue/cameras/angles/organization`), reuse that exact key. Where it uses a hardcoded literal (`"SOBRE O SHOW"`), copy the same literal.
- All new user-facing strings must be added to all three locale files: `messages/pt.json`, `messages/en.json`, `messages/es.json`.

---

### Task 1: `EventPreviewPanel` component

**Files:**
- Create: `src/features/events/components/dashboard/EventPreviewPanel.tsx`
- Create: `src/features/events/components/dashboard/EventPreviewPanel.module.scss`
- Modify: `messages/pt.json`, `messages/en.json`, `messages/es.json`

**Interfaces:**
- Consumes: `Control<CreateEventFormValues>` (from `react-hook-form`, already exposed by `CreateEventForm`'s `useForm()` call), `OrganizationResponse[]` (from `@/features/organizations/types/organization.types`, already fetched by `CreateEventForm` via `useMyOrganizationsQuery`), `AddedTicket[]` (exported from `./TicketSection`, already held in `CreateEventForm`'s `wizard.tickets` state).
- Produces: `EventPreviewPanel({ control, orgs, tickets }: Props)` — a self-contained presentational component. Consumed by Task 2's `CreateEventForm.tsx`.

- [ ] **Step 1: Add translation keys**

In `messages/pt.json`, inside the `createEvent` object (as a new sibling to `info`, `location`, `production`, `stream`), add:

```json
"preview": {
  "heading": "Prévia da página do evento",
  "badge": "PRÉVIA",
  "titlePlaceholder": "Título do evento",
  "noOrg": "Selecione uma organização",
  "ticketsHeading": "INGRESSOS",
  "ticketsEmpty": "Nenhum ingresso configurado ainda"
}
```

In `messages/en.json`, inside its `createEvent` object, add:

```json
"preview": {
  "heading": "Event page preview",
  "badge": "PREVIEW",
  "titlePlaceholder": "Event title",
  "noOrg": "Select an organization",
  "ticketsHeading": "TICKETS",
  "ticketsEmpty": "No tickets configured yet"
}
```

In `messages/es.json`, inside its `createEvent` object, add:

```json
"preview": {
  "heading": "Vista previa de la página del evento",
  "badge": "VISTA PREVIA",
  "titlePlaceholder": "Título del evento",
  "noOrg": "Selecciona una organización",
  "ticketsHeading": "ENTRADAS",
  "ticketsEmpty": "Aún no hay entradas configuradas"
}
```

- [ ] **Step 2: Create the component**

Create `src/features/events/components/dashboard/EventPreviewPanel.tsx`:

```tsx
'use client';

import { useWatch } from 'react-hook-form';
import type { Control } from 'react-hook-form';
import { useTranslations } from 'next-intl';
import { Calendar, Clock, MapPin, Camera } from 'lucide-react';
import type { CreateEventFormValues } from '../../schemas/create-event.schema';
import type { OrganizationResponse } from '@/features/organizations/types/organization.types';
import type { AddedTicket } from './TicketSection';
import { formatDate, formatTime, formatDuration, formatPrice } from '../../utils/event-formatters';
import eventStyles from '../public/EventDetailPageContent.module.scss';
import styles from './EventPreviewPanel.module.scss';

interface Props {
  control: Control<CreateEventFormValues>;
  orgs: OrganizationResponse[];
  tickets: AddedTicket[];
}

function hasValidDate(value: string): boolean {
  return !!value && !isNaN(new Date(value).getTime());
}

export function EventPreviewPanel({ control, orgs, tickets }: Props) {
  const t = useTranslations('events.detail');
  const tInfo = useTranslations('createEvent.info');
  const tp = useTranslations('createEvent.preview');

  const title = useWatch({ control, name: 'title' });
  const description = useWatch({ control, name: 'description' });
  const venue = useWatch({ control, name: 'venue' });
  const city = useWatch({ control, name: 'city' });
  const country = useWatch({ control, name: 'country' });
  const startsAt = useWatch({ control, name: 'startsAt' });
  const endsAt = useWatch({ control, name: 'endsAt' });
  const camerasCountRaw = useWatch({ control, name: 'camerasCount' });
  const organizationId = useWatch({ control, name: 'organizationId' });

  const camerasCount = Number.isFinite(camerasCountRaw) && camerasCountRaw > 0 ? camerasCountRaw : 1;
  const org = orgs.find((o) => o.id === organizationId) ?? null;
  const datesValid = hasValidDate(startsAt) && hasValidDate(endsAt);
  const venueLine = [city, country].filter(Boolean).join(', ') || '—';

  const metaItems = [
    { icon: <Calendar size={12} />, label: t('date'), value: datesValid ? formatDate(startsAt) : '—' },
    { icon: <Clock size={12} />, label: t('time'), value: datesValid ? `${formatTime(startsAt)} · ${formatDuration(startsAt, endsAt)}` : '—' },
    { icon: <MapPin size={12} />, label: t('venue'), value: venueLine },
    { icon: <Camera size={12} />, label: t('cameras'), value: t('angles', { count: camerasCount }) },
  ];

  return (
    <div className={styles.wrap}>
      <p className={styles.wrapLabel}>{tp('heading')}</p>

      <div className={`${eventStyles.hero} ${styles.heroSm}`}>
        <div className={eventStyles.heroPlaceholder} />
        <div className={eventStyles.heroScrim} />
        <div className={`${eventStyles.heroContent} ${styles.heroContentSm}`}>
          <div className={eventStyles.heroBadges}>
            <span className={eventStyles.badgeStatus}>{tp('badge')}</span>
          </div>
          <h1 className={`${eventStyles.heroTitle} ${styles.heroTitleSm}`}>
            {title || tp('titlePlaceholder')}
          </h1>
          {venue && (
            <div className={`${eventStyles.heroVenue} ${styles.heroVenueSm}`}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#ff5fb4" strokeWidth="2">
                <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
                <circle cx="12" cy="10" r="2.6" />
              </svg>
              {venue}
            </div>
          )}
        </div>
      </div>

      <div className={`${eventStyles.metaGrid} ${styles.metaGridSm}`}>
        {metaItems.map((item) => (
          <div key={item.label} className={`${eventStyles.metaCard} ${styles.metaCardSm}`}>
            <div className={`${eventStyles.metaLabel} ${styles.metaLabelSm}`}>
              <span className={eventStyles.metaIcon}>{item.icon}</span>
              {item.label}
            </div>
            <p className={`${eventStyles.metaValue} ${styles.metaValueSm}`}>{item.value}</p>
          </div>
        ))}
      </div>

      <div className={`${eventStyles.orgCard} ${styles.orgCardSm}`}>
        <div className={`${eventStyles.orgAvatar} ${styles.orgAvatarSm}`}>
          {org && org.logoUrl && (
            <img src={org.logoUrl} alt={org.name} className={eventStyles.orgAvatarImg} />
          )}
        </div>
        <div className={eventStyles.orgInfo}>
          <span className={eventStyles.orgLabel}>{t('organization')}</span>
          <span className={`${eventStyles.orgName} ${styles.orgNameSm}`}>
            {org?.name ?? tp('noOrg')}
          </span>
        </div>
      </div>

      <div className={`${eventStyles.section} ${styles.sectionSm}`}>
        <div className={eventStyles.sectionLabel}>SOBRE O SHOW</div>
        <p className={`${eventStyles.description} ${styles.descriptionSm}`}>
          {description || tInfo('descPlaceholder')}
        </p>
      </div>

      <div className={`${eventStyles.section} ${styles.sectionSm}`}>
        <div className={eventStyles.sectionLabel}>{tp('ticketsHeading')}</div>
        {tickets.length === 0 ? (
          <p className={styles.ticketsEmpty}>{tp('ticketsEmpty')}</p>
        ) : (
          <div className={styles.ticketList}>
            {tickets.map((ticket) => (
              <div key={ticket._key} className={styles.ticketItem}>
                <div className={styles.ticketItemHeader}>
                  <span className={styles.ticketName}>{ticket.name}</span>
                  <span className={styles.ticketPrice}>{formatPrice(ticket.price)}</span>
                </div>
                {ticket.description && (
                  <p className={styles.ticketDesc}>{ticket.description}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create the stylesheet**

Create `src/features/events/components/dashboard/EventPreviewPanel.module.scss`:

```scss
@use '../../../../styles/_variables' as *;

// ── Panel wrapper ─────────────────────────────────────────────────
.wrap {
  position: sticky;
  top: 96px;
  display: flex;
  flex-direction: column;
  background-color: $bg;
  border: 1px solid $border;
  border-radius: 12px;
  padding: 1.5rem;
  max-height: calc(100vh - 120px);
  overflow-y: auto;

  @media (max-width: 1100px) {
    position: static;
    max-height: none;
  }
}

.wrapLabel {
  font-family: 'Space Mono', monospace;
  font-size: 0.7rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: $text-muted;
  margin: 0 0 1rem;
}

// ── Hero scale-down (real page's hero is sized for a 1240px-wide
// page; this panel lives in a ~400px sidebar column) ───────────────
.heroSm {
  aspect-ratio: 16 / 10 !important;
  border-radius: 14px !important;
  margin-bottom: 1rem !important;
}

.heroContentSm {
  padding: 16px 18px !important;
}

.heroTitleSm {
  font-size: 22px !important;
  line-height: 1.15 !important;
  margin: 0 0 6px !important;
}

.heroVenueSm {
  font-size: 12px !important;
  gap: 6px !important;
}

// ── Meta grid scale-down ────────────────────────────────────────
.metaGridSm {
  grid-template-columns: repeat(2, 1fr) !important;
  gap: 8px !important;
  margin-bottom: 12px !important;
}

.metaCardSm {
  padding: 10px !important;
  border-radius: 10px !important;
}

.metaLabelSm {
  font-size: 9px !important;
  margin-bottom: 6px !important;
}

.metaValueSm {
  font-size: 12px !important;
}

// ── Org card scale-down ─────────────────────────────────────────
.orgCardSm {
  padding: 10px 12px !important;
  gap: 10px !important;
  margin-bottom: 1rem !important;
  border-radius: 10px !important;
  cursor: default !important;
}

.orgAvatarSm {
  width: 32px !important;
  height: 32px !important;
  border-radius: 8px !important;
}

.orgNameSm {
  font-size: 13px !important;
}

// ── Section scale-down ────────────────────────────────────────────
.sectionSm {
  margin-bottom: 1rem !important;
  gap: 8px !important;
}

.descriptionSm {
  font-size: 12.5px !important;
  line-height: 1.5 !important;
  max-width: none !important;
}

// ── Ticket list (preview-only — no equivalent in the real page,
// which uses the interactive TicketPanel instead) ─────────────────
.ticketsEmpty {
  font-size: 0.8rem;
  color: $text-muted;
  margin: 0;
}

.ticketList {
  display: flex;
  flex-direction: column;
  gap: 0.625rem;
}

.ticketItem {
  background: #101013;
  border: 1px solid rgba(255, 255, 255, 0.07);
  border-radius: 10px;
  padding: 0.75rem 0.875rem;
}

.ticketItemHeader {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}

.ticketName {
  font-size: 0.85rem;
  font-weight: 700;
  color: $text-primary;
}

.ticketPrice {
  font-family: 'Space Mono', monospace;
  font-size: 0.8rem;
  font-weight: 700;
  color: $action;
  white-space: nowrap;
}

.ticketDesc {
  font-size: 0.78rem;
  color: $text-secondary;
  margin: 0.375rem 0 0;
}
```

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: a new error is expected and fine at this point — `EventPreviewPanel` isn't imported/used anywhere yet (that's Task 2), so there should be **no** errors from this new file itself, but confirm there are no errors introduced by it (e.g. unused-import or type mismatches). If there is any error, it must come from this new file's own code, not from anything else.

- [ ] **Step 5: Commit**

```bash
git add src/features/events/components/dashboard/EventPreviewPanel.tsx src/features/events/components/dashboard/EventPreviewPanel.module.scss messages/pt.json messages/en.json messages/es.json
git commit -m "feat(events): add EventPreviewPanel for live event-creation preview"
```

---

### Task 2: Wire the preview panel into the wizard layout

**Files:**
- Modify: `src/features/events/components/dashboard/CreateEventForm.tsx`
- Modify: `src/features/events/components/dashboard/CreateEventForm.module.scss`

**Interfaces:**
- Consumes: `EventPreviewPanel` from Task 1 (`src/features/events/components/dashboard/EventPreviewPanel.tsx`).

- [ ] **Step 1: Import and wire `EventPreviewPanel` into the wizard's JSX**

In `src/features/events/components/dashboard/CreateEventForm.tsx`, add the import (alongside the other step imports):

```tsx
import { EventPreviewPanel } from './EventPreviewPanel';
```

Replace the current return statement's form section:

```tsx
  return (
    <div className={styles.wizard}>
      <CreateEventStepper current={step} onNavigate={setStep} />

      <form onSubmit={handleSubmit(wizard.submit)} className={styles.form}>
        {stepContent[step]}

        <div className={styles.navRow}>
          {step > 1 && (
            <button type="button" onClick={wizard.back} className={styles.btnBack}>
              <ChevronLeft size={16} /> {t('nav.back')}
            </button>
          )}

          <div className={styles.navSpacer} />

          {step < 5 && (
            <button type="button" onClick={() => wizard.advance(trigger)} className={styles.btnNext}>
              {t('nav.next')} <ChevronRight size={16} />
            </button>
          )}

          {step === 5 && (
            <button type="submit" className={styles.btnNext} disabled={mutation.isPending}>
              {mutation.isPending ? t('nav.creating') : t('nav.create')}
            </button>
          )}
        </div>
      </form>
    </div>
  );
```

with:

```tsx
  return (
    <div className={styles.wizard}>
      <CreateEventStepper current={step} onNavigate={setStep} />

      <div className={styles.layout}>
        <form onSubmit={handleSubmit(wizard.submit)} className={styles.form}>
          {stepContent[step]}

          <div className={styles.navRow}>
            {step > 1 && (
              <button type="button" onClick={wizard.back} className={styles.btnBack}>
                <ChevronLeft size={16} /> {t('nav.back')}
              </button>
            )}

            <div className={styles.navSpacer} />

            {step < 5 && (
              <button type="button" onClick={() => wizard.advance(trigger)} className={styles.btnNext}>
                {t('nav.next')} <ChevronRight size={16} />
              </button>
            )}

            {step === 5 && (
              <button type="submit" className={styles.btnNext} disabled={mutation.isPending}>
                {mutation.isPending ? t('nav.creating') : t('nav.create')}
              </button>
            )}
          </div>
        </form>

        <div className={styles.previewCol}>
          <EventPreviewPanel control={control} orgs={orgs} tickets={tickets} />
        </div>
      </div>
    </div>
  );
```

Note: the `step === 6` branch above this return (photo upload, rendered after the event is created) is untouched — it returns its own separate JSX and never reaches this two-column layout.

- [ ] **Step 2: Update the layout stylesheet**

In `src/features/events/components/dashboard/CreateEventForm.module.scss`, the current `.wizard` and `.form` rules are:

```scss
.wizard {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  max-width: 720px;
}
```

and:

```scss
// ── Form ──────────────────────────────────────────────────────────
.form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
```

Replace the `.wizard` rule with:

```scss
.wizard {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  max-width: 1180px;
}
```

Replace the `.form` rule with:

```scss
// ── Layout ────────────────────────────────────────────────────────
.layout {
  display: flex;
  align-items: flex-start;
  gap: 2rem;

  @media (max-width: 1100px) {
    flex-direction: column;
  }
}

// ── Form ──────────────────────────────────────────────────────────
.form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  flex: 1 1 720px;
  max-width: 720px;
  min-width: 0;

  @media (max-width: 1100px) {
    max-width: none;
  }
}

.previewCol {
  flex: 1 1 420px;
  max-width: 420px;
  width: 100%;

  @media (max-width: 1100px) {
    max-width: none;
  }
}
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Manual verification**

Start the dev server (`pnpm dev`), log in as a seeded organizer (`organizer@rockfest.com` / `Seed@123`), and navigate to the event-creation wizard (dashboard → Eventos → criar evento).

1. Confirm the preview panel appears to the right of the form on step 1, showing placeholder text for title/description, a "Selecione uma organização" org card, and an empty-state ticket section.
2. Type a title — confirm the preview's hero title updates live, character by character.
3. Type a description — confirm the preview's "SOBRE O SHOW" section updates live.
4. Select an organization — confirm the org card shows its real name (and logo, if set).
5. Advance to step 2 (Local & Data), fill venue/city/country and both dates — confirm the preview's venue line, date, and time/duration meta cards update live and correctly (no "Invalid Date" text).
6. Advance to step 3 (Produção), change the camera count — confirm the "Câmeras" meta card updates.
7. Advance to step 5 (Ingressos) and add a ticket — confirm it appears in the preview's ticket list with correct name/price/description; remove it and confirm the empty-state placeholder returns.
8. Resize the browser narrower than ~1100px — confirm the layout stacks (preview below the form) instead of overflowing or clipping.
9. Confirm the existing wizard behavior (step navigation, validation, submission) is otherwise unchanged.

- [ ] **Step 5: Commit**

```bash
git add src/features/events/components/dashboard/CreateEventForm.tsx src/features/events/components/dashboard/CreateEventForm.module.scss
git commit -m "feat(events): show live event-page preview alongside the creation wizard"
```

---
