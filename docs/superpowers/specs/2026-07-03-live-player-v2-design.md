# Live Player v2 + Chat Foundation — Design

## Goal

Refactor `/live/[eventId]` to match the "Liveshow Live Player v2" mockup
(imported from claude.ai/design project `408d44eb-903d-4b0c-a77a-ed874730d02c`,
file `Liveshow Live Player v2.dc.html`) and lay the groundwork for chat: a
local-only chat UI + hook that a future realtime backend can drop into
without touching call sites.

Source design system: `DESIGN_SYSTEM.md` in the same project (near-black bg,
`#ff2e9e` magenta accent, Archivo + Space Mono, pill radii, inline-style
convention — the repo instead uses SCSS modules per its existing pattern,
which this refactor follows, not the design tool's inline-style convention).

## Current state (before this change)

`LivePlayer.tsx` orchestrates:
- `StageSelector` — top bar, back button + stage tabs.
- `CameraGrid` — owns its own header row (title/subtitle + "Câmeras" toggle),
  a right-side sliding sidebar for camera selection + view-mode picker
  (Solo / Main+Rail / Grid), and renders `SoloView` / `MainRailView` /
  `GridView`, all built on `VideoPanel` (HLS via hls.js, quality levels,
  per-tile mute).
- A bottom bar: live badge, viewer count (`useViewerCount`), global mute,
  audio-camera picker, quality picker, fullscreen.

`src/features/chat/` exists as an empty scaffold (`index.ts` only, no
content) — this work fills it in.

No setlist/track/caption data exists anywhere in the codebase.

## Architecture

```
LiveGate (unchanged: auth/access gate)
 └─ LivePlayer (orchestrator, existing state/hooks kept)
     ├─ Header (NEW — replaces StageSelector + CameraGrid's own header row)
     │   back · LIVE+title/meta · stage tabs · viewer count ·
     │   Câmeras toggle · Chat toggle (badge = message count) · share · exit
     ├─ CameraGrid (TRIMMED — drops header row + sidebar, keeps videoArea)
     │   └─ SoloView / MainRailView / GridView / VideoPanel / PipOverlay
     │       — untouched, HLS/quality/mute logic stays as-is
     ├─ CameraStrip (NEW — bottom drawer, replaces the right sidebar picker;
     │   reuses CameraGrid's existing activeCameraIds/viewMode/
     │   handleToggleCamera logic, UI relocated only)
     ├─ TransportBar (RESTYLED bottom bar, same mute/quality/fullscreen
     │   state as today, plus two small real additions — see below)
     └─ ChatDock (NEW, from src/features/chat)
         ├─ ChatMessageList / ChatMessageItem / ChatInput / ReactionBar
         └─ ReactionsTicker (floating, bottom-left)
```

Chat is a fully separate feature module (`src/features/chat`), decoupled
from streaming. `LivePlayer` renders `<ChatDock eventId={eventId} />` and
nothing else couples to it. Streaming keeps owning all camera/stage/quality
state exactly as today.

## Chat feature (`src/features/chat`)

Local-only: no backend, no socket. Shaped so a real transport swaps in
behind `useChat` later without changing any call site.

```ts
// types/chat.types.ts
interface ChatMessage {
  id: string;
  authorName: string;
  authorInitials: string;
  authorColor: string;   // deterministic from name hash (matches mockup's colored avatar chips)
  body: string;
  sentAt: string;        // ISO
}

type ReactionEmoji = '💜' | '🔥' | '🤘' | '👏' | '✨';

// hooks/use-chat.ts
function useChat(eventId: string): {
  messages: ChatMessage[];
  sendMessage: (body: string) => void;   // appends to local state, stamped with current user
  reactionCounts: Record<ReactionEmoji, number>;
  totalReactions: number;
  react: (emoji: ReactionEmoji) => void; // increments local counter
}
```

- Starts empty — no seeded mock messages, since a real event has none until
  viewers post. `eventId` is accepted but unused today; kept so the future
  real hook has the same signature.
- Current user's name/initials come from `useAuth()` (already used by
  `LiveGate`/`LivePlayer`).
- Reactions ticker and reaction buttons share the same hook/state — no
  separate reactions system.

Components under `src/features/chat/components/`:
- `ChatDock` — frame, open/close, desktop dock (right side) vs mobile
  fullscreen overlay (breakpoint-driven, same pattern as
  `LivePlayer.module.scss`'s existing mobile breakpoint).
- `ChatMessageList`, `ChatMessageItem`, `ChatInput`, `ReactionBar`.
- `ReactionsTicker` — floating pill, bottom-left, reads `totalReactions`.

## Streaming feature changes

**Header (new)** — folds `StageSelector`'s back button + tabs (restyled to
mockup's pill-tab look) together with: LIVE badge + event title + meta line
(stage/camera/quality), viewer count (existing `useViewerCount`), "Câmeras"
toggle (opens `CameraStrip`), "Chat" toggle (opens `ChatDock`, badge shows
`messages.length`), share button, exit button (same
`router.push('/events/${eventId}')` behavior as today's back button).

**CameraStrip (new)** — bottom horizontal drawer of camera thumbnails,
replacing `CameraGrid`'s right sidebar. Reuses the exact same
`activeCameraIds` / `viewMode` / `handleToggleCamera` logic that lives in
`CameraGrid` today (lifted up alongside it, not reimplemented) — only the UI
position and visual chrome change. "MULTIVIEW" button opens the Solo /
Main+Rail / Grid picker that's currently inside the sidebar.

**TransportBar (restyled)** — same mute / audio-camera-picker /
quality-picker / fullscreen state and handlers as today's bottom bar, reskinned
to the mockup's transport-bar chrome.

**Dropped from the mockup** (decorative data the backend doesn't have):
- "Tocando agora" track bar — no setlist data model exists.
- Timeline scrubber + `01:24:38 / 03:00:00 est.` timecode — this is a live
  stream, not seekable VOD; there's no real duration to show. Dropped
  entirely rather than faked.
- Captions button — no caption-track data exists.

**Added** (small, real, not in today's bar but trivial given what already
exists):
- Volume slider — today is mute-only. Threads a real `volume` prop into
  `VideoPanel` (`video.volume = x`), one additional prop, no new
  architecture.
- Picture-in-Picture button — real browser API
  (`video.requestPictureInPicture()`) on the same `<video>` ref
  `VideoPanel` already holds.

## Mobile

Desktop: `ChatDock` renders as a fixed-width right dock (mockup's 320px),
`CameraStrip` as a horizontal-scroll bottom drawer — both matching the
mockup as-is.

Mobile (`<640px`, matching the breakpoint already used in
`LivePlayer.module.scss`): `ChatDock` becomes a fullscreen overlay opened by
the header's Chat toggle, closed the same way. `CameraStrip` stays a
horizontal-scroll strip at any width — no layout change needed there.

## Out of scope

- Any real chat backend/socket/persistence.
- Seeded/mock chat messages.
- Setlist/track data model.
- Caption tracks.
- Seekable timeline / stream duration display.

## Testing

- Manual verification in-browser (dev server) covering: stage switching,
  camera activation/deactivation via `CameraStrip`, view-mode switching
  (Solo/Rail/Grid) still works after being relocated, volume slider changes
  actual video volume, PiP button opens native PiP, chat send/receive
  (local), reactions increment ticker + button counts, mobile breakpoint
  (`ChatDock` fullscreen overlay, `CameraStrip` still scrollable).
- No new backend/data-fetching code is introduced, so no new query/mutation
  tests are needed beyond what verification-before-completion already
  requires for the touched components.
