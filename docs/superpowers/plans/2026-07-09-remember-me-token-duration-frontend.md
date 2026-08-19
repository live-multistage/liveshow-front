# Remember Me / Token Duration — Frontend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stop discarding the login form's `rememberMe` checkbox value, send it to the backend, and make both auth cookies' `maxAge` mirror the actual signed token duration (7d/30d) — including on every subsequent silent refresh, not just at login.

**Architecture:** `rememberMe` flows: checkbox → `LoginForm` → `useLoginMutation` → `/api/auth/login` route → backend (which now, per the companion backend plan, signs the refresh JWT with a matching expiry and embeds `rememberMe` as a claim). The two other routes that re-set cookies after minting a fresh token pair (`/api/auth/refresh`, `/api/auth/session`) don't originate the choice — they decode it back out of the freshly-issued refresh token's own claim, so the cookie's `maxAge` always matches what the backend actually signed, on every refresh cycle, not just the first login.

**Tech Stack:** Next.js (Route Handlers), react-hook-form, Zod.

## Prerequisite

This plan depends on the companion backend plan
(`live-show-orchestrator`'s `docs/superpowers/plans/2026-07-09-remember-me-token-duration-backend.md`)
being fully merged and the backend running with those changes —
specifically that `LoginDto` accepts `rememberMe`. The backend's global
`ValidationPipe` has `forbidNonWhitelisted: true`; sending an unrecognized
`rememberMe` field before the backend supports it gets the login request
rejected with a 400. Do not start this plan until the backend plan is
done.

## Global Constraints

- `rememberMe` is optional everywhere — omitting it preserves today's
  7-day behavior exactly.
- Both `access_token` and `refresh_token` cookies get the **same**
  `maxAge` (derived from `rememberMe`), replacing the previous fixed,
  mismatched pair (7d / 30d) with a value that always matches the actual
  token lifetime.
- No new dependencies.

---

### Task 1: Type, JWT claim decoder, cookie helper

**Files:**
- Modify: `src/features/account/types/account.types.ts`
- Modify: `src/lib/auth/jwt.server.ts`
- Modify: `src/app/api/auth/_cookies.ts`

**Interfaces:**
- Produces: `LoginRequest.rememberMe?: boolean`, `getTokenRememberMe(token: string): boolean` (from `jwt.server.ts`), `setAuthCookies(response, accessToken, refreshToken, rememberMe?)` (new 4th param). Consumed by Task 2's three route handlers and `LoginForm.tsx`.

- [ ] **Step 1: Add `rememberMe` to `LoginRequest`**

In `src/features/account/types/account.types.ts`, `LoginRequest` is currently:

```ts
export interface LoginRequest {
  email: string;
  password: string;
}
```

Replace it with:

```ts
export interface LoginRequest {
  email: string;
  password: string;
  rememberMe?: boolean;
}
```

- [ ] **Step 2: Add a `rememberMe` claim decoder**

`src/lib/auth/jwt.server.ts` is currently:

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

Add a new exported function after `isTokenExpired`:

```ts
export function getTokenRememberMe(token: string): boolean {
  try {
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
    return payload.rememberMe === true;
  } catch {
    return false;
  }
}
```

This reads the `rememberMe` claim the backend now signs into the refresh
JWT (see the companion backend plan's Task 1) — no signature verification
needed here, same trust level as `isTokenExpired`'s existing `exp` read:
this is a server-only route handler reading a claim from a cookie value
it already trusts enough to forward to the backend for the actual
refresh call.

- [ ] **Step 3: Make `setAuthCookies` derive `maxAge` from `rememberMe`**

`src/app/api/auth/_cookies.ts` is currently:

```ts
import type { NextResponse } from 'next/server';

const API_URL = (
  process.env.API_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  'http://localhost:8080/api'
).replace(/\/$/, '');

export { API_URL };

const secure = process.env.NODE_ENV === 'production';

export function setAuthCookies(
  response: NextResponse,
  accessToken: string,
  refreshToken: string,
) {
  response.cookies.set('access_token', accessToken, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    secure,
    maxAge: 60 * 60 * 24 * 7,
  });
  response.cookies.set('refresh_token', refreshToken, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    secure,
    maxAge: 60 * 60 * 24 * 30,
  });
}

export function clearAuthCookies(response: NextResponse) {
  response.cookies.set('access_token', '', { httpOnly: true, maxAge: 0, path: '/' });
  response.cookies.set('refresh_token', '', { httpOnly: true, maxAge: 0, path: '/' });
}
```

Replace the `setAuthCookies` function with:

```ts
export function setAuthCookies(
  response: NextResponse,
  accessToken: string,
  refreshToken: string,
  rememberMe?: boolean,
) {
  const maxAge = rememberMe ? 60 * 60 * 24 * 30 : 60 * 60 * 24 * 7;
  response.cookies.set('access_token', accessToken, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    secure,
    maxAge,
  });
  response.cookies.set('refresh_token', refreshToken, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    secure,
    maxAge,
  });
}
```

(Leave `API_URL`, `secure`, and `clearAuthCookies` untouched.)

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: no new errors — `setAuthCookies`'s new 4th parameter is optional, so its three existing call sites (`login/route.ts`, `refresh/route.ts`, `session/route.ts`) still compile without changes at this point; they're updated in Task 2 to actually pass the value through.

- [ ] **Step 5: Commit**

```bash
git add src/features/account/types/account.types.ts src/lib/auth/jwt.server.ts src/app/api/auth/_cookies.ts
git commit -m "feat(account): add rememberMe to LoginRequest and cookie-duration helpers"
```

---

### Task 2: Wire `rememberMe` through the login form and all three cookie-setting routes

**Files:**
- Modify: `src/features/account/components/LoginForm.tsx`
- Modify: `src/app/api/auth/login/route.ts`
- Modify: `src/app/api/auth/refresh/route.ts`
- Modify: `src/app/api/auth/session/route.ts`

**Interfaces:**
- Consumes: `getTokenRememberMe`, updated `setAuthCookies` signature (Task 1).

- [ ] **Step 1: Stop discarding `rememberMe` in `LoginForm`**

In `src/features/account/components/LoginForm.tsx`, the submit handler is currently:

```tsx
  function onSubmit({ rememberMe: _ignored, ...payload }: LoginFormValues) {
    mutate({ email: payload.email, password: payload.password });
  }
```

Replace it with:

```tsx
  function onSubmit(payload: LoginFormValues) {
    mutate(payload);
  }
```

(`LoginFormValues` — `{ email, password, rememberMe }` — now matches `LoginRequest`'s shape exactly after Task 1, so the whole object can be passed straight through.)

- [ ] **Step 2: Pass `rememberMe` through in the login route**

`src/app/api/auth/login/route.ts` is currently:

```ts
import { NextRequest, NextResponse } from 'next/server';
import { API_URL, setAuthCookies } from '../_cookies';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const upstream = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const data = await upstream.json();
  if (!upstream.ok) return NextResponse.json(data, { status: upstream.status });

  const response = NextResponse.json({ accessToken: data.accessToken, user: data.user });
  setAuthCookies(response, data.accessToken, data.refreshToken);
  return response;
}
```

Replace the last line before `return response;` with a call that passes `body.rememberMe`:

```ts
  const response = NextResponse.json({ accessToken: data.accessToken, user: data.user });
  setAuthCookies(response, data.accessToken, data.refreshToken, body.rememberMe);
  return response;
```

(Only that one line changes — everything else in the file stays the same.)

- [ ] **Step 3: Decode `rememberMe` back out on every refresh**

`src/app/api/auth/refresh/route.ts` is currently:

```ts
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { API_URL, setAuthCookies, clearAuthCookies } from '../_cookies';

export async function POST() {
  const cookieStore = await cookies();
  const refreshToken = cookieStore.get('refresh_token')?.value;

  if (!refreshToken) {
    return NextResponse.json({ error: 'No refresh token' }, { status: 401 });
  }

  const upstream = await fetch(`${API_URL}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });

  if (!upstream.ok) {
    const response = NextResponse.json({ error: 'Refresh failed' }, { status: 401 });
    clearAuthCookies(response);
    return response;
  }

  const data = await upstream.json();
  const response = NextResponse.json({ accessToken: data.accessToken });
  setAuthCookies(response, data.accessToken, data.refreshToken);
  return response;
}
```

Replace it with:

```ts
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { API_URL, setAuthCookies, clearAuthCookies } from '../_cookies';
import { getTokenRememberMe } from '@/lib/auth/jwt.server';

export async function POST() {
  const cookieStore = await cookies();
  const refreshToken = cookieStore.get('refresh_token')?.value;

  if (!refreshToken) {
    return NextResponse.json({ error: 'No refresh token' }, { status: 401 });
  }

  const upstream = await fetch(`${API_URL}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });

  if (!upstream.ok) {
    const response = NextResponse.json({ error: 'Refresh failed' }, { status: 401 });
    clearAuthCookies(response);
    return response;
  }

  const data = await upstream.json();
  const response = NextResponse.json({ accessToken: data.accessToken });
  setAuthCookies(response, data.accessToken, data.refreshToken, getTokenRememberMe(data.refreshToken));
  return response;
}
```

Note: `rememberMe` is read from the **new** `data.refreshToken` (the one
just minted by this refresh call), not the old one — this reflects
whatever the backend actually just signed, which is what should govern
the new cookie's lifetime.

- [ ] **Step 4: Same fix in the session route**

`src/app/api/auth/session/route.ts` is currently:

```ts
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { API_URL, setAuthCookies, clearAuthCookies } from '../_cookies';
import { isTokenExpired } from '@/lib/auth/jwt.server';

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

Replace the import and the final `setAuthCookies` call:

```ts
import { isTokenExpired, getTokenRememberMe } from '@/lib/auth/jwt.server';
```

```ts
  const data = await upstream.json() as { accessToken: string; refreshToken: string };
  const response = NextResponse.json({ accessToken: data.accessToken, authenticated: true });
  setAuthCookies(response, data.accessToken, data.refreshToken, getTokenRememberMe(data.refreshToken));
  return response;
```

(Everything else in the file — the early-return branches, `clearAuthCookies` calls — stays unchanged.)

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Manual verification**

Requires the backend plan already merged and running (see this plan's Prerequisite).

1. Log in with "Lembrar-me" checked. In devtools' Network tab, inspect the `/api/auth/login` response's `Set-Cookie` headers — confirm both `access_token` and `refresh_token` show `Max-Age=2592000` (30 days).
2. Log out, log in again with "Lembrar-me" unchecked. Confirm both cookies show `Max-Age=604800` (7 days).
3. With a remembered session, manually trigger a refresh (e.g. wait for the access token to expire, or call `/api/auth/session`) and confirm the re-set cookies still show the 30-day `Max-Age` — not reset to 7 days.

- [ ] **Step 7: Commit**

```bash
git add src/features/account/components/LoginForm.tsx src/app/api/auth/login/route.ts src/app/api/auth/refresh/route.ts src/app/api/auth/session/route.ts
git commit -m "feat(account): send rememberMe on login and preserve it across refreshes"
```

---
