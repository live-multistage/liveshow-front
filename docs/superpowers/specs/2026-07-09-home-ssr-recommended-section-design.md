# Home Page SSR + Recommended Events Section — Design

## Context

The home page (`src/app/(public)/page.tsx` → `EditorialHomeContent`) is a fully
client-side (`'use client'`) component. Its event data comes from
`useListEventsQuery('all')`, an axios-backed react-query hook hitting
`/v1/feed` — meaning the initial render is an empty shell + spinner until the
client-side fetch resolves. Two changes are needed:

1. Move the initial events fetch to the server, so first paint already has
   real data (no layout shift, no spinner on cold load).
2. Add a new section surfacing the recently-built `GET /events/recommended`
   backend endpoint (see `live-show-orchestrator`'s
   `docs/superpowers/specs/2026-07-08-recommended-events-endpoint-design.md`),
   which personalizes for logged-in users and falls back to popularity
   ranking for anonymous/cold-start ones.

This repo already has an established SSR pattern for exactly this shape of
problem: `src/app/(public)/cart/page.tsx` (async Server Component) calls
`fetchCartServer()` (native `fetch`, forwards the `access_token` cookie),
passes the result as `initialCart` into `CartPageContent`, which feeds it to
`useCartQuery(initialData)` — react-query's `initialData` option means first
paint is server-rendered and all existing client-side refetch/cache behavior
is unchanged. This design reuses that exact pattern rather than introducing
a new one.

## Goals

- Home page's main event list is fetched server-side; first paint has real
  data.
- New "Recomendados para você" / "Em alta agora" section, sourced from
  `GET /events/recommended`, also fetched server-side.
- Zero behavior change to `EditorialHomeContent`'s existing interactivity
  (genre filter, click handlers, hero/live-rail/ticker) — this is additive,
  not a rewrite of the component's client logic.

## Non-goals

- No change to `useEventsPriceMap` (per-event ticket price lookup) — stays
  client-side, secondary enhancement, not part of "chamadas de eventos"
  scope as discussed.
- No pagination UI for the recommended section on the home page — it's a
  fixed-size section (`pageSize=10`), not a full listing page. A "ver mais"
  link can point at a future dedicated recommendations page if wanted later
  — not part of this pass.
- No backend changes — `/events/recommended` already exists and is merged.
- No de-duplication between the main feed grid and the recommended section
  if the same event appears in both — same posture as any other
  multi-row content surface (e.g. a title appearing in two rows is normal),
  not treated as a defect here.

## Architecture

`page.tsx` (async Server Component) → `Promise.all([fetchFeed(),
fetchRecommendedEvents()])` → both results passed as props into
`EditorialHomeContent` (`'use client'`, unchanged interactivity) → each
consumed via `useQuery({..., initialData})` so react-query owns the data
from first render onward (cache, refetch-on-focus, etc. all still work
exactly as today).

## Components

### `src/features/events/queries/get-feed.server.ts` (new)

```ts
import { cache } from 'react';
import type { EventResponse } from '../types/event.types';

const apiBase = () =>
  (process.env.API_INTERNAL_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api').replace(/\/$/, '');

interface FeedOutput {
  events: Array<{ event: EventResponse; score: number }>;
  total: number;
}

export const fetchFeed = cache(async (): Promise<EventResponse[]> => {
  try {
    const res = await fetch(`${apiBase()}/v1/feed?filter=all`, { next: { revalidate: 30 } });
    if (!res.ok) return [];
    const data = (await res.json()) as FeedOutput;
    return data.events.map((item) => item.event);
  } catch {
    return [];
  }
});
```

Mirrors `get-event.server.ts`'s `apiBase()` pattern (internal-URL-first, for
efficient server-to-server calls inside the docker network) and
`get-feature-flags.server.ts`'s try/catch-to-empty-default posture (a feed
hiccup must not break the whole home page).

### `src/features/events/queries/get-recommended-events.server.ts` (new)

```ts
import { cookies } from 'next/headers';
import type { RecommendedEventsResponse } from '../types/event.types';

const apiBase = () =>
  (process.env.API_INTERNAL_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api').replace(/\/$/, '');

const EMPTY: RecommendedEventsResponse = { items: [], page: 1, pageSize: 10, total: 0 };

// Forwards the access_token cookie when present (mirrors cart.server.ts) so
// a logged-in visitor gets personalized ranking; the backend endpoint is
// auth-optional and falls back to popularity ranking with no token — this
// function never throws, a ranking hiccup must not break the home page.
export async function fetchRecommendedEvents(): Promise<RecommendedEventsResponse> {
  const token = (await cookies()).get('access_token')?.value;
  try {
    const res = await fetch(`${apiBase()}/events/recommended?page=1&pageSize=10`, {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      cache: 'no-store', // personalized — same posture as fetchCartServer
    });
    if (!res.ok) return EMPTY;
    return (await res.json()) as RecommendedEventsResponse;
  } catch {
    return EMPTY;
  }
}
```

Not wrapped in React's `cache()` (unlike `fetchFeed`/`fetchEvent`) because
its result is per-user (varies by cookie) within the same request — `cache()`
is for deduping identical-argument calls within one render pass, and this
function takes no arguments but returns different data depending on the
caller's cookies, so memoizing it per-render would be correct-but-pointless
here (it's only called once per request in `page.tsx` anyway).

### `src/features/events/types/event.types.ts` (add)

```ts
export interface RecommendedEventsResponse {
  items: EventResponse[];
  page: number;
  pageSize: number;
  total: number;
}
```

### `src/features/events/services/events.service.ts` (add one method)

```ts
getRecommendedEvents: async (): Promise<RecommendedEventsResponse> => {
  const { data } = await httpClient.get<RecommendedEventsResponse>('/events/recommended', {
    params: { page: 1, pageSize: 10 },
  });
  return data;
},
```

Client-side refetch path (axios, carries auth interceptors automatically —
unlike the server fetch, no manual cookie handling needed here).

### `src/features/events/queries/use-recommended-events.ts` (new)

```ts
'use client';

import { useQuery } from '@tanstack/react-query';
import { eventsService } from '../services/events.service';
import type { RecommendedEventsResponse } from '../types/event.types';

export const RECOMMENDED_EVENTS_KEY = ['events', 'recommended'];

export function useRecommendedEventsQuery(initialData?: RecommendedEventsResponse) {
  return useQuery({
    queryKey: RECOMMENDED_EVENTS_KEY,
    queryFn: eventsService.getRecommendedEvents,
    initialData,
    staleTime: 5 * 60_000,
  });
}
```

Mirrors `useCartQuery`'s shape exactly.

### `src/features/events/queries/use-list-events.ts` (modify)

Add an optional `initialData` param, additive — existing callers (none pass
it today) are unaffected:

```ts
export function useListEventsQuery(filter: ListEventsFilter = 'all', initialData?: EventResponse[]) {
  return useQuery({
    queryKey: LIST_EVENTS_KEY(filter),
    queryFn: () => eventsService.listEvents(filter),
    staleTime: 5 * 60_000,
    initialData,
  });
}
```

### `src/app/(public)/page.tsx` (rewrite)

```tsx
import { EditorialHomeContent } from '@/features/events';
import { fetchFeed } from '@/features/events/queries/get-feed.server';
import { fetchRecommendedEvents } from '@/features/events/queries/get-recommended-events.server';

export default async function Home() {
  const [initialEvents, initialRecommended] = await Promise.all([
    fetchFeed(),
    fetchRecommendedEvents(),
  ]);
  return <EditorialHomeContent initialEvents={initialEvents} initialRecommended={initialRecommended} />;
}
```

### `src/features/events/components/public/EditorialHomeContent.tsx` (modify)

- New props: `initialEvents?: EventResponse[]`, `initialRecommended?: RecommendedEventsResponse`.
- `useListEventsQuery('all')` → `useListEventsQuery('all', initialEvents)`.
- New `useRecommendedEventsQuery(initialRecommended)` call, mapped through
  the same `eventToShow`/`priceMap` pipeline the main grid already uses (so
  recommended cards look and behave identically to `EditorialCard`s
  elsewhere — same `EditorialCard` component reused, no new card variant).
- New section rendered directly after the existing Hero/Live Rail `<div
  className={styles.heroGrid}>` block, before the `AdBanner` — matches your
  placement choice ("logo após o Hero/Live Rail").
- Section title: `useAuth().isLoggedIn ? 'Recomendados para você' : 'Em alta agora'`.
  Same underlying data either way (the backend already decides
  personalized-vs-popularity server-side) — the title is just being honest
  about which one actually happened, not gating on a separate client-side
  check.
- If `recommendedShows.length === 0`, the section renders nothing (no
  heading, no empty-state box) — matches the live-rail's existing minimal
  empty posture, and avoids an awkward "no recommendations yet" block for a
  brand-new event catalog with zero data.

## Data Flow

1. Request hits `page.tsx`. Server reads `access_token` cookie (if any).
2. `Promise.all([fetchFeed(), fetchRecommendedEvents()])` — two parallel
   backend calls, both degrade to empty results on failure rather than
   throwing.
3. Both results flow into `EditorialHomeContent` as props → `initialData`
   for their respective `useQuery` calls → first paint is fully populated,
   no spinner for either the main grid or the new section.
4. From then on, both are ordinary react-query-managed client data: refetch
   on window focus, cache, etc. — completely unchanged from how
   `useListEventsQuery` already behaves today, just with a server-provided
   first value instead of `undefined`.

## Error Handling & Edge Cases

- Backend down / `/v1/feed` or `/events/recommended` erroring at request
  time → both server fetchers degrade to empty (`[]` / `EMPTY`), home page
  still renders (hero/ticker sections simply show nothing, matching
  existing `isLoading` empty behavior — no new failure mode introduced).
- Anonymous visitor → `access_token` cookie absent → no `Authorization`
  header sent → backend's `OptionalJwtGuard` fallback path serves
  popularity ranking → section renders under "Em alta agora".
- Expired/invalid token in the cookie → backend's `OptionalJwtGuard` never
  401s (confirmed in the endpoint's own design/implementation) → same
  graceful fallback, no special handling needed here.

## Testing Plan

No backend changes. Frontend: manual verification only (this repo has no
component test suite for this page) —
1. `curl -s http://localhost:3000/ | grep -o 'Recomendados\|Em alta agora'`
   (or view-source in browser) to confirm the section's heading and at
   least one event card are present in the raw server-rendered HTML, not
   just injected after client hydration.
2. Confirm the existing main grid still full-renders server-side too (same
   check for an event title known to exist in seed data).
3. Log out (clear cookies) and repeat — confirm the section still renders,
   now titled "Em alta agora".
4. Confirm existing interactivity (genre filter clicks, hero play button,
   card navigation) still works after hydration — no regression.
