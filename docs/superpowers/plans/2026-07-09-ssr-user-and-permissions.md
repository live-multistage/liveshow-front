# SSR User Profile + Permissions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the remaining gaps from the SSR Auth State feature — the full `AuthUser` profile (displayName/email/role) and the `access_dashboard` permission check are still resolved client-side after mount, causing a visible pop-in even though `isLoggedIn` itself is now correct from the first paint.

**Architecture:** Two independent SSR mechanisms, matching two independent client-side state models already in this app:
1. **`user`** — plain React state in `AuthProvider` (not React Query). Seeded via a new `initialUser` prop, computed by a new server function (`getUserServer`) that calls the existing `GET /auth/me` endpoint with the `access_token` cookie forwarded as a Bearer header — no backend changes needed, this is the same endpoint `getMe()` already calls client-side.
2. **The `access_dashboard` permission check** — a React Query–backed value (`useAuthCheck`, used by `Navbar`). Seeded via the `dehydrate`/`HydrationBoundary` pattern **already established elsewhere in this codebase** (`src/app/(public)/events/[id]/page.tsx` does exactly this for `live`/`replay` access checks) — a server-side `QueryClient` prefetches the same query key the client hook uses, its dehydrated state is passed down, and `useAuthCheck`'s client-side call finds the cache already warm.

**Tech Stack:** Next.js App Router, TanStack Query (`dehydrate`/`HydrationBoundary`), TypeScript. No new dependencies, no backend changes.

## Global Constraints

- **`isLoading`'s timing is still unchanged** — this is the third plan in a row to make this explicit, because it keeps mattering: `isLoading` continues to gate exclusively on whether `tokenStore` has been populated (the httpOnly cookie's token value transferred into readable client memory via `/api/auth/session`), which is still required for any *fresh* authenticated client-side API call (`httpClient`'s request interceptor reads `tokenStore.get()` synchronously — confirmed in `src/lib/http/interceptors.ts`). `DashboardGuard`/`LiveGate`/etc. still wait on it exactly as before. `initialUser` only changes `user`'s *initial value* (and skips a redundant localStorage re-read when already seeded) — it does not shortcut `isLoading`.
- `getUserServer`/`checkAuthServer` both degrade gracefully on any failure (backend down, token rejected) — `getUserServer` returns `null` (the existing client-side hydration effect's localStorage fallback still covers that case), `checkAuthServer` returns `{ allowed: false }` (a fail-closed default for a permission check, not `{ allowed: true }`).
- The dehydrated query key for the permission check must be **exactly** `['auth-check', 'access_dashboard', {}]` — this must byte-match what `Navbar`'s `useAuthCheck('access_dashboard', {}, { enabled: isLoggedIn })` call produces (`['auth-check', action, context]` per `use-auth-check.ts`), or TanStack Query will treat them as different cache entries and the client will silently refetch instead of using the seeded value.
- Only the `access_dashboard` check is seeded — this plan does not attempt to SSR every possible `useAuthCheck` call site in the app (per the earlier scope discussion). Per-event `live`/`replay` access checks are unaffected by this plan (already SSR'd separately, on the event detail page, unrelated code path).
- No test runner exists in this repo for this kind of file — verification is `npx tsc --noEmit` plus manual dev-server checks.

---

### Task 1: Server-side user + permission-check fetchers

**Files:**
- Modify: `src/features/account/queries/get-auth-state.server.ts`

**Interfaces:**
- Produces: `getUserServer(accessToken: string): Promise<AuthUser | null>`, `checkAuthServer(action: string, context: Record<string, unknown>, accessToken: string): Promise<{ allowed: boolean; reason?: string }>` — both consumed by Task 3's root layout. `getInitialIsLoggedIn` (existing, from the prior plan) is unchanged.

- [ ] **Step 1: Add the two new server functions**

`src/features/account/queries/get-auth-state.server.ts` is currently:

```ts
import { cookies } from 'next/headers';
import { isTokenExpired } from '@/lib/auth/jwt.server';

// Pure JWT payload decode, no network call — mirrors the same expiry check
// /api/auth/session's route handler uses, minus the refresh-token exchange
// (that still only ever happens client-side, via useAuth's existing
// hydration effect, completely unchanged by this function). A freshly-
// expired access token with a still-valid refresh token reads as "logged
// out" here for one brief window until client hydration silently refreshes
// it — an accepted tradeoff, not a regression from today's behavior.
export async function getInitialIsLoggedIn(): Promise<boolean> {
  const token = (await cookies()).get('access_token')?.value;
  if (!token) return false;
  return !isTokenExpired(token);
}
```

Replace it with:

```ts
import { cookies } from 'next/headers';
import { isTokenExpired } from '@/lib/auth/jwt.server';
import type { AuthUser } from '../types/account.types';

const apiBase = () =>
  (process.env.API_INTERNAL_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080/api').replace(/\/$/, '');

// Pure JWT payload decode, no network call — mirrors the same expiry check
// /api/auth/session's route handler uses, minus the refresh-token exchange
// (that still only ever happens client-side, via useAuth's existing
// hydration effect, completely unchanged by this function). A freshly-
// expired access token with a still-valid refresh token reads as "logged
// out" here for one brief window until client hydration silently refreshes
// it — an accepted tradeoff, not a regression from today's behavior.
export async function getInitialIsLoggedIn(): Promise<boolean> {
  const token = (await cookies()).get('access_token')?.value;
  if (!token) return false;
  return !isTokenExpired(token);
}

// GET /auth/me — the same endpoint the client's getMe() (queries/get-me.ts)
// already calls, just server-side with the token forwarded as a Bearer
// header instead of relying on httpClient's browser-only auth interceptor.
// Returns null on any failure (backend down, token rejected) — the client
// hydration effect's existing localStorage fallback covers that case, same
// as it always has for a user it doesn't have SSR data for.
export async function getUserServer(accessToken: string): Promise<AuthUser | null> {
  try {
    const res = await fetch(`${apiBase()}/auth/me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: 'no-store',
    });
    if (!res.ok) return null;
    return (await res.json()) as AuthUser;
  } catch {
    return null;
  }
}

// POST /auth/check — mirrors useAuthCheck's (hooks/use-auth-check.ts)
// request body shape exactly, so the dehydrated query cache entry this
// seeds matches what the client hook would otherwise fetch itself. Fails
// closed (allowed: false) on any error — a permission check must never
// silently default to "allowed" just because the SSR call failed.
export async function checkAuthServer(
  action: string,
  context: Record<string, unknown>,
  accessToken: string,
): Promise<{ allowed: boolean; reason?: string }> {
  try {
    const res = await fetch(`${apiBase()}/auth/check`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, context }),
      cache: 'no-store',
    });
    if (!res.ok) return { allowed: false };
    return (await res.json()) as { allowed: boolean; reason?: string };
  } catch {
    return { allowed: false };
  }
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add src/features/account/queries/get-auth-state.server.ts
git commit -m "feat(account): add server-side user profile and permission-check fetchers"
```

---

### Task 2: `AuthProvider` gains `initialUser`

**Files:**
- Modify: `src/features/account/context/AuthProvider.tsx`

**Interfaces:**
- Produces: `AuthProvider`'s props gain `initialUser: AuthUser | null` (alongside the existing `initialIsLoggedIn: boolean`). `useAuth()`'s public shape (`{ user, isLoggedIn, isLoading, logout }`) is completely unchanged — consumed identically by all existing call sites, no changes needed there. Consumed by Task 3's `Providers` component.

- [ ] **Step 1: Add `initialUser` to `AuthProvider`**

`src/features/account/context/AuthProvider.tsx` is currently:

```tsx
'use client';

import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { tokenStore } from '@/lib/auth/token-store';
import type { AuthUser } from '../types/account.types';

interface AuthContextValue {
  user: AuthUser | null;
  isLoggedIn: boolean;
  isLoading: boolean;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

let pendingSession: Promise<{ accessToken: string } | null> | null = null;

function fetchSession(): Promise<{ accessToken: string } | null> {
  if (!pendingSession) {
    pendingSession = fetch('/api/auth/session')
      .then((res) => (res.ok ? (res.json() as Promise<{ accessToken: string }>) : null))
      .catch(() => null)
      .finally(() => { pendingSession = null; });
  }
  return pendingSession;
}

interface AuthProviderProps {
  children: React.ReactNode;
  // Server-decoded from the access_token cookie (see
  // src/features/account/queries/get-auth-state.server.ts) — used only as
  // the pre-hydration snapshot below; once the real hydration effect
  // resolves, isLoggedIn is derived from `user` exactly as this hook always
  // computed it.
  initialIsLoggedIn: boolean;
}

export function AuthProvider({ children, initialIsLoggedIn }: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const queryClient = useQueryClient();

  useEffect(() => {
    async function hydrate() {
      if (tokenStore.get()) {
        const stored = localStorage.getItem('user');
        if (stored) {
          try { setUser(JSON.parse(stored) as AuthUser); } catch { /* corrupted */ }
        }
        setIsLoading(false);
        return;
      }

      try {
        const data = await fetchSession();
        if (data) {
          tokenStore.set(data.accessToken);
          const stored = localStorage.getItem('user');
          if (stored) {
            try { setUser(JSON.parse(stored) as AuthUser); } catch { /* corrupted */ }
          }
        }
      } finally {
        setIsLoading(false);
      }
    }

    void hydrate();
  }, []);

  const logout = useCallback(async () => {
    tokenStore.clear();
    localStorage.removeItem('user');
    await fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
    queryClient.clear();
    setUser(null);
    router.push('/login');
  }, [router, queryClient]);

  // While hydration is still in flight, trust the server-decoded snapshot
  // (correct immediately — no cookie round-trip needed) instead of a
  // hardcoded false. Once hydration resolves (isLoading becomes false),
  // isLoggedIn tracks `user` directly — exactly how this hook always
  // computed it (`isLoggedIn: !!user`) before this Provider existed.
  const isLoggedIn = isLoading ? initialIsLoggedIn : !!user;

  const value = useMemo(
    () => ({ user, isLoggedIn, isLoading, logout }),
    [user, isLoggedIn, isLoading, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContextValue(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuthContextValue must be used within an AuthProvider');
  }
  return ctx;
}
```

Replace it with:

```tsx
'use client';

import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { tokenStore } from '@/lib/auth/token-store';
import type { AuthUser } from '../types/account.types';

interface AuthContextValue {
  user: AuthUser | null;
  isLoggedIn: boolean;
  isLoading: boolean;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

let pendingSession: Promise<{ accessToken: string } | null> | null = null;

function fetchSession(): Promise<{ accessToken: string } | null> {
  if (!pendingSession) {
    pendingSession = fetch('/api/auth/session')
      .then((res) => (res.ok ? (res.json() as Promise<{ accessToken: string }>) : null))
      .catch(() => null)
      .finally(() => { pendingSession = null; });
  }
  return pendingSession;
}

interface AuthProviderProps {
  children: React.ReactNode;
  // Server-decoded from the access_token cookie (see
  // src/features/account/queries/get-auth-state.server.ts) — used only as
  // the pre-hydration snapshot below; once the real hydration effect
  // resolves, isLoggedIn is derived from `user` exactly as this hook always
  // computed it.
  initialIsLoggedIn: boolean;
  // Server-fetched via GET /auth/me (getUserServer) using the access_token
  // cookie as Bearer — null when logged out, or when SSR couldn't reach the
  // backend (rare; the hydration effect below still falls back to
  // localStorage in that case, exactly as it did before this prop existed).
  initialUser: AuthUser | null;
}

export function AuthProvider({ children, initialIsLoggedIn, initialUser }: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(initialUser);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const queryClient = useQueryClient();

  useEffect(() => {
    async function hydrate() {
      if (tokenStore.get()) {
        if (!initialUser) {
          const stored = localStorage.getItem('user');
          if (stored) {
            try { setUser(JSON.parse(stored) as AuthUser); } catch { /* corrupted */ }
          }
        }
        setIsLoading(false);
        return;
      }

      try {
        const data = await fetchSession();
        if (data) {
          tokenStore.set(data.accessToken);
          if (!initialUser) {
            const stored = localStorage.getItem('user');
            if (stored) {
              try { setUser(JSON.parse(stored) as AuthUser); } catch { /* corrupted */ }
            }
          }
        }
      } finally {
        setIsLoading(false);
      }
    }

    void hydrate();
    // initialUser is a prop captured once at mount (Provider is mounted
    // exactly once, at the app root) — it can't meaningfully change across
    // this component's lifetime, so it's intentionally excluded from the
    // dependency array rather than re-running hydration if it did.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const logout = useCallback(async () => {
    tokenStore.clear();
    localStorage.removeItem('user');
    await fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
    queryClient.clear();
    setUser(null);
    router.push('/login');
  }, [router, queryClient]);

  // While hydration is still in flight, trust the server-decoded snapshot
  // (correct immediately — no cookie round-trip needed) instead of a
  // hardcoded false. Once hydration resolves (isLoading becomes false),
  // isLoggedIn tracks `user` directly — exactly how this hook always
  // computed it (`isLoggedIn: !!user`) before this Provider existed.
  const isLoggedIn = isLoading ? initialIsLoggedIn : !!user;

  const value = useMemo(
    () => ({ user, isLoggedIn, isLoading, logout }),
    [user, isLoggedIn, isLoading, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContextValue(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuthContextValue must be used within an AuthProvider');
  }
  return ctx;
}
```

**Note on what deliberately did NOT change:** `isLoading` still starts `true` and only flips to `false` inside `hydrate()`'s existing paths — identical timing to before this task. The only behavioral change is `user`'s *initial* value (`initialUser` instead of `null`) and skipping the redundant `localStorage` re-read when `initialUser` is already present. This is a deliberate, narrow change — do not "simplify" this further by also short-circuiting `isLoading` based on `initialUser`, which would reintroduce a race for any consumer that gates its own authenticated queries on `isLoading` (`DashboardGuard`, `LiveGate`) before `tokenStore` is actually populated.

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: a new error is expected and fine at this point — `Providers` (not yet updated, that's Task 3) doesn't pass `initialUser` to `AuthProvider` yet. Confirm the *only* new error is that missing-prop error at the `<AuthProvider>` call site inside `src/providers/index.tsx`, nothing else.

- [ ] **Step 3: Commit**

```bash
git add src/features/account/context/AuthProvider.tsx
git commit -m "feat(account): add initialUser prop to AuthProvider"
```

---

### Task 3: Wire SSR user + permission prefetch into the app root

**Files:**
- Modify: `src/providers/index.tsx`
- Modify: `src/app/layout.tsx`

**Interfaces:**
- Consumes: `getUserServer`, `checkAuthServer` (Task 1), `AuthProvider`'s new `initialUser` prop (Task 2).

- [ ] **Step 1: Thread `initialUser` and a dehydrated query cache through `Providers`**

`src/providers/index.tsx` is currently:

```tsx
'use client';

import { isServer, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/shared/components/ui/sonner';
import { NavigationEvents } from '@/shared/components/NavigationEvents';
import { NavigationOverlay } from '@/shared/components/NavigationOverlay';
import { AuthProvider } from '@/features/account/context/AuthProvider';

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { staleTime: 60 * 1000 },
    },
  });
}

let browserQueryClient: QueryClient | undefined;

function getQueryClient() {
  if (isServer) {
    return makeQueryClient();
  }
  if (!browserQueryClient) browserQueryClient = makeQueryClient();
  return browserQueryClient;
}

interface ProvidersProps {
  children: React.ReactNode;
  initialIsLoggedIn: boolean;
}

export function Providers({ children, initialIsLoggedIn }: ProvidersProps) {
  const queryClient = getQueryClient();
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider initialIsLoggedIn={initialIsLoggedIn}>
        {children}
        <Toaster />
        <NavigationEvents />
        <NavigationOverlay />
      </AuthProvider>
    </QueryClientProvider>
  );
}
```

Replace it with:

```tsx
'use client';

import { isServer, QueryClient, QueryClientProvider, HydrationBoundary, type DehydratedState } from '@tanstack/react-query';
import { Toaster } from '@/shared/components/ui/sonner';
import { NavigationEvents } from '@/shared/components/NavigationEvents';
import { NavigationOverlay } from '@/shared/components/NavigationOverlay';
import { AuthProvider } from '@/features/account/context/AuthProvider';
import type { AuthUser } from '@/features/account';

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { staleTime: 60 * 1000 },
    },
  });
}

let browserQueryClient: QueryClient | undefined;

function getQueryClient() {
  if (isServer) {
    return makeQueryClient();
  }
  if (!browserQueryClient) browserQueryClient = makeQueryClient();
  return browserQueryClient;
}

interface ProvidersProps {
  children: React.ReactNode;
  initialIsLoggedIn: boolean;
  initialUser: AuthUser | null;
  // Seeded by the root layout's server-side prefetch (see layout.tsx) —
  // mirrors the same dehydrate()/HydrationBoundary pattern already used in
  // src/app/(public)/events/[id]/page.tsx for live/replay access checks,
  // just applied at the app root for the one check every page needs
  // (access_dashboard, used by Navbar).
  dehydratedState: DehydratedState;
}

export function Providers({ children, initialIsLoggedIn, initialUser, dehydratedState }: ProvidersProps) {
  const queryClient = getQueryClient();
  return (
    <QueryClientProvider client={queryClient}>
      <HydrationBoundary state={dehydratedState}>
        <AuthProvider initialIsLoggedIn={initialIsLoggedIn} initialUser={initialUser}>
          {children}
          <Toaster />
          <NavigationEvents />
          <NavigationOverlay />
        </AuthProvider>
      </HydrationBoundary>
    </QueryClientProvider>
  );
}
```

- [ ] **Step 2: Prefetch user + permission check in the root layout**

`src/app/layout.tsx` is currently:

```tsx
import type { Metadata } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, getLocale } from 'next-intl/server';
import { Providers } from '@/providers';
import { getInitialIsLoggedIn } from '@/features/account/queries/get-auth-state.server';
import '@/styles/index.css';

export const metadata: Metadata = {
  title: {
    default: 'Liveshow',
    template: '%s · Liveshow',
  },
  description: 'Shows ao vivo de todo o mundo, na palma da sua mão.',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  const messages = await getMessages();
  const initialIsLoggedIn = await getInitialIsLoggedIn();

  return (
    <html lang={locale} className="dark">
      <body>
        <NextIntlClientProvider messages={messages}>
          <Providers initialIsLoggedIn={initialIsLoggedIn}>{children}</Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
```

Replace it with:

```tsx
import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, getLocale } from 'next-intl/server';
import { QueryClient, dehydrate } from '@tanstack/react-query';
import { Providers } from '@/providers';
import { getInitialIsLoggedIn, getUserServer, checkAuthServer } from '@/features/account/queries/get-auth-state.server';
import '@/styles/index.css';

export const metadata: Metadata = {
  title: {
    default: 'Liveshow',
    template: '%s · Liveshow',
  },
  description: 'Shows ao vivo de todo o mundo, na palma da sua mão.',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  const messages = await getMessages();

  const accessToken = (await cookies()).get('access_token')?.value;
  const initialIsLoggedIn = await getInitialIsLoggedIn();

  const qc = new QueryClient();
  const [initialUser] = await Promise.all([
    initialIsLoggedIn && accessToken ? getUserServer(accessToken) : Promise.resolve(null),
    initialIsLoggedIn && accessToken
      ? qc.prefetchQuery({
          queryKey: ['auth-check', 'access_dashboard', {}],
          queryFn: () => checkAuthServer('access_dashboard', {}, accessToken),
        })
      : Promise.resolve(),
  ]);

  return (
    <html lang={locale} className="dark">
      <body>
        <NextIntlClientProvider messages={messages}>
          <Providers
            initialIsLoggedIn={initialIsLoggedIn}
            initialUser={initialUser}
            dehydratedState={dehydrate(qc)}
          >
            {children}
          </Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 4: Manual verification — logged-out visitor unaffected**

Start the dev stack (frontend `pnpm dev`, backend `docker compose up -d` in the sibling `live-show-orchestrator` repo). With no `access_token` cookie:

```bash
curl -s http://localhost:3000/ | grep -o 'Em alta agora\|Recomendados para você'
```

Expected: `Em alta agora`, same as before this plan — this confirms the anonymous path (both new `Promise.resolve(null)`/`Promise.resolve()` branches) doesn't break anything for logged-out visitors.

- [ ] **Step 5: Manual verification — logged-in visitor sees real name/email immediately**

Log in via a real curl-based session (mirrors the verification done for the prior plan):

```bash
curl -s -c /tmp/authcookies.txt -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"jazzfan@viewer.com","password":"Seed@123"}' -o /dev/null -w '%{http_code}\n'

curl -s -b /tmp/authcookies.txt http://localhost:3000/ | grep -o 'jazzfan@viewer\.com\|Renata Jazzista'
```

`jazzfan@viewer.com`'s seeded display name is `Renata Jazzista` (`live-show-orchestrator`'s `src/database/seeds/seed.ts`, `U_VIEWER_JAZZ` persona). Expected: the raw SSR HTML directly contains `jazzfan@viewer.com` (Navbar's dropdown label renders `user?.email`) or `Renata Jazzista` (`user?.displayName`, used both in the dropdown label and via `getInitials()` for the avatar) — either match confirms the profile data that previously only appeared after a client-side pop-in is now present from the very first render. Clean up: `rm -f /tmp/authcookies.txt`.

- [ ] **Step 6: Manual verification — permission check resolved server-side**

With the browser (not curl, since this needs devtools), log in as the same or another seeded user, open the Network tab filtered to `check`, and load the home page. Confirm **zero** `POST /auth/check` requests fire on initial load for the `access_dashboard` check specifically (the dehydrated cache entry should satisfy `useAuthCheck` without a network call) — some other `auth/check` calls for *different* actions elsewhere in the app, if any exist, are out of scope and may still fire normally.

- [ ] **Step 7: Manual verification — no regression in existing behavior**

Confirm Navbar's dashboard icon (if the logged-in test user has `access_dashboard`) or its absence (if not) renders correctly and consistently with what a direct `POST /auth/check` call would return — spot-check by comparing against the equivalent client-side-only behavior (e.g. temporarily check in another browser profile without the SSR change, or just trust that the dehydrated value came from the same `checkAuthServer` code path hitting the same backend policy). Confirm login/logout still work end to end, and confirm `DashboardGuard`'s loading-spinner timing is unchanged (per this plan's explicit non-goal).

- [ ] **Step 8: Commit**

```bash
git add src/providers/index.tsx src/app/layout.tsx
git commit -m "feat(account): SSR-prefetch user profile and access_dashboard permission check"
```

---

## Post-implementation

Other `useAuthCheck` call sites throughout the app (per-page/per-action checks
beyond the global `access_dashboard` one) remain client-side, per the explicit
scope decision made when this plan was brainstormed. If a specific page's own
permission check becomes a visible pop-in problem later, it should follow the
same `dehydrate`/`HydrationBoundary` pattern already proven twice now (event
detail page's live/replay access, this plan's `access_dashboard`) — scoped to
that page's own Server Component, not bolted onto the root layout.
