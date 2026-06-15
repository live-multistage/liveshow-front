# Cart & Checkout — Front-End Design

Date: 2026-06-15
Repo: `live-show-react` (Next.js App Router)
Status: Approved (brainstorming) → ready for implementation plan

## Problem

There is no dedicated cart or checkout flow. Today the public event detail page
(`TicketPanel`) does the whole purchase inline: select a ticket → a mock credit
card form → a fake success screen, with no backend call. We want a proper
**single-item cart** page and a **checkout review** page as their own routes.

Backend constraints (live-show-orchestrator):
- `GET /shows/:showId/tickets` → ticket products (`id, showId, name,
  description, price, capabilities, camerasLimit, immutable`).
- `POST /orders` `{ ticketProductId }` purchases **one** product, **no
  quantity**, **no payment gateway** — the order is created immediately.
- `GET /orders/mine` → user orders.

Therefore the cart is a **front-end-only** concept, and the purchase itself
(gateway + `POST /orders`) is **out of scope for now** — this work stops at the
checkout **review** step.

## Scope

In scope:
- Single-item cart (one ticket product for one event).
- `/cart` page (public) — review the selected item, go to checkout.
- `/checkout` page (authenticated) — order review only, with a stubbed final CTA.
- Persist the cart across refresh (localStorage).
- Re-point the event page's "Comprar Ingresso" button at the new flow.

Out of scope (later):
- Payment gateway and the actual `POST /orders` call.
- Multi-item cart, quantities, coupons, taxes.
- Order confirmation / success screen tied to a real order.

## Decisions (from brainstorming)

- **Cart semantics:** single-item.
- **Payment:** none yet — implement up to the review step; the final CTA is a
  disabled stub ("Pagamento em breve"). No `POST /orders` call.
- **Routing/auth:** `/cart` public; `/checkout` authenticated.
- **State approach (A):** a zustand `persist` store in a new `cart` feature.

## Architecture

Feature-based, matching the repo:
- `page.tsx` files stay thin and render a feature `*PageContent` component.
- New `src/features/cart/` owns cart state + the cart UI.
- The existing empty `src/features/checkout/` gets the checkout review UI.
- Auth gating is done in `src/middleware.ts` (cookie `access_token` + path
  matcher), not in layouts.

### Data flow

```
Event page (TicketPanel)
   select ticket → useCartStore.setItem(CartItem)
   router.push('/cart')
        │
        ▼
/cart (public)  ── CartPageContent
   reads useCartStore.item
   empty → empty state (link to /events)
   filled → summary + "Ir para o checkout" → /checkout
        │
        ▼
/checkout (authenticated; middleware redirects to /login if no token)
   CheckoutPageContent
   reads useCartStore.item; if null → redirect('/cart')
   reads useAuth().user for buyer info
   renders review (event, ticket, capabilities, camerasLimit, total, buyer)
   final CTA: disabled "Pagamento em breve" (no order created)
```

## Components & Files

### New feature: `src/features/cart/`

`types/cart.types.ts`
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

`stores/cart.store.ts` — zustand + `persist`
```typescript
interface CartState {
  item: CartItem | null;
  setItem: (item: CartItem) => void;
  clear: () => void;
}
```
- `persist` with name `ls-cart`.
- Single-item: `setItem` replaces any existing item.

`components/CartPageContent.tsx` (+ `.module.scss`)
- `'use client'`. Reads `useCartStore`.
- Empty: message + link to `/events`.
- Filled: card with event title, ticket name, capabilities badges,
  `camerasLimit` (if set), price/total (via existing `formatPrice`), a remove
  button (`clear()`), and a primary "Ir para o checkout" linking to `/checkout`.

`index.ts` — barrel exporting `useCartStore`, `CartPageContent`, `CartItem`.

### Feature: `src/features/checkout/`

`components/CheckoutPageContent.tsx` (+ `.module.scss`)
- `'use client'`. Reads `useCartStore.item` and `useAuth()`.
- If `item` is null → `router.replace('/cart')`.
- Renders review: order summary (event, ticket, capabilities, camerasLimit,
  total) and buyer block (`user.displayName`, `user.email`).
- Final CTA disabled with label "Pagamento em breve" and a note that purchase is
  coming soon. No network call.

`index.ts` — barrel exporting `CheckoutPageContent`.

### Routes

`src/app/(public)/cart/page.tsx`
```tsx
import type { Metadata } from 'next';
import { CartPageContent } from '@/features/cart';
export const metadata: Metadata = { title: 'Carrinho' };
export default function CartPage() { return <CartPageContent />; }
```

`src/app/(authenticated)/checkout/page.tsx`
```tsx
import type { Metadata } from 'next';
import { CheckoutPageContent } from '@/features/checkout';
export const metadata: Metadata = { title: 'Checkout' };
export default function CheckoutPage() { return <CheckoutPageContent />; }
```

> `(authenticated)` is chosen over `(user)` so checkout is gated but not part of
> the user-account section. If `(authenticated)` lacks a `layout.tsx`, add a
> minimal one mirroring `(user)/layout.tsx` (Navbar + children).

### Auth gating — `src/middleware.ts`

Add `/checkout` to the protected set and matcher:
```typescript
const PROTECTED_PATHS = ['/tickets', '/account', '/purchases', '/settings', '/checkout'];
// matcher: add '/checkout/:path*'
```
`/cart` stays public (not added).

### Entry-point change — `TicketPanel`

`src/features/events/components/public/TicketPanel.tsx`:
- Remove the inline `checkout` and `success` steps, the `card`/`processing`
  state, and `handlePurchase`. Keep the `select` UI (ticket options, total,
  free-demo link, cancelled / no-tickets states).
- "Comprar Ingresso" now:
  ```ts
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
  ```

## Error / Edge Handling

| Condition | Behavior |
|-----------|----------|
| `/cart` with empty cart | Empty state + link to `/events` |
| `/checkout` with empty cart | `router.replace('/cart')` |
| `/checkout` without token | middleware redirects to `/login` |
| Event cancelled / no tickets | Handled at source in `TicketPanel` (unchanged) |
| Corrupted persisted cart | zustand `persist` ignores bad JSON; treat as empty |

## Testing / Verification

The repo has **no test runner** (no jest/vitest, no test files). Do not add one.
Verify via:
- `npx tsc --noEmit` (typecheck) clean.
- `npm run lint` clean.
- `npm run build` succeeds.
- Manual: select ticket on an event → `/cart` shows it → "Ir para o checkout"
  → redirected to `/login` when logged out; when logged in, review renders with
  buyer info and the disabled CTA; removing the item empties the cart; refresh
  keeps the item (persist).

## Affected Files

New:
- `src/features/cart/types/cart.types.ts`
- `src/features/cart/stores/cart.store.ts`
- `src/features/cart/components/CartPageContent.tsx` (+ `.module.scss`)
- `src/features/cart/index.ts`
- `src/features/checkout/components/CheckoutPageContent.tsx` (+ `.module.scss`)
- `src/features/checkout/index.ts`
- `src/app/(public)/cart/page.tsx`
- `src/app/(authenticated)/checkout/page.tsx`
- `src/app/(authenticated)/layout.tsx` (only if missing)

Modified:
- `src/middleware.ts` (gate `/checkout`)
- `src/features/events/components/public/TicketPanel.tsx` (route to cart)
- `src/features/checkout/index.ts` (was effectively empty)
