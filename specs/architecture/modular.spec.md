# Frontend Architecture Specification

## Project: Online Concert Platform

## Stack

* Next.js 16+
* React 20+
* TypeScript
* TailwindCSS
* TanStack Query
* Zod
* React Hook Form
* Zustand
* Axios
* Framer Motion
* Shadcn/UI

---

# Goals

The frontend must:

* Support live events
* Support ticket purchasing
* Support multiple camera streams
* Support VOD (Video On Demand)
* Support authenticated users
* Support artist pages
* Support organizer dashboard
* Support future white-label solutions
* Remain scalable as new domains are added

---

# Architectural Principles

## 1. Domain Driven Structure

The codebase must be organized around business domains instead of technical layers.

Bad:

```txt
components/
pages/
hooks/
services/
```

Good:

```txt
features/
events/
tickets/
account/
streaming/
```

---

## 2. Feature Isolation

Each feature owns:

* components
* hooks
* queries
* mutations
* schemas
* services
* types

No feature may directly access internals from another feature.

Communication must happen through public exports.

---

## Root Structure

```txt
src/
│
├── app/
│
├── features/
│
├── shared/
│
├── providers/
│
├── config/
│
├── lib/
│
├── styles/
│
└── types/
```

---

# App Router Structure

```txt
app/

├── (public)
│   ├── page.tsx
│   ├── events
│   ├── artists
│   └── about
│
├── (auth)
│   ├── login
│   ├── register
│   ├── forgot-password
│   └── reset-password
│
├── (user)
│   ├── account
│   ├── tickets
│   ├── purchases
│   └── settings
│
├── (stream)
│   ├── live
│   │   └── [eventId]
│   └── replay
│       └── [eventId]
│
├── (dashboard)
│   ├── events
│   ├── sales
│   ├── analytics
│   └── streams
│
└── api
```

---

# Features

```txt
features/

├── account/
├── events/
├── artists/
├── tickets/
├── checkout/
├── streaming/
├── chat/
├── notifications/
├── dashboard/
└── analytics/
```

---

# Example Feature Structure

```txt
events/

├── api/
├── components/
├── hooks/
├── schemas/
├── types/
├── queries/
├── mutations/
├── services/
├── stores/
├── utils/
└── index.ts
```

---

# Shared Layer

Contains reusable code without business rules.

```txt
shared/

├── components/
├── hooks/
├── utils/
├── constants/
├── types/
├── forms/
├── icons/
└── validations/
```

Examples:

* Button
* Input
* Modal
* Skeleton
* Avatar
* DataTable

No domain logic allowed.

---

# API Layer

## Axios Instance

```txt
lib/http/

├── client.ts
├── interceptors.ts
└── errors.ts
```

Responsibilities:

* Authentication
* Refresh Token
* Request tracing
* Error normalization

---

# Query Layer

TanStack Query must be the single source of server state.

Example:

```txt
events/queries/

├── get-event.ts
├── get-events.ts
└── get-featured-events.ts
```

---

# Mutation Layer

```txt
tickets/mutations/

├── purchase-ticket.ts
├── refund-ticket.ts
└── validate-ticket.ts
```

---

# Validation Layer

All API payloads must be validated with Zod.

Example:

```txt
events/schemas/

event.schema.ts
event-response.schema.ts
```

---

# Authentication

Authentication flow:

```txt
User
 ↓
Login
 ↓
Access Token
 ↓
Refresh Token
 ↓
Middleware Validation
 ↓
Protected Route
```

---

# Route Protection

Use:

```txt
middleware.ts
```

Responsibilities:

* Auth validation
* Session validation
* Role verification

Roles:

```txt
USER
ORGANIZER
ARTIST
ADMIN
```

---

# State Management

## Zustand

Allowed only for:

* Video player state
* Current camera
* Playback state
* UI state

Not allowed:

* Server state
* API cache

---

# Streaming Module

Structure:

```txt
streaming/

├── components/
│   ├── player
│   ├── controls
│   ├── camera-selector
│   ├── chat
│   └── timeline
│
├── hooks/
├── stores/
├── services/
└── types/
```

Player responsibilities:

* Live playback
* DVR
* Replay
* Camera switching
* Quality switching

---

# Checkout Flow

```txt
Event
 ↓
Ticket Selection
 ↓
Cart
 ↓
Checkout
 ↓
Payment
 ↓
Confirmation
```

Modules:

```txt
checkout/
tickets/
payments/
```

Must remain independent.

---

# Error Handling

Global error boundary:

```txt
app/error.tsx
```

Feature-specific boundaries:

```txt
features/*/components/error-boundary.tsx
```

---

# Observability

Integrate:

* Sentry
* OpenTelemetry
* PostHog

Track:

* Purchases
* Playback starts
* Playback failures
* Camera switches
* Stream buffering

---

# Testing Strategy

## Unit

* Vitest
* Testing Library

Coverage target:

```txt
80%
```

---

## Integration

Focus:

* Authentication
* Checkout
* Ticket ownership
* Stream access

---

## E2E

Playwright

Critical flows:

* Login
* Purchase ticket
* Enter live event
* Switch camera
* Watch replay

---

# Naming Conventions

Components

```txt
PascalCase
```

Hooks

```txt
useSomething
```

Queries

```txt
getSomething
```

Mutations

```txt
createSomething
updateSomething
deleteSomething
```

Stores

```txt
useSomethingStore
```

---

# Future Modules

Reserved domains:

```txt
sponsorship/
merchandising/
subscriptions/
community/
fan-club/
virtual-meetings/
```

Architecture must support these modules without structural changes.
