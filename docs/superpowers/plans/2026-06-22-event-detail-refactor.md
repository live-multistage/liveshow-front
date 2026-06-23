# Event Detail Page Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor the `/events/[id]` page to match the Liveshow design spec without changing any behavior or logic.

**Architecture:** Two independent component rewrites (EventDetailPageContent + TicketPanel), each with a TSX update and a full SCSS module replacement. No hooks, queries, routing, or type changes. Camera grid kept and restyled.

**Tech Stack:** Next.js App Router, React, TypeScript, SCSS Modules, next-intl, Lucide icons.

## Global Constraints

- SCSS modules only — no inline styles on React components (SVG element attributes `stroke`/`fill`/`strokeWidth` are OK)
- No behavior or logic changes — hooks, routing, state, translations unchanged
- No type changes
- Camera grid kept (restyled, not removed)
- Target SCSS file: `src/features/events/components/public/EventDetailPageContent.module.scss` (NOT `src/app/(public)/events/[id]/page.module.scss` — that file is unused)
- Variables file: `src/styles/_variables.scss` — use `$bg`, `$surface`, `$surface-dark`, `$action`, `$text-primary`, `$text-secondary`, `$text-muted`, `$border`, `$success`, `$success-light` where they match
- Exact spec values must be used verbatim (see each task)
- TypeScript must compile with no errors: `npx tsc --noEmit`

---

### Task 1: EventDetailPageContent

**Files:**
- Modify: `src/features/events/components/public/EventDetailPageContent.tsx`
- Modify: `src/features/events/components/public/EventDetailPageContent.module.scss`

**Interfaces:**
- Produces: restyled page — back link, hero with aspect-ratio + glow + camera chip + badges + 54px title, meta cards (16px radius), org card, about section, camera grid

- [ ] **Step 1: Replace `EventDetailPageContent.tsx`**

```tsx
'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Calendar, Clock, MapPin, Camera, RotateCcw, Play } from 'lucide-react';
import { useGetEventQuery, useListTicketProductsQuery } from '../../queries/get-event';
import { TicketPanel } from './TicketPanel';
import { formatDate, formatTime, formatDuration, statusLabel } from '../../utils/event-formatters';
import { useEventCamerasQuery } from '@/features/streams/queries/streams.queries';
import { useOrganization } from '@/features/organizations';
import styles from './EventDetailPageContent.module.scss';

interface Props {
  id: string;
}

export function EventDetailPageContent({ id }: Props) {
  const router = useRouter();
  const t = useTranslations('events.detail');
  const { data: event, isLoading, isError } = useGetEventQuery(id);
  const { data: tickets = [] } = useListTicketProductsQuery(id);
  const { data: org } = useOrganization(event?.organizationId ?? '');
  const { cameras, isLoading: camerasLoading } = useEventCamerasQuery(event ? id : null);

  if (isLoading) {
    return (
      <div className={styles.centered}>
        <span className={styles.spinner} />
      </div>
    );
  }

  if (isError || !event) {
    return (
      <div className={styles.centered}>
        <p className={styles.notFound}>{t('notFound')}</p>
        <button onClick={() => router.push('/')} className={styles.backLink}>{t('backToHome')}</button>
      </div>
    );
  }

  const isLive = event.status === 'LIVE';
  const isFinished = event.status === 'FINISHED';
  const heroImage = event.bannerUrl ?? event.thumbnailUrl;
  const cameraCount = cameras.length || event.camerasCount || 0;

  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        <button onClick={() => router.back()} className={styles.backBtn}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M11 18l-6-6 6-6"/>
          </svg>
          VOLTAR
        </button>

        <div className={styles.hero}>
          {heroImage
            ? <img src={heroImage} alt={event.title} className={styles.heroImg} />
            : <div className={styles.heroPlaceholder} />}
          <div className={styles.heroScrim} />

          {cameraCount > 0 && (
            <div className={styles.camerasChip}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M23 7l-7 5 7 5V7Z"/>
                <rect x="1" y="5" width="15" height="14" rx="2"/>
              </svg>
              {cameraCount} CÂMERAS
            </div>
          )}

          <div className={styles.heroContent}>
            <div className={styles.heroBadges}>
              {isFinished && (
                <span className={styles.badgeReplay}>
                  <RotateCcw size={12} />REPLAY
                </span>
              )}
              {isLive && (
                <span className={styles.badgeLive}>
                  <span className={styles.liveDot} />AO VIVO
                </span>
              )}
              {!isLive && (
                <span className={styles.badgeStatus}>{statusLabel(event.status)}</span>
              )}
            </div>
            <h1 className={styles.heroTitle}>{event.title}</h1>
            {event.venue && (
              <div className={styles.heroVenue}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ff5fb4" strokeWidth="2">
                  <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
                  <circle cx="12" cy="10" r="2.6"/>
                </svg>
                {event.venue}
              </div>
            )}
          </div>
        </div>

        <div className={styles.grid}>
          <div>
            <div className={styles.metaGrid}>
              {[
                { icon: <Calendar size={14} />, label: t('date'), value: formatDate(event.startsAt) },
                { icon: <Clock size={14} />, label: t('time'), value: `${formatTime(event.startsAt)} · ${formatDuration(event.startsAt, event.endsAt)}` },
                { icon: <MapPin size={14} />, label: t('venue'), value: [event.city, event.country].filter(Boolean).join(', ') || '—' },
                { icon: <Camera size={14} />, label: t('cameras'), value: t('angles', { count: cameraCount }) },
              ].map((info) => (
                <div key={info.label} className={styles.metaCard}>
                  <div className={styles.metaLabel}>
                    <span className={styles.metaIcon}>{info.icon}</span>
                    {info.label}
                  </div>
                  <p className={styles.metaValue}>{info.value}</p>
                </div>
              ))}
            </div>

            {org && (
              <button className={styles.orgCard} onClick={() => router.push(`/o/${org.slug}`)}>
                <div className={styles.orgAvatar}>
                  {org.logoUrl && <img src={org.logoUrl} alt={org.name} className={styles.orgAvatarImg} />}
                </div>
                <div className={styles.orgInfo}>
                  <span className={styles.orgLabel}>{t('organization')}</span>
                  <span className={styles.orgName}>{org.name}</span>
                </div>
                <span className={styles.orgArrow}>VER PERFIL →</span>
              </button>
            )}

            <div className={styles.section}>
              <div className={styles.sectionLabel}>SOBRE O SHOW</div>
              <p className={styles.description}>{event.description}</p>
            </div>

            {(cameras.length > 0 || camerasLoading) && (
              <div className={styles.section}>
                <div className={styles.sectionLabel}>{t('availableCameras', { count: cameras.length })}</div>
                <div className={styles.cameraGrid}>
                  {camerasLoading
                    ? Array.from({ length: event.camerasCount || 2 }).map((_, i) => (
                        <div key={i} className={`${styles.cameraCard} ${styles.cameraCardSkeleton}`}>
                          <div className={styles.cameraPreview} />
                          <div className={styles.cameraMeta}>
                            <p className={`${styles.cameraName} ${styles.cameraNameHidden}`}>—</p>
                          </div>
                        </div>
                      ))
                    : cameras.map((camera) => (
                        <div key={camera.id} className={styles.cameraCard}>
                          <div className={styles.cameraPreview}>
                            <div className={styles.cameraPlayIcon}>
                              <Play size={20} color="white" fill="white" />
                            </div>
                            {isLive && camera.enabled && (
                              <div className={styles.cameraBadge}>
                                <span className={styles.liveDot} /> {t('live')}
                              </div>
                            )}
                          </div>
                          <div className={styles.cameraMeta}>
                            <p className={styles.cameraName}>{camera.name}</p>
                            <p className={styles.cameraAngle}>{camera.stageName}</p>
                          </div>
                        </div>
                      ))}
                </div>
              </div>
            )}
          </div>

          <div>
            <TicketPanel event={event} tickets={tickets} />
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Replace `EventDetailPageContent.module.scss`**

```scss
@use '../../../../styles/_variables' as *;

@keyframes spin { to { transform: rotate(360deg); } }
@keyframes lsPulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50%       { opacity: .35; transform: scale(.7); }
}

// ── Loading / Error ──────────────────────────────────────────────
.centered {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  gap: 1rem;
}

.spinner {
  width: 24px;
  height: 24px;
  border: 2px solid rgba(255, 255, 255, .15);
  border-top-color: $action;
  border-radius: 50%;
  animation: spin .7s linear infinite;
}

.notFound { color: $text-muted; font-size: 1rem; }

.backLink {
  background: none;
  border: 1px solid $border;
  color: $text-secondary;
  border-radius: 8px;
  padding: .6rem 1.25rem;
  cursor: pointer;
  font-size: .9rem;
}

// ── Page ────────────────────────────────────────────────────────
.page {
  min-height: 100vh;
  background: $bg;
  color: $text-primary;
}

.inner {
  max-width: 1240px;
  margin: 0 auto;
  padding: 28px 40px 72px;

  @media (max-width: 860px) { padding: 20px 20px 48px; }
}

// ── Back link ────────────────────────────────────────────────────
.backBtn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-family: 'Space Mono', monospace;
  font-size: 12px;
  letter-spacing: .08em;
  color: #9a9aa2;
  background: none;
  border: none;
  cursor: pointer;
  margin-bottom: 22px;
  text-transform: uppercase;
  transition: color .15s;

  &:hover { color: $text-primary; }
  svg { flex-shrink: 0; }
}

// ── Hero ────────────────────────────────────────────────────────
.hero {
  position: relative;
  border-radius: 20px;
  overflow: hidden;
  aspect-ratio: 21 / 8;
  border: 1px solid rgba(255, 255, 255, .07);
  margin-bottom: 28px;
}

.heroImg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.heroPlaceholder {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(120% 120% at 72% 18%, rgba(155, 123, 255, .55), transparent 52%),
    radial-gradient(90% 120% at 12% 90%, rgba(255, 46, 158, .42), transparent 55%),
    linear-gradient(150deg, #160f28 0%, #0d0a16 60%, #08080a 100%);
}

.heroScrim {
  position: absolute;
  inset: 0;
  background: linear-gradient(to top, rgba(5, 4, 6, .92) 6%, rgba(5, 4, 6, .25) 48%, transparent 78%);
}

.camerasChip {
  position: absolute;
  top: 18px;
  right: 18px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: rgba(8, 8, 10, .6);
  backdrop-filter: blur(6px);
  border: 1px solid rgba(255, 255, 255, .14);
  color: #e7e7ea;
  font-family: 'Space Mono', monospace;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: .06em;
  padding: 6px 10px;
  border-radius: 999px;

  svg { flex-shrink: 0; }
}

.heroContent {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 40px 44px;

  @media (max-width: 640px) { padding: 20px 24px; }
}

.heroBadges {
  display: flex;
  flex-wrap: wrap;
  gap: 9px;
  margin-bottom: 16px;
}

.badgeReplay {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-family: 'Space Mono', monospace;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: .08em;
  color: #ff8ec9;
  background: rgba(255, 46, 158, .12);
  border: 1px solid rgba(255, 46, 158, .34);
  padding: 6px 11px;
  border-radius: 999px;

  svg { flex-shrink: 0; }
}

.badgeLive {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-family: 'Space Mono', monospace;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: .08em;
  background: $action;
  color: #0a0a0b;
  padding: 6px 11px;
  border-radius: 999px;
}

.badgeStatus {
  display: inline-flex;
  align-items: center;
  font-family: 'Space Mono', monospace;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: .08em;
  color: #b9b9c0;
  background: rgba(255, 255, 255, .06);
  border: 1px solid rgba(255, 255, 255, .12);
  padding: 6px 11px;
  border-radius: 999px;
}

.liveDot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #0a0a0b;
  animation: lsPulse 1.4s infinite;
  flex-shrink: 0;
}

.heroTitle {
  margin: 0 0 8px;
  font-size: 54px;
  font-weight: 800;
  letter-spacing: -.035em;
  line-height: .98;
  -webkit-font-smoothing: antialiased;

  @media (max-width: 640px) { font-size: 32px; }
}

.heroVenue {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  color: #c7c7cd;

  svg { flex-shrink: 0; }
}

// ── Body grid ────────────────────────────────────────────────────
.grid {
  display: grid;
  grid-template-columns: 1fr 388px;
  gap: 28px;
  align-items: start;

  @media (max-width: 860px) { grid-template-columns: 1fr; }
}

// ── Meta cards ───────────────────────────────────────────────────
.metaGrid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 14px;
  margin-bottom: 18px;

  @media (max-width: 640px) { grid-template-columns: repeat(2, 1fr); }
}

.metaCard {
  background: #101013;
  border: 1px solid rgba(255, 255, 255, .07);
  border-radius: 16px;
  padding: 18px;
}

.metaLabel {
  display: flex;
  align-items: center;
  gap: 7px;
  font-family: 'Space Mono', monospace;
  font-size: 10px;
  letter-spacing: .1em;
  color: #8f8f97;
  margin-bottom: 12px;
}

.metaIcon {
  color: $action;
  display: inline-flex;
  flex-shrink: 0;
}

.metaValue {
  font-size: 14px;
  font-weight: 600;
  color: #f4f4f5;
  line-height: 1.35;
  margin: 0;
}

// ── Organization card ────────────────────────────────────────────
.orgCard {
  display: flex;
  align-items: center;
  gap: 16px;
  width: 100%;
  background: #101013;
  border: 1px solid rgba(255, 255, 255, .07);
  border-radius: 16px;
  padding: 18px 20px;
  margin-bottom: 28px;
  cursor: pointer;
  text-align: left;
  transition: border-color .15s;

  &:hover { border-color: rgba(255, 46, 158, .28); }
}

.orgAvatar {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  flex-shrink: 0;
  background:
    radial-gradient(120% 120% at 30% 20%, rgba(70, 214, 216, .5), transparent 60%),
    linear-gradient(150deg, #13212b, #0d1117);
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}

.orgAvatarImg {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.orgInfo {
  display: flex;
  flex-direction: column;
  gap: 5px;
  min-width: 0;
}

.orgLabel {
  font-family: 'Space Mono', monospace;
  font-size: 10px;
  letter-spacing: .12em;
  color: #8f8f97;
}

.orgName {
  font-size: 16px;
  font-weight: 700;
  letter-spacing: -.01em;
  color: $text-primary;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.orgArrow {
  margin-left: auto;
  font-family: 'Space Mono', monospace;
  font-size: 11px;
  letter-spacing: .06em;
  color: #9a9aa2;
  white-space: nowrap;
  flex-shrink: 0;
  transition: color .15s;

  .orgCard:hover & { color: #ff5fb4; }
}

// ── Content sections ─────────────────────────────────────────────
.section {
  display: flex;
  flex-direction: column;
  gap: 14px;
  margin-bottom: 28px;
}

.sectionLabel {
  font-family: 'Space Mono', monospace;
  font-size: 12px;
  letter-spacing: .14em;
  color: #fff;
  font-weight: 700;
}

.description {
  font-size: 16px;
  line-height: 1.65;
  color: #b9b9c0;
  max-width: 62ch;
  margin: 0;
}

// ── Camera grid ──────────────────────────────────────────────────
.cameraGrid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;

  @media (min-width: 640px) { grid-template-columns: repeat(4, 1fr); }
}

.cameraCard {
  background: #101013;
  border: 1px solid rgba(255, 255, 255, .07);
  border-radius: 12px;
  overflow: hidden;
  cursor: pointer;
  position: relative;
  transition: border-color .15s;

  &:hover { border-color: rgba(255, 46, 158, .28); }
}

.cameraCardSkeleton {
  opacity: .5;
  pointer-events: none;
}

.cameraPreview {
  height: 5rem;
  position: relative;
  background: $surface-dark;
  display: flex;
  align-items: center;
  justify-content: center;
}

.cameraPlayIcon {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  background: rgba(0, 0, 0, .4);
  transition: opacity .15s;

  .cameraCard:hover & { opacity: 1; }
}

.cameraBadge {
  position: absolute;
  bottom: 4px;
  left: 4px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: $action;
  color: #0a0a0b;
  font-family: 'Space Mono', monospace;
  font-size: 9px;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 4px;
}

.cameraMeta {
  padding: 8px 10px;
  background: $surface-dark;
}

.cameraName {
  font-size: 11px;
  font-weight: 500;
  color: $text-primary;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin: 0;
}

.cameraNameHidden { opacity: 0; }

.cameraAngle {
  font-size: 10px;
  color: $text-muted;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin: 0;
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd /Users/ysraelmoreno/Documents/codes/live-show/live-show-react && npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors related to `EventDetailPageContent`.

- [ ] **Step 4: Commit**

```bash
git add src/features/events/components/public/EventDetailPageContent.tsx src/features/events/components/public/EventDetailPageContent.module.scss
git commit -m "refactor(events): update event detail page layout and hero to new design"
```

---

### Task 2: TicketPanel

**Files:**
- Modify: `src/features/events/components/public/TicketPanel.tsx`
- Modify: `src/features/events/components/public/TicketPanel.module.scss`

**Interfaces:**
- Consumes: `EventResponse`, `TicketProductResponse[]` (unchanged from Task 1)
- Produces: restyled purchase card — magenta glow, ticket option card, divider, 28px magenta total, new buy/cart buttons; owned/cancelled/empty states restyled to match new card container

- [ ] **Step 1: Replace `TicketPanel.tsx`**

```tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Tv2, RotateCcw, CheckCircle2 } from 'lucide-react';
import { formatPrice } from '../../utils/event-formatters';
import type { EventResponse, TicketProductResponse } from '../../types/event.types';
import { useTranslations } from 'next-intl';
import { useAddToCartMutation } from '@/features/cart';
import { Button } from '@/shared/components/Button';
import { useAuth } from '@/features/account';
import {
  useLiveAccessQuery,
  useReplayAccessQuery,
  useLivePlaybackQuery,
} from '@/features/streaming/queries/live.queries';
import styles from './TicketPanel.module.scss';

interface Props {
  event: EventResponse;
  tickets: TicketProductResponse[];
}

export function TicketPanel({ event, tickets }: Props) {
  const router = useRouter();
  const [selected, setSelected] = useState<string | null>(tickets[0]?.id ?? null);
  const [pendingAction, setPendingAction] = useState<'cart' | null>(null);
  const addToCart = useAddToCartMutation();
  const { isLoggedIn } = useAuth();
  const t = useTranslations('ticketPanel');

  const liveAccess = useLiveAccessQuery(event.id, isLoggedIn);
  const replayAccess = useReplayAccessQuery(event.id, isLoggedIn);

  const isLive = event.status === 'LIVE';
  const isFinished = event.status === 'FINISHED';

  const purchasableTickets = isFinished
    ? tickets.filter((t) => t.capabilities.includes('REPLAY_VIEW'))
    : tickets;

  const ticket = purchasableTickets.find((t) => t.id === selected) ?? purchasableTickets[0];

  const ownsLive = liveAccess.data === true;
  const ownsReplay = replayAccess.data === true;
  const owns = isLoggedIn && (ownsLive || ownsReplay);
  const accessLoading = isLoggedIn && (liveAccess.isLoading || replayAccess.isLoading);

  const playback = useLivePlaybackQuery(event.id, ownsLive);
  const liveNow = playback.data?.live === true;

  if (event.status === 'CANCELLED') {
    return (
      <div className={styles.panel}>
        <div className={styles.glow} aria-hidden />
        <div className={styles.panelContent}>
          <p className={styles.empty}>{t('cancelled')}</p>
        </div>
      </div>
    );
  }

  if (accessLoading) {
    return (
      <div className={styles.panel}>
        <div className={styles.glow} aria-hidden />
        <div className={styles.panelContent}>
          <p className={styles.empty}>{t('verifyingAccess')}</p>
        </div>
      </div>
    );
  }

  if (owns) {
    return (
      <div className={styles.panel}>
        <div className={styles.glow} aria-hidden />
        <div className={styles.panelContent}>
          <div className={styles.ownedBadge}>
            <CheckCircle2 size={18} /> {t('ticketSecured')}
          </div>
          {liveNow ? (
            <>
              <Button
                variant="primary"
                fullWidth
                icon={<Tv2 size={16} />}
                className={styles.ticketAction}
                onClick={() => router.push(`/live/${event.id}`)}
              >
                {t('watchNow')}
              </Button>
              <p className={styles.ownedNote}>{t('streamIsLive')}</p>
            </>
          ) : isFinished && ownsReplay ? (
            <>
              <Button
                variant="primary"
                fullWidth
                icon={<RotateCcw size={16} />}
                className={styles.ticketAction}
                onClick={() => router.push(`/replay/${event.id}`)}
              >
                {t('watchReplay')}
              </Button>
              <p className={styles.ownedNote}>{t('replayAvailable')}</p>
            </>
          ) : (
            <p className={styles.ownedNote}>{t('alreadyHaveAccess')}</p>
          )}
        </div>
      </div>
    );
  }

  if (purchasableTickets.length === 0) {
    return (
      <div className={styles.panel}>
        <div className={styles.glow} aria-hidden />
        <div className={styles.panelContent}>
          <p className={styles.empty}>
            {isFinished ? t('noReplay') : t('noTickets')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.panel}>
      <div className={styles.glow} aria-hidden />
      <div className={styles.panelContent}>
        <div className={styles.panelLabel}>
          {isFinished ? t('buyReplay') : t('buyTicket')}
        </div>

        <div className={styles.ticketOptions}>
          {purchasableTickets.map((opt) => (
            <button
              key={opt.id}
              onClick={() => setSelected(opt.id)}
              className={`${styles.ticketOption} ${selected === opt.id ? styles.ticketOptionSelected : styles.ticketOptionDefault}`}
            >
              <div className={styles.ticketOptionHeader}>
                <span className={styles.ticketOptionName}>{opt.name}</span>
                <span className={styles.ticketOptionPrice}>{formatPrice(opt.price)}</span>
              </div>
              {opt.description && (
                <p className={styles.ticketOptionDesc}>{opt.description}</p>
              )}
            </button>
          ))}
        </div>

        <div className={styles.divider} />

        {ticket && (
          <>
            <div className={styles.totalRow}>
              <span className={styles.totalLabel}>Total</span>
              <div className={styles.totalRight}>
                <span className={styles.currency}>BRL</span>
                <span className={styles.totalAmount}>{formatPrice(ticket.price)}</span>
              </div>
            </div>
            <p className={styles.totalNote}>{t('validFor')}</p>
          </>
        )}

        <button
          className={styles.buyBtn}
          onClick={() => {
            if (!ticket) return;
            if (!isLoggedIn) {
              router.push(`/login?next=/events/${event.id}/checkout?ticketId=${ticket.id}`);
              return;
            }
            router.push(`/events/${event.id}/checkout?ticketId=${ticket.id}`);
          }}
        >
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
            <path d="M3 9a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2 2 2 0 0 0 0 4 2 2 0 0 1-2 2H5a2 2 0 0 1-2-2 2 2 0 0 0 0-4Z"/>
          </svg>
          {isFinished ? t('buyReplay') : t('buyTicket')}
        </button>

        <button
          className={styles.cartBtn}
          disabled={addToCart.isPending}
          onClick={() => {
            if (!ticket) return;
            if (!isLoggedIn) { router.push('/login'); return; }
            setPendingAction('cart');
            addToCart.mutate(ticket.id, {
              onSettled: () => setPendingAction(null),
            });
          }}
        >
          {pendingAction === 'cart' ? (
            <><span className={styles.btnSpinner} />{t('adding')}</>
          ) : (
            <>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 4h2l2.5 12h11l2-8H6.5"/>
                <circle cx="9" cy="20" r="1.4"/>
                <circle cx="18" cy="20" r="1.4"/>
              </svg>
              {t('addToCart')}
            </>
          )}
        </button>

        {isLive && (
          <div className={styles.demoLink}>
            <button onClick={() => router.push(`/live/${event.id}`)} className={styles.demoBtn}>
              {t('freePreview')}
            </button>
          </div>
        )}

        <div className={styles.secureNote}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3Z"/>
            <path d="M9 12l2 2 4-4"/>
          </svg>
          COMPRA 100% SEGURA
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Replace `TicketPanel.module.scss`**

```scss
@use '../../../../styles/_variables' as *;

@keyframes spin { to { transform: rotate(360deg); } }

// ── Panel container ──────────────────────────────────────────────
.panel {
  position: sticky;
  top: 96px;
  background: #101013;
  border: 1px solid rgba(255, 255, 255, .08);
  border-radius: 20px;
  padding: 24px;
  overflow: hidden;

  @media (max-width: 860px) { position: static; }
}

.glow {
  position: absolute;
  top: -60px;
  right: -50px;
  width: 180px;
  height: 180px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255, 46, 158, .18), transparent 70%);
  pointer-events: none;
}

.panelContent {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 0;
}

// ── Panel label ──────────────────────────────────────────────────
.panelLabel {
  font-family: 'Space Mono', monospace;
  font-size: 11px;
  letter-spacing: .14em;
  color: #ff7ec2;
  font-weight: 700;
  text-transform: uppercase;
  margin-bottom: 16px;
}

// ── Empty / loading states ────────────────────────────────────────
.empty {
  color: $text-secondary;
  font-size: .875rem;
  text-align: center;
  padding: 2rem 0;
  margin: 0;
}

// ── Owned state ──────────────────────────────────────────────────
.ownedBadge {
  display: flex;
  align-items: center;
  gap: .5rem;
  color: $success-light;
  font-weight: 600;
  font-size: .95rem;
  margin-bottom: 1rem;
}

.ownedNote {
  color: $text-secondary;
  font-size: .8rem;
  text-align: center;
  margin: .5rem 0 0;
}

.ticketAction {
  padding: .875rem;
  font-size: .9rem;
  font-weight: 700;
  border-radius: 14px;
}

// ── Ticket options ────────────────────────────────────────────────
.ticketOptions {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 18px;
}

.ticketOption {
  width: 100%;
  text-align: left;
  border-radius: 16px;
  padding: 18px;
  cursor: pointer;
  transition: border-color .15s, background .15s;
  border: 1px solid transparent;
}

.ticketOptionSelected {
  background: rgba(255, 46, 158, .05);
  border-color: rgba(255, 46, 158, .34);
}

.ticketOptionDefault {
  background: rgba(255, 255, 255, .03);
  border-color: rgba(255, 255, 255, .09);

  &:hover { border-color: rgba(255, 46, 158, .22); }
}

.ticketOptionHeader {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
  margin-bottom: 8px;
}

.ticketOptionName {
  font-size: 17px;
  font-weight: 700;
  letter-spacing: -.01em;
  line-height: 1.25;
  color: $text-primary;
}

.ticketOptionPrice {
  font-family: 'Space Mono', monospace;
  font-size: 16px;
  font-weight: 700;
  white-space: nowrap;
  color: $text-primary;
  flex-shrink: 0;
}

.ticketOptionDesc {
  font-size: 13.5px;
  color: #9a9aa2;
  line-height: 1.45;
  margin: 0;
}

// ── Divider ──────────────────────────────────────────────────────
.divider {
  height: 1px;
  background: rgba(255, 255, 255, .1);
  margin-bottom: 18px;
}

// ── Total ────────────────────────────────────────────────────────
.totalRow {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  margin-bottom: 4px;
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

.totalAmount {
  font-family: 'Space Mono', monospace;
  font-size: 28px;
  font-weight: 700;
  letter-spacing: -.01em;
  color: $action;
  line-height: 1;
}

.totalNote {
  font-family: 'Space Mono', monospace;
  font-size: 10.5px;
  letter-spacing: .04em;
  color: #7d7d85;
  text-transform: uppercase;
  margin: 0 0 20px;
}

// ── Buttons ───────────────────────────────────────────────────────
.buyBtn {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 9px;
  background: $action;
  color: #0a0a0b;
  font-weight: 700;
  font-size: 15px;
  border: none;
  padding: 16px;
  border-radius: 14px;
  cursor: pointer;
  margin-bottom: 11px;
  font-family: 'Archivo', sans-serif;
  transition: filter .15s;

  &:hover { filter: brightness(1.08); }
  svg { flex-shrink: 0; }
}

.cartBtn {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 9px;
  background: transparent;
  color: $text-primary;
  font-weight: 600;
  font-size: 14px;
  border: 1px solid rgba(255, 255, 255, .18);
  padding: 14px;
  border-radius: 14px;
  cursor: pointer;
  font-family: 'Archivo', sans-serif;
  transition: border-color .15s, color .15s;

  &:hover:not(:disabled) { border-color: $action; color: #ff5fb4; }
  &:disabled { opacity: .5; cursor: not-allowed; }
  svg { flex-shrink: 0; }
}

.btnSpinner {
  width: 14px;
  height: 14px;
  border: 2px solid rgba(255, 255, 255, .2);
  border-top-color: currentColor;
  border-radius: 50%;
  animation: spin .7s linear infinite;
  flex-shrink: 0;
}

// ── Demo / free preview ──────────────────────────────────────────
.demoLink { text-align: center; margin-top: 10px; }

.demoBtn {
  background: none;
  border: none;
  color: $text-muted;
  font-size: .8rem;
  cursor: pointer;
  transition: color .15s;

  &:hover { color: $text-secondary; }
}

// ── Security note ────────────────────────────────────────────────
.secureNote {
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
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd /Users/ysraelmoreno/Documents/codes/live-show/live-show-react && npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/features/events/components/public/TicketPanel.tsx src/features/events/components/public/TicketPanel.module.scss
git commit -m "refactor(events): update ticket panel to new purchase card design"
```

---

## Self-Review

**Spec coverage:**
- [x] Back link: Space Mono 12px VOLTAR arrow SVG → Task 1
- [x] Hero: aspect-ratio 21/8, 20px radius, border, margin-bottom 28px → Task 1
- [x] Hero: gradient placeholder → Task 1
- [x] Hero: bottom scrim → Task 1
- [x] Hero: camera chip top-right glassmorphism → Task 1
- [x] Hero: badges (REPLAY pink pill, AO VIVO magenta, status neutral) → Task 1
- [x] Hero: H1 54px/800 → Task 1
- [x] Hero: venue line with magenta pin SVG → Task 1
- [x] Meta cards: 16px radius, 18px padding, Space Mono label, 14px/600 value → Task 1
- [x] Org card: 16px radius, 48×48 avatar, orgLabel/orgName/orgArrow → Task 1
- [x] About: "SOBRE O SHOW" label, 16px body, 62ch max-width → Task 1
- [x] Camera grid: kept, 12px radius → Task 1
- [x] Grid: 1fr 388px gap 28px → Task 1
- [x] TicketPanel: 20px radius sticky 96px, magenta glow → Task 2
- [x] Panel label color #ff7ec2 Space Mono 11px → Task 2
- [x] Ticket option: selected magenta border/bg, unselected neutral → Task 2
- [x] Divider 1px rgba(255,255,255,.1) → Task 2
- [x] Total: 28px magenta amount, BRL label, "ACESSO VÁLIDO..." note → Task 2
- [x] Buy button: magenta #ff2e9e / #0a0a0b text / 16px padding / 14px radius → Task 2
- [x] Cart button: transparent / rgba border / hover magenta → Task 2
- [x] Security note Space Mono shield icon → Task 2
- [x] inline style `style={{ opacity: 0 }}` removed → `.cameraNameHidden` class → Task 1

**Placeholder scan:** None found.

**Type consistency:**
- `EventResponse`, `TicketProductResponse` — unchanged, same imports as before
- `cameras.length || event.camerasCount || 0` — `event.camerasCount` is on `EventResponse` (confirmed in original code: `t('angles', { count: cameras.length || event.camerasCount })`)
- `formatPrice`, `formatDate`, `formatTime`, `formatDuration`, `statusLabel` — all imported from same path as before, unchanged
