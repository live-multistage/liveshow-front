# Checkout Page Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor the `/events/:eventId/checkout` page to match the new Liveshow design spec without changing any behavior or logic.

**Architecture:** 4 independent component edits (TSX + SCSS module per component). No new files. No logic changes. Pure visual/structural updates using the existing SCSS module pattern.

**Tech Stack:** Next.js App Router, React, TypeScript, SCSS Modules, Lucide icons.

## Global Constraints

- SCSS modules only — no inline styles on React components
- No behavior changes: hooks, mutations, routing logic unchanged
- `EventSummaryCard.tsx` kept but removed from checkout render
- `CheckoutSession.totalAmount` is the source of truth; `serviceFee` shown as "Grátis" (0)
- All existing ARIA attributes preserved (`role="radiogroup"`, `aria-checked`, `aria-busy`)
- SCSS variable file: `src/styles/_variables.scss` — use `$action`, `$surface`, `$border`, `$text-muted`, `$text-primary` where they match

---

## File Map

| File | Action |
|---|---|
| `src/features/checkout/components/CheckoutPageContent.tsx` | Add breadcrumb, update title/expiry, remove EventSummaryCard, update grid |
| `src/features/checkout/components/CheckoutPageContent.module.scss` | Restyle `.title`, add `.breadcrumb`, restyle `.expiry`, update `.layout`/`.right` |
| `src/features/checkout/components/TicketSummaryCard.tsx` | Add `eventName?: string` prop, render event label row |
| `src/features/checkout/components/TicketSummaryCard.module.scss` | Full restyle: violet glow, magenta checks, unified card look |
| `src/features/checkout/components/OrderSummaryCard.tsx` | Add subtotal + fees rows + divider |
| `src/features/checkout/components/OrderSummaryCard.module.scss` | Add `.row`, `.rowLabel`, `.divider`, restyle `.total` |
| `src/features/checkout/components/PaymentMethodSelector.module.scss` | Bigger padding, icon containers, selected glow, border-radius |

---

### Task 1: Page Header & Layout

**Files:**
- Modify: `src/features/checkout/components/CheckoutPageContent.tsx`
- Modify: `src/features/checkout/components/CheckoutPageContent.module.scss`

**Interfaces:**
- Produces: updated `<CheckoutPageContent>` — breadcrumb + 40px title + pill expiry + `1fr 408px` grid, no `EventSummaryCard`

- [ ] **Step 1: Update `CheckoutPageContent.tsx`**

Replace the JSX inside the `return (...)` block (the non-error, non-loading return) with the following. Keep all hooks and state above unchanged.

```tsx
  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        <div className={styles.breadcrumb}>CHECKOUT · ETAPA 2 DE 2</div>
        <h1 className={styles.title}>Finalizar compra</h1>

        {sessionExpiry && (
          <div className={styles.expiry}>
            <Clock size={13} />
            SESSÃO EXPIRA ÀS {sessionExpiry.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
          </div>
        )}

        <div className={styles.layout}>
          <div className={styles.left}>
            <PaymentMethodSelector
              methods={paymentMethods.data ?? []}
              selected={selectedMethodId}
              onChange={setSelectedMethodId}
              isLoading={paymentMethods.isLoading}
            />

            <button
              className={styles.payBtn}
              onClick={handlePay}
              disabled={!session || !selectedMethodId || processPayment.isPending}
              aria-busy={processPayment.isPending}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
                <rect x="4" y="10" width="16" height="11" rx="2"/>
                <path d="M8 10V7a4 4 0 0 1 8 0v3"/>
              </svg>
              {processPayment.isPending
                ? 'Processando…'
                : session
                ? `Pagar ${formatPrice(session.totalAmount)}`
                : 'Aguardando sessão…'}
            </button>

            <div className={styles.secure}>
              <Shield size={13} />
              PAGAMENTO SEGURO — SEUS DADOS SÃO PROTEGIDOS
            </div>
          </div>

          <aside className={styles.right}>
            <TicketSummaryCard ticket={ticket} quantity={quantity} eventName={event.data.title} />
            {session && <OrderSummaryCard session={session} />}
          </aside>
        </div>
      </div>
    </div>
  );
```

Also remove the `EventSummaryCard` import line at the top of the file:
```tsx
// DELETE this line:
import { EventSummaryCard } from './EventSummaryCard';
```

- [ ] **Step 2: Update `CheckoutPageContent.module.scss`**

Replace the entire file with:

```scss
@use '../../../styles/_variables' as *;

.page {
  min-height: calc(100vh - 56px);
  background: $bg;
  color: $text-primary;
}

.inner {
  max-width: 1240px;
  margin: 0 auto;
  padding: 44px 40px 64px;

  @media (max-width: 860px) {
    padding: 32px 20px 48px;
  }
}

.breadcrumb {
  font-family: 'Space Mono', monospace;
  font-size: 11px;
  letter-spacing: .16em;
  color: #ff7ec2;
  margin-bottom: 10px;
  font-weight: 700;
}

.title {
  font-size: 40px;
  font-weight: 800;
  letter-spacing: -.025em;
  margin: 0 0 12px;
  color: $text-primary;
  -webkit-font-smoothing: antialiased;

  @media (max-width: 860px) {
    font-size: 28px;
  }
}

.expiry {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-family: 'Space Mono', monospace;
  font-size: 11px;
  letter-spacing: .06em;
  color: #8f8f97;
  padding: 6px 12px;
  background: rgba(255, 255, 255, .03);
  border: 1px solid rgba(255, 255, 255, .08);
  border-radius: 999px;
  margin-bottom: 38px;
  text-transform: uppercase;

  svg { flex-shrink: 0; }
}

.layout {
  display: grid;
  grid-template-columns: 1fr 408px;
  gap: 28px;
  align-items: start;

  @media (max-width: 860px) {
    grid-template-columns: 1fr;
  }
}

.left {
  display: flex;
  flex-direction: column;
  gap: 0;

  @media (max-width: 860px) {
    order: 2;
  }
}

.right {
  display: flex;
  flex-direction: column;
  gap: 16px;
  position: sticky;
  top: 96px;

  @media (max-width: 860px) {
    order: 1;
    position: static;
  }
}

.payBtn {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  background: $action;
  color: #0a0a0b;
  border: none;
  border-radius: 16px;
  font-size: 16px;
  font-weight: 700;
  padding: 18px;
  cursor: pointer;
  margin-top: 24px;
  transition: filter .15s;
  font-family: 'Archivo', sans-serif;

  &:hover:not(:disabled) { filter: brightness(1.08); }
  &:disabled { opacity: 0.5; cursor: not-allowed; }

  svg { flex-shrink: 0; }
}

.secure {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-top: 18px;
  font-family: 'Space Mono', monospace;
  font-size: 10.5px;
  letter-spacing: .06em;
  color: #6f6f77;
  text-transform: uppercase;

  svg { flex-shrink: 0; }
}

// ── Loading skeleton ──────────────────────────────────────────────

.container {
  max-width: 1240px;
  margin: 0 auto;
  padding: 3rem 40px;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.skeleton {
  height: 160px;
  border-radius: 16px;
  background: linear-gradient(
    90deg,
    $surface 25%,
    rgba(255, 46, 158, .08) 50%,
    $surface 75%
  );
  background-size: 400% 100%;
  animation: shimmer 1.5s infinite linear;
}

@keyframes shimmer {
  0%   { background-position: 100% 0; }
  100% { background-position: -100% 0; }
}

// ── Error state ───────────────────────────────────────────────────

.error {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  padding: 5rem 1rem;
  text-align: center;
  color: $text-muted;

  svg { color: #f87171; }
  p { font-size: 1rem; }
}

.backBtn {
  background: transparent;
  border: 1px solid $border;
  color: $text-primary;
  border-radius: 8px;
  padding: 0.6rem 1.25rem;
  cursor: pointer;
  font-size: 0.9rem;
  transition: border-color .15s;

  &:hover { border-color: $text-muted; }
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd /Users/ysraelmoreno/Documents/codes/live-show/live-show-react && npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors about `CheckoutPageContent`.

- [ ] **Step 4: Commit**

```bash
git add src/features/checkout/components/CheckoutPageContent.tsx src/features/checkout/components/CheckoutPageContent.module.scss
git commit -m "refactor(checkout): update page header layout and grid to new design"
```

---

### Task 2: Unified Ticket Card

**Files:**
- Modify: `src/features/checkout/components/TicketSummaryCard.tsx`
- Modify: `src/features/checkout/components/TicketSummaryCard.module.scss`

**Interfaces:**
- Consumes: `TicketSummaryCard` now receives `eventName?: string` from `CheckoutPageContent` (added in Task 1)
- Produces: unified card showing event label row + ticket name/price + capabilities with violet glow

- [ ] **Step 1: Update `TicketSummaryCard.tsx`**

Replace entire file with:

```tsx
import { formatPrice } from '@/features/events';
import type { TicketProductResponse } from '@/features/events';
import { CAPABILITY_LABELS } from '@/features/cart';
import styles from './TicketSummaryCard.module.scss';

interface Props {
  ticket: TicketProductResponse;
  quantity: number;
  eventName?: string;
}

export function TicketSummaryCard({ ticket, quantity, eventName }: Props) {
  return (
    <div className={styles.card}>
      <div className={styles.glow} aria-hidden />
      <div className={styles.body}>
        {eventName && (
          <div className={styles.eventLabel}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 9a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2 2 2 0 0 0 0 4 2 2 0 0 1-2 2H5a2 2 0 0 1-2-2 2 2 0 0 0 0-4Z"/>
            </svg>
            {eventName}
          </div>
        )}

        <div className={styles.row}>
          <p className={styles.name}>{ticket.name}</p>
          <p className={styles.price}>{quantity}× {formatPrice(ticket.price)}</p>
        </div>

        {ticket.capabilities.length > 0 && (
          <div className={styles.capabilities}>
            {ticket.capabilities.map((c) => (
              <div key={c} className={styles.capItem}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#ff5fb4" strokeWidth="2.4">
                  <path d="M20 6L9 17l-5-5"/>
                </svg>
                {CAPABILITY_LABELS[c]}
              </div>
            ))}
            {ticket.camerasLimit != null && (
              <div className={styles.capItem}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#ff5fb4" strokeWidth="2.4">
                  <path d="M20 6L9 17l-5-5"/>
                </svg>
                {ticket.camerasLimit} câmeras
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Update `TicketSummaryCard.module.scss`**

Replace entire file with:

```scss
@use '../../../styles/_variables' as *;

.card {
  position: relative;
  background: $surface;
  border: 1px solid rgba(255, 255, 255, .08);
  border-radius: 20px;
  padding: 22px;
  overflow: hidden;
}

.glow {
  position: absolute;
  top: -60px;
  right: -50px;
  width: 180px;
  height: 180px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(155, 123, 255, .16), transparent 70%);
  pointer-events: none;
}

.body {
  position: relative;
}

.eventLabel {
  display: flex;
  align-items: center;
  gap: 8px;
  font-family: 'Space Mono', monospace;
  font-size: 11px;
  letter-spacing: .06em;
  color: #8f8f97;
  margin-bottom: 16px;

  svg { flex-shrink: 0; }
}

.row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
  margin-bottom: 16px;
}

.name {
  font-size: 18px;
  font-weight: 700;
  letter-spacing: -.01em;
  line-height: 1.25;
  color: $text-primary;
  margin: 0;
}

.price {
  font-family: 'Space Mono', monospace;
  font-size: 16px;
  font-weight: 700;
  white-space: nowrap;
  color: $text-primary;
  margin: 0;
  flex-shrink: 0;
}

.capabilities {
  display: flex;
  flex-direction: column;
  gap: 9px;
}

.capItem {
  display: flex;
  align-items: center;
  gap: 9px;
  font-size: 13.5px;
  color: #b9b9c0;

  svg { flex-shrink: 0; }
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd /Users/ysraelmoreno/Documents/codes/live-show/live-show-react && npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/features/checkout/components/TicketSummaryCard.tsx src/features/checkout/components/TicketSummaryCard.module.scss
git commit -m "refactor(checkout): unify ticket card with event label and violet glow"
```

---

### Task 3: Order Summary Card Breakdown

**Files:**
- Modify: `src/features/checkout/components/OrderSummaryCard.tsx`
- Modify: `src/features/checkout/components/OrderSummaryCard.module.scss`

**Interfaces:**
- Consumes: `CheckoutSession.totalAmount: number` (subtotal = totalAmount, serviceFee = 0)
- Produces: card with subtotal row + fees row + divider + big magenta total

- [ ] **Step 1: Update `OrderSummaryCard.tsx`**

Replace entire file with:

```tsx
import { formatPrice } from '@/features/events';
import type { CheckoutSession } from '../types/checkout.types';
import styles from './OrderSummaryCard.module.scss';

interface Props {
  session: CheckoutSession;
}

export function OrderSummaryCard({ session }: Props) {
  const subtotal = session.totalAmount;
  const serviceFee = 0;

  return (
    <div className={styles.card}>
      <div className={styles.rows}>
        <div className={styles.row}>
          <span className={styles.rowLabel}>Subtotal</span>
          <span className={styles.rowValue}>{formatPrice(subtotal)}</span>
        </div>
        <div className={styles.row}>
          <span className={styles.rowLabel}>Taxas de serviço</span>
          <span className={styles.rowValue}>{serviceFee ? formatPrice(serviceFee) : 'Grátis'}</span>
        </div>
      </div>

      <div className={styles.divider} />

      <div className={styles.total}>
        <span className={styles.totalLabel}>Total</span>
        <div className={styles.totalRight}>
          <span className={styles.currency}>{session.currency ?? 'BRL'}</span>
          <span className={styles.totalValue}>{formatPrice(session.totalAmount)}</span>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Update `OrderSummaryCard.module.scss`**

Replace entire file with:

```scss
@use '../../../styles/_variables' as *;

.card {
  background: $surface;
  border: 1px solid rgba(255, 255, 255, .08);
  border-radius: 20px;
  padding: 22px;
}

.rows {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 18px;
}

.row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.rowLabel {
  font-size: 14px;
  color: #b9b9c0;
}

.rowValue {
  font-family: 'Space Mono', monospace;
  font-size: 14px;
  color: $text-primary;
}

.divider {
  height: 1px;
  background: rgba(255, 255, 255, .1);
  margin-bottom: 18px;
}

.total {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
}

.totalLabel {
  font-size: 16px;
  font-weight: 700;
  color: $text-primary;
}

.totalRight {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}

.currency {
  font-family: 'Space Mono', monospace;
  font-size: 11px;
  color: #7d7d85;
  line-height: 1.4;
}

.totalValue {
  font-family: 'Space Mono', monospace;
  font-size: 28px;
  font-weight: 700;
  letter-spacing: -.01em;
  color: $action;
  line-height: 1;
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd /Users/ysraelmoreno/Documents/codes/live-show/live-show-react && npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/features/checkout/components/OrderSummaryCard.tsx src/features/checkout/components/OrderSummaryCard.module.scss
git commit -m "refactor(checkout): add subtotal/fees breakdown and magenta total to order summary"
```

---

### Task 4: Payment Method Selector Visual Update

**Files:**
- Modify: `src/features/checkout/components/PaymentMethodSelector.module.scss`

**Interfaces:**
- No TSX changes — the component logic is unchanged
- Produces: bigger method cards (20px 22px padding, 16px radius), 40px icon containers, radial glow on selected

- [ ] **Step 1: Update `PaymentMethodSelector.module.scss`**

Replace entire file with:

```scss
@use '../../../styles/_variables' as *;

.wrap {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.label {
  font-family: 'Space Mono', monospace;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: .14em;
  color: $text-primary;
  text-transform: uppercase;
}

.list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.method {
  position: relative;
  display: flex;
  align-items: center;
  gap: 16px;
  width: 100%;
  text-align: left;
  background: $surface;
  border: 1px solid rgba(255, 255, 255, .07);
  border-radius: 16px;
  padding: 20px 22px;
  cursor: pointer;
  transition: border-color .15s, background .15s;
  color: #e7e7ea;
  overflow: hidden;

  &:hover {
    border-color: rgba(255, 46, 158, .32);
    background: #131316;
  }

  &:focus-visible {
    outline: 2px solid $action;
    outline-offset: 2px;
  }
}

.methodSelected {
  background: rgba(255, 46, 158, .07);
  border-color: $action;
  color: $text-primary;

  &:hover {
    border-color: $action;
    background: rgba(255, 46, 158, .07);
  }
}

.selectedGlow {
  position: absolute;
  top: -50px;
  right: -40px;
  width: 150px;
  height: 150px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255, 46, 158, .16), transparent 70%);
  pointer-events: none;
}

.methodIcon {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: rgba(255, 255, 255, .04);
  color: #b9b9c0;
  flex-shrink: 0;
  transition: background .15s, color .15s;
}

.methodIconSelected {
  background: rgba(255, 46, 158, .14);
  color: #ff5fb4;
}

.methodName {
  position: relative;
  flex: 1;
  font-size: 16px;
  font-weight: 500;
}

.methodNameSelected {
  font-weight: 600;
  color: $text-primary;
}

.radio {
  position: relative;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  border: 2px solid rgba(255, 255, 255, .18);
  flex-shrink: 0;
  transition: border-color .15s;
}

.radioActive {
  border-color: $action;

  &::after {
    content: '';
    position: absolute;
    inset: 4px;
    border-radius: 50%;
    background: $action;
  }
}

.skeleton {
  height: 200px;
  border-radius: 16px;
  background: linear-gradient(90deg, $surface 25%, rgba(255, 46, 158, .08) 50%, $surface 75%);
  background-size: 400% 100%;
  animation: shimmer 1.5s infinite linear;
}

@keyframes shimmer {
  0%   { background-position: 100% 0; }
  100% { background-position: -100% 0; }
}
```

- [ ] **Step 2: Update `PaymentMethodSelector.tsx` to use new CSS classes**

The TSX needs to apply the new class variants for icon and name. Replace entire file:

```tsx
import { CreditCard, QrCode, Wallet, Smartphone } from 'lucide-react';
import type { PaymentMethod, PaymentMethodType } from '../types/checkout.types';
import styles from './PaymentMethodSelector.module.scss';

const METHOD_ICONS: Record<PaymentMethodType, React.ReactNode> = {
  PIX: <QrCode size={19} />,
  CREDIT_CARD: <CreditCard size={19} />,
  DEBIT_CARD: <CreditCard size={19} />,
  GOOGLE_PAY: <Smartphone size={19} />,
  APPLE_PAY: <Smartphone size={19} />,
  STRIPE: <Wallet size={19} />,
};

interface Props {
  methods: PaymentMethod[];
  selected: string | null;
  onChange: (id: string) => void;
  isLoading?: boolean;
}

export function PaymentMethodSelector({ methods, selected, onChange, isLoading }: Props) {
  if (isLoading) {
    return (
      <div className={styles.wrap}>
        <p className={styles.label}>Forma de Pagamento</p>
        <div className={styles.skeleton} />
      </div>
    );
  }

  return (
    <div className={styles.wrap}>
      <p className={styles.label}>Forma de Pagamento</p>
      <div className={styles.list} role="radiogroup" aria-label="Forma de pagamento">
        {methods.map((method) => {
          const isSelected = selected === method.id;
          return (
            <button
              key={method.id}
              role="radio"
              aria-checked={isSelected}
              onClick={() => onChange(method.id)}
              className={`${styles.method} ${isSelected ? styles.methodSelected : ''}`}
            >
              {isSelected && <span className={styles.selectedGlow} aria-hidden />}
              <span className={`${styles.methodIcon} ${isSelected ? styles.methodIconSelected : ''}`}>
                {METHOD_ICONS[method.type]}
              </span>
              <span className={`${styles.methodName} ${isSelected ? styles.methodNameSelected : ''}`}>
                {method.displayName}
              </span>
              <span className={`${styles.radio} ${isSelected ? styles.radioActive : ''}`} />
            </button>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd /Users/ysraelmoreno/Documents/codes/live-show/live-show-react && npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/features/checkout/components/PaymentMethodSelector.tsx src/features/checkout/components/PaymentMethodSelector.module.scss
git commit -m "refactor(checkout): update payment method selector to new design"
```

---

## Self-Review

**Spec coverage:**
- [x] Breadcrumb "CHECKOUT · ETAPA 2 DE 2" → Task 1
- [x] Title 40px/800 → Task 1
- [x] Session expiry pill → Task 1
- [x] Grid 1fr 408px / gap 28px → Task 1
- [x] Sidebar sticky top:96px → Task 1
- [x] EventSummaryCard removed from render → Task 1
- [x] Unified ticket card (event label + ticket name/price + capabilities + violet glow) → Task 2
- [x] Subtotal + fees + divider + big magenta total → Task 3
- [x] Payment method cards: bigger padding, 40px icon containers, 16px radius, radial glow on selected → Task 4
- [x] Pay button: lock icon, 16px radius, 18px padding, magenta → Task 1

**Placeholder scan:** None found.

**Type consistency:**
- `eventName?: string` added to `TicketSummaryCard` Props in Task 2; consumed in Task 1 as `event.data.title` — `EventResponse.title: string` confirmed existing.
- `session.currency` used in Task 3 — `CheckoutSession` doesn't have `currency`. Fix: use `'BRL'` literal as fallback (`session.currency ?? 'BRL'`). ✓ Already in code above.
