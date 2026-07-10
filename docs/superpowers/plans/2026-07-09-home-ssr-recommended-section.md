# Home Page SSR + Recommended Events Section Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fetch the home page's event data server-side (no client-side spinner on first paint) and add a new "Recomendados para você" / "Em alta agora" section backed by the existing `GET /events/recommended` backend endpoint.

**Architecture:** `src/app/(public)/page.tsx` becomes an async Server Component that fetches both the main feed and the recommended list in parallel via two new native-`fetch` server functions, passing both as `initial*` props into the existing `'use client'` `EditorialHomeContent`. Each is consumed via react-query's `initialData` option (mirrors this repo's existing `cart.server.ts` → `fetchCartServer` → `useCartQuery(initialData)` pattern) — first paint is server-rendered, all existing client-side refetch/cache/interactivity is unchanged.

**Tech Stack:** Next.js App Router, React Query (`@tanstack/react-query`), TypeScript. No new dependencies.

## Global Constraints

- No new component test suite exists in this repo for this page — verification is `npx tsc --noEmit` plus manual dev-server checks (curl / view-source for SSR content), matching how the existing `cart.server.ts`/`get-feature-flags.server.ts` SSR work was verified.
- Server fetch functions use native `fetch`, never the axios `httpClient` — the client is `'use client'`-only and carries browser auth interceptors that don't exist in a Server Component (see `get-event.server.ts`'s existing comment on this).
- `fetchRecommendedEvents()` reads the `access_token` cookie via `next/headers`'s `cookies()` — this makes the whole home page a dynamically-rendered (per-request) route, same as `/cart` already is today. This is an accepted, expected consequence, not a defect to work around.
- `'use client'` query-key/hook files must never be imported into a `.server.ts` file (Next.js Server/Client Component boundary) — inline the same key strings instead, matching `get-event.ts`'s existing comment on this exact constraint.
- No new SCSS classes for the new section — reuse the existing `.gridSection`/`.sectionHeader`/`.sectionEyebrow`/`.sectionTitle`/`.eventGrid` classes already used by the "Em alta na LIVESHOW" grid in `EditorialHomeContent.module.scss`, and the existing `EditorialCard` component for each item.
- Recommended section fetch is `pageSize=10`, `page=1`, fixed — no pagination UI on the home page.
- If the recommended section has zero items, render nothing (no heading, no empty-state box).

---

### Task 1: Types + server-side fetch functions

**Files:**
- Modify: `src/features/events/types/event.types.ts`
- Create: `src/features/events/queries/get-feed.server.ts`
- Create: `src/features/events/queries/get-recommended-events.server.ts`

**Interfaces:**
- Produces: `RecommendedEventsResponse` type (`src/features/events/types/event.types.ts`), `fetchFeed(): Promise<EventResponse[]>` (`get-feed.server.ts`), `fetchRecommendedEvents(): Promise<RecommendedEventsResponse>` (`get-recommended-events.server.ts`) — all consumed by Task 3's `page.tsx`.

- [ ] **Step 1: Add the `RecommendedEventsResponse` type**

In `src/features/events/types/event.types.ts`, add near the other response interfaces (after `EventResponse`):

```ts
export interface RecommendedEventsResponse {
  items: EventResponse[];
  page: number;
  pageSize: number;
  total: number;
}
```

- [ ] **Step 2: Create the feed server-fetch function**

Create `src/features/events/queries/get-feed.server.ts`:

```ts
import { cache } from 'react';
import type { EventResponse } from '../types/event.types';

// Server-side fetches use native fetch, not the axios httpClient (which is
// 'use client' and carries browser-only auth interceptors). Public endpoint —
// no Authorization header needed.
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

- [ ] **Step 3: Create the recommended-events server-fetch function**

Create `src/features/events/queries/get-recommended-events.server.ts`:

```ts
import { cookies } from 'next/headers';
import type { RecommendedEventsResponse } from '../types/event.types';

const apiBase = () =>
  (process.env.API_INTERNAL_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api').replace(/\/$/, '');

const EMPTY: RecommendedEventsResponse = { items: [], page: 1, pageSize: 10, total: 0 };

// Forwards the access_token cookie when present (mirrors cart.server.ts's
// fetchCartServer) so a logged-in visitor gets personalized ranking — the
// backend endpoint is auth-optional and falls back to popularity ranking
// with no token. Never throws: a ranking hiccup must not break the home
// page. Not wrapped in React's cache() (unlike fetchFeed) since its result
// varies per-caller by cookie, not by argument — cache() would just add
// pointless bookkeeping for a function called once per request anyway.
export async function fetchRecommendedEvents(): Promise<RecommendedEventsResponse> {
  const token = (await cookies()).get('access_token')?.value;
  try {
    const res = await fetch(`${apiBase()}/events/recommended?page=1&pageSize=10`, {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      cache: 'no-store',
    });
    if (!res.ok) return EMPTY;
    return (await res.json()) as RecommendedEventsResponse;
  } catch {
    return EMPTY;
  }
}
```

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: no new errors (this repo may have pre-existing unrelated errors elsewhere — if so, confirm the count/files match what exists on the branch before this task via `git stash` + re-run + `git stash pop`, same sanity check used in the backend plan's Task 3/4).

- [ ] **Step 5: Commit**

```bash
git add src/features/events/types/event.types.ts src/features/events/queries/get-feed.server.ts src/features/events/queries/get-recommended-events.server.ts
git commit -m "feat(events): add server-side feed and recommended-events fetchers"
```

---

### Task 2: Client-side query layer

**Files:**
- Modify: `src/features/events/services/events.service.ts`
- Modify: `src/features/events/queries/use-list-events.ts`
- Create: `src/features/events/queries/use-recommended-events.ts`
- Modify: `src/features/events/index.ts`

**Interfaces:**
- Consumes: `RecommendedEventsResponse` type from Task 1.
- Produces: `eventsService.getRecommendedEvents(): Promise<RecommendedEventsResponse>`, `useRecommendedEventsQuery(initialData?: RecommendedEventsResponse)`, `RECOMMENDED_EVENTS_KEY`, and `useListEventsQuery`'s new optional second `initialData` param — all consumed by Task 3's `EditorialHomeContent.tsx`.

- [ ] **Step 1: Add the client-side service method**

In `src/features/events/services/events.service.ts`, add the import and method (the file already imports several types from `../types/event.types` on line 2 — add `RecommendedEventsResponse` to that same import list):

```ts
import { httpClient } from '@/lib/http/client';
import type { CreateEventRequest, CreateTicketRequest, EventPhotoResponse, EventResponse, ListEventsFilter, RecommendedEventsResponse, TicketProductResponse, UpdateEventRequest, UpdateTicketRequest } from '../types/event.types';
```

Add this method inside the `eventsService` object, near `listEvents`:

```ts
  getRecommendedEvents: async (): Promise<RecommendedEventsResponse> => {
    const { data } = await httpClient.get<RecommendedEventsResponse>('/events/recommended', {
      params: { page: 1, pageSize: 10 },
    });
    return data;
  },
```

- [ ] **Step 2: Add `initialData` support to `useListEventsQuery`**

`src/features/events/queries/use-list-events.ts` is currently:

```ts
'use client';

import { useQuery } from '@tanstack/react-query';
import { eventsService } from '../services/events.service';
import type { ListEventsFilter } from '../types/event.types';

export const LIST_EVENTS_KEY = (filter: ListEventsFilter) => ['events', 'list', filter];

export function useListEventsQuery(filter: ListEventsFilter = 'all') {
  return useQuery({
    queryKey: LIST_EVENTS_KEY(filter),
    queryFn: () => eventsService.listEvents(filter),
    staleTime: 5 * 60_000,
  });
}
```

Replace it with:

```ts
'use client';

import { useQuery } from '@tanstack/react-query';
import { eventsService } from '../services/events.service';
import type { EventResponse, ListEventsFilter } from '../types/event.types';

export const LIST_EVENTS_KEY = (filter: ListEventsFilter) => ['events', 'list', filter];

export function useListEventsQuery(filter: ListEventsFilter = 'all', initialData?: EventResponse[]) {
  return useQuery({
    queryKey: LIST_EVENTS_KEY(filter),
    queryFn: () => eventsService.listEvents(filter),
    staleTime: 5 * 60_000,
    initialData,
  });
}
```

- [ ] **Step 3: Create the recommended-events client hook**

Create `src/features/events/queries/use-recommended-events.ts`:

```ts
'use client';

import { useQuery } from '@tanstack/react-query';
import { eventsService } from '../services/events.service';
import type { RecommendedEventsResponse } from '../types/event.types';

// Defined here for the client hook; the server page (get-recommended-events.server.ts)
// inlines its own fetch rather than importing this 'use client' module —
// same boundary constraint documented in get-event.ts's eventKeys.
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

- [ ] **Step 4: Export the new pieces from the feature barrel**

In `src/features/events/index.ts`, add:

```ts
export { useRecommendedEventsQuery, RECOMMENDED_EVENTS_KEY } from './queries/use-recommended-events';
```

next to the existing `export { useListEventsQuery, LIST_EVENTS_KEY } from './queries/use-list-events';` line, and add `RecommendedEventsResponse` to the existing type-export line:

```ts
export type { EventResponse, CreateEventRequest, CreateTicketRequest, TicketProductResponse, AccessCapability, EventStatus, ListEventsFilter, RecommendedEventsResponse } from './types/event.types';
```

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 6: Commit**

```bash
git add src/features/events/services/events.service.ts src/features/events/queries/use-list-events.ts src/features/events/queries/use-recommended-events.ts src/features/events/index.ts
git commit -m "feat(events): add client-side recommended-events query and initialData support"
```

---

### Task 3: Wire SSR into the home page and add the recommended section

**Files:**
- Modify: `src/app/(public)/page.tsx`
- Modify: `src/features/events/components/public/EditorialHomeContent.tsx`

**Interfaces:**
- Consumes: `fetchFeed`, `fetchRecommendedEvents` (Task 1); `useRecommendedEventsQuery`, `RecommendedEventsResponse` (Task 2); `useListEventsQuery`'s new `initialData` param (Task 2); `useAuth` from `@/features/account` (existing, returns `{ user, isLoggedIn, isLoading, logout }`).

- [ ] **Step 1: Rewrite `page.tsx` as an async Server Component**

Replace the full contents of `src/app/(public)/page.tsx`:

```tsx
// EditorialHomeContent: new editorial layout (active)
// HomePageContent: kept for future A/B testing
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

- [ ] **Step 2: Add the new props and hook wiring to `EditorialHomeContent`**

In `src/features/events/components/public/EditorialHomeContent.tsx`, the current top of the file is:

```tsx
'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import { useListEventsQuery, eventToShow, useEventsPriceMap, formatPriceRange } from '@/features/events';
import type { Show } from '@/features/events/types/show';
import styles from './EditorialHomeContent.module.scss';
import { AdBanner } from '@/features/advertisements/components/AdBanner';
```

Replace it with:

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

Change the component signature from `export function EditorialHomeContent() {` to:

```tsx
interface Props {
  initialEvents?: EventResponse[];
  initialRecommended?: RecommendedEventsResponse;
}

export function EditorialHomeContent({ initialEvents, initialRecommended }: Props) {
```

Change the existing events query call:

```tsx
  const { data: events = [], isLoading } = useListEventsQuery('all');
```

to:

```tsx
  const { data: events = [], isLoading } = useListEventsQuery('all', initialEvents);
```

Add, near the other `useMemo`/query hooks (after the existing `priceMap`/`shows` block, before `liveShows`):

```tsx
  const { isLoggedIn } = useAuth();
  const { data: recommended } = useRecommendedEventsQuery(initialRecommended);
  const recommendedShows = useMemo(
    () => (recommended?.items ?? []).map((e) => ({ ...eventToShow(e), priceRange: priceMap[e.id] ?? undefined })),
    [recommended, priceMap],
  );
```

- [ ] **Step 3: Render the new section**

The current file has this exact block (the end of the `heroGrid` conditional, immediately followed by the ad banner wrapper):

```tsx
            </div>
          </div>
        )}

       <div className={styles.adBannerWrapper}>
        <AdBanner placement="FEED" className={styles.feedAd} />
       </div>
```

Insert the new section between the `)}` (closing the `{featured && (...)}` conditional) and the `<div className={styles.adBannerWrapper}>` line, so the full replaced block becomes:

```tsx
            </div>
          </div>
        )}

        {recommendedShows.length > 0 && (
          <div className={styles.gridSection}>
            <div className={styles.sectionHeader}>
              <div>
                <div className={styles.sectionEyebrow}>
                  {isLoggedIn ? 'PARA VOCÊ' : 'DESTAQUES'}
                </div>
                <div className={styles.sectionTitle}>
                  {isLoggedIn ? 'Recomendados para você' : 'Em alta agora'}
                </div>
              </div>
            </div>
            <div className={styles.eventGrid}>
              {recommendedShows.map((show) => (
                <EditorialCard
                  key={show.id}
                  show={show}
                  localeCode={localeCode}
                  onWatch={() => goWatch(show)}
                  onInfo={() => goInfo(show)}
                />
              ))}
            </div>
          </div>
        )}

       <div className={styles.adBannerWrapper}>
        <AdBanner placement="FEED" className={styles.feedAd} />
       </div>
```

This reuses `EditorialCard` (already defined earlier in the same file) and the existing `goWatch`/`goInfo` handlers and `localeCode` value already in scope in this component — no new handlers needed.

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 5: Manual verification — SSR content present**

Start the dev stack if not already running (check `docker compose ps` in the `live-show-orchestrator` repo first — the frontend needs the backend reachable at `NEXT_PUBLIC_API_URL`/`API_INTERNAL_URL`), then:

```bash
curl -s http://localhost:3000/ | grep -o 'Em alta agora\|Recomendados para você' | head -1
```

Expected: prints one of the two strings, proving the section's heading is present in the raw server-rendered HTML (not just injected after client hydration — if this prints nothing, the section is only rendering client-side and something in Task 3 is wrong).

```bash
curl -s http://localhost:3000/ | grep -c 'eventCard\|liveItem'
```

Expected: non-zero count, confirming the main grid also renders server-side (pre-existing `eventCard`/`liveItem` class names from the existing markup).

- [ ] **Step 6: Manual verification — logged-out vs logged-in copy**

With no `access_token` cookie (fresh/incognito browser session), load `http://localhost:3000/` and confirm the section title reads "Em alta agora". Log in as any seeded user with preference data (e.g. `jazzfan@viewer.com`, per the backend feature's own test data), reload, and confirm the title switches to "Recomendados para você".

- [ ] **Step 7: Manual verification — existing interactivity unchanged**

On the loaded home page: click a genre filter chip (confirm the main grid filters), click a card's "Assistir"/"+ INFO" button (confirm navigation still fires), confirm the hero play button and "VER TODOS"/"VER TODA A PROGRAMAÇÃO AO VIVO" links still work. No regression expected — this step exists to catch anything Step 2/3's edits might have accidentally broken in the surrounding JSX.

- [ ] **Step 8: Commit**

```bash
git add src/app/\(public\)/page.tsx src/features/events/components/public/EditorialHomeContent.tsx
git commit -m "feat(home): fetch events server-side and add recommended-events section"
```

---

## Post-implementation

No backend changes in this plan — `GET /events/recommended` already exists
and is merged (see `live-show-orchestrator`'s
`docs/superpowers/plans/2026-07-08-recommended-events-endpoint.md`).

`useEventsPriceMap` remains client-side-only per the design spec's
Non-goals — not addressed by this plan, and not a blocker for it.
