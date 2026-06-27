# Checkout Refactor — Design Spec

**Date:** 2026-06-22
**Scope:** `features/checkout/` components and SCSS modules only

---

## Goal

Align `/events/:eventId/checkout` page visually with the new design spec (`specs/checkout/design/Liveshow Checkout.dc.html`) while preserving all existing behavior and the SCSS module styling pattern.

---

## Design Reference

Source: `live-show-react/specs/checkout/design/Liveshow Checkout.dc.html`
Brand system: `live-show-react/DESIGN.md`

---

## Layout

Two-column grid: `1fr 408px`, gap `28px`. Breakpoint ≤860px: single column (payment below summary on mobile becomes payment below summary — summary stays on top).

Left column: payment method selector + pay button + security badge.
Right column: sticky at `top: 96px`. Unified ticket card + order summary card.

---

## Page Header

- Breadcrumb label: `"CHECKOUT · ETAPA 2 DE 2"` — Space Mono, 11px, `letter-spacing: .16em`, color `#ff7ec2`, `margin-bottom: 10px`
- Title `"Finalizar compra"` — Archivo 40px / weight 800, `letter-spacing: -.025em`, `margin-bottom: 12px`
- Session expiry pill — pill-shaped border (`border-radius: 999px`, `background: rgba(255,255,255,.03)`, `border: 1px solid rgba(255,255,255,.08)`), clock icon + Space Mono 11px text, `margin-bottom: 38px`

---

## Payment Method Selector

- Label: `"FORMA DE PAGAMENTO"` — Space Mono 12px / 700, `letter-spacing: .14em`
- Each method card: `padding: 20px 22px`, `border-radius: 16px`
- **Unselected:** `background: #101013`, `border: 1px solid rgba(255,255,255,.07)`, icon in `rgba(255,255,255,.04)` 40px container, empty 22px radio circle
- **Selected:** `background: rgba(255,46,158,.07)`, `border: 1px solid #ff2e9e`, radial glow top-right corner, icon in `rgba(255,46,158,.14)` container with `color: #ff5fb4`, filled radio
- Icon container: 40px × 40px, `border-radius: 10px`, flex center

---

## Pay Button

- Full width, `padding: 18px`, `border-radius: 16px`, magenta background `#ff2e9e`, `color: #0a0a0b`, weight 700, 16px
- Lock SVG icon leading
- Hover: `filter: brightness(1.08)`

---

## Unified Ticket Card (right column, card 1)

Replaces the two separate `EventSummaryCard` + `TicketSummaryCard` cards.

- Container: `background: #101013`, `border: 1px solid rgba(255,255,255,.08)`, `border-radius: 20px`, `padding: 22px`
- Violet radial glow: `position: absolute; top: -60px; right: -50px; width: 180px; height: 180px; border-radius: 50%; background: radial-gradient(circle, rgba(155,123,255,.16), transparent 70%)`
- **Event label row:** ticket icon (15px) + event name — Space Mono 11px, `letter-spacing: .06em`, `color: #8f8f97`, `margin-bottom: 16px`
- **Ticket row:** ticket name (18px / 700, `letter-spacing: -.01em`) + unit price (Space Mono 16px / 700) — space-between, `margin-bottom: 16px`
- **Capabilities:** each item = magenta checkmark SVG (`stroke: #ff5fb4`) + 13.5px text `color: #b9b9c0`, gap 9px

`TicketSummaryCard` receives new `eventName?: string` prop. `EventSummaryCard` stops rendering in the summary column (file kept, just unused in checkout).

---

## Order Summary Card (right column, card 2)

- Container: same surface card style as above (no glow)
- Rows: Subtotal + Taxas de serviço — 14px `color: #b9b9c0` label / Space Mono 14px value
- `serviceFee` not yet in `CheckoutSession` → derive `subtotal = totalAmount`, `serviceFee = 0` (render "Grátis")
- Divider: `height: 1px; background: rgba(255,255,255,.1); margin: 18px 0`
- Total: label "Total" 16px / 700 + value block right-aligned: "BRL" in Space Mono 11px `color: #7d7d85` above, amount in Space Mono 28px / 700 `color: #ff2e9e`, `letter-spacing: -.01em`

---

## Component File Map

| File | Action |
|---|---|
| `CheckoutPageContent.tsx` | Add breadcrumb, restyle title/expiry, remove `EventSummaryCard` import, adjust aside |
| `CheckoutPageContent.module.scss` | Update `.title`, add `.breadcrumb`, update `.expiry`, `.layout` grid, `.right` top |
| `TicketSummaryCard.tsx` | Add `eventName?: string` prop, render event label row, update visuals |
| `TicketSummaryCard.module.scss` | Full restyle to match new design (glow, magenta checks, unified card) |
| `OrderSummaryCard.tsx` | Add subtotal + fees rows + divider |
| `OrderSummaryCard.module.scss` | Add `.subtotal`, `.fees`, `.divider`, restyle `.total` |
| `PaymentMethodSelector.tsx` | Update icon container size; no logic changes |
| `PaymentMethodSelector.module.scss` | Update padding, border-radius, selected glow, icon container |
| `EventSummaryCard.tsx` | No changes (just stops being rendered in checkout) |

---

## Constraints

- SCSS modules — no inline styles on React components
- No behavior/logic changes — only visual/structural
- `EventSummaryCard.tsx` kept (not deleted)
- `CheckoutSession` type not modified — `serviceFee` derived as 0
- Accessibility: keep `role="radiogroup"`, `aria-checked`, `aria-busy` unchanged
