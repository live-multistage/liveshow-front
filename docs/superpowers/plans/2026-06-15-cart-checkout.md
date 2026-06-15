# Cart & Checkout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a single-item `/cart` (public) and `/checkout` (authenticated, review-only) flow, backed by a persisted zustand store, and re-point the event page's "Comprar Ingresso" button at it.

**Architecture:** Feature-based Next.js App Router. New `cart` feature owns a zustand `persist` store + the cart UI; the existing empty `checkout` feature gets the review UI. Thin `page.tsx` files render feature `*PageContent` components. `/checkout` is gated in `src/middleware.ts`. No payment / `POST /orders` yet — the final CTA is a disabled stub.

**Tech Stack:** Next.js 15 (App Router), React 18, TypeScript, zustand 5 (`persist`), SCSS modules, lucide-react icons.

**Note on testing:** This repo has **no test runner** (no jest/vitest, no test files). Do **not** add one. Each task is verified with `npx tsc --noEmit`, `npm run lint`, `npm run build`, and the manual checks at the end.

---

## File Structure

New:
- `src/features/cart/types/cart.types.ts` — `CartItem`.
- `src/features/cart/utils/capability-labels.ts` — `CAPABILITY_LABELS` map.
- `src/features/cart/stores/cart.store.ts` — `useCartStore` (zustand persist).
- `src/features/cart/components/CartPageContent.tsx` (+ `.module.scss`).
- `src/features/cart/index.ts` — barrel.
- `src/features/checkout/components/CheckoutPageContent.tsx` (+ `.module.scss`).
- `src/app/(public)/cart/page.tsx`.
- `src/app/(authenticated)/layout.tsx` — minimal (group has none).
- `src/app/(authenticated)/checkout/page.tsx`.

Modified:
- `src/features/checkout/index.ts` — export `CheckoutPageContent`.
- `src/middleware.ts` — gate `/checkout`.
- `src/features/events/components/public/TicketPanel.tsx` — route to cart.

Reference patterns (do not change):
- `src/features/events/queries/get-event.ts` — `'use client'` + hooks style.
- `src/app/(user)/layout.tsx` + `layout.module.scss` — group layout pattern.
- `src/features/events/utils/event-formatters.ts` — `formatPrice`.
- `src/app/(user)/tickets/page.tsx` — thin page pattern.

---

## Task 1: Cart types + capability labels

**Files:**
- Create: `src/features/cart/types/cart.types.ts`
- Create: `src/features/cart/utils/capability-labels.ts`

- [ ] **Step 1: Create the cart item type**

`src/features/cart/types/cart.types.ts`:
```typescript
import type { AccessCapability } from '@/features/events';

export interface CartItem {
  eventId: string;
  eventTitle: string;
  ticketProductId: string;
  ticketName: string;
  price: number;
  capabilities: AccessCapability[];
  camerasLimit: number | null;
}
```

- [ ] **Step 2: Create the capability label map**

`src/features/cart/utils/capability-labels.ts`:
```typescript
import type { AccessCapability } from '@/features/events';

export const CAPABILITY_LABELS: Record<AccessCapability, string> = {
  LIVE_VIEW: 'Ao vivo',
  REPLAY_VIEW: 'Reprise',
  CAMERA_VIEW: 'Multicâmera',
};
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: no new errors referencing these files.

- [ ] **Step 4: Commit**

```bash
git add src/features/cart/types/cart.types.ts src/features/cart/utils/capability-labels.ts
git commit -m "feat(cart): cart item type and capability labels"
```

---

## Task 2: Cart store (zustand persist)

**Files:**
- Create: `src/features/cart/stores/cart.store.ts`

- [ ] **Step 1: Implement the store**

`src/features/cart/stores/cart.store.ts`:
```typescript
'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CartItem } from '../types/cart.types';

interface CartState {
  item: CartItem | null;
  setItem: (item: CartItem) => void;
  clear: () => void;
}

// Single-item cart: setItem replaces any existing selection.
export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      item: null,
      setItem: (item) => set({ item }),
      clear: () => set({ item: null }),
    }),
    { name: 'ls-cart' },
  ),
);
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no new errors. (`zustand` and `zustand/middleware` are already in `package.json`.)

- [ ] **Step 3: Commit**

```bash
git add src/features/cart/stores/cart.store.ts
git commit -m "feat(cart): persisted single-item cart store"
```

---

## Task 3: Cart page content + barrel + route

**Files:**
- Create: `src/features/cart/components/CartPageContent.tsx`
- Create: `src/features/cart/components/CartPageContent.module.scss`
- Create: `src/features/cart/index.ts`
- Create: `src/app/(public)/cart/page.tsx`

- [ ] **Step 1: Create the styles**

`src/features/cart/components/CartPageContent.module.scss`:
```scss
@use '../../../styles/_variables' as *;

.wrap {
  max-width: 720px;
  margin: 0 auto;
  padding: 2rem 1rem;
}

.title {
  font-size: 1.5rem;
  font-weight: 700;
  margin-bottom: 1.5rem;
}

.empty {
  text-align: center;
  padding: 3rem 1rem;
  color: #666;
}

.emptyLink {
  display: inline-block;
  margin-top: 1rem;
  color: $primary;
  font-weight: 600;
}

.card {
  border: 1px solid #e5e5e5;
  border-radius: 12px;
  padding: 1.25rem;
}

.event {
  font-size: 1.1rem;
  font-weight: 700;
}

.ticket {
  color: #444;
  margin-top: 0.25rem;
}

.badges {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin: 0.75rem 0;
}

.badge {
  font-size: 0.75rem;
  background: #f1f1f1;
  border-radius: 999px;
  padding: 0.2rem 0.6rem;
}

.totalRow {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-top: 1px solid #eee;
  margin-top: 1rem;
  padding-top: 1rem;
}

.total {
  font-size: 1.25rem;
  font-weight: 700;
}

.actions {
  display: flex;
  gap: 0.75rem;
  margin-top: 1.25rem;
}

.primary {
  flex: 1;
  background: $primary;
  color: #fff;
  border: none;
  border-radius: 10px;
  padding: 0.85rem 1rem;
  font-weight: 600;
  text-align: center;
  cursor: pointer;
}

.remove {
  background: transparent;
  border: 1px solid #ddd;
  border-radius: 10px;
  padding: 0.85rem 1rem;
  cursor: pointer;
}
```

> If `$primary` is not defined in `styles/_variables`, grep that file and use the
> existing brand color variable instead (the same one `TicketPanel.module.scss`
> uses for its primary button).

- [ ] **Step 2: Create the component**

`src/features/cart/components/CartPageContent.tsx`:
```tsx
'use client';

import Link from 'next/link';
import { formatPrice } from '@/features/events';
import { useCartStore } from '../stores/cart.store';
import { CAPABILITY_LABELS } from '../utils/capability-labels';
import styles from './CartPageContent.module.scss';

export function CartPageContent() {
  const item = useCartStore((s) => s.item);
  const clear = useCartStore((s) => s.clear);

  if (!item) {
    return (
      <div className={styles.wrap}>
        <h1 className={styles.title}>Carrinho</h1>
        <div className={styles.empty}>
          <p>Seu carrinho está vazio.</p>
          <Link href="/events" className={styles.emptyLink}>
            Explorar eventos →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.wrap}>
      <h1 className={styles.title}>Carrinho</h1>
      <div className={styles.card}>
        <p className={styles.event}>{item.eventTitle}</p>
        <p className={styles.ticket}>{item.ticketName}</p>
        <div className={styles.badges}>
          {item.capabilities.map((c) => (
            <span key={c} className={styles.badge}>{CAPABILITY_LABELS[c]}</span>
          ))}
          {item.camerasLimit != null && (
            <span className={styles.badge}>{item.camerasLimit} câmeras</span>
          )}
        </div>
        <div className={styles.totalRow}>
          <span>Total</span>
          <span className={styles.total}>{formatPrice(item.price)}</span>
        </div>
        <div className={styles.actions}>
          <button onClick={clear} className={styles.remove}>Remover</button>
          <Link href="/checkout" className={styles.primary}>Ir para o checkout</Link>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create the barrel**

`src/features/cart/index.ts`:
```typescript
export { useCartStore } from './stores/cart.store';
export { CartPageContent } from './components/CartPageContent';
export { CAPABILITY_LABELS } from './utils/capability-labels';
export type { CartItem } from './types/cart.types';
```

- [ ] **Step 4: Create the route page**

`src/app/(public)/cart/page.tsx`:
```tsx
import type { Metadata } from 'next';
import { CartPageContent } from '@/features/cart';

export const metadata: Metadata = { title: 'Carrinho' };

export default function CartPage() {
  return <CartPageContent />;
}
```

- [ ] **Step 5: Typecheck + lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: clean (no errors in new files).

- [ ] **Step 6: Commit**

```bash
git add src/features/cart/components src/features/cart/index.ts "src/app/(public)/cart/page.tsx"
git commit -m "feat(cart): /cart public page with item review and empty state"
```

---

## Task 4: Gate /checkout in middleware

**Files:**
- Modify: `src/middleware.ts`

- [ ] **Step 1: Add `/checkout` to the protected set and matcher**

In `src/middleware.ts`, change the `PROTECTED_PATHS` constant and the `matcher`:
```typescript
const PROTECTED_PATHS = ['/tickets', '/account', '/purchases', '/settings', '/checkout'];
```
```typescript
export const config = {
  matcher: ['/tickets/:path*', '/account/:path*', '/purchases/:path*', '/settings/:path*', '/dashboard/:path*', '/checkout/:path*'],
};
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add src/middleware.ts
git commit -m "feat(checkout): require auth for /checkout"
```

---

## Task 5: Checkout review page + layout + route

**Files:**
- Create: `src/features/checkout/components/CheckoutPageContent.tsx`
- Create: `src/features/checkout/components/CheckoutPageContent.module.scss`
- Modify: `src/features/checkout/index.ts`
- Create: `src/app/(authenticated)/layout.tsx`
- Create: `src/app/(authenticated)/checkout/page.tsx`

- [ ] **Step 1: Create the styles**

`src/features/checkout/components/CheckoutPageContent.module.scss`:
```scss
@use '../../../styles/_variables' as *;

.wrap {
  max-width: 720px;
  margin: 0 auto;
  padding: 2rem 1rem;
}

.title {
  font-size: 1.5rem;
  font-weight: 700;
  margin-bottom: 1.5rem;
}

.section {
  border: 1px solid #e5e5e5;
  border-radius: 12px;
  padding: 1.25rem;
  margin-bottom: 1.25rem;
}

.sectionTitle {
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #888;
  margin-bottom: 0.75rem;
}

.event {
  font-size: 1.1rem;
  font-weight: 700;
}

.ticket {
  color: #444;
  margin-top: 0.25rem;
}

.badges {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin: 0.75rem 0;
}

.badge {
  font-size: 0.75rem;
  background: #f1f1f1;
  border-radius: 999px;
  padding: 0.2rem 0.6rem;
}

.row {
  display: flex;
  justify-content: space-between;
  padding: 0.35rem 0;
}

.totalRow {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-top: 1px solid #eee;
  margin-top: 0.75rem;
  padding-top: 0.75rem;
}

.total {
  font-size: 1.25rem;
  font-weight: 700;
}

.cta {
  width: 100%;
  background: #cfcfcf;
  color: #666;
  border: none;
  border-radius: 10px;
  padding: 0.95rem 1rem;
  font-weight: 600;
  cursor: not-allowed;
}

.note {
  text-align: center;
  color: #999;
  font-size: 0.85rem;
  margin-top: 0.75rem;
}
```

- [ ] **Step 2: Create the component**

`src/features/checkout/components/CheckoutPageContent.tsx`:
```tsx
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { formatPrice } from '@/features/events';
import { useCartStore, CAPABILITY_LABELS } from '@/features/cart';
import { useAuth } from '@/features/account';
import styles from './CheckoutPageContent.module.scss';

export function CheckoutPageContent() {
  const router = useRouter();
  const item = useCartStore((s) => s.item);
  const { user } = useAuth();

  useEffect(() => {
    if (!item) router.replace('/cart');
  }, [item, router]);

  if (!item) return null;

  return (
    <div className={styles.wrap}>
      <h1 className={styles.title}>Checkout</h1>

      <div className={styles.section}>
        <p className={styles.sectionTitle}>Resumo do pedido</p>
        <p className={styles.event}>{item.eventTitle}</p>
        <p className={styles.ticket}>{item.ticketName}</p>
        <div className={styles.badges}>
          {item.capabilities.map((c) => (
            <span key={c} className={styles.badge}>{CAPABILITY_LABELS[c]}</span>
          ))}
          {item.camerasLimit != null && (
            <span className={styles.badge}>{item.camerasLimit} câmeras</span>
          )}
        </div>
        <div className={styles.totalRow}>
          <span>Total</span>
          <span className={styles.total}>{formatPrice(item.price)}</span>
        </div>
      </div>

      <div className={styles.section}>
        <p className={styles.sectionTitle}>Comprador</p>
        <div className={styles.row}>
          <span>Nome</span>
          <span>{user?.displayName ?? '—'}</span>
        </div>
        <div className={styles.row}>
          <span>E-mail</span>
          <span>{user?.email ?? '—'}</span>
        </div>
      </div>

      <button className={styles.cta} disabled>Pagamento em breve</button>
      <p className={styles.note}>O pagamento será habilitado em breve.</p>
    </div>
  );
}
```

- [ ] **Step 3: Update the checkout barrel**

Replace the contents of `src/features/checkout/index.ts` with:
```typescript
export { CheckoutPageContent } from './components/CheckoutPageContent';
```

- [ ] **Step 4: Create the `(authenticated)` group layout**

The `(authenticated)` group has no `layout.tsx`. Create
`src/app/(authenticated)/layout.tsx` mirroring `(user)/layout.tsx`:
```tsx
import { Navbar } from '@/shared/components/Navbar';

export default function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Navbar />
      {children}
    </>
  );
}
```

> Confirm the import path `@/shared/components/Navbar` matches the one used in
> `src/app/(user)/layout.tsx`; copy it verbatim from there.

- [ ] **Step 5: Create the route page**

`src/app/(authenticated)/checkout/page.tsx`:
```tsx
import type { Metadata } from 'next';
import { CheckoutPageContent } from '@/features/checkout';

export const metadata: Metadata = { title: 'Checkout' };

export default function CheckoutPage() {
  return <CheckoutPageContent />;
}
```

- [ ] **Step 6: Typecheck + lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: clean.

- [ ] **Step 7: Commit**

```bash
git add src/features/checkout "src/app/(authenticated)/layout.tsx" "src/app/(authenticated)/checkout/page.tsx"
git commit -m "feat(checkout): /checkout review page (auth-gated, review-only)"
```

---

## Task 6: Re-point TicketPanel at the cart flow

**Files:**
- Modify: `src/features/events/components/public/TicketPanel.tsx`

Context: today `TicketPanel` has a 3-step inline flow (`'select' | 'checkout' |
'success'`) with a mock card form and `handlePurchase`. Remove the `checkout`
and `success` steps and route the "Comprar Ingresso" button to the cart instead.

- [ ] **Step 1: Remove inline purchase state**

In `TicketPanel.tsx`, delete these now-unused pieces:
- the `PurchaseStep` type and `const [step, setStep] = useState<PurchaseStep>('select')`,
- `const [card, setCard] = useState(...)` and `const [processing, setProcessing] = useState(false)`,
- the `handlePurchase` function,
- the entire `if (step === 'success') { ... }` block,
- the entire `if (step === 'checkout') { ... }` block.

Remove now-unused imports from the `lucide-react` line (`X`, `CreditCard`,
`Check`) and keep the ones still used (`Tv2`, `RotateCcw`, `Ticket`). Keep
`formatPrice`.

- [ ] **Step 2: Wire the store + cart navigation**

Add near the other imports:
```tsx
import { useCartStore } from '@/features/cart';
```
Inside the component, add:
```tsx
const setItem = useCartStore((s) => s.setItem);
```
Replace the final "Comprar Ingresso" button's handler so it adds to cart and
navigates:
```tsx
<button
  onClick={() => {
    if (!ticket) return;
    setItem({
      eventId: event.id,
      eventTitle: event.title,
      ticketProductId: ticket.id,
      ticketName: ticket.name,
      price: ticket.price,
      capabilities: ticket.capabilities,
      camerasLimit: ticket.camerasLimit,
    });
    router.push('/cart');
  }}
  className={styles.btnPrimary}
>
  <Ticket size={16} /> Comprar Ingresso
</button>
```

The retained `return` is the previous `select`-step JSX (ticket options, total,
this button, and the free-demo link). The `isLive`/`isFinished` consts stay only
if still referenced by the free-demo link; otherwise remove the unused one to
keep lint clean.

- [ ] **Step 3: Typecheck + lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: clean — in particular no "unused variable" errors for removed icons /
state.

- [ ] **Step 4: Commit**

```bash
git add src/features/events/components/public/TicketPanel.tsx
git commit -m "feat(events): TicketPanel adds ticket to cart and routes to /cart"
```

---

## Final Verification

- [ ] `npx tsc --noEmit` → clean.
- [ ] `npm run lint` → clean.
- [ ] `npm run build` → succeeds.
- [ ] Manual (run `npm run dev`):
  - Open an event with tickets → pick a ticket → "Comprar Ingresso" → lands on
    `/cart` showing the event, ticket, capability badges, and total.
  - "Remover" empties the cart (empty state with link to `/events`).
  - Re-add, refresh `/cart` → item persists (localStorage `ls-cart`).
  - Logged out: click "Ir para o checkout" → redirected to `/login`.
  - Logged in: `/checkout` shows order summary + buyer (name/email) and a
    disabled "Pagamento em breve" CTA.
  - Visit `/checkout` with an empty cart → redirected to `/cart`.

---

## Spec Coverage Check

| Spec item | Task |
|-----------|------|
| `CartItem` type | Task 1 |
| Capability labels for badges | Task 1 |
| zustand persist single-item store | Task 2 |
| `/cart` public page (empty + filled) | Task 3 |
| `/checkout` auth gating | Task 4 |
| `/checkout` review (summary + buyer + stub CTA) | Task 5 |
| Empty-cart redirect on `/checkout` | Task 5 |
| `(authenticated)` layout (was missing) | Task 5 |
| TicketPanel re-point to cart, drop inline mock | Task 6 |
| No test runner; verify via tsc/lint/build/manual | Final Verification |
