# Event Detail Page (`/events/[id]`) Refactor — Design Spec

**Date:** 2026-06-22
**Scope:** `features/events/components/public/EventDetailPageContent.tsx/.module.scss` + `TicketPanel.tsx/.module.scss`

---

## Goal

Align `/events/[id]` visual with the new Liveshow design spec (`specs/events/[id]/design/Liveshow Event.dc.html`). No logic or behavior changes.

---

## Design Reference

Source: `live-show-react/specs/events/[id]/design/Liveshow Event.dc.html`
Brand: `live-show-react/DESIGN.md`

---

## Layout

`max-width:1240px; padding:28px 40px 72px`
Two-column grid: `1fr 388px` gap `28px`. Breakpoint ≤860px: single column.

---

## Back Link

- Space Mono 12px / `letter-spacing:.08em` / `color:#9a9aa2` / uppercase "VOLTAR"
- Left-arrow inline SVG (`M19 12H5M11 18l-6-6 6-6`) instead of `ChevronLeft` icon
- `margin-bottom: 22px`

---

## Hero

- `aspect-ratio: 21/8` (replaces fixed `height:18rem`)
- `border-radius: 20px` (was 8px)
- `border: 1px solid rgba(255,255,255,.07)`
- `margin-bottom: 28px`
- Keep conditional `<img src={heroImage}>` when available; gradient placeholder when not
- Bottom scrim: `linear-gradient(to top, rgba(5,4,6,.92) 6%, rgba(5,4,6,.25) 48%, transparent 78%)`
- **Camera count chip** (top-right): `background:rgba(8,8,10,.6); backdrop-filter:blur(6px); border:1px solid rgba(255,255,255,.14); color:#e7e7ea; font-family:Space Mono; font-size:10px; font-weight:700; letter-spacing:.06em; padding:6px 10px; border-radius:999px;` — shows camera icon + `{N} CÂMERAS` (uses `cameras.length || event.camerasCount`)
- **Bottom content** `padding: 40px 44px`:
  - Status badges row `gap:9px; margin-bottom:16px`:
    - REPLAY pill: `font-family:Space Mono; font-size:10px; font-weight:700; letter-spacing:.08em; color:#ff8ec9; background:rgba(255,46,158,.12); border:1px solid rgba(255,46,158,.34); padding:6px 11px; border-radius:999px;` + RotateCcw icon 12px
    - ENCERRADO / status pill: `font-family:Space Mono; font-size:10px; font-weight:700; letter-spacing:.08em; color:#b9b9c0; background:rgba(255,255,255,.06); border:1px solid rgba(255,255,255,.12); padding:6px 11px; border-radius:999px;`
    - LIVE pill: `background:#ff2e9e; color:#0a0a0b` + pulsing dot (existing `lsPulse` animation)
  - H1: `font-size:54px; font-weight:800; letter-spacing:-.035em; line-height:.98; margin:0 0 8px`
  - Venue line: `display:flex; align-items:center; gap:8px; font-size:16px; color:#c7c7cd;` with magenta pin SVG (`stroke:#ff5fb4`)

---

## Meta Cards (4-column info grid)

- Grid: `repeat(4,1fr)` gap `14px` `margin-bottom:18px`
- Card: `background:#101013; border:1px solid rgba(255,255,255,.07); border-radius:16px; padding:18px`
- Label row: Space Mono 10px / `letter-spacing:.1em` / `color:#8f8f97` / `margin-bottom:12px` — icon `color:#ff2e9e` (magenta)
- Value: `font-size:14px; font-weight:600; color:#f4f4f5; line-height:1.35`

---

## Organization Card

- `display:flex; align-items:center; gap:16px; background:#101013; border:1px solid rgba(255,255,255,.07); border-radius:16px; padding:18px 20px; margin-bottom:28px;`
- Hover: `border-color:rgba(255,46,158,.28)`
- Avatar: 48×48px, `border-radius:12px`, gradient placeholder (`radial-gradient(120% 120% at 30% 20%, rgba(70,214,216,.5), transparent 60%), linear-gradient(150deg,#13212b,#0d1117)`) — keep `<img>` when `org.logoUrl` present
- "ORGANIZAÇÃO" label: Space Mono 10px / `letter-spacing:.12em` / `color:#8f8f97` / `margin-bottom:5px`
- Name: `font-size:16px; font-weight:700; letter-spacing:-.01em`
- "VER PERFIL →" link: `margin-left:auto; font-family:Space Mono; font-size:11px; letter-spacing:.06em; color:#9a9aa2;` hover `color:#ff5fb4`

---

## About Section

- Label: `font-family:Space Mono; font-size:12px; letter-spacing:.14em; color:#fff; font-weight:700; margin-bottom:14px` — "SOBRE O SHOW"
- Body: `font-size:16px; line-height:1.65; color:#b9b9c0; max-width:62ch`

---

## Camera Grid (kept, restyled)

- Section label: same "SOBRE O SHOW" pattern (Space Mono / uppercase / `color:#fff`)
- Cards: `border-radius:12px`, surface pattern consistent with other cards
- No structural changes

---

## TicketPanel

### Container

`background:#101013; border:1px solid rgba(255,255,255,.08); border-radius:20px; padding:24px; overflow:hidden; position:sticky; top:96px`

### Magenta radial glow

`position:absolute; top:-60px; right:-50px; width:180px; height:180px; border-radius:50%; background:radial-gradient(circle, rgba(255,46,158,.18), transparent 70%); pointer-events:none`

### Header label

`font-family:Space Mono; font-size:11px; letter-spacing:.14em; color:#ff7ec2; font-weight:700; margin-bottom:16px` — "COMPRAR REPLAY" / "COMPRAR INGRESSO" based on event status

### Ticket option card

`background:rgba(255,46,158,.05); border:1px solid rgba(255,46,158,.34); border-radius:16px; padding:18px; margin-bottom:18px`
- Name: `font-size:17px; font-weight:700; letter-spacing:-.01em; line-height:1.25`
- Price: Space Mono 16px / 700 / `white-space:nowrap`
- Description: `font-size:13.5px; color:#9a9aa2; line-height:1.45`

### Divider

`height:1px; background:rgba(255,255,255,.1); margin-bottom:18px`

### Total row

- "Total" label: `font-size:16px; font-weight:700`
- Right block: "BRL" Space Mono 11px `color:#7d7d85` above, amount Space Mono 28px/700 `letter-spacing:-.01em` `color:#ff2e9e`
- "ACESSO VÁLIDO PARA UMA PESSOA": Space Mono 10.5px / `letter-spacing:.04em` / `color:#7d7d85` / `margin-bottom:20px`

### Buttons

- Buy: `background:#ff2e9e; color:#0a0a0b; font-weight:700; font-size:15px; padding:16px; border-radius:14px; margin-bottom:11px`
- Cart: `background:transparent; border:1px solid rgba(255,255,255,.18); color:#fff; font-weight:600; font-size:14px; padding:14px; border-radius:14px` hover `border-color:#ff2e9e; color:#ff5fb4`

### Security badge

Space Mono 10.5px / `letter-spacing:.06em` / `color:#6f6f77` — shield icon

### Owned / empty / loading states

Keep existing logic, restyle containers to match new card pattern (20px radius, surface, `rgba(255,255,255,.08)` border).

---

## Constraints

- SCSS modules only — no inline styles on React components
- No behavior / logic changes
- No type changes
- Camera grid kept and restyled (not removed)
- `EventDetailPageContent.module.scss` is the SCSS file used (not the one in `src/app/(public)/events/[id]/page.module.scss`)

---

## File Map

| File | Action |
|---|---|
| `src/features/events/components/public/EventDetailPageContent.tsx` | Update hero, back link, meta cards, org card, about section, camera section label |
| `src/features/events/components/public/EventDetailPageContent.module.scss` | Full restyle |
| `src/features/events/components/public/TicketPanel.tsx` | Update purchase card markup, header label, divider, total row, buttons |
| `src/features/events/components/public/TicketPanel.module.scss` | Full restyle |
