# Checkout Page - Frontend Specification

# Overview

The Checkout Page is responsible for converting an event visitor into a ticket holder.

The page must provide a secure, scalable and gateway-agnostic payment experience.

The architecture must support:

* Stripe
* PayPal
* Mercado Pago
* Apple Pay
* Google Pay
* Internal Payment Gateway

without requiring checkout redesign.

---

# Goals

Allow users to:

* Purchase tickets
* Select payment methods
* Complete payment
* Receive purchase confirmation
* Receive ticket access

The Checkout Page must remain independent from payment providers.

---

# Core Principle

The frontend must never integrate directly with a specific provider business flow.

Forbidden:

```text
Checkout
   ↓
Stripe SDK Logic
```

Preferred:

```text
Checkout
   ↓
Payment Session
   ↓
Gateway Provider
```

The backend decides which provider executes the payment.

---

# Route Structure

## Checkout

```text
/events/:eventId/checkout
```

---

## Checkout Success

```text
/events/:eventId/checkout/success
```

---

## Checkout Failed

```text
/events/:eventId/checkout/failed
```

---

## Checkout Pending

```text
/events/:eventId/checkout/pending
```

---

# User Journey

```text
Event Page
      ↓
Select Ticket
      ↓
Checkout
      ↓
Create Payment Session
      ↓
Payment Processing
      ↓
Payment Confirmation
      ↓
Ticket Granted
```

---

# Page Layout

```text
-------------------------------------------------

Event Summary

Ticket Information

Order Summary

Payment Method

Purchase Button

-------------------------------------------------
```

---

# Sections

## Event Summary

Display:

```typescript
{
  eventName: string
  eventDate: string
  organizationName: string
  eventBanner: string
}
```

---

## Ticket Summary

Display:

```typescript
{
  ticketName: string
  ticketType: string
  quantity: number
}
```

Example:

```text
Replay Ticket

1x

R$ 49.90
```

---

## Access Summary

Display capabilities included.

Example:

```text
Included:

✓ Live Viewing

✓ Replay Access
```

Generated from:

```typescript
AccessCapability
```

---

# Order Summary

Display:

```typescript
{
  subtotal: number
  serviceFee: number
  taxes: number
  total: number
}
```

---

# Payment Methods Section

Dynamic.

Provided by backend.

Example:

```json
[
  {
    "id": "stripe-card",
    "name": "Credit Card"
  },
  {
    "id": "paypal",
    "name": "PayPal"
  },
  {
    "id": "pix",
    "name": "PIX"
  }
]
```

---

# Frontend Domain Model

## Checkout Session

```typescript
interface CheckoutSession {
  id: string

  eventId: string

  ticketId: string

  quantity: number

  totalAmount: number

  currency: string

  expiresAt: string
}
```

---

## Payment Method

```typescript
interface PaymentMethod {
  id: string

  provider: string

  displayName: string

  type: PaymentMethodType
}
```

---

## Payment Method Type

```typescript
enum PaymentMethodType {
  CARD,
  PAYPAL,
  PIX,
  APPLE_PAY,
  GOOGLE_PAY,
  BANK_TRANSFER
}
```

---

# Frontend Architecture

## Feature Structure

```text
features/

checkout/

├── pages/
├── components/
├── hooks/
├── services/
├── schemas/
├── types/
└── tests/
```

---

# Components

## CheckoutPage

Container page.

Responsibilities:

* Fetch checkout session
* Render payment options
* Submit payment

---

## EventSummaryCard

Displays event information.

---

## TicketSummaryCard

Displays selected ticket.

---

## OrderSummaryCard

Displays totals.

---

## PaymentMethodSelector

Displays available payment methods.

---

## CheckoutButton

Starts payment flow.

---

# Hooks

## useCheckoutSession

Responsible for:

```text
Loading checkout data
```

---

## usePaymentMethods

Responsible for:

```text
Loading available methods
```

---

## useCreatePayment

Responsible for:

```text
Starting payment flow
```

---

## usePaymentStatus

Responsible for:

```text
Polling payment status
```

---

# Payment Session Flow

## Step 1

User enters checkout.

Frontend:

```http
POST /checkout/sessions
```

Response:

```json
{
  "sessionId": "session-001"
}
```

---

## Step 2

Load payment methods.

```http
GET /checkout/sessions/{id}/payment-methods
```

---

## Step 3

User selects payment method.

---

## Step 4

Frontend creates payment.

```http
POST /payments
```

Request:

```json
{
  "sessionId": "...",
  "paymentMethodId": "stripe-card"
}
```

---

## Step 5

Receive payment action.

Example:

```json
{
  "type": "REDIRECT",
  "url": "..."
}
```

or

```json
{
  "type": "EMBEDDED_FORM"
}
```

---

## Step 6

Payment confirmation.

---

## Payment Status

```typescript
enum PaymentStatus {
  PENDING,
  PROCESSING,
  AUTHORIZED,
  COMPLETED,
  FAILED,
  REFUNDED
}
```

---

# Gateway Agnostic Design

Frontend must not know:

```text
Stripe API

PayPal API

Mercado Pago API
```

Frontend only understands:

```typescript
PaymentAction
```

---

## Payment Action

```typescript
interface PaymentAction {
  type: PaymentActionType

  payload: Record<string, unknown>
}
```

---

## Payment Action Types

```typescript
enum PaymentActionType {
  REDIRECT,
  EMBEDDED_FORM,
  QR_CODE,
  WAITING_APPROVAL
}
```

---

# Future Internal Gateway Support

The architecture must support:

```text
Internal Gateway
```

Example:

```text
Checkout
      ↓
Payment Orchestrator
      ↓
Internal Gateway
```

No frontend changes required.

---

# Success Page

Route:

```text
/checkout/success
```

Display:

```text
Payment Successful

Ticket Granted

View Event
```

---

# Failed Page

Route:

```text
/checkout/failed
```

Display:

```text
Payment Failed

Retry Payment
```

---

# Pending Page

Route:

```text
/checkout/pending
```

Display:

```text
Waiting Payment Confirmation
```

Useful for:

```text
PIX

Bank Transfers

Manual Approvals
```

---

# Security Requirements

Frontend must never:

```text
Store Card Data

Store CVV

Store Raw Payment Tokens
```

All sensitive data belongs to payment providers.

---

# Analytics

Track:

```text
Checkout Opened

Checkout Started

Payment Initiated

Payment Completed

Payment Failed

Checkout Abandoned
```

---

# Accessibility

Required:

```text
Keyboard Navigation

Screen Reader Support

Focus Management
```

---

# Testing

## Unit Tests

Test:

```text
Price Calculations

Payment State Logic

Capability Rendering
```

---

## Integration Tests

Test:

```text
Checkout Flow

Success Flow

Failure Flow

Pending Flow
```

---

# Future Features

The architecture must support:

```text
Installments

Discount Coupons

Promo Codes

Gift Tickets

Bundles

Subscriptions

Organization Revenue Share

Multi-Currency

Marketplace Payments

Internal Gateway

Hybrid Payments
```

without requiring Checkout redesign.

---

# MVP Success Criteria

The Checkout Page must:

* Sell tickets
* Support multiple gateways
* Remain provider agnostic
* Grant ticket access after payment
* Support replay tickets
* Support future internal payment gateway
* Support future marketplace expansion

while keeping payment provider logic outside the frontend.
