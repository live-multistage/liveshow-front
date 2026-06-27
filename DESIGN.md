# LIVESHOW — Design System

Bold, energetic live-streaming brand. Near-black canvas, electric magenta accent, monospaced technical labels paired with a heavy grotesque display face. Motion is used sparingly but pointedly (pulsing "live" dots) to signal that something is happening *right now*.

---

## 1. Brand

| | |
|---|---|
| **Personality** | Energetic, broadcast, live-event hype. Dark, cinematic, confident. |
| **Logomark** | 5-bar audio waveform (rounded bars, ascending-descending) + `LIVESHOW` wordmark in Space Mono, `letter-spacing: .18em`. |
| **Voice** | Direct, Portuguese-first (PT-BR). Short mono labels in UPPERCASE (`AO VIVO`, `EM DESTAQUE`, `VER TODOS →`). |

---

## 2. Color

### Core
| Token | Hex | Use |
|---|---|---|
| `--bg` | `#08080a` | Page background (near-black) |
| `--surface` | `#101013` | Cards, panels |
| `--surface-alt` | `#0b0b0d` | Sidebar, nav bars, recessed strips |
| `--ink` | `#f4f4f5` | Primary text |
| `--ink-2` | `#b9b9c0` | Secondary text |
| `--ink-3` | `#8f8f97` | Muted / meta text |
| `--ink-4` | `#7d7d85` · `#6f6f77` | Labels, axis ticks, disabled |

### Accent — Magenta
| Token | Hex | Use |
|---|---|---|
| `--accent` | `#ff2e9e` | Primary CTA, active state, live indicator, links |
| `--accent-bright` | `#ff5fb4` · `#ff7ec2` | Hover text, live badge text |
| `--accent-soft` | `#ff8ec9` · `#ffa6d4` · `#ffb3da` | Eyebrow labels on dark imagery |
| `--accent-ink` | `#0a0a0b` | Text/icon **on** magenta fills |

### Secondary (data viz & event art only — never UI chrome)
`#9b7bff` violet · `#ff7a4d`/`#ff5a4d` coral · `#46d6d8` cyan · `#7fe0a0` green

### Lines & overlays
- Hairline border: `rgba(255,255,255,.07)` (default), `rgba(255,255,255,.1)` (chips)
- Hover border: `rgba(255,46,158,.3–.4)`
- Image scrim: `linear-gradient(to top, rgba(5,4,6,.92) 8%, rgba(5,4,6,.15) 55%, transparent)`
- Card glow: `radial-gradient(circle, rgba(255,46,158,.18–.25), transparent 70%)` placed off the top-right corner

---

## 3. Typography

Two families only.

| Role | Family | Notes |
|---|---|---|
| **Display / UI** | `Archivo` | 700–900 for headings, 500–600 for body/nav. Tight tracking on big type: `letter-spacing: -.02em` to `-.045em`. |
| **Mono / labels** | `Space Mono` | All caps, `letter-spacing: .05em–.18em`. Eyebrows, badges, prices, metadata, axis ticks, the wordmark. |

### Scale (px)
| Use | Size / weight |
|---|---|
| Hero display | 58–108 / 800–900 |
| Page / section title | 28–32 / 800 |
| Card title | 13.5–22 / 700–800 |
| Body | 13–15 / 400–600 |
| Mono label | 10–13 / 700, uppercase |
| Big stat number | 42 / 800, `letter-spacing: -.03em` |

Headings use `-webkit-font-smoothing: antialiased`. Long titles in cards: `white-space: nowrap; overflow: hidden; text-overflow: ellipsis`.

---

## 4. Spacing, radius & shadow

- **Radii:** pill `999px` (buttons, chips, status pills) · cards `16px` · media tiles `16–18px` · small badges `6–8px`.
- **Card padding:** `18–20px`. **Nav/section padding:** `26–40px`.
- **Grid gaps:** `14–18px`.
- **Elevation:** flat on dark; depth comes from the `1px` hairline border + the radial corner glow, not drop shadows. (Frames in galleries use `0 30px 70px -30px rgba(0,0,0,.5)`.)

---

## 5. Components

### Buttons
- **Primary:** `background:#ff2e9e; color:#0a0a0b; font-weight:700;` pill, `padding:12–16px 18–28px`. Often a leading icon (play/plus).
- **Secondary:** `background:rgba(255,255,255,.07–.08); border:1px solid rgba(255,255,255,.18–.2); color:#fff;` pill.
- **Ghost / mono:** transparent, `1px` hairline or dashed border, Space Mono `11–12px` uppercase label.

### Genre chips (toggle)
Pill, Space Mono `11–12px` uppercase.
- **Active:** `background:#ff2e9e; color:#0a0a0b; font-weight:700; border:1px solid #ff2e9e`.
- **Inactive:** `background:rgba(255,255,255,.04); color:#b9b9c0; border:1px solid rgba(255,255,255,.1); font-weight:500`.
> Render active/inactive as **two separate nodes toggled by `sc-if`**, not one node with interpolated style — the runtime won't re-patch a string-interpolated `style` on a reused list node.

### Live badge
`background:#ff2e9e; color:#0a0a0b;` Space Mono `10px/700`, radius `6–7px`, with a leading pulsing dot (`background:#0a0a0b`). Label `AO VIVO` / `LIVE`.

### Status pill (dashboard)
Tinted by state, `1px` matching border, Space Mono `10px/700` uppercase, `white-space:nowrap`:
- Live → magenta tint + pulsing dot · Scheduled → violet tint · Cancelled/neutral → white-5% tint.

### Cards
`background:#101013; border:1px solid rgba(255,255,255,.07); border-radius:16px;` hover → `border:1px solid rgba(255,46,158,.3–.4)` and/or `transform:translateY(-4px)`. KPI & recent-event cards add the off-corner radial glow.

### Event media tile
Aspect-ratio box, gradient placeholder art, top scrim for legibility, badges top-left (live/reprise) and a camera-count chip top-right, title + meta + price bottom. Asymmetric poster grid uses `grid-auto-rows:200px` with `grid-column/row: span N`.

### Charts
Inline SVG area charts: smooth Catmull-Rom path, vertical fill via a per-chart `linearGradient` (color → transparent), `rgba(255,255,255,.06)` gridlines, Space Mono `9px` axis ticks, point dots in the series color. One series color per card (magenta / violet / coral).

### Navigation
- **Top nav** (marketing): waveform + wordmark left, text links, search/bell/cart/lang icons, magenta `INGRESSOS` pill, magenta avatar circle right.
- **Sidebar** (admin): `256px`, `#0b0b0d`, items `12px` radius; active item = `rgba(255,46,158,.1)` fill + `rgba(255,46,158,.32)` border + magenta icon; user block pinned bottom.

---

## 6. Motion

- `lsPulse` — opacity+scale pulse on every live dot (`1.4s infinite`).
- `lsMarquee` — looping live ticker (duplicate track, translateX -50%).
- `lsRing` — expanding ring on the hero play button.
- Card hover: `transform:translateY(-3/-4px)` + accent border. Keep transitions ~`.15s`.

Use motion only to signal "live" or on hover. No gratuitous animation.

---

## 7. Iconography
Inline SVG, `1px`–`2px` stroke, `currentColor`, `~16–19px`. Filled glyphs only for play triangles and the waveform logo. No emoji.

---

## 8. Implementation notes
- **Inline styles only** (Design Component convention) — no class-based CSS except `@keyframes`, `@font-face`, and body resets in `<helmet>`.
- Fonts loaded via Google Fonts: `Archivo` (400–900) + `Space Mono` (400/700).
- Gradient placeholders stand in for real event photography — swap for licensed imagery in production.
- Files: `Liveshow Home.dc.html` (marketing home), `Liveshow Dashboard.dc.html` (admin), `Liveshow Layouts.dc.html` (3-direction exploration).
