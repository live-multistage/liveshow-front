# LIVESHOW — Design System (as built)

Bold, energetic live-streaming brand. Near-black canvas, electric magenta accent, monospaced technical labels paired with the Archivo grotesque display face. Motion is used sparingly but pointedly (pulsing "live" dots) to signal that something is happening *right now*.

> This documents the design **as actually implemented** in `live-show-react` and the shared `@live-show/design-system` package — the real tokens, fonts, radii, and project conventions. It is the source of truth; where an older mockup spec disagreed (16px cards, invented `--ink`/`--accent-soft` names, inline-styles-only), reality wins.

---

## 1. Brand

| | |
|---|---|
| **Personality** | Energetic, broadcast, live-event hype. Dark, cinematic, confident. |
| **Logomark** | 5-bar audio waveform (rounded bars) + `LIVESHOW` wordmark in Space Mono, `letter-spacing: .18em`. A panel badge may follow it (`ADS`, `Studio`, `ADMIN`). |
| **Voice** | Portuguese-first (PT-BR). Short mono labels visually uppercased (`Ao Vivo`, `Em Destaque`, `Ver todos`). |

**Caixa alta rule:** i18n copy is authored in sentence case; visual uppercase comes from CSS `text-transform: uppercase`, never a literal uppercase string or `.toUpperCase()` in code. Eyebrows are never headings — they're decorative/contextual labels above a real `<h2>`/`<h3>`.

---

## 2. Tokens — two systems, both real

The codebase carries **two token layers**. Use the right one for the context.

### A. SCSS variables — `src/styles/_variables.scss`
Consumed by hand-written **SCSS Modules** via `@use '…/styles/_variables' as *`. This is what you use in feature styles.

| Token | Value | Use |
|---|---|---|
| `$bg` | `#08080a` | Page background |
| `$surface` / `$surface-card` | `#101013` | Cards, panels |
| `$surface-dark` | `#0b0b0d` | Sidebar, recessed strips, input backgrounds |
| `$accent` | `#1a0a12` | Tinted magenta-black wash (not a text color) |
| `$action` | `#ff2e9e` | Primary CTA, active state, live, links |
| `$action-dim` / `$action-bg` | `rgba(255,46,158,.14)` / `.12` | Magenta tints |
| `$violet` | `#9810fa` | Scheduled state / secondary data viz |
| `$text-primary` | `#FFFFFF` | Primary text |
| `$text-secondary` (`$muted`, `$text-label`) | `#A1A1AA` | Secondary / labels |
| `$text-muted` | `#71717A` | Muted / meta |
| `$white-50` | `rgba(255,255,255,.5)` | Faint overlays |
| `$border` | `#27272A` | Card / divider hairline (legacy; new work uses `$border-hairline`) |
| `$border-hairline` | `rgba(255,255,255,.08)` | Card shell hairline border (`card-shell` mixin) |
| `$bg-hover` | `#1f1f23` | Hover fill |
| `$error` / `$error-bg` | `#F87171` / `rgba(248,113,113,.12)` | Errors (never magenta) |
| `$danger` / `$danger-bg` | `#EF4444` / `rgba(239,68,68,.12)` | Destructive |
| `$success` / `$success-light` / `$success-bg` | `#16A34A` / `#4ADE80` / `rgba(22,163,74,.1)` | Success |
| `$price` | `#FB64B6` | Prices |
| `$accent-text` | `#ff8ec9` | Tinted magenta text on dark chips/pills (`card-cta-tinted`, replay badge) |
| `$ink` | `#0a0a0b` | Text on solid-magenta surfaces (live badge, primary card CTA) |
| `$card-radius` | `18px` | Card shell radius — the dominant radius across the app (see §4) |
| Breakpoints | `$sm 640px` · `$md 768px` · `$lg 1024px` · `$xl 1280px` | Media queries |

### B. CSS custom properties — `:root` in `src/styles/globals.scss`
Consumed by the **`@live-show/design-system` primitives** (shadcn lineage: Button, Card, Input, Badge, …) via `var(--*)`. Don't hand-author these values in modules — reference the SCSS tokens instead; edit `:root` only to reskin the primitives.

| Var | Value | | Var | Value |
|---|---|---|---|---|
| `--background` | `#08080a` | | `--muted` | `#27272a` |
| `--foreground` | `#f4f4f5` | | `--muted-foreground` | `#b9b9c0` |
| `--card` / `--popover` | `#101013` | | `--accent` | `#1a0a12` |
| `--primary` | `#ff2e9e` | | `--destructive` | `#ef4444` |
| `--primary-foreground` | `#0a0a0b` | | `--border` / `--input` | `rgba(255,255,255,.07)` |
| `--secondary` | `#101013` | | `--input-background` | `#0b0b0d` |
| `--ring` | `#ff2e9e` | | `--radius` | `0.5rem` (8px) |
| `--sidebar` | `#0b0b0d` | | `--sidebar-primary` | `#ff2e9e` |
| `--sidebar-border` | `rgba(255,255,255,.07)` | | `--chart-1…5` | magenta · `#9b7bff` · `#ff7a4d` · `#46d6d8` · `#7fe0a0` |

**Reconcile the small drifts, on purpose:** `$text-primary #FFFFFF` vs `--foreground #f4f4f5`; `$border #27272A` (module hairline) vs `--border rgba(255,255,255,.07)` (primitive/sidebar hairline). Both are in use — pick by layer (SCSS module → `$*`; primitive reskin → `--*`).

---

## 3. Typography

Two families, loaded via a Google Fonts `<link>` in `src/app/layout.tsx`:
`Archivo` (400–900) + `Space Mono` (400/700). Body font is **Archivo** (`globals.scss`).

| Role | Family | Notes |
|---|---|---|
| **Display / UI / body** | `Archivo` | 700–900 headings, 400–600 body/nav. Tight tracking on big type (`-.02em` to `-.045em`). |
| **Mono / labels / titles** | `Space Mono` | UPPERCASE, `letter-spacing .05–.18em`. Eyebrows, badges, prices, metadata, table headers, the wordmark — and page/section titles on data screens (e.g. the advertisements pages). |

Approx scale: page title 24–32 / 700–800 · card title 13.5–18 / 700 · body 13–15 / 400–600 · mono label 10–13 / 700 uppercase · big stat 28–42 / 700–800. Headings use `-webkit-font-smoothing: antialiased`; long card titles ellipsize (`nowrap; overflow:hidden; text-overflow:ellipsis`).

---

## 4. Spacing, radius, elevation

- **Radius:** base `--radius: 0.5rem` (8px) for design-system primitives (inputs/buttons ~`6–8px`, small badges `6–8px`, pills `999px`). **Cards use `$card-radius` (18px)** — the shared shell for ShowCard, ChannelCard and the home feed AdBanner (`card-shell` mixin in `src/styles/_mixins.scss`).
- **Padding:** cards `18–24px` · nav/section `26–40px` · page content `2rem`, capped at `max-width: 1200px` (narrower forms `~640px`).
- **Grid gaps:** `12–18px` (home rails and grids use `12px` uniformly across breakpoints).
- **Elevation:** flat on dark — depth is the `1px` hairline border (+ optional off-corner magenta radial glow on KPI cards), not drop shadows.

### Shared mixins — `src/styles/_mixins.scss`

`@use '…/styles/_mixins' as *;` alongside `_variables`.

| Mixin | Use |
|---|---|
| `card-shell` | Card surface: `$surface` bg, `1px solid $border-hairline`, `$card-radius`, hover `translateY(-3px)` + magenta border (no transform under `prefers-reduced-motion`). |
| `live-badge($font-size: 10px)` | Solid-magenta pill, `$ink` text, Space Mono 700, uppercase. Used by ShowCard, ChannelCard (on-air) and the hero badge. |
| `pulse-dot($size: 5px, $color: $ink)` | The pulsing dot inside a live badge — single `ls-pulse` keyframe, animation disabled under `prefers-reduced-motion`. |
| `card-cta` | Unified card CTA: magenta solid, `$ink` text, Space Mono 11px/700 uppercase `.06em`, `9px` radius. |
| `card-cta-tinted` | Same shape, tinted: `$action-bg` background + `$accent-text` text (ChannelCard off-air CTA, AdBanner CTA). |

---

## 5. Components

Prefer the shared primitives before hand-rolling: **`@live-show/design-system`** exports Button, Card, Input, Label, Select/SimpleCustomSelect, Checkbox, Switch, Badge, Chip, Avatar, DropdownMenu, Popover, Skeleton, Toaster/sonner, plus `Logo`, `ImageWithFallback`, `cn`. Compose these; only build new markup when no primitive fits, and promote genuinely reusable primitives back into the package.

- **Button (primary):** `--primary` magenta fill, `--primary-foreground` ink text, weight 700, pill/`--radius`. **Secondary:** faint white fill + hairline. **Ghost/mono:** transparent, hairline, Space Mono uppercase.
- **Chip (toggle):** pill, Space Mono uppercase. Active = magenta fill + ink text; inactive = `rgba(255,255,255,.04)` fill + `$text-secondary` + `rgba(255,255,255,.1)` border.
- **Badge / status pill:** tinted by state, matching `1px` border, Space Mono `10px/700` uppercase, `nowrap`. Live → magenta tint + pulsing dot · Scheduled → violet tint · neutral → white-5%.
- **Card:** shared `card-shell` mixin — `$surface` bg, `$border-hairline`, `$card-radius` (18px); hover → magenta border (`rgba($action,.34)`) + `translateY(-3px)`. Used by ShowCard, ChannelCard and the feed AdBanner. Dashboard/KPI cards keep their own `~10px` radius and off-corner radial glow (not yet unified onto the shell).
- **Card CTA:** one visual language via `card-cta` (solid magenta, primary action — "watch", "watch now") and `card-cta-tinted` (tinted magenta, secondary action — "view schedule", "learn more").
- **SectionHeader:** shared title + optional "see all" link component for home rails (`src/shared/components/SectionHeader`). `eyebrow` is optional — only sections whose eyebrow actually conveys information (e.g. Channels: "TV linear · 24h" + on-air count) show one; purely decorative eyebrows were removed.
- **Charts:** inline SVG area charts — smooth path, per-chart `linearGradient` fill, `rgba(255,255,255,.06)` gridlines, Space Mono `9px` ticks, one `--chart-*` series color per card.
- **Sidebar (admin/dashboard):** `256px`, `--sidebar #0b0b0d`, `rgba(255,255,255,.07)` right border, `26px 18px` padding, `34px` gaps. Waveform + Space Mono wordmark (+ optional panel badge) at top. Nav items `12px` radius; **active** = `rgba(255,46,158,.1)` fill + `rgba(255,46,158,.32)` border + white text/magenta icon. User block pinned bottom.

---

## 6. Motion
`lsPulse` (live dots), `lsMarquee` (ticker), card hover `translateY(-3/-4px)` + accent border. Transitions ~`.15s`. Motion signals "live" or hover only — nothing gratuitous.

## 7. Iconography
Inline SVG, `1–2px` stroke, `currentColor`, `~16–19px`. Filled glyphs only for play triangles and the waveform logo. No emoji.

---

## 8. Project & implementation conventions

- **Styling = SCSS Modules.** One `.module.scss` per component; `@use '…/styles/_variables' as *` for tokens. `globals.scss` (compiled by sass, via `@use './reset'`) is the only global stylesheet and owns the `:root` vars — no CSS `@import` chains, no Tailwind (the old shadcn `ui/` utility classes are dead). No inline styles.
- **Feature-folder structure:** `src/features/<feature>/{components,hooks,queries,mutations,services,types}` + `src/app/**` route files (Next.js App Router). API access is isolated (component → hook → service/API client), never `fetch` in a component.
- **Design system is a workspace package** (`@live-show/design-system`, extracted from `src/shared/components/ui`) — import primitives from it; don't re-implement them.
- **Fonts:** Google Fonts `<link>` in `app/layout.tsx` (`Archivo` + `Space Mono`).
- **Dark only.** No light theme; the canvas is always near-black.
