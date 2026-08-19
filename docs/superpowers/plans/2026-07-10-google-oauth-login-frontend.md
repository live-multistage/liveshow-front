# Google OAuth Login — Frontend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire the existing (dead) "Continue with Google" button to the backend's new OAuth flow — thread the intended post-login destination through as `state`, handle the backend's redirect-back with a code-exchange route, set cookies exactly like password login.

**Architecture:** The Google button's `href` gains `?state=<callbackUrl>`. The backend redirects back to a new `GET /api/auth/google/callback` Route Handler carrying `?code=...&state=...`; that route exchanges the code for real tokens via the backend's `POST /auth/google/exchange`, sets the same httpOnly cookies the password-login route already sets (via the shared `setAuthCookies` helper, `rememberMe: true` to match the backend's own default for Google logins), and redirects to the validated `state` or `/`.

**Tech Stack:** Next.js (Route Handlers), next-intl.

## Prerequisite

This plan depends on the companion backend plan
(`live-show-orchestrator`'s `docs/superpowers/plans/2026-07-10-google-oauth-login-backend.md`)
being fully merged, running, and configured with real Google Cloud OAuth
credentials (`GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET`) before end-to-end
testing is possible. The code in this plan can be written and typechecked
independently, but live verification requires the backend half working.

## Global Constraints

- `rememberMe: true` when setting cookies in the new callback route — this
  must match the backend's own default for Google-originated tokens
  (shipped in the backend plan's Task 3), or the cookie's `Max-Age` would
  disagree with the actual signed token's lifetime (the exact class of bug
  the "Remember Me" feature fixed for password login — don't reintroduce
  it here for OAuth).
- Reuse the existing `safeRedirect` open-redirect guard (currently private
  inside `use-login.mutation.ts`) rather than writing a second copy.
- New user-facing strings added to all three locale files.

---

### Task 1: Extract `safeRedirect`, add the OAuth callback route

**Files:**
- Create: `src/lib/auth/safe-redirect.ts`
- Modify: `src/features/account/mutations/use-login.mutation.ts`
- Create: `src/app/api/auth/google/callback/route.ts`

**Interfaces:**
- Produces: `safeRedirect(url: string | undefined): string` (shared). Consumed by Task 2 is not needed (only this task uses it, in two places).

- [ ] **Step 1: Extract `safeRedirect` to a shared file**

Create `src/lib/auth/safe-redirect.ts`:

```ts
export function safeRedirect(url: string | undefined): string {
  if (!url || !url.startsWith('/') || url.startsWith('//')) return '/';
  return url;
}
```

`src/features/account/mutations/use-login.mutation.ts` is currently:

```ts
'use client';

import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import type { AppError } from '@/lib/http/errors';
import { tokenStore } from '@/lib/auth/token-store';
import type { LoginRequest, AuthUser } from '../types/account.types';

interface LoginResult {
  accessToken: string;
  user: AuthUser;
}

function safeRedirect(url: string | undefined): string {
  if (!url || !url.startsWith('/') || url.startsWith('//')) return '/';
  return url;
}

export function useLoginMutation(callbackUrl?: string) {
  const router = useRouter();

  return useMutation<LoginResult, AppError, LoginRequest>({
    mutationFn: async (payload) => {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json() as LoginResult & { message?: string };
      if (!res.ok) {
        const err: AppError = { message: data.message ?? 'Login failed', status: res.status };
        throw err;
      }
      return data;
    },
    onSuccess: (data) => {
      tokenStore.set(data.accessToken);
      localStorage.setItem('user', JSON.stringify(data.user));
      router.push(safeRedirect(callbackUrl));
    },
  });
}
```

Replace it with (removes the local `safeRedirect` function, imports the shared one instead — nothing else changes):

```ts
'use client';

import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import type { AppError } from '@/lib/http/errors';
import { tokenStore } from '@/lib/auth/token-store';
import { safeRedirect } from '@/lib/auth/safe-redirect';
import type { LoginRequest, AuthUser } from '../types/account.types';

interface LoginResult {
  accessToken: string;
  user: AuthUser;
}

export function useLoginMutation(callbackUrl?: string) {
  const router = useRouter();

  return useMutation<LoginResult, AppError, LoginRequest>({
    mutationFn: async (payload) => {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json() as LoginResult & { message?: string };
      if (!res.ok) {
        const err: AppError = { message: data.message ?? 'Login failed', status: res.status };
        throw err;
      }
      return data;
    },
    onSuccess: (data) => {
      tokenStore.set(data.accessToken);
      localStorage.setItem('user', JSON.stringify(data.user));
      router.push(safeRedirect(callbackUrl));
    },
  });
}
```

- [ ] **Step 2: Create the OAuth callback route**

Create `src/app/api/auth/google/callback/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server';
import { API_URL, setAuthCookies } from '../../_cookies';
import { safeRedirect } from '@/lib/auth/safe-redirect';
import type { AuthResponse } from '@/features/account/types/account.types';

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code');
  const state = req.nextUrl.searchParams.get('state') ?? undefined;
  const destination = safeRedirect(state);

  if (!code) {
    return NextResponse.redirect(new URL('/login?error=google', req.url));
  }

  const upstream = await fetch(`${API_URL}/auth/google/exchange`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code }),
  });

  if (!upstream.ok) {
    return NextResponse.redirect(new URL('/login?error=google', req.url));
  }

  const data = await upstream.json() as AuthResponse;
  const response = NextResponse.redirect(new URL(destination, req.url));
  setAuthCookies(response, data.accessToken, data.refreshToken, true);
  return response;
}
```

`AuthResponse` (`{ accessToken: string; refreshToken: string; user: AuthUser }`)
already exists in `src/features/account/types/account.types.ts` — matches
the backend's `POST /auth/google/exchange` response shape exactly, no new
type needed.

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/lib/auth/safe-redirect.ts src/features/account/mutations/use-login.mutation.ts src/app/api/auth/google/callback/route.ts
git commit -m "feat(account): add Google OAuth callback route, extract shared safeRedirect"
```

---

### Task 2: Wire the Google button and surface exchange failures

**Files:**
- Modify: `src/features/account/components/LoginForm.tsx`
- Modify: `src/app/(auth)/login/page.tsx`
- Modify: `messages/pt.json`, `messages/en.json`, `messages/es.json`

**Interfaces:**
- Consumes: nothing new from Task 1 directly (this task only touches the button `href` and error display — the callback route from Task 1 is what the button eventually lands on, no import needed here).

- [ ] **Step 1: Add the `GOOGLE_FAILED` translation key**

In `messages/pt.json`, inside `auth.login.errors` (alongside the existing `INVALID_CREDENTIALS`/`USER_BLOCKED`/`TOO_MANY_ATTEMPTS` keys), add:

```json
"GOOGLE_FAILED": "Não foi possível continuar com o Google. Tente novamente."
```

In `messages/en.json`, inside its `auth.login.errors`, add:

```json
"GOOGLE_FAILED": "Couldn't continue with Google. Please try again."
```

In `messages/es.json`, inside its `auth.login.errors`, add:

```json
"GOOGLE_FAILED": "No se pudo continuar con Google. Inténtalo de nuevo."
```

- [ ] **Step 2: Wire the button and error display in `LoginForm`**

`src/features/account/components/LoginForm.tsx` currently has this props
interface and function signature:

```tsx
interface LoginFormProps {
  callbackUrl?: string;
}

export function LoginForm({ callbackUrl }: LoginFormProps) {
```

Replace with:

```tsx
interface LoginFormProps {
  callbackUrl?: string;
  oauthError?: boolean;
}

export function LoginForm({ callbackUrl, oauthError }: LoginFormProps) {
```

The existing error computation is:

```tsx
  const errorMessage = error ? (getErrorMessage(error.code ?? '') ?? error.message) : null;
```

Add a line right after it:

```tsx
  const errorMessage = error ? (getErrorMessage(error.code ?? '') ?? error.message) : null;
  const oauthErrorMessage = oauthError ? t('errors.GOOGLE_FAILED') : null;
```

The error banner is currently rendered as:

```tsx
            {errorMessage && <p className={styles.errorBanner}>{errorMessage}</p>}
```

Replace it with:

```tsx
            {(errorMessage || oauthErrorMessage) && (
              <p className={styles.errorBanner}>{errorMessage ?? oauthErrorMessage}</p>
            )}
```

The Google button is currently:

```tsx
            <Button variant="outline" className={styles.oauthBtn} asChild>
              <a href={`${config.apiUrl}/auth/google`}>
                <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                Google
              </a>
            </Button>
```

Replace the `<a>` tag's `href` and its trailing text node (leave the `svg` and the `Apple` button below it completely untouched):

```tsx
            <Button variant="outline" className={styles.oauthBtn} asChild>
              <a href={callbackUrl ? `${config.apiUrl}/auth/google?state=${encodeURIComponent(callbackUrl)}` : `${config.apiUrl}/auth/google`}>
                <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                {t('continueWithGoogle')}
              </a>
            </Button>
```

(`t('continueWithGoogle')` already exists in all 3 locale files — it was defined but never actually used by this button; this is a pre-existing, adjacent, zero-risk fix bundled in since this task already touches this exact line.)

- [ ] **Step 3: Thread the `error` search param through the login page**

`src/app/(auth)/login/page.tsx` is currently:

```tsx
import type { Metadata } from 'next';
import { LoginForm } from '@/features/account';

interface LoginPageProps {
  searchParams: Promise<{ redirect?: string }>;
}

export const metadata: Metadata = { title: 'Entrar' };

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { redirect } = await searchParams;
  return <LoginForm callbackUrl={redirect} />;
}
```

Replace it with:

```tsx
import type { Metadata } from 'next';
import { LoginForm } from '@/features/account';

interface LoginPageProps {
  searchParams: Promise<{ redirect?: string; error?: string }>;
}

export const metadata: Metadata = { title: 'Entrar' };

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { redirect, error } = await searchParams;
  return <LoginForm callbackUrl={redirect} oauthError={error === 'google'} />;
}
```

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Manual verification**

Requires the backend plan fully merged, running, and configured with real
Google Cloud OAuth credentials (see this plan's Prerequisite) — if not
available yet, skip this step and note it as pending.

1. On `/login`, confirm the Google button now reads "Continuar com Google"
   (translated), not the raw literal "Google".
2. Click it — confirm you land on Google's real consent screen.
3. Complete sign-in — confirm you land back on the app, fully logged in
   (Navbar shows your real name/avatar), on whatever page you started the
   login flow from (test both `/login` directly and `/login?redirect=/dashboard`
   — confirm the second case lands you on `/dashboard`, not `/`).
4. Inspect the `access_token`/`refresh_token` cookies — confirm both show
   a 30-day `Max-Age`.
5. Manually navigate to `http://localhost:3000/api/auth/google/callback`
   with no `code` param — confirm you're redirected to `/login` with the
   "Couldn't continue with Google" banner showing.

- [ ] **Step 6: Commit**

```bash
git add src/features/account/components/LoginForm.tsx src/app/\(auth\)/login/page.tsx messages/pt.json messages/en.json messages/es.json
git commit -m "feat(account): wire the Google login button and surface OAuth exchange failures"
```

---
