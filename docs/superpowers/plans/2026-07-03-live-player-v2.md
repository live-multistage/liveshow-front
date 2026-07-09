# Live Player v2 + Chat Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor `/live/[eventId]` to the "Liveshow Live Player v2" mockup and stand up a local-only chat feature (`src/features/chat`) that a real backend can drop into later without touching call sites.

**Architecture:** `LivePlayer.tsx` stays the state owner (stages, cameras, view mode, quality, mute/volume, chat open/closed) but its rendering is split into five focused children instead of two: `Header` (top bar — stage tabs, viewer count, drawer toggles, share, exit), `CameraGrid` (trimmed down to just the video-mode dispatcher it already mostly is), `CameraStrip` (new — bottom camera-picker drawer, replaces `CameraGrid`'s old right sidebar), `TransportBar` (restyled bottom controls, gains a volume slider and a Picture-in-Picture button), and `ChatDock` (new, from the separate `chat` feature). `StageSelector.tsx` is deleted — its job folds into `Header`. Chat is fully local: `useChat` holds messages/reactions in React state, no network calls, shaped so a real transport can replace its internals later without changing any call site.

**Tech Stack:** Next.js App Router, React, TypeScript, SCSS modules, lucide-react icons, `@tanstack/react-query` (unchanged, already used by existing streaming queries — chat does not use it, since chat has no server calls yet).

## Global Constraints

- No test runner exists in `live-show-react` (`package.json` has no `test` script). Every "verify" step is `npx tsc --noEmit -p tsconfig.json` run from `/Users/ysraelmoreno/Documents/codes/live-show/live-show-react`, expected output `TypeScript: No errors found` (or empty output, tsc's normal success case). Do not add jest/vitest/playwright as part of this plan — out of scope.
- Every new/rewritten `.module.scss` file starts with `@use '../../../styles/_variables' as *;` (3 levels up from `src/features/<feature>/components/` to `src/styles/`). Reuse existing tokens — `$action`, `$action-dim`, `$action-bg`, `$border`, `$surface`, `$bg`, `$muted`, `$text-primary`, `$text-secondary`, `$text-muted` — never hardcode a hex value that already has one of these tokens. Decorative gradient/avatar colors that have no token in `src/styles/_variables.scss` (e.g. camera-thumbnail placeholder gradients, chat avatar colors) may stay as raw hex — consistent with `DESIGN_SYSTEM.md`'s own secondary/data-viz palette, which is also untokenized.
- Every new component file starts with `'use client';` — this whole feature is interactive/stateful, no server components involved.
- Font families are hardcoded per-file as `'Archivo', sans-serif` and `'Space Mono', monospace` (no shared font-variable exists in this codebase — `StageSelector.module.scss` and `LivePlayer.module.scss` both do this today). Follow the same pattern, do not introduce a new font token.
- Design source of truth: `docs/superpowers/specs/2026-07-03-live-player-v2-design.md`. If anything in this plan contradicts that spec, the spec wins — stop and flag it rather than guessing.
- Portuguese (PT-BR) UI copy is hardcoded directly in JSX, not run through `next-intl`'s `useTranslations` — this matches every existing sibling component in `features/streaming/components/` (`StageSelector.tsx`, `CameraGrid.tsx`, `LivePlayer.tsx`'s bottom bar all hardcode PT-BR strings directly; only `LiveGate.tsx` uses `useTranslations`). Do not introduce new translation keys for this feature.

---

## Task 1: Chat types + local-only `useChat` hook

**Files:**
- Create: `src/features/chat/types/chat.types.ts`
- Create: `src/features/chat/hooks/use-chat.ts`
- Modify: `src/features/chat/index.ts`

**Interfaces:**
- Produces: `ChatMessage` (`id`, `authorName`, `authorInitials`, `authorColor`, `body`, `sentAt` — all `string`), `ReactionEmoji` (union of 5 literal emoji strings), `REACTION_EMOJIS: ReactionEmoji[]`, and `useChat(eventId: string): { messages: ChatMessage[]; sendMessage: (body: string) => void; reactionCounts: Record<ReactionEmoji, number>; totalReactions: number; react: (emoji: ReactionEmoji) => void }`. Task 2's components consume `ChatMessage`/`ReactionEmoji`. Task 3's `ChatDock` consumes the full `useChat` return shape (via props, not by calling the hook itself — see Task 9). Task 9's `LivePlayer` calls `useChat(eventId)` directly.

- [ ] **Step 1: Write the types file**

Create `src/features/chat/types/chat.types.ts`:

```ts
export interface ChatMessage {
  id: string;
  authorName: string;
  authorInitials: string;
  authorColor: string;
  body: string;
  // ISO timestamp — formatted for display where it's rendered (ChatMessageItem),
  // not here, so this type stays serialization-friendly for a future API.
  sentAt: string;
}

export type ReactionEmoji = '💜' | '🔥' | '🤘' | '👏' | '✨';
```

- [ ] **Step 2: Write the hook**

Create `src/features/chat/hooks/use-chat.ts`:

```ts
'use client';

import { useCallback, useMemo, useState } from 'react';
import { useAuth } from '@/features/account/hooks/use-auth';
import type { ChatMessage, ReactionEmoji } from '../types/chat.types';

export const REACTION_EMOJIS: ReactionEmoji[] = ['💜', '🔥', '🤘', '👏', '✨'];

const AVATAR_COLORS = ['#46d6d8', '#9b7bff', '#7fe0a0', '#ff7a4d', '#bba6ff', '#ffd166'];

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 31 + value.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '??';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

function emptyReactionCounts(): Record<ReactionEmoji, number> {
  return { '💜': 0, '🔥': 0, '🤘': 0, '👏': 0, '✨': 0 };
}

// Local-only chat: no network calls, state lives here for the lifetime of the
// player. `eventId` is unused today but kept in the signature so a future
// real-transport version of this hook (sockets/query) is a drop-in
// replacement — no call site needs to change when that lands.
export function useChat(eventId: string) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [reactionCounts, setReactionCounts] = useState<Record<ReactionEmoji, number>>(emptyReactionCounts);

  const sendMessage = useCallback((body: string) => {
    const trimmed = body.trim();
    if (!trimmed) return;
    const authorName = user?.displayName ?? 'Você';
    const message: ChatMessage = {
      id: crypto.randomUUID(),
      authorName,
      authorInitials: initialsFromName(authorName),
      authorColor: AVATAR_COLORS[hashString(authorName) % AVATAR_COLORS.length],
      body: trimmed,
      sentAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, message]);
  }, [user?.displayName]);

  const react = useCallback((emoji: ReactionEmoji) => {
    setReactionCounts((prev) => ({ ...prev, [emoji]: prev[emoji] + 1 }));
  }, []);

  const totalReactions = useMemo(
    () => Object.values(reactionCounts).reduce((sum, count) => sum + count, 0),
    [reactionCounts],
  );

  return { messages, sendMessage, reactionCounts, totalReactions, react };
}
```

- [ ] **Step 3: Export from the feature barrel**

Replace the entire contents of `src/features/chat/index.ts` with:

```ts
export { useChat, REACTION_EMOJIS } from './hooks/use-chat';
export type { ChatMessage, ReactionEmoji } from './types/chat.types';
```

- [ ] **Step 4: Verify**

```bash
cd /Users/ysraelmoreno/Documents/codes/live-show/live-show-react && npx tsc --noEmit -p tsconfig.json
```
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/features/chat/types/chat.types.ts src/features/chat/hooks/use-chat.ts src/features/chat/index.ts
git commit -m "feat: add local-only chat types and useChat hook"
```

---

## Task 2: Chat presentational components

**Files:**
- Create: `src/features/chat/components/ChatMessageItem.tsx`
- Create: `src/features/chat/components/ChatMessageItem.module.scss`
- Create: `src/features/chat/components/ChatMessageList.tsx`
- Create: `src/features/chat/components/ChatMessageList.module.scss`
- Create: `src/features/chat/components/ChatInput.tsx`
- Create: `src/features/chat/components/ChatInput.module.scss`
- Create: `src/features/chat/components/ReactionBar.tsx`
- Create: `src/features/chat/components/ReactionBar.module.scss`

**Interfaces:**
- Consumes: `ChatMessage`, `ReactionEmoji` from `../types/chat.types` (Task 1); `REACTION_EMOJIS` from `../hooks/use-chat` (Task 1).
- Produces: `ChatMessageList({ messages: ChatMessage[] })`, `ChatInput({ onSend: (body: string) => void })`, `ReactionBar({ onReact: (emoji: ReactionEmoji) => void })`. Task 3's `ChatDock` renders all three.

- [ ] **Step 1: `ChatMessageItem`**

Create `src/features/chat/components/ChatMessageItem.tsx`:

```tsx
'use client';

import type { ChatMessage } from '../types/chat.types';
import styles from './ChatMessageItem.module.scss';

interface Props {
  message: ChatMessage;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

export function ChatMessageItem({ message }: Props) {
  return (
    <div className={styles.item}>
      <div className={styles.avatar} style={{ backgroundColor: message.authorColor }}>
        {message.authorInitials}
      </div>
      <div className={styles.body}>
        <div className={styles.meta}>
          <span className={styles.author}>{message.authorName}</span>
          <span className={styles.time}>{formatTime(message.sentAt)}</span>
        </div>
        <div className={styles.text}>{message.body}</div>
      </div>
    </div>
  );
}
```

Create `src/features/chat/components/ChatMessageItem.module.scss`:

```scss
@use '../../../styles/_variables' as *;

.item {
  display: flex;
  gap: 0.5625rem;
}

.avatar {
  width: 1.625rem;
  height: 1.625rem;
  border-radius: 50%;
  color: #0a0a0b;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'Space Mono', monospace;
  font-weight: 700;
  font-size: 0.59rem;
  flex-shrink: 0;
}

.body {
  min-width: 0;
}

.meta {
  display: flex;
  align-items: baseline;
  gap: 0.375rem;
  margin-bottom: 0.125rem;
}

.author {
  font-size: 0.71875rem;
  font-weight: 700;
  color: $text-primary;
}

.time {
  font-family: 'Space Mono', monospace;
  font-size: 0.53125rem;
  color: $text-muted;
}

.text {
  font-size: 0.75rem;
  line-height: 1.45;
  color: $text-secondary;
}
```

- [ ] **Step 2: `ChatMessageList`**

Create `src/features/chat/components/ChatMessageList.tsx`:

```tsx
'use client';

import { useEffect, useRef } from 'react';
import type { ChatMessage } from '../types/chat.types';
import { ChatMessageItem } from './ChatMessageItem';
import styles from './ChatMessageList.module.scss';

interface Props {
  messages: ChatMessage[];
}

// Auto-scrolls to the newest message whenever the list grows — every live
// chat UX (Twitch/YouTube) does this so viewers never have to scroll down
// manually to see what's just been posted.
export function ChatMessageList({ messages }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' });
  }, [messages.length]);

  return (
    <div className={styles.list}>
      {messages.length === 0 ? (
        <p className={styles.empty}>Seja o primeiro a comentar</p>
      ) : (
        messages.map((message) => <ChatMessageItem key={message.id} message={message} />)
      )}
      <div ref={bottomRef} />
    </div>
  );
}
```

Create `src/features/chat/components/ChatMessageList.module.scss`:

```scss
@use '../../../styles/_variables' as *;

.list {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 0.75rem 0.875rem;
  display: flex;
  flex-direction: column;
  gap: 0.7rem;
}

.empty {
  margin: auto;
  color: $muted;
  font-size: 0.75rem;
  font-family: 'Space Mono', monospace;
  text-align: center;
}
```

- [ ] **Step 3: `ChatInput`**

Create `src/features/chat/components/ChatInput.tsx`:

```tsx
'use client';

import { useState, type FormEvent } from 'react';
import { Send } from 'lucide-react';
import styles from './ChatInput.module.scss';

interface Props {
  onSend: (body: string) => void;
}

export function ChatInput({ onSend }: Props) {
  const [value, setValue] = useState('');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!value.trim()) return;
    onSend(value);
    setValue('');
  };

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Mensagem…"
        className={styles.input}
      />
      <button type="submit" className={styles.sendBtn} aria-label="Enviar mensagem" disabled={!value.trim()}>
        <Send size={13} />
      </button>
    </form>
  );
}
```

Create `src/features/chat/components/ChatInput.module.scss`:

```scss
@use '../../../styles/_variables' as *;

.form {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid $border;
  border-radius: 9px;
  padding: 0.5rem 0.6875rem;
}

.input {
  flex: 1;
  min-width: 0;
  background: transparent;
  border: none;
  outline: none;
  color: $text-primary;
  font-family: 'Archivo', sans-serif;
  font-size: 0.75rem;
}

.sendBtn {
  width: 1.625rem;
  height: 1.625rem;
  border-radius: 6px;
  background-color: $action;
  border: none;
  color: #0a0a0b;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex-shrink: 0;
  transition: opacity 0.15s;

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
}
```

- [ ] **Step 4: `ReactionBar`**

Create `src/features/chat/components/ReactionBar.tsx`:

```tsx
'use client';

import type { ReactionEmoji } from '../types/chat.types';
import { REACTION_EMOJIS } from '../hooks/use-chat';
import styles from './ReactionBar.module.scss';

interface Props {
  onReact: (emoji: ReactionEmoji) => void;
}

export function ReactionBar({ onReact }: Props) {
  return (
    <div className={styles.bar}>
      <span className={styles.label}>REAGIR</span>
      {REACTION_EMOJIS.map((emoji) => (
        <button key={emoji} className={styles.emojiBtn} onClick={() => onReact(emoji)}>
          {emoji}
        </button>
      ))}
    </div>
  );
}
```

Create `src/features/chat/components/ReactionBar.module.scss`:

```scss
@use '../../../styles/_variables' as *;

.bar {
  display: flex;
  align-items: center;
  gap: 0.3125rem;
  padding: 0.5rem 0.875rem;
  border-top: 1px solid $border;
  flex-shrink: 0;
}

.label {
  font-family: 'Space Mono', monospace;
  font-size: 0.5625rem;
  letter-spacing: 0.12em;
  color: $text-muted;
  margin-right: 0.125rem;
}

.emojiBtn {
  width: 1.75rem;
  height: 1.75rem;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.04);
  border: none;
  cursor: pointer;
  font-size: 0.8125rem;
  transition: background-color 0.15s;

  &:hover {
    background-color: rgba(255, 255, 255, 0.1);
  }
}
```

- [ ] **Step 5: Verify**

```bash
cd /Users/ysraelmoreno/Documents/codes/live-show/live-show-react && npx tsc --noEmit -p tsconfig.json
```
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/features/chat/components/ChatMessageItem.tsx src/features/chat/components/ChatMessageItem.module.scss src/features/chat/components/ChatMessageList.tsx src/features/chat/components/ChatMessageList.module.scss src/features/chat/components/ChatInput.tsx src/features/chat/components/ChatInput.module.scss src/features/chat/components/ReactionBar.tsx src/features/chat/components/ReactionBar.module.scss
git commit -m "feat: add chat message list, input and reaction bar components"
```

---

## Task 3: `ChatDock`, `ReactionsTicker` + barrel export

**Files:**
- Create: `src/features/chat/components/ChatDock.tsx`
- Create: `src/features/chat/components/ChatDock.module.scss`
- Create: `src/features/chat/components/ReactionsTicker.tsx`
- Create: `src/features/chat/components/ReactionsTicker.module.scss`
- Modify: `src/features/chat/index.ts`

**Interfaces:**
- Consumes: `ChatMessage`, `ReactionEmoji` (Task 1); `ChatMessageList`, `ChatInput`, `ReactionBar` (Task 2).
- Produces: `ChatDock({ open: boolean; onClose: () => void; messages: ChatMessage[]; onSend: (body: string) => void; onReact: (emoji: ReactionEmoji) => void })` and `ReactionsTicker({ totalReactions: number })`. Both are controlled components — they don't call `useChat` themselves. Task 9's `LivePlayer` calls `useChat(eventId)` once and passes its fields down to both `ChatDock` and the `Header`'s chat-badge count, so the message count shown in the header toggle and the messages shown in the dock always agree.

- [ ] **Step 1: `ChatDock`**

Create `src/features/chat/components/ChatDock.tsx`:

```tsx
'use client';

import { X, MessageSquare } from 'lucide-react';
import type { ChatMessage, ReactionEmoji } from '../types/chat.types';
import { ChatMessageList } from './ChatMessageList';
import { ChatInput } from './ChatInput';
import { ReactionBar } from './ReactionBar';
import styles from './ChatDock.module.scss';

interface Props {
  open: boolean;
  onClose: () => void;
  messages: ChatMessage[];
  onSend: (body: string) => void;
  onReact: (emoji: ReactionEmoji) => void;
}

export function ChatDock({ open, onClose, messages, onSend, onReact }: Props) {
  if (!open) return null;

  return (
    <div className={styles.dock}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <MessageSquare size={14} color="#ff8ec9" />
          <span className={styles.title}>Chat</span>
          <span className={styles.count}>{messages.length} MENSAGENS</span>
        </div>
        <button className={styles.closeBtn} onClick={onClose} aria-label="Fechar chat">
          <X size={12} />
        </button>
      </div>

      <ChatMessageList messages={messages} />
      <ReactionBar onReact={onReact} />

      <div className={styles.inputArea}>
        <ChatInput onSend={onSend} />
      </div>
    </div>
  );
}
```

Create `src/features/chat/components/ChatDock.module.scss`:

```scss
@use '../../../styles/_variables' as *;

.dock {
  display: flex;
  flex-direction: column;
  width: 320px;
  flex-shrink: 0;
  background-color: rgba(10, 10, 12, 0.9);
  border-left: 1px solid $border;

  // Mobile: the dock has no room to sit beside the video, so it becomes a
  // fullscreen overlay instead — same breakpoint LivePlayer.module.scss
  // already uses elsewhere in this feature.
  @media (max-width: 639px) {
    position: fixed;
    inset: 0;
    z-index: 50;
    width: auto;
  }
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid $border;
  flex-shrink: 0;
}

.headerLeft {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.title {
  font-family: 'Archivo', sans-serif;
  font-size: 0.8rem;
  font-weight: 700;
  color: $text-primary;
}

.count {
  font-family: 'Space Mono', monospace;
  font-size: 0.6rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  color: $muted;
}

.closeBtn {
  width: 1.5rem;
  height: 1.5rem;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.05);
  border: none;
  color: $muted;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: color 0.15s, background-color 0.15s;

  &:hover {
    color: $text-primary;
    background-color: rgba(255, 255, 255, 0.12);
  }
}

.inputArea {
  padding: 0.625rem 0.875rem 0.75rem;
  border-top: 1px solid $border;
  flex-shrink: 0;
}
```

- [ ] **Step 2: `ReactionsTicker`**

Create `src/features/chat/components/ReactionsTicker.tsx`:

```tsx
'use client';

import styles from './ReactionsTicker.module.scss';

interface Props {
  totalReactions: number;
}

// Duplicated on purpose — every other file in this codebase that formats a
// compact count (LivePlayer.tsx, LiveNoAccess.tsx, AnalyticsDashboard.tsx)
// keeps its own copy rather than importing a shared util.
function fmtCompact(v: number): string {
  if (v >= 1000) return `${(v / 1000).toFixed(1).replace('.', ',')}k`;
  return v.toLocaleString('pt-BR');
}

export function ReactionsTicker({ totalReactions }: Props) {
  if (totalReactions === 0) return null;

  return (
    <div className={styles.ticker}>
      <span>💜</span>
      <span>🔥</span>
      <span>🤘</span>
      <span className={styles.count}>
        <strong>{fmtCompact(totalReactions)}</strong> reações
      </span>
    </div>
  );
}
```

Create `src/features/chat/components/ReactionsTicker.module.scss`:

```scss
@use '../../../styles/_variables' as *;

.ticker {
  position: absolute;
  bottom: 1.25rem;
  left: 1.25rem;
  z-index: 14;
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.375rem 0.6875rem;
  background: rgba(10, 10, 12, 0.6);
  backdrop-filter: blur(10px);
  border: 1px solid $border;
  border-radius: 20px;
  font-size: 0.8125rem;
}

.count {
  font-family: 'Space Mono', monospace;
  font-size: 0.59375rem;
  letter-spacing: 0.1em;
  color: $muted;

  strong {
    color: $text-primary;
    font-weight: 700;
  }
}
```

- [ ] **Step 3: Update the barrel**

Replace the entire contents of `src/features/chat/index.ts` with:

```ts
export { useChat, REACTION_EMOJIS } from './hooks/use-chat';
export type { ChatMessage, ReactionEmoji } from './types/chat.types';
export { ChatDock } from './components/ChatDock';
export { ReactionsTicker } from './components/ReactionsTicker';
```

- [ ] **Step 4: Verify**

```bash
cd /Users/ysraelmoreno/Documents/codes/live-show/live-show-react && npx tsc --noEmit -p tsconfig.json
```
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/features/chat/components/ChatDock.tsx src/features/chat/components/ChatDock.module.scss src/features/chat/components/ReactionsTicker.tsx src/features/chat/components/ReactionsTicker.module.scss src/features/chat/index.ts
git commit -m "feat: add ChatDock and ReactionsTicker, complete chat feature barrel"
```

---

## Task 4: `VideoPanel` gains `volume` prop + `data-focused` attribute

**Files:**
- Modify: `src/features/streaming/components/VideoPanel.tsx`

**Interfaces:**
- Produces: new optional `VideoPanelProps` field `volume?: number` (default `1`, applied via `video.volume`), and a `data-focused="true"|"false"` attribute on the rendered `<video>` element reflecting the existing `isFocused` prop. Every other prop/behavior is unchanged. Task 5 threads `volume` through `SoloView`/`MainRailView`/`GridView`. Task 9's `LivePlayer` uses `document.querySelector('video[data-focused="true"]')` (via its existing `containerRef`) to find the Picture-in-Picture target.

- [ ] **Step 1: Add the `volume` prop to the interface**

In `VideoPanel.tsx`, find the `VideoPanelProps` interface's last two fields (`fit?: 'contain' | 'cover';` and `showMuteButton?: boolean;`). Add a new field after `showMuteButton`:

```ts
  // Small thumbnails (PIP, rail) don't get their own mute toggle — audio is
  // one global choice (LivePlayer's cog menu), not per-tile at that size.
  showMuteButton?: boolean;
  // Applied via video.volume. Independent from `muted` — mute is a hard
  // on/off switch, volume only matters once unmuted. Optional: utility
  // thumbnails (PIP, rail, CameraStrip) never pass it and get the browser
  // default of 1, which is irrelevant since they're always muted anyway.
  volume?: number;
```

- [ ] **Step 2: Destructure it with a default**

Find the function signature's parameter list (`fit = 'contain', showMuteButton = true, }: VideoPanelProps) {`). Add `volume = 1,` right after `showMuteButton = true,`:

```tsx
  fit = 'contain',
  showMuteButton = true,
  volume = 1,
}: VideoPanelProps) {
```

- [ ] **Step 3: Apply volume to the video element**

Find the existing effect that applies `muted`:

```tsx
  useEffect(() => {
    if (videoRef.current) videoRef.current.muted = muted;
  }, [muted]);
```

Add a new effect right after it:

```tsx
  useEffect(() => {
    if (videoRef.current) videoRef.current.volume = volume;
  }, [volume]);
```

- [ ] **Step 4: Add the `data-focused` attribute**

Find the `<video>` element:

```tsx
      <video
        ref={videoRef}
        className={styles.video}
        style={{ objectFit: fit }}
        autoPlay
        muted
        playsInline
      />
```

Change it to:

```tsx
      <video
        ref={videoRef}
        className={styles.video}
        style={{ objectFit: fit }}
        data-focused={isFocused}
        autoPlay
        muted
        playsInline
      />
```

- [ ] **Step 5: Verify**

```bash
cd /Users/ysraelmoreno/Documents/codes/live-show/live-show-react && npx tsc --noEmit -p tsconfig.json
```
Expected: no errors. (No existing call site passes `volume` yet, so nothing else needs to change — it's optional with a default matching today's implicit browser behavior.)

- [ ] **Step 6: Commit**

```bash
git add src/features/streaming/components/VideoPanel.tsx
git commit -m "feat: add volume control and PiP-target attribute to VideoPanel"
```

---

## Task 5: Thread `volume` through `SoloView`, `MainRailView`, `GridView`

**Files:**
- Modify: `src/features/streaming/components/SoloView.tsx`
- Modify: `src/features/streaming/components/MainRailView.tsx`
- Modify: `src/features/streaming/components/GridView.tsx`

**Interfaces:**
- Consumes: `VideoPanel`'s new `volume` prop (Task 4).
- Produces: new optional `volume?: number` prop (default `1`) on all three components' own prop interfaces. Task 9's trimmed `CameraGrid` passes `volume={volume}` explicitly to all three (making it non-optional in practice from that call site, even though the prop itself stays optional here for backward compatibility with the not-yet-trimmed `CameraGrid` that exists between this task and Task 9).
- Also (in `GridView` only): each tile gets `isFocused={camera.cameraId === audioCameraId}` so Grid mode has a Picture-in-Picture target — Solo and Main+Rail already mark their main tile `isFocused`, Grid currently marks none.

- [ ] **Step 1: `SoloView`**

Replace the entire contents of `src/features/streaming/components/SoloView.tsx` with:

```tsx
'use client';

import type { LiveCamera } from '../types/live.types';
import { VideoPanel } from './VideoPanel';
import type { QualityLevel } from './VideoPanel';
import styles from './SoloView.module.scss';

interface Props {
  camera: LiveCamera;
  muted: boolean;
  onMutedChange: (muted: boolean) => void;
  volume?: number;
  selectedLevel?: number;
  onLevelsReady?: (levels: QualityLevel[]) => void;
}

// One camera, fills the whole player area. Used for viewMode 'solo', and
// forced whenever there's only one active camera regardless of the
// selected viewMode (CameraGrid handles that fallback).
export function SoloView({ camera, muted, onMutedChange, volume = 1, selectedLevel, onLevelsReady }: Props) {
  return (
    <div className={styles.solo}>
      <VideoPanel
        camera={camera}
        isFocused
        showLabel
        muted={muted}
        onMutedChange={onMutedChange}
        volume={volume}
        selectedLevel={selectedLevel}
        onLevelsReady={onLevelsReady}
      />
    </div>
  );
}
```

- [ ] **Step 2: `MainRailView`**

Replace the entire contents of `src/features/streaming/components/MainRailView.tsx` with:

```tsx
'use client';

import type { LiveCamera } from '../types/live.types';
import { VideoPanel } from './VideoPanel';
import type { QualityLevel } from './VideoPanel';
import { PipOverlay } from './PipOverlay';
import { CameraRail } from './CameraRail';
import styles from './MainRailView.module.scss';

interface Props {
  mainCamera: LiveCamera;
  otherCameras: LiveCamera[];
  onSelectMain: (cameraId: string) => void;
  muted: boolean;
  onMutedChange: (muted: boolean) => void;
  volume?: number;
  selectedLevel?: number;
  onLevelsReady?: (levels: QualityLevel[]) => void;
}

// F1 TV-style layout: big main video + either a PIP overlay (exactly 1
// other active camera) or a sidebar rail (2 or more others). See
// docs/superpowers/specs/2026-07-02-live-viewer-camera-modes-design.md for
// why the split happens at exactly 2-total vs 3-plus-total cameras.
export function MainRailView({
  mainCamera,
  otherCameras,
  onSelectMain,
  muted,
  onMutedChange,
  volume = 1,
  selectedLevel,
  onLevelsReady,
}: Props) {
  return (
    <div className={styles.wrap}>
      <div className={styles.mainArea}>
        <VideoPanel
          camera={mainCamera}
          isFocused
          showLabel
          muted={muted}
          onMutedChange={onMutedChange}
          volume={volume}
          selectedLevel={selectedLevel}
          onLevelsReady={onLevelsReady}
        />
        {otherCameras.length === 1 && (
          <PipOverlay camera={otherCameras[0]} onSelect={() => onSelectMain(otherCameras[0].cameraId)} />
        )}
      </div>
      {otherCameras.length >= 2 && <CameraRail cameras={otherCameras} onSelect={onSelectMain} />}
    </div>
  );
}
```

- [ ] **Step 3: `GridView`**

In `src/features/streaming/components/GridView.tsx`, add `volume?: number;` to the `Props` interface right after `onAudioCameraChange`:

```ts
interface Props {
  cameras: LiveCamera[];
  onSelectCamera: (cameraId: string) => void;
  globalMuted: boolean;
  audioCameraId: string | null;
  onAudioCameraChange: (cameraId: string) => void;
  volume?: number;
  selectedLevel?: number;
  onLevelsReady?: (levels: QualityLevel[]) => void;
}
```

Add `volume = 1,` to the destructured parameters, right after `onAudioCameraChange,`:

```tsx
export function GridView({
  cameras,
  onSelectCamera,
  globalMuted,
  audioCameraId,
  onAudioCameraChange,
  volume = 1,
  selectedLevel,
  onLevelsReady,
}: Props) {
```

Find the `<VideoPanel>` call inside the `.map`:

```tsx
                  <VideoPanel
                    camera={camera}
                    onSelect={() => onSelectCamera(camera.cameraId)}
                    showLabel
                    selectedLevel={selectedLevel}
                    onLevelsReady={onLevelsReady}
                    onAspectRatioReady={handleAspectRatioReady}
                    muted={isTileMuted(camera.cameraId)}
                    onMutedChange={(m) => handleTileMutedChange(camera.cameraId, m)}
                  />
```

Change it to (adds `isFocused` so the audible tile is the Picture-in-Picture target, and `volume`):

```tsx
                  <VideoPanel
                    camera={camera}
                    onSelect={() => onSelectCamera(camera.cameraId)}
                    showLabel
                    isFocused={camera.cameraId === audioCameraId}
                    volume={volume}
                    selectedLevel={selectedLevel}
                    onLevelsReady={onLevelsReady}
                    onAspectRatioReady={handleAspectRatioReady}
                    muted={isTileMuted(camera.cameraId)}
                    onMutedChange={(m) => handleTileMutedChange(camera.cameraId, m)}
                  />
```

- [ ] **Step 4: Verify**

```bash
cd /Users/ysraelmoreno/Documents/codes/live-show/live-show-react && npx tsc --noEmit -p tsconfig.json
```
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/features/streaming/components/SoloView.tsx src/features/streaming/components/MainRailView.tsx src/features/streaming/components/GridView.tsx
git commit -m "feat: thread volume control through Solo/MainRail/Grid views"
```

---

## Task 6: New `Header` component

**Files:**
- Create: `src/features/streaming/components/Header.tsx`
- Create: `src/features/streaming/components/Header.module.scss`

**Interfaces:**
- Consumes: `LiveStage` from `../types/live.types` (existing).
- Produces: `Header(props)` where `props` is:
```ts
interface HeaderProps {
  eventTitle?: string;
  metaLine: string;
  stages: LiveStage[];
  activeStageId: string;
  onStageChange: (stageId: string) => void;
  onExit: () => void;
  currentViewers: number;
  cameraCount: number;
  cameraStripOpen: boolean;
  onToggleCameraStrip: () => void;
  chatOpen: boolean;
  onToggleChat: () => void;
  chatMessageCount: number;
  onShare: () => void;
}
```
Task 9's `LivePlayer` renders this at the top of the player, replacing `StageSelector` (deleted in Task 9) and the header row that used to live inside `CameraGrid`.

- [ ] **Step 1: Write the component**

Create `src/features/streaming/components/Header.tsx`:

```tsx
'use client';

import { ChevronLeft, Users, Video, MessageSquare, Share2 } from 'lucide-react';
import type { LiveStage } from '../types/live.types';
import styles from './Header.module.scss';

interface Props {
  eventTitle?: string;
  metaLine: string;
  stages: LiveStage[];
  activeStageId: string;
  onStageChange: (stageId: string) => void;
  onExit: () => void;
  currentViewers: number;
  cameraCount: number;
  cameraStripOpen: boolean;
  onToggleCameraStrip: () => void;
  chatOpen: boolean;
  onToggleChat: () => void;
  chatMessageCount: number;
  onShare: () => void;
}

// Duplicated on purpose, see ReactionsTicker.tsx for why — this codebase
// keeps a local copy of this formatter in every file that needs it.
function fmtCompact(v: number): string {
  if (v >= 1000) return `${(v / 1000).toFixed(1).replace('.', ',')}k`;
  return v.toLocaleString('pt-BR');
}

export function Header({
  eventTitle,
  metaLine,
  stages,
  activeStageId,
  onStageChange,
  onExit,
  currentViewers,
  cameraCount,
  cameraStripOpen,
  onToggleCameraStrip,
  chatOpen,
  onToggleChat,
  chatMessageCount,
  onShare,
}: Props) {
  return (
    <header className={styles.header}>
      <button onClick={onExit} className={styles.backBtn} aria-label="Voltar">
        <ChevronLeft size={16} />
      </button>

      <div className={styles.titleGroup}>
        <span className={styles.liveBadge}>
          <span className={styles.liveDot} />
          AO VIVO
        </span>
        <div>
          {eventTitle && <div className={styles.title}>{eventTitle}</div>}
          <div className={styles.meta}>{metaLine}</div>
        </div>
      </div>

      {stages.length > 1 && (
        <div className={styles.tabs} role="tablist" aria-label="Palcos">
          <span className={styles.tabsLabel}>PALCOS</span>
          {stages.map((stage) => (
            <button
              key={stage.stageId}
              role="tab"
              aria-selected={stage.stageId === activeStageId}
              className={`${styles.tab} ${stage.stageId === activeStageId ? styles.tabActive : ''}`}
              onClick={() => onStageChange(stage.stageId)}
            >
              <span className={styles.tabDot} />
              {stage.name}
              <span className={styles.tabCount}>{stage.cameras.length}</span>
            </button>
          ))}
        </div>
      )}

      <div className={styles.right}>
        {currentViewers > 0 && (
          <div className={styles.viewerBadge}>
            <Users size={12} />
            {fmtCompact(currentViewers)}
          </div>
        )}
        <button
          className={`${styles.drawerBtn} ${cameraStripOpen ? styles.drawerBtnActive : ''}`}
          onClick={onToggleCameraStrip}
          title="Alternar câmeras"
        >
          <Video size={13} />
          Câmeras
          <span className={styles.badge}>{cameraCount}</span>
        </button>
        <button
          className={`${styles.drawerBtn} ${chatOpen ? styles.drawerBtnActive : ''}`}
          onClick={onToggleChat}
          title="Alternar chat"
        >
          <MessageSquare size={13} />
          Chat
          <span className={styles.badge}>{chatMessageCount}</span>
        </button>
        <button className={styles.iconBtn} onClick={onShare} title="Compartilhar" aria-label="Compartilhar">
          <Share2 size={14} />
        </button>
      </div>
    </header>
  );
}
```

- [ ] **Step 2: Write the styles**

Create `src/features/streaming/components/Header.module.scss`:

```scss
@use '../../../styles/_variables' as *;

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.4; }
}

.header {
  display: flex;
  align-items: center;
  gap: 0.875rem;
  padding: 0.75rem 1.25rem;
  background-color: $surface;
  border-bottom: 1px solid $border;
  flex-shrink: 0;
  flex-wrap: wrap;
}

.backBtn {
  width: 2.125rem;
  height: 2.125rem;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid $border;
  color: $text-primary;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex-shrink: 0;
  transition: background-color 0.15s;

  &:hover { background-color: rgba(255, 255, 255, 0.12); }
}

.titleGroup {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  flex-shrink: 0;
}

.liveBadge {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  background-color: $action;
  color: #0a0a0b;
  font-family: 'Space Mono', monospace;
  font-size: 0.625rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  padding: 0.3125rem 0.5625rem;
  border-radius: 5px;
}

.liveDot {
  width: 0.375rem;
  height: 0.375rem;
  border-radius: 50%;
  background-color: #0a0a0b;
  animation: pulse 1.2s ease-in-out infinite;
}

.title {
  font-family: 'Archivo', sans-serif;
  font-size: 0.875rem;
  font-weight: 700;
  color: $text-primary;
  line-height: 1.2;
}

.meta {
  font-family: 'Space Mono', monospace;
  font-size: 0.59375rem;
  letter-spacing: 0.1em;
  color: $text-secondary;
  margin-top: 0.125rem;
}

.tabs {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 0.25rem;
  min-width: 0;
  overflow-x: auto;
  scrollbar-width: none;

  &::-webkit-scrollbar { display: none; }
}

.tabsLabel {
  font-family: 'Space Mono', monospace;
  font-size: 0.5625rem;
  letter-spacing: 0.1em;
  color: $text-muted;
  flex-shrink: 0;
  margin-right: 0.25rem;
}

.tab {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.375rem 0.625rem;
  border-radius: 7px;
  border: none;
  background: transparent;
  color: $text-muted;
  font-family: 'Archivo', sans-serif;
  font-size: 0.71875rem;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  flex-shrink: 0;
  transition: color 0.15s;

  &:hover { color: $text-primary; }
}

.tabActive {
  background-color: $action-bg;
  color: $text-primary;

  .tabDot { background-color: $action; animation: pulse 1.2s ease-in-out infinite; }
  .tabCount { background-color: $action; color: #0a0a0b; }
}

.tabDot {
  width: 0.3125rem;
  height: 0.3125rem;
  border-radius: 50%;
  background-color: $text-muted;
  flex-shrink: 0;
}

.tabCount {
  font-family: 'Space Mono', monospace;
  font-size: 0.53125rem;
  font-weight: 700;
  color: $text-muted;
}

.right {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-shrink: 0;
  margin-left: auto;
}

.viewerBadge {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.375rem 0.6875rem;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid $border;
  border-radius: 20px;
  font-family: 'Space Mono', monospace;
  font-size: 0.65625rem;
  color: $text-secondary;
}

.drawerBtn {
  display: inline-flex;
  align-items: center;
  gap: 0.4375rem;
  padding: 0.4375rem 0.75rem;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid $border;
  color: $text-secondary;
  font-family: 'Archivo', sans-serif;
  font-size: 0.71875rem;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.15s, border-color 0.15s, color 0.15s;

  &:hover { color: $text-primary; }
}

.drawerBtnActive {
  background: $action-dim;
  border-color: rgba(255, 46, 158, 0.32);
  color: $text-primary;
}

.badge {
  font-family: 'Space Mono', monospace;
  font-size: 0.5625rem;
  font-weight: 700;
  color: #0a0a0b;
  background-color: $action;
  padding: 0.0625rem 0.3125rem;
  border-radius: 3px;
}

.iconBtn {
  width: 2.125rem;
  height: 2.125rem;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid $border;
  color: $text-secondary;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: color 0.15s, background-color 0.15s;

  &:hover { color: $text-primary; background-color: rgba(255, 255, 255, 0.12); }
}
```

- [ ] **Step 3: Verify**

```bash
cd /Users/ysraelmoreno/Documents/codes/live-show/live-show-react && npx tsc --noEmit -p tsconfig.json
```
Expected: no errors. (`Header` isn't imported anywhere yet — that's fine, it still type-checks standalone.)

- [ ] **Step 4: Commit**

```bash
git add src/features/streaming/components/Header.tsx src/features/streaming/components/Header.module.scss
git commit -m "feat: add Header component for live player v2"
```

---

## Task 7: New `CameraStrip` component

**Files:**
- Create: `src/features/streaming/components/CameraStrip.tsx`
- Create: `src/features/streaming/components/CameraStrip.module.scss`

**Interfaces:**
- Consumes: `LiveCamera` from `../types/live.types`; `ViewMode` from `./CameraGrid` (existing export, unaffected by the Task 9 trim).
- Produces: `CameraStrip(props)` where `props` is:
```ts
interface CameraStripProps {
  cameras: LiveCamera[];
  activeCameraIds: string[];
  onToggleCamera: (cameraId: string) => void;
  isModeLocked: boolean;
  effectiveMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  open: boolean;
  onClose: () => void;
}
```
Task 9's `LivePlayer` renders this at the bottom of the player and owns `handleToggleCamera` (moved there from `CameraGrid`'s old sidebar).

- [ ] **Step 1: Write the component**

Create `src/features/streaming/components/CameraStrip.tsx`:

```tsx
'use client';

import { X, Square, PanelRight, LayoutGrid } from 'lucide-react';
import type { LiveCamera } from '../types/live.types';
import type { ViewMode } from './CameraGrid';
import styles from './CameraStrip.module.scss';

const MODES: { id: ViewMode; label: string; icon: typeof Square }[] = [
  { id: 'solo', label: 'Solo', icon: Square },
  { id: 'main-rail', label: 'Principal + trilha', icon: PanelRight },
  { id: 'grid', label: 'Grade', icon: LayoutGrid },
];

interface Props {
  cameras: LiveCamera[];
  activeCameraIds: string[];
  onToggleCamera: (cameraId: string) => void;
  isModeLocked: boolean;
  effectiveMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  open: boolean;
  onClose: () => void;
}

export function CameraStrip({
  cameras,
  activeCameraIds,
  onToggleCamera,
  isModeLocked,
  effectiveMode,
  onViewModeChange,
  open,
  onClose,
}: Props) {
  if (!open) return null;

  return (
    <div className={styles.strip}>
      <div className={styles.side}>
        <div className={styles.sideTop}>
          <span className={styles.label}>MULTICAM</span>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Fechar câmeras">
            <X size={10} />
          </button>
        </div>
        <span className={styles.count}>{cameras.length} CÂMERAS</span>
      </div>

      <div className={styles.thumbs}>
        {cameras.map((camera) => {
          const isActive = activeCameraIds.includes(camera.cameraId);
          return (
            <button
              key={camera.cameraId}
              onClick={() => onToggleCamera(camera.cameraId)}
              className={`${styles.thumb} ${isActive ? styles.thumbActive : ''}`}
            >
              {isActive && (
                <span className={styles.thumbBadge}>
                  <span className={styles.thumbDot} />
                  ATIVA
                </span>
              )}
              <div className={styles.thumbInfo}>
                <p className={styles.thumbName}>{camera.name}</p>
                <p className={styles.thumbAngle}>{camera.slug}</p>
              </div>
            </button>
          );
        })}

        {!isModeLocked && (
          <div className={styles.modeGroup}>
            {MODES.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => onViewModeChange(id)}
                title={label}
                aria-label={label}
                className={`${styles.modeBtn} ${effectiveMode === id ? styles.modeBtnActive : ''}`}
              >
                <Icon size={14} />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Write the styles**

Create `src/features/streaming/components/CameraStrip.module.scss`:

```scss
@use '../../../styles/_variables' as *;

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.4; }
}

.strip {
  display: flex;
  align-items: flex-end;
  gap: 0.75rem;
  padding: 0.75rem 1.25rem;
  background-color: $surface;
  border-top: 1px solid $border;
  flex-shrink: 0;
}

.side {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
  flex-shrink: 0;
}

.sideTop {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.label {
  font-family: 'Space Mono', monospace;
  font-size: 0.5625rem;
  letter-spacing: 0.14em;
  color: $text-muted;
}

.closeBtn {
  width: 1.25rem;
  height: 1.25rem;
  border-radius: 5px;
  background: rgba(255, 255, 255, 0.05);
  border: none;
  color: $muted;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;

  &:hover { color: $text-primary; background-color: rgba(255, 255, 255, 0.12); }
}

.count {
  font-family: 'Space Mono', monospace;
  font-size: 0.625rem;
  font-weight: 700;
  color: $text-primary;
}

.thumbs {
  flex: 1;
  display: flex;
  align-items: flex-end;
  gap: 0.5rem;
  overflow-x: auto;
  min-width: 0;
  scrollbar-width: none;

  &::-webkit-scrollbar { display: none; }
}

.thumb {
  position: relative;
  width: 150px;
  aspect-ratio: 16 / 9;
  border-radius: 10px;
  overflow: hidden;
  border: 2px solid transparent;
  padding: 0;
  cursor: pointer;
  background: linear-gradient(135deg, #1a2b3a, #3a5a7a 55%, #0a1520);
  flex-shrink: 0;
  transition: border-color 0.15s;

  &:hover { border-color: rgba(255, 46, 158, 0.5); }
}

.thumbActive {
  border-color: $action;
  box-shadow: 0 0 0 3px rgba(255, 46, 158, 0.15);
}

.thumbBadge {
  position: absolute;
  top: 6px;
  left: 6px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background-color: $action;
  color: #0a0a0b;
  font-family: 'Space Mono', monospace;
  font-size: 0.53125rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  padding: 2px 6px;
  border-radius: 4px;
}

.thumbDot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background-color: #0a0a0b;
  animation: pulse 1.2s ease-in-out infinite;
}

.thumbInfo {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 6px 8px;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.85), transparent);
  text-align: left;
}

.thumbName {
  color: #fff;
  font-family: 'Archivo', sans-serif;
  font-size: 0.6875rem;
  font-weight: 700;
}

.thumbAngle {
  color: $text-secondary;
  font-family: 'Space Mono', monospace;
  font-size: 0.53125rem;
  letter-spacing: 0.08em;
  font-weight: 700;
}

.modeGroup {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  flex-shrink: 0;
  background-color: rgba(0, 0, 0, 0.5);
  border-radius: 8px;
  border: 1px solid $border;
  padding: 0.25rem;
}

.modeBtn {
  padding: 0.375rem 0.5rem;
  border-radius: 5px;
  background: none;
  border: none;
  color: $muted;
  cursor: pointer;
  display: flex;
  transition: color 0.15s, background-color 0.15s;

  &:hover { color: $text-primary; background-color: rgba(255, 255, 255, 0.08); }
}

.modeBtnActive {
  background-color: $action;
  color: $text-primary;
}
```

- [ ] **Step 3: Verify**

```bash
cd /Users/ysraelmoreno/Documents/codes/live-show/live-show-react && npx tsc --noEmit -p tsconfig.json
```
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/features/streaming/components/CameraStrip.tsx src/features/streaming/components/CameraStrip.module.scss
git commit -m "feat: add CameraStrip bottom drawer component"
```

---

## Task 8: New `TransportBar` component

**Files:**
- Create: `src/features/streaming/components/TransportBar.tsx`
- Create: `src/features/streaming/components/TransportBar.module.scss`

**Interfaces:**
- Consumes: `LiveCamera` from `../types/live.types`; `QualityLevel` from `./VideoPanel` (existing export).
- Produces: `TransportBar(props)` where `props` is:
```ts
interface TransportBarProps {
  globalMuted: boolean;
  onToggleMute: () => void;
  volume: number;
  onVolumeChange: (volume: number) => void;
  audioCameras: LiveCamera[];
  effectiveAudioCameraId: string | null;
  onAudioCameraChange: (cameraId: string) => void;
  levels: QualityLevel[];
  currentLevel: number;
  qualityLabel: string;
  onSelectLevel: (level: number) => void;
  onTogglePip: () => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
}
```
The audio-camera-picker and quality-picker open/closed state is owned internally by `TransportBar` (it's local UI-only state, not needed by any other component — unlike `globalMuted`/`volume`/etc., which the video-rendering tree also needs). Task 9's `LivePlayer` renders this at the bottom of the player.

- [ ] **Step 1: Write the component**

Create `src/features/streaming/components/TransportBar.tsx`:

```tsx
'use client';

import { useState } from 'react';
import { Volume2, VolumeX, Settings, PictureInPicture, Maximize, Minimize } from 'lucide-react';
import type { LiveCamera } from '../types/live.types';
import type { QualityLevel } from './VideoPanel';
import styles from './TransportBar.module.scss';

interface Props {
  globalMuted: boolean;
  onToggleMute: () => void;
  volume: number;
  onVolumeChange: (volume: number) => void;
  audioCameras: LiveCamera[];
  effectiveAudioCameraId: string | null;
  onAudioCameraChange: (cameraId: string) => void;
  levels: QualityLevel[];
  currentLevel: number;
  qualityLabel: string;
  onSelectLevel: (level: number) => void;
  onTogglePip: () => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
}

export function TransportBar({
  globalMuted,
  onToggleMute,
  volume,
  onVolumeChange,
  audioCameras,
  effectiveAudioCameraId,
  onAudioCameraChange,
  levels,
  currentLevel,
  qualityLabel,
  onSelectLevel,
  onTogglePip,
  isFullscreen,
  onToggleFullscreen,
}: Props) {
  const [showAudioMenu, setShowAudioMenu] = useState(false);
  const [showQuality, setShowQuality] = useState(false);

  return (
    <div className={styles.bar}>
      <div className={styles.liveBadge}>
        <span className={styles.liveDot} />
        AO VIVO
      </div>

      <div className={styles.volumeGroup}>
        <button
          onClick={onToggleMute}
          className={styles.iconBtn}
          aria-label={globalMuted ? 'Ativar som' : 'Silenciar'}
        >
          {globalMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
        </button>
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={globalMuted ? 0 : volume}
          onChange={(e) => {
            onVolumeChange(Number(e.target.value));
            if (globalMuted) onToggleMute();
          }}
          className={styles.volumeSlider}
          aria-label="Volume"
        />
      </div>

      <div className={styles.spacer} />

      {audioCameras.length > 1 && (
        <div className={styles.menuWrapper}>
          {showAudioMenu && (
            <div className={styles.menu}>
              {audioCameras.map((cam) => (
                <button
                  key={cam.cameraId}
                  className={cam.cameraId === effectiveAudioCameraId ? styles.menuItemActive : styles.menuItem}
                  onClick={() => {
                    onAudioCameraChange(cam.cameraId);
                    setShowAudioMenu(false);
                  }}
                >
                  {cam.name}
                </button>
              ))}
            </div>
          )}
          <button
            className={styles.iconBtn}
            onClick={() => setShowAudioMenu((s) => !s)}
            aria-label="Escolher câmera com áudio"
            title="Escolher câmera com áudio"
          >
            <Settings size={16} />
          </button>
        </div>
      )}

      {levels.length > 0 && (
        <div className={styles.menuWrapper}>
          {showQuality && (
            <div className={styles.menu}>
              <button
                className={currentLevel === -1 ? styles.menuItemActive : styles.menuItem}
                onClick={() => {
                  onSelectLevel(-1);
                  setShowQuality(false);
                }}
              >
                Auto
              </button>
              {levels.map(({ index, height }) => (
                <button
                  key={index}
                  className={index === currentLevel ? styles.menuItemActive : styles.menuItem}
                  onClick={() => {
                    onSelectLevel(index);
                    setShowQuality(false);
                  }}
                >
                  {height}p
                </button>
              ))}
            </div>
          )}
          <button className={styles.qualityBtn} onClick={() => setShowQuality((s) => !s)}>
            {qualityLabel}
          </button>
        </div>
      )}

      <button className={styles.iconBtn} onClick={onTogglePip} aria-label="Picture-in-Picture" title="Picture-in-Picture">
        <PictureInPicture size={16} />
      </button>

      <button
        className={styles.iconBtn}
        onClick={onToggleFullscreen}
        aria-label={isFullscreen ? 'Sair da tela cheia' : 'Tela cheia'}
      >
        {isFullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Write the styles**

Create `src/features/streaming/components/TransportBar.module.scss`:

```scss
@use '../../../styles/_variables' as *;

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.4; }
}

.bar {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.625rem 1.25rem;
  background-color: $surface;
  border-top: 1px solid $border;
  flex-shrink: 0;
}

.liveBadge {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.375rem 0.625rem;
  background: $action-dim;
  border: 1px solid rgba(255, 46, 158, 0.28);
  border-radius: 8px;
  font-family: 'Space Mono', monospace;
  font-size: 0.625rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  color: $action;
  flex-shrink: 0;
}

.liveDot {
  width: 0.4375rem;
  height: 0.4375rem;
  border-radius: 50%;
  background-color: $action;
  animation: pulse 1.2s ease-in-out infinite;
}

.volumeGroup {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-shrink: 0;
}

.volumeSlider {
  width: 4.5rem;
  accent-color: $action;
}

.spacer {
  flex: 1;
}

.iconBtn {
  padding: 0.375rem;
  border-radius: 7px;
  background: rgba(255, 255, 255, 0.05);
  border: none;
  color: $text-secondary;
  cursor: pointer;
  display: flex;
  flex-shrink: 0;
  transition: color 0.15s, background-color 0.15s;

  &:hover { color: $text-primary; background-color: rgba(255, 255, 255, 0.12); }
}

.menuWrapper {
  position: relative;
  flex-shrink: 0;
}

.menu {
  position: absolute;
  bottom: calc(100% + 0.375rem);
  right: 0;
  display: flex;
  flex-direction: column;
  gap: 1px;
  background: rgba(13, 13, 15, 0.95);
  border: 1px solid $border;
  border-radius: 6px;
  padding: 0.25rem;
  backdrop-filter: blur(8px);
  min-width: 4rem;
  z-index: 20;
}

.menuItem {
  background: none;
  border: none;
  color: $muted;
  font-size: 0.6875rem;
  font-family: 'Space Mono', monospace;
  font-weight: 600;
  padding: 0.3rem 0.5rem;
  border-radius: 4px;
  cursor: pointer;
  text-align: right;
  white-space: nowrap;
  transition: background 0.1s, color 0.1s;

  &:hover { background: rgba(255, 255, 255, 0.08); color: $text-primary; }
}

.menuItemActive {
  @extend .menuItem;
  color: $action;

  &:hover { color: $action; }
}

.qualityBtn {
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid $border;
  border-radius: 4px;
  color: $muted;
  font-size: 0.6875rem;
  font-family: 'Space Mono', monospace;
  font-weight: 700;
  letter-spacing: 0.04em;
  padding: 0.25rem 0.5rem;
  cursor: pointer;
  flex-shrink: 0;
  transition: color 0.15s, border-color 0.15s;

  &:hover { color: $text-primary; border-color: rgba(255, 255, 255, 0.25); }
}
```

- [ ] **Step 3: Verify**

```bash
cd /Users/ysraelmoreno/Documents/codes/live-show/live-show-react && npx tsc --noEmit -p tsconfig.json
```
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/features/streaming/components/TransportBar.tsx src/features/streaming/components/TransportBar.module.scss
git commit -m "feat: add TransportBar with volume slider and PiP toggle"
```

---

## Task 9: Integration — trim `CameraGrid`, rewrite `LivePlayer`, remove `StageSelector`

**Files:**
- Modify: `src/features/streaming/components/CameraGrid.tsx`
- Modify: `src/features/streaming/components/CameraGrid.module.scss`
- Modify: `src/features/streaming/components/LivePlayer.tsx`
- Modify: `src/features/streaming/components/LivePlayer.module.scss`
- Delete: `src/features/streaming/components/StageSelector.tsx`
- Delete: `src/features/streaming/components/StageSelector.module.scss`

**Interfaces:**
- Consumes: everything produced by Tasks 1–8 (`useChat`, `ChatDock`, `ReactionsTicker`, `Header`, `CameraStrip`, `TransportBar`, and the `volume`-aware `VideoPanel`/`SoloView`/`MainRailView`/`GridView`).
- Produces: the final `CameraGridProps` shape (below) — no later task depends on it.

```ts
interface CameraGridProps {
  cameras: LiveCamera[];
  selectedLevel?: number;
  onLevelsReady?: (levels: QualityLevel[]) => void;
  globalMuted: boolean;
  onGlobalMutedChange: (muted: boolean) => void;
  audioCameraId: string | null;
  onAudioCameraChange: (cameraId: string) => void;
  volume: number;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  mainCameraId: string | null;
  onMainCameraChange: (cameraId: string) => void;
  activeCameraIds: string[];
}
```

- [ ] **Step 1: Trim `CameraGrid.tsx`**

Replace the entire contents of `src/features/streaming/components/CameraGrid.tsx` with:

```tsx
'use client';

import { useMemo } from 'react';
import type { LiveCamera } from '../types/live.types';
import type { QualityLevel } from './VideoPanel';
import { SoloView } from './SoloView';
import { MainRailView } from './MainRailView';
import { GridView } from './GridView';
import styles from './CameraGrid.module.scss';

export type { QualityLevel };
export type ViewMode = 'solo' | 'main-rail' | 'grid';

interface CameraGridProps {
  cameras: LiveCamera[];
  selectedLevel?: number;
  onLevelsReady?: (levels: QualityLevel[]) => void;
  globalMuted: boolean;
  onGlobalMutedChange: (muted: boolean) => void;
  audioCameraId: string | null;
  onAudioCameraChange: (cameraId: string) => void;
  volume: number;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  mainCameraId: string | null;
  onMainCameraChange: (cameraId: string) => void;
  activeCameraIds: string[];
}

// Pure view-mode dispatcher now — camera selection lives in CameraStrip,
// stage/chat/share chrome lives in Header, both siblings of this component
// in LivePlayer. This component only decides which of Solo/Main+Rail/Grid
// to render for the currently active cameras.
export function CameraGrid({
  cameras,
  selectedLevel,
  onLevelsReady,
  globalMuted,
  onGlobalMutedChange,
  audioCameraId,
  onAudioCameraChange,
  volume,
  viewMode,
  onViewModeChange,
  mainCameraId,
  onMainCameraChange,
  activeCameraIds,
}: CameraGridProps) {
  const cameraById = useMemo(() => new Map(cameras.map((c) => [c.cameraId, c])), [cameras]);
  const activeCameras = useMemo(
    () => activeCameraIds.map((id) => cameraById.get(id)).filter((c): c is LiveCamera => !!c),
    [activeCameraIds, cameraById],
  );

  const mainCamera = activeCameras.find((c) => c.cameraId === mainCameraId) || activeCameras[0];
  const otherCameras = mainCamera ? activeCameras.filter((c) => c.cameraId !== mainCamera.cameraId) : [];

  // Only 1 active camera forces Solo — CameraStrip hides the multiview
  // picker in that same case (its own isModeLocked prop).
  const effectiveMode: ViewMode = activeCameras.length <= 1 ? 'solo' : viewMode;

  const mainMuted = mainCamera ? globalMuted || mainCamera.cameraId !== audioCameraId : true;
  const handleMainMutedChange = (m: boolean) => {
    if (!mainCamera) return;
    if (!m) onAudioCameraChange(mainCamera.cameraId);
    else onGlobalMutedChange(true);
  };

  return (
    <div className={styles.videoArea}>
      {!mainCamera ? (
        <div className={styles.emptyState}>Nenhuma câmera ativa</div>
      ) : effectiveMode === 'solo' ? (
        <SoloView
          camera={mainCamera}
          muted={mainMuted}
          onMutedChange={handleMainMutedChange}
          volume={volume}
          selectedLevel={selectedLevel}
          onLevelsReady={onLevelsReady}
        />
      ) : effectiveMode === 'main-rail' ? (
        <MainRailView
          mainCamera={mainCamera}
          otherCameras={otherCameras}
          onSelectMain={onMainCameraChange}
          muted={mainMuted}
          onMutedChange={handleMainMutedChange}
          volume={volume}
          selectedLevel={selectedLevel}
          onLevelsReady={onLevelsReady}
        />
      ) : (
        <GridView
          cameras={activeCameras}
          onSelectCamera={(id) => {
            onMainCameraChange(id);
            onViewModeChange('main-rail');
          }}
          globalMuted={globalMuted}
          audioCameraId={audioCameraId}
          onAudioCameraChange={onAudioCameraChange}
          volume={volume}
          selectedLevel={selectedLevel}
          onLevelsReady={onLevelsReady}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 2: Trim `CameraGrid.module.scss`**

Replace the entire contents of `src/features/streaming/components/CameraGrid.module.scss` with:

```scss
@use '../../../styles/_variables' as *;

.videoArea {
  flex: 1;
  min-height: 0;
  min-width: 0;
  height: 100%;
  position: relative;
  display: flex;
}

.emptyState {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: $muted;
  font-family: 'Space Mono', monospace;
  font-size: 0.875rem;
}
```

- [ ] **Step 3: Rewrite `LivePlayer.tsx`**

Replace the entire contents of `src/features/streaming/components/LivePlayer.tsx` with:

```tsx
'use client';

import { useMemo, useRef, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import type { LiveCamera, LiveStage } from '../types/live.types';
import { CameraGrid } from './CameraGrid';
import type { QualityLevel, ViewMode } from './CameraGrid';
import { Header } from './Header';
import { CameraStrip } from './CameraStrip';
import { TransportBar } from './TransportBar';
import { ChatDock, ReactionsTicker, useChat } from '@/features/chat';
import { useAuth } from '@/features/account/hooks/use-auth';
import { useViewerTracking } from '../hooks/use-viewer-tracking';
import { useViewerCount } from '../hooks/use-viewer-count';
import styles from './LivePlayer.module.scss';

interface LivePlayerProps {
  cameras: LiveCamera[];
  stages?: LiveStage[];
  primaryCameraId?: string | null;
  title: string;
  eventId: string;
}

function useStages(cameras: LiveCamera[], rawStages?: LiveStage[]): LiveStage[] {
  return useMemo(() => {
    if (rawStages && rawStages.length > 0) {
      return [...rawStages]
        .sort((a, b) => a.position - b.position)
        .map((s) => ({ ...s, cameras: [...s.cameras].sort((a, b) => a.priority - b.priority) }));
    }
    return [{ stageId: '__main__', name: 'Palco Principal', slug: 'main', position: 0, cameras: [...cameras].sort((a, b) => a.priority - b.priority) }];
  }, [cameras, rawStages]);
}

function initialStageId(stages: LiveStage[], primaryCameraId?: string | null): string {
  if (primaryCameraId) {
    const match = stages.find((s) => s.cameras.some((c) => c.cameraId === primaryCameraId));
    if (match) return match.stageId;
  }
  return stages.find((s) => s.cameras.length > 0)?.stageId ?? stages[0]?.stageId ?? '__main__';
}

export function LivePlayer({ cameras, stages: rawStages, primaryCameraId, title, eventId }: LivePlayerProps) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  // Starts muted — browser autoplay policy requires it.
  const [globalMuted, setGlobalMuted] = useState(true);
  const [volume, setVolume] = useState(1);
  const [audioCameraId, setAudioCameraId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('main-rail');
  const [mainCameraId, setMainCameraId] = useState<string | null>(null);
  const [activeCameraIds, setActiveCameraIds] = useState<string[]>([]);
  const [cameraStripOpen, setCameraStripOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const { user } = useAuth();

  useViewerTracking(eventId, activeCameraIds, user?.id);
  const { currentViewers } = useViewerCount(eventId);
  const chat = useChat(eventId);

  const stages = useStages(cameras, rawStages);
  const [activeStageId, setActiveStageId] = useState<string>(() => initialStageId(stages, primaryCameraId));

  const [levels, setLevels] = useState<QualityLevel[]>([]);
  const [currentLevel, setCurrentLevel] = useState(-1);

  const activeStage = stages.find((s) => s.stageId === activeStageId) ?? stages[0];

  const stageCameraKey = (activeStage?.cameras ?? []).map((c) => c.cameraId).sort().join(',');
  useEffect(() => {
    const first = activeStage?.cameras[0]?.cameraId;
    setActiveCameraIds(first ? [first] : []);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stageCameraKey]);

  const toggleFullscreen = () => {
    if (!isFullscreen) containerRef.current?.requestFullscreen?.();
    else document.exitFullscreen?.();
    setIsFullscreen(!isFullscreen);
  };

  const handleTogglePip = async () => {
    const video = containerRef.current?.querySelector<HTMLVideoElement>('video[data-focused="true"]');
    if (!video) return;
    try {
      if (document.pictureInPictureElement) await document.exitPictureInPicture();
      else await video.requestPictureInPicture();
    } catch {
      // PiP unsupported or blocked by the browser — no-op.
    }
  };

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
      } catch {
        // User cancelled the native share sheet.
      }
    } else {
      await navigator.clipboard.writeText(url);
      toast.success('Link copiado');
    }
  };

  const handleToggleCamera = (cameraId: string) => {
    if (activeCameraIds.includes(cameraId)) {
      if (activeCameraIds.length > 1) setActiveCameraIds(activeCameraIds.filter((id) => id !== cameraId));
    } else {
      setActiveCameraIds([...activeCameraIds, cameraId]);
    }
  };

  const activeLevel = levels.find((l) => l.index === currentLevel);
  const qualityLabel = currentLevel === -1 ? 'Auto' : activeLevel ? `${activeLevel.height}p` : 'Auto';

  const effectiveAudioCameraId =
    audioCameraId && activeStage?.cameras.some((c) => c.cameraId === audioCameraId)
      ? audioCameraId
      : (activeStage?.cameras[0]?.cameraId ?? null);

  const effectiveMainCameraId =
    mainCameraId && activeCameraIds.includes(mainCameraId)
      ? mainCameraId
      : (activeCameraIds[0] ?? null);

  const effectiveViewMode: ViewMode = activeCameraIds.length <= 1 ? 'solo' : viewMode;

  const metaLine = [activeStage?.name, qualityLabel].filter(Boolean).join(' · ');

  const handleAudioCameraChange = (id: string) => {
    setAudioCameraId(id);
    setGlobalMuted(false);
  };

  return (
    <div ref={containerRef} className={styles.player}>
      <Header
        eventTitle={title}
        metaLine={metaLine}
        stages={stages}
        activeStageId={activeStageId}
        onStageChange={setActiveStageId}
        onExit={() => router.push(`/events/${eventId}`)}
        currentViewers={currentViewers}
        cameraCount={activeStage?.cameras.length ?? 0}
        cameraStripOpen={cameraStripOpen}
        onToggleCameraStrip={() => setCameraStripOpen((o) => !o)}
        chatOpen={chatOpen}
        onToggleChat={() => setChatOpen((o) => !o)}
        chatMessageCount={chat.messages.length}
        onShare={handleShare}
      />

      <div className={styles.main}>
        <div className={styles.gridArea}>
          {activeStage && (
            <CameraGrid
              key={activeStage.stageId}
              cameras={activeStage.cameras}
              selectedLevel={currentLevel}
              onLevelsReady={setLevels}
              globalMuted={globalMuted}
              onGlobalMutedChange={setGlobalMuted}
              audioCameraId={effectiveAudioCameraId}
              onAudioCameraChange={handleAudioCameraChange}
              volume={volume}
              viewMode={effectiveViewMode}
              onViewModeChange={setViewMode}
              mainCameraId={effectiveMainCameraId}
              onMainCameraChange={setMainCameraId}
              activeCameraIds={activeCameraIds}
            />
          )}
        </div>

        <ChatDock
          open={chatOpen}
          onClose={() => setChatOpen(false)}
          messages={chat.messages}
          onSend={chat.sendMessage}
          onReact={chat.react}
        />
      </div>

      {activeStage && (
        <CameraStrip
          cameras={activeStage.cameras}
          activeCameraIds={activeCameraIds}
          onToggleCamera={handleToggleCamera}
          isModeLocked={activeCameraIds.length <= 1}
          effectiveMode={effectiveViewMode}
          onViewModeChange={setViewMode}
          open={cameraStripOpen}
          onClose={() => setCameraStripOpen(false)}
        />
      )}

      <TransportBar
        globalMuted={globalMuted}
        onToggleMute={() => setGlobalMuted((m) => !m)}
        volume={volume}
        onVolumeChange={setVolume}
        audioCameras={activeStage?.cameras ?? []}
        effectiveAudioCameraId={effectiveAudioCameraId}
        onAudioCameraChange={handleAudioCameraChange}
        levels={levels}
        currentLevel={currentLevel}
        qualityLabel={qualityLabel}
        onSelectLevel={setCurrentLevel}
        onTogglePip={handleTogglePip}
        isFullscreen={isFullscreen}
        onToggleFullscreen={toggleFullscreen}
      />

      <ReactionsTicker totalReactions={chat.totalReactions} />
    </div>
  );
}
```

- [ ] **Step 4: Trim `LivePlayer.module.scss`**

Replace the entire contents of `src/features/streaming/components/LivePlayer.module.scss` with:

```scss
@use '../../../styles/_variables' as *;

.player {
  position: relative;
  min-height: 100vh;
  background-color: $bg;
  display: flex;
  flex-direction: column;
}

.main {
  flex: 1;
  display: flex;
  min-height: 0;
  position: relative;
}

.gridArea {
  flex: 1;
  min-width: 0;
  min-height: 0;
  display: flex;
}
```

- [ ] **Step 5: Delete `StageSelector`**

```bash
cd /Users/ysraelmoreno/Documents/codes/live-show/live-show-react
rm src/features/streaming/components/StageSelector.tsx src/features/streaming/components/StageSelector.module.scss
```

- [ ] **Step 6: Verify**

```bash
cd /Users/ysraelmoreno/Documents/codes/live-show/live-show-react && npx tsc --noEmit -p tsconfig.json
```
Expected: no errors. If `StageSelector` is still referenced anywhere (it shouldn't be — only `LivePlayer.tsx` imported it, and that import is gone in the rewrite above), tsc will report the missing module; grep for `StageSelector` under `src/` and remove the stale reference before proceeding.

- [ ] **Step 7: Commit**

```bash
git add src/features/streaming/components/CameraGrid.tsx src/features/streaming/components/CameraGrid.module.scss src/features/streaming/components/LivePlayer.tsx src/features/streaming/components/LivePlayer.module.scss src/features/streaming/components/StageSelector.tsx src/features/streaming/components/StageSelector.module.scss
git commit -m "feat: wire live player v2 layout together, remove StageSelector"
```

(`git add` on a deleted path stages the deletion — no `-A` or `git rm` needed.)

---

## Task 10: Manual QA walkthrough

**Files:** none (verification only).

- [ ] **Step 1: Start the dev server**

```bash
cd /Users/ysraelmoreno/Documents/codes/live-show/live-show-react && npm run dev
```

- [ ] **Step 2: Walk through the player in a browser**

Navigate to a live event's `/live/[eventId]` page (any event currently live, or one with an active camera in the dev/staging backend) and confirm, in order:

1. `Header` renders: back button exits to `/events/[eventId]`, LIVE badge pulses, stage tabs appear only when there's more than one stage and switching tabs swaps cameras, viewer count badge shows once `currentViewers > 0`.
2. "Câmeras" button in the header opens `CameraStrip` at the bottom; the badge count matches the stage's camera count.
3. In `CameraStrip`: clicking a thumbnail toggles that camera active/inactive (the last active camera cannot be turned off); the "MULTIVIEW" mode buttons (Solo/Main+Rail/Grid) appear only once 2+ cameras are active, and switching modes changes the video layout.
4. "Chat" button in the header opens `ChatDock` on the right (desktop) or fullscreen (resize the browser to under 640px width). Typing a message and submitting appends it to the list and auto-scrolls; the header's Chat badge count increases to match.
5. Clicking a reaction emoji in `ChatDock`'s `ReactionBar` makes the `ReactionsTicker` (bottom-left) appear/update with the running total.
6. `TransportBar`: mute button toggles audio; dragging the volume slider changes actual video volume and un-mutes; the audio-camera picker (gear icon, only visible with 2+ cameras) switches which camera's audio plays; the quality picker (only visible once HLS levels are known) switches resolution; the Picture-in-Picture button opens the browser's native PiP window for the currently focused camera; the fullscreen button toggles fullscreen.
7. Resize below 640px width again and confirm `CameraStrip` still scrolls horizontally and remains usable.

- [ ] **Step 3: Final verify**

```bash
cd /Users/ysraelmoreno/Documents/codes/live-show/live-show-react && npx tsc --noEmit -p tsconfig.json
```
Expected: no errors.

- [ ] **Step 4: Confirm no dead references remain**

```bash
cd /Users/ysraelmoreno/Documents/codes/live-show/live-show-react && grep -rn "StageSelector" src/ || echo "clean"
```
Expected: `clean`.

No commit for this task — it's verification only, not a code change.
