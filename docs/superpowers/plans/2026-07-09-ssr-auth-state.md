# SSR Auth State Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminate the layout shift caused by `useAuth()`'s `isLoggedIn` defaulting to `false` on every fresh page load until a client-side round-trip to `/api/auth/session` resolves — by decoding the `access_token` cookie server-side (no network call) and seeding that boolean into `useAuth()` from the very first render.

**Architecture:** `useAuth()` currently self-manages its own `useState`/`useEffect` independently in every one of its 21 call sites (band-aided by a `pendingSession` de-dupe cache for parallel mounts). This plan converts it into a single Context Provider (`AuthProvider`), mounted once at the app root, so there is exactly one hydration cycle for the whole app instead of N. The root layout (already an async Server Component) decodes the `access_token` cookie directly — pure JWT payload decode, zero network calls — and passes the resulting boolean into the Provider as `initialIsLoggedIn`. `useAuth()`'s public shape (`{ user, isLoggedIn, isLoading, logout }`) is completely unchanged, so none of the 21 existing call sites need to change.

**Tech Stack:** Next.js App Router, React Context, TypeScript. No new dependencies.

## Global Constraints

- `useAuth()`'s public return shape (`{ user, isLoggedIn, isLoading, logout }`) must not change — this is what makes the refactor safe across 21 call sites with zero changes to any of them.
- **`isLoading`'s timing is unchanged.** It still starts `true` and only flips to `false` once the existing hydration effect (which transfers the actual token value out of the httpOnly cookie into `tokenStore`, via `/api/auth/session`) completes. This plan does **not** shorten that round-trip or change when guard components (`DashboardGuard`, `LiveGate`, etc.) stop showing their loading state — that's a separate, larger problem (the token value itself can only be read into JS via that endpoint, since the cookie is httpOnly by design) and explicitly out of scope here.
- **Only `isLoggedIn`'s pre-hydration value improves.** Before hydration completes, `isLoggedIn` now reflects the server-decoded cookie snapshot instead of a hardcoded `false`. After hydration completes, `isLoggedIn` is derived from `user` exactly as it was before this plan (`isLoggedIn: !!user`) — this plan does not introduce a separately-tracked `isLoggedIn` state that could drift from `user`.
- This fix directly benefits any consumer that reads `isLoggedIn` for a structural rendering decision **without** also gating on `isLoading` first (e.g. `EditorialHomeContent.tsx`'s "Recomendados para você" vs "Em alta agora" section title — the exact case flagged as a cosmetic Minor finding in that feature's own final review). It does not change behavior for consumers that gate on `isLoading` first (they already wait for the same round-trip today).
- **Known accepted edge case:** if `access_token` is freshly expired but `refresh_token` is still valid, the server-side decode (no network call, by design) reports `isLoggedIn: false` for that request — the existing client-side hydration effect still runs unconditionally afterward and silently refreshes via `/api/auth/session` exactly as it does today, so this only affects the pre-hydration snapshot for that narrow window, not the eventual correct state.
- Because the root layout now calls `cookies()`, the entire app is forced into per-request dynamic rendering — this was almost certainly already the case (next-intl's `getLocale()`/`getMessages()` in the same layout typically require per-request locale detection with no `[locale]` route segment present in this app), so this is not expected to be a new consequence, but is worth confirming during manual verification (Task 3) rather than assuming.
- No test runner exists in this repo for this kind of file (confirmed absent in prior features) — verification is `npx tsc --noEmit` plus manual dev-server checks.

---

### Task 1: Shared JWT decode util + server-side auth-state reader

**Files:**
- Create: `src/lib/auth/jwt.server.ts`
- Modify: `src/app/api/auth/session/route.ts`
- Create: `src/features/account/queries/get-auth-state.server.ts`

**Interfaces:**
- Produces: `isTokenExpired(token: string): boolean` (`src/lib/auth/jwt.server.ts`) — consumed by both the modified route handler and the new server-side reader. `getInitialIsLoggedIn(): Promise<boolean>` (`get-auth-state.server.ts`) — consumed by Task 3's root layout.

- [ ] **Step 1: Extract the shared JWT expiry check**

Create `src/lib/auth/jwt.server.ts`:

```ts
// Server-only: relies on Buffer (Node.js global, not available in the
// browser). Never import this from a 'use client' file.
export function isTokenExpired(token: string): boolean {
  try {
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
    return payload.exp * 1000 < Date.now();
  } catch {
    return true;
  }
}
```

- [ ] **Step 2: Update the session route to use the shared util**

`src/app/api/auth/session/route.ts` is currently:

```ts
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { API_URL, setAuthCookies, clearAuthCookies } from '../_cookies';

function isTokenExpired(token: string): boolean {
  try {
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
    return payload.exp * 1000 < Date.now();
  } catch {
    return true;
  }
}

export async function GET() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get('access_token')?.value;
  const refreshToken = cookieStore.get('refresh_token')?.value;

  if (!accessToken) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  if (!isTokenExpired(accessToken)) {
    return NextResponse.json({ accessToken, authenticated: true });
  }

  if (!refreshToken) {
    const response = NextResponse.json({ authenticated: false }, { status: 401 });
    clearAuthCookies(response);
    return response;
  }

  const upstream = await fetch(`${API_URL}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });

  if (!upstream.ok) {
    const response = NextResponse.json({ authenticated: false }, { status: 401 });
    clearAuthCookies(response);
    return response;
  }

  const data = await upstream.json() as { accessToken: string; refreshToken: string };
  const response = NextResponse.json({ accessToken: data.accessToken, authenticated: true });
  setAuthCookies(response, data.accessToken, data.refreshToken);
  return response;
}
```

Replace the top of the file (imports + local `isTokenExpired` definition) with:

```ts
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { API_URL, setAuthCookies, clearAuthCookies } from '../_cookies';
import { isTokenExpired } from '@/lib/auth/jwt.server';
```

(The `export async function GET() { ... }` body below is completely unchanged — only the local `function isTokenExpired(...) {...}` definition is removed, replaced by the import above.)

- [ ] **Step 3: Create the server-side auth-state reader**

Create `src/features/account/queries/get-auth-state.server.ts`:

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

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: no new errors (this repo may have pre-existing unrelated errors elsewhere from other in-progress work).

- [ ] **Step 5: Commit**

```bash
git add src/lib/auth/jwt.server.ts src/app/api/auth/session/route.ts src/features/account/queries/get-auth-state.server.ts
git commit -m "feat(account): extract shared JWT expiry check, add server-side auth-state reader"
```

---

### Task 2: `AuthProvider` context + rewritten `useAuth()` hook

**Files:**
- Create: `src/features/account/context/AuthProvider.tsx`
- Modify: `src/features/account/hooks/use-auth.ts`

**Interfaces:**
- Consumes: nothing from Task 1 directly (the `initialIsLoggedIn` boolean is passed in as a prop by Task 3's wiring, not fetched by this file).
- Produces: `AuthProvider({ children, initialIsLoggedIn }: { children: React.ReactNode; initialIsLoggedIn: boolean })` and `useAuth(): { user: AuthUser | null; isLoggedIn: boolean; isLoading: boolean; logout: () => Promise<void> }` — the latter's shape is byte-identical to what it was before this task, so none of its 21 existing call sites (grep `useAuth()` across `src/` to confirm the count is unchanged if you want to double check) need to change. Consumed by Task 3's `Providers` component.

- [ ] **Step 1: Create the `AuthProvider`**

Create `src/features/account/context/AuthProvider.tsx`:

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

// Coalesces parallel session fetches from multiple component mounts on first
// page load. Kept even though there's now a single Provider instance (not N
// independent hook instances) — React Strict Mode double-invokes effects in
// development, which would otherwise double-fire this fetch on every mount.
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

- [ ] **Step 2: Rewrite `useAuth()` as a thin context consumer**

`src/features/account/hooks/use-auth.ts` is currently:

```ts
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { tokenStore } from '@/lib/auth/token-store';
import type { AuthUser } from '../types/account.types';

// Coalesces parallel session fetches from multiple component mounts on first
// page load. Without this, N concurrent useAuth() calls all fire /api/auth/session
// before any of them sets tokenStore.
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

export function useAuth() {
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

  return { user, isLoggedIn: !!user, isLoading, logout };
}
```

Replace the entire file with:

```ts
'use client';

import { useAuthContextValue } from '../context/AuthProvider';

// Public shape unchanged: { user, isLoggedIn, isLoading, logout }. All
// existing call sites keep working with zero changes — the actual state
// now lives in a single AuthProvider (mounted once at the app root) instead
// of being independently re-hydrated by every component that calls this.
export function useAuth() {
  return useAuthContextValue();
}
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: no new errors. Since `Providers`/`RootLayout` haven't been updated yet (Task 3), `AuthProvider` is not yet mounted anywhere — this is expected and fine for this task; the app will not run correctly until Task 3 wires it in, but the two files this task touches must compile cleanly on their own.

- [ ] **Step 4: Commit**

```bash
git add src/features/account/context/AuthProvider.tsx src/features/account/hooks/use-auth.ts
git commit -m "refactor(account): move useAuth's state into a single AuthProvider context"
```

---

### Task 3: Wire the Provider into the app root + verify

**Files:**
- Modify: `src/providers/index.tsx`
- Modify: `src/app/layout.tsx`

**Interfaces:**
- Consumes: `AuthProvider` from Task 2 (`src/features/account/context/AuthProvider.tsx`), `getInitialIsLoggedIn` from Task 1 (`src/features/account/queries/get-auth-state.server.ts`).

- [ ] **Step 1: Thread `initialIsLoggedIn` through `Providers`**

`src/providers/index.tsx` is currently:

```tsx
'use client';

import { isServer, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/shared/components/ui/sonner';
import { NavigationEvents } from '@/shared/components/NavigationEvents';
import { NavigationOverlay } from '@/shared/components/NavigationOverlay';

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

export function Providers({ children }: { children: React.ReactNode }) {
  const queryClient = getQueryClient();
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <Toaster />
      <NavigationEvents />
      <NavigationOverlay />
    </QueryClientProvider>
  );
}
```

Replace it with:

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

(`AuthProvider` must be inside `QueryClientProvider` — its `logout` callback calls `useQueryClient()`.)

- [ ] **Step 2: Compute `initialIsLoggedIn` in the root layout**

`src/app/layout.tsx` is currently:

```tsx
import type { Metadata } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, getLocale } from 'next-intl/server';
import { Providers } from '@/providers';
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

  return (
    <html lang={locale} className="dark">
      <body>
        <NextIntlClientProvider messages={messages}>
          <Providers>{children}</Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
```

Replace it with:

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

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 4: Manual verification — logged-out visitor**

Start the dev stack (frontend `pnpm dev`, backend `docker compose up -d` in the sibling `live-show-orchestrator` repo). With no `access_token` cookie (fresh/incognito session):

```bash
curl -s http://localhost:3000/ | grep -o 'Em alta agora\|Recomendados para você'
```

Expected: `Em alta agora` (confirms `isLoggedIn` is `false` from the very first server-rendered HTML — no round-trip needed to know this).

- [ ] **Step 5: Manual verification — logged-in visitor, no flash**

Log in as any seeded user (e.g. `jazzfan@viewer.com`, used elsewhere this session) in a real browser with devtools open. Reload the home page and confirm:

1. The page's initial server-rendered HTML already shows `Recomendados para você` (not a placeholder that then flips) — check via "View Page Source" or:
   ```bash
   curl -s -b "access_token=<paste a real valid access token cookie value>" http://localhost:3000/ | grep -o 'Em alta agora\|Recomendados para você'
   ```
   Expected: `Recomendados para você` present immediately in the raw HTML.
2. In the browser (not curl, since this needs live interactivity), confirm the Navbar and any dashboard/live/replay guard pages still behave exactly as before — no new console errors, no infinite loops, login/logout still work end to end (log out via the Navbar, confirm redirect to `/login` and that the Navbar correctly shows the logged-out state after).

- [ ] **Step 6: Manual verification — no regression in a representative guard**

Navigate to a dashboard-guarded page while logged in. Confirm `DashboardGuard`'s loading spinner still appears for the same brief window as before (this is expected — Global Constraints explicitly do not change `isLoading`'s timing) and then correctly shows the dashboard content. This step exists to confirm the refactor didn't accidentally change `isLoading` semantics for consumers that depend on it.

- [ ] **Step 7: Commit**

```bash
git add src/providers/index.tsx src/app/layout.tsx
git commit -m "feat(account): wire AuthProvider into the app root with SSR-seeded login state"
```

---

## Post-implementation

`AuthUser` (display name, avatar, role) remains client-only, cached in
`localStorage`, populated one tick after mount — same timing as before this
plan. Fully closing that gap would require either embedding those fields
into the JWT payload (backend change, `TokenPayload` in
`live-show-orchestrator` currently only carries `sub`/`email`) or having the
root layout call the existing `GET /auth/me` endpoint
(`src/features/account/queries/get-me.ts`, currently only used by the
Settings page) server-side on every request — a real network call per page
load, just moved server-side. Neither was in scope for this plan (see the
brainstorm's explicit scope decision); worth a separate future feature if
the remaining one-tick user-details pop-in ever becomes visible enough to
matter.
