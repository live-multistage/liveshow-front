# Feed-Embedded Price Range Frontend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Consume the price range now embedded in `/v1/feed`'s event payload (`priceFromCents`/`priceToCents` — see `live-show-orchestrator`'s `docs/superpowers/plans/2026-07-09-feed-embedded-price-range.md`) instead of fetching ticket prices separately, eliminating the `useEventsPriceMap` network call(s) entirely from both consumers.

**Architecture:** `EventResponse` gains `priceFromCents?`/`priceToCents?`. `eventToShow()` builds `price`/`priceRange` directly from those fields instead of hardcoding `price: 0`. Both call sites (`EditorialHomeContent.tsx`, `EventsListPageContent.tsx`) drop their `useEventsPriceMap`/`priceMap` override entirely — `eventToShow(e)` alone is now sufficient. With zero remaining callers, `use-events-prices.ts` is deleted.

**Tech Stack:** TypeScript, React. No new dependencies.

## Global Constraints

- No test runner exists in this repo for this kind of file — verification is `npx tsc --noEmit` plus a manual devtools Network-tab check (zero `/shows/:id/tickets` requests firing from the home page or events-listing page).
- An event with no `priceFromCents` (i.e. zero ticket products) must render exactly as it does today for that case — `formatPriceRange(undefined, 0)` → `'Grátis'` — not a new/different empty state.
- `useListTicketProductsQuery` (the single-event ticket-products hook, used by checkout/event-detail/dashboard pages) is untouched — this plan only removes the plural, N-events `useEventsPriceMap`.
- This plan depends on the backend plan (`live-show-orchestrator`) being deployed — `priceFromCents`/`priceToCents` must actually be present in `/v1/feed` responses before Task 1's manual verification step can succeed.

---

### Task 1: Consume embedded price range, delete `useEventsPriceMap`

**Files:**
- Modify: `src/features/events/types/event.types.ts`
- Modify: `src/features/events/utils/event-adapter.ts`
- Modify: `src/features/events/components/public/EditorialHomeContent.tsx`
- Modify: `src/features/events/components/public/EventsListPageContent.tsx`
- Modify: `src/features/events/index.ts`
- Delete: `src/features/events/queries/use-events-prices.ts`

**Interfaces:**
- Produces: `EventResponse.priceFromCents?: number`, `EventResponse.priceToCents?: number`; `eventToShow(event)` now returns a real `price`/`priceRange` instead of a hardcoded `price: 0`.

- [ ] **Step 1: Add the price fields to `EventResponse`**

In `src/features/events/types/event.types.ts`, `EventResponse` currently ends with:

```ts
  domain: 'ENTERTAINMENT' | 'SPORTS' | 'CORPORATE' | 'EDUCATION' | 'RELIGIOUS' | 'OTHER' | null;
  subtype: string | null;
  camerasCount: number;
}
```

Replace it with:

```ts
  domain: 'ENTERTAINMENT' | 'SPORTS' | 'CORPORATE' | 'EDUCATION' | 'RELIGIOUS' | 'OTHER' | null;
  subtype: string | null;
  camerasCount: number;
  priceFromCents?: number;
  priceToCents?: number;
}
```

- [ ] **Step 2: Rewrite `eventToShow()` to use the embedded price**

`src/features/events/utils/event-adapter.ts` is currently:

```ts
import type { EventResponse } from '../types/event.types';
import type { Show, Camera } from '../types/show';

const FALLBACK_IMAGE =
  'https://images.unsplash.com/photo-1619973226698-b77a5b5dd14b?auto=format&fit=crop&w=1080&q=80';

const CAMERA_COLORS = [
  { color: '#e63946', gradient: 'from-red-900 via-red-800 to-orange-900' },
  { color: '#457b9d', gradient: 'from-blue-900 via-blue-800 to-indigo-900' },
  { color: '#2a9d8f', gradient: 'from-teal-900 via-teal-800 to-green-900' },
  { color: '#e9c46a', gradient: 'from-yellow-900 via-yellow-800 to-amber-900' },
  { color: '#8338ec', gradient: 'from-purple-900 via-purple-800 to-violet-900' },
  { color: '#f77f00', gradient: 'from-orange-900 via-orange-800 to-red-900' },
  { color: '#06d6a0', gradient: 'from-emerald-900 via-emerald-800 to-teal-900' },
  { color: '#f72585', gradient: 'from-pink-900 via-pink-800 to-rose-900' },
];

function buildCameras(count: number): Camera[] {
  return Array.from({ length: Math.max(count, 1) }, (_, i) => ({
    id: `cam${i + 1}`,
    name: `Câmera ${i + 1}`,
    angle: `Vista ${i + 1}`,
    ...CAMERA_COLORS[i % CAMERA_COLORS.length],
  }));
}

export function eventToShow(event: EventResponse): Show {
  const startsAt = new Date(event.startsAt);
  const endsAt = new Date(event.endsAt);
  const durationMs = endsAt.getTime() - startsAt.getTime();
  const durationMin = Math.round(durationMs / 60000);
  const durationLabel =
    durationMin >= 60
      ? `${Math.floor(durationMin / 60)}h${durationMin % 60 > 0 ? ` ${durationMin % 60}min` : ''}`
      : `${durationMin}min`;

  return {
    id: event.id,
    title: event.title,
    artist: '',
    genre: 'Show',
    venue: event.venue ?? '',
    city: event.city ?? '',
    country: event.country ?? '',
    date: startsAt.toISOString().split('T')[0],
    time: startsAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    duration: durationLabel,
    image: event.thumbnailUrl ?? event.bannerUrl ?? FALLBACK_IMAGE,
    price: 0,
    currency: 'BRL',
    isLive: event.status === 'LIVE',
    hasReplay: event.status === 'FINISHED',
    cameras: buildCameras(event.camerasCount),
    description: event.description,
    tags: [],
    viewers: undefined,
    rating: undefined,
  };
}
```

Replace the `return { ... }` block (keep everything above it — imports, `FALLBACK_IMAGE`, `CAMERA_COLORS`, `buildCameras`, and the function signature/duration-calculation lines — unchanged) with:

```ts
export function eventToShow(event: EventResponse): Show {
  const startsAt = new Date(event.startsAt);
  const endsAt = new Date(event.endsAt);
  const durationMs = endsAt.getTime() - startsAt.getTime();
  const durationMin = Math.round(durationMs / 60000);
  const durationLabel =
    durationMin >= 60
      ? `${Math.floor(durationMin / 60)}h${durationMin % 60 > 0 ? ` ${durationMin % 60}min` : ''}`
      : `${durationMin}min`;

  // priceFromCents/priceToCents are only present when the event has at
  // least one ticket product (see GetFeedUseCase, live-show-orchestrator) —
  // absent means "no ticket data," rendered the same as free (price: 0),
  // matching this component's pre-existing behavior for that case.
  const price = event.priceFromCents !== undefined ? event.priceFromCents / 100 : 0;
  const priceRange =
    event.priceToCents !== undefined && event.priceToCents !== event.priceFromCents
      ? { min: price, max: event.priceToCents / 100 }
      : undefined;

  return {
    id: event.id,
    title: event.title,
    artist: '',
    genre: 'Show',
    venue: event.venue ?? '',
    city: event.city ?? '',
    country: event.country ?? '',
    date: startsAt.toISOString().split('T')[0],
    time: startsAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    duration: durationLabel,
    image: event.thumbnailUrl ?? event.bannerUrl ?? FALLBACK_IMAGE,
    price,
    priceRange,
    currency: 'BRL',
    isLive: event.status === 'LIVE',
    hasReplay: event.status === 'FINISHED',
    cameras: buildCameras(event.camerasCount),
    description: event.description,
    tags: [],
    viewers: undefined,
    rating: undefined,
  };
}
```

- [ ] **Step 3: Simplify `EditorialHomeContent.tsx`**

The current relevant block is:

```tsx
  const { data: events = [], isLoading } = useListEventsQuery('all', initialEvents);
  const eventIds = useMemo(() => events.map((e) => e.id), [events]);
  const priceMap = useEventsPriceMap(eventIds);
  const shows = useMemo(
    () => events.map((e) => ({ ...eventToShow(e), priceRange: priceMap[e.id] ?? undefined })),
    [events, priceMap],
  );

  const { isLoggedIn } = useAuth();
  const { data: recommended } = useRecommendedEventsQuery(initialRecommended);
  const recommendedShows = useMemo(
    () => (recommended?.items ?? []).map((e) => ({ ...eventToShow(e), priceRange: priceMap[e.id] ?? undefined })),
    [recommended, priceMap],
  );
```

Replace it with:

```tsx
  const { data: events = [], isLoading } = useListEventsQuery('all', initialEvents);
  const shows = useMemo(() => events.map(eventToShow), [events]);

  const { isLoggedIn } = useAuth();
  const { data: recommended } = useRecommendedEventsQuery(initialRecommended);
  const recommendedShows = useMemo(
    () => (recommended?.items ?? []).map(eventToShow),
    [recommended],
  );
```

Also update the import line — `useEventsPriceMap` is no longer used in this file. The file's current top-of-file import block (after the prior SSR task) is:

```tsx
'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import { useListEventsQuery, useRecommendedEventsQuery, eventToShow, useEventsPriceMap, formatPriceRange } from '@/features/events';
import type { Show } from '@/features/events/types/show';
import type { EventResponse, RecommendedEventsResponse } from '@/features/events';
import { useAuth } from '@/features/account';
import styles from './EditorialHomeContent.module.scss';
import { AdBanner } from '@/features/advertisements/components/AdBanner';
```

Replace it with (only the `useEventsPriceMap` symbol is dropped from the import list, nothing else changes):

```tsx
'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import { useListEventsQuery, useRecommendedEventsQuery, eventToShow, formatPriceRange } from '@/features/events';
import type { Show } from '@/features/events/types/show';
import type { EventResponse, RecommendedEventsResponse } from '@/features/events';
import { useAuth } from '@/features/account';
import styles from './EditorialHomeContent.module.scss';
import { AdBanner } from '@/features/advertisements/components/AdBanner';
```

- [ ] **Step 4: Simplify `EventsListPageContent.tsx`**

The current relevant block is:

```tsx
import { useListEventsQuery, eventToShow, useEventsPriceMap } from '@/features/events';
```

...

```tsx
  const { data: events = [], isLoading, isError } = useListEventsQuery('all');
  const eventIds = useMemo(() => events.map((e) => e.id), [events]);
  const priceMap = useEventsPriceMap(eventIds);
  const SHOWS = useMemo(
    () => events.map((e) => ({ ...eventToShow(e), priceRange: priceMap[e.id] ?? undefined })),
    [events, priceMap],
  );
```

Replace the import line with:

```tsx
import { useListEventsQuery, eventToShow } from '@/features/events';
```

Replace the query/mapping block with:

```tsx
  const { data: events = [], isLoading, isError } = useListEventsQuery('all');
  const SHOWS = useMemo(() => events.map(eventToShow), [events]);
```

(`useMemo` is still imported and used elsewhere in this file for other derived values — do not remove that import.)

- [ ] **Step 5: Remove the barrel exports and delete the now-dead file**

In `src/features/events/index.ts`, remove these two lines entirely:

```ts
export { useEventsPriceMap } from './queries/use-events-prices';
export type { PriceMap, PriceRange } from './queries/use-events-prices';
```

Delete `src/features/events/queries/use-events-prices.ts` entirely (confirm zero remaining references first: `grep -rn "useEventsPriceMap\|use-events-prices" src` should return nothing outside this deleted file after Steps 3-5).

- [ ] **Step 6: Typecheck**

Run: `npx tsc --noEmit`
Expected: no new errors (this repo may have pre-existing unrelated errors elsewhere from other in-progress work).

- [ ] **Step 7: Manual verification**

Requires the backend plan (`live-show-orchestrator`) already deployed with `priceFromCents`/`priceToCents` present in `/v1/feed` responses.

1. Open the home page with devtools Network tab filtered to `tickets` — confirm **zero** requests to `/shows/:id/tickets` or `/shows/tickets` fire.
2. Confirm price badges ("a partir de R$X" / range / "Grátis") render the same values as before this change on the home page's cards.
3. Repeat on the public events-listing page — zero ticket requests, correct price rendering.
4. Navigate to a single event's detail page and confirm ticket purchase flow (which uses the untouched `useListTicketProductsQuery`) still works normally.

- [ ] **Step 8: Commit**

```bash
git add src/features/events/types/event.types.ts src/features/events/utils/event-adapter.ts src/features/events/components/public/EditorialHomeContent.tsx src/features/events/components/public/EventsListPageContent.tsx src/features/events/index.ts
git rm src/features/events/queries/use-events-prices.ts
git commit -m "feat(events): consume feed-embedded price range, delete useEventsPriceMap"
```

---

## Post-implementation

Backend counterpart (`GetFeedUseCase` embedding `priceFromCents`/`priceToCents`)
is a separate plan in `live-show-orchestrator` — see
`docs/superpowers/plans/2026-07-09-feed-embedded-price-range.md`. That plan
must be deployed before this one's Task 1 Step 7 manual verification can
succeed.
