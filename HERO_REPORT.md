# HomeHero → Home v2 redesign report

## What was built
Reworked `HomeHero` to match the Home v2 mock: full-bleed rounded hero card (20px radius,
520px min-height), bottom-left-aligned content over a layered background (photo or fallback
gradient, magenta/violet radial tint, left-fade scrim). Kept the exact `{ show: Show }` prop
contract — `HomePageContent.tsx:54` needed no changes.

Content, top to bottom:
- "AO VIVO" pill badge with pulsing dot — only when `show.isLive`.
- Giant Archivo title, `clamp(44px, 8vw, 80px)` so it degrades gracefully on mobile instead of
  overflowing at a fixed 80px.
- "watching now" line with inline live-wave SVG (paths taken verbatim from the spec) + pt-BR
  formatted viewer count — only when `show.viewers != null`.
- Meta line: venue · city · N câmeras · Dolby Atmos, dot-separated. Kept `show.venue` prefix
  from the old component per the spec's "your call" allowance — it's free info and matches the
  old component's intent without contradicting the mock's city/cameras/Dolby line.
- Two pill CTAs + a static 4-bar decorative dot row.

## Decisions

**Image vs. gradient layering.** `.art` always carries the fallback gradient as its CSS
`background`; when `show.image` exists it's applied inline via `style` (photo layer sits over
the gradient since inline styles win). A second `.tint` div (the same two radials at 0.35
opacity) is rendered only when `show.image` is set, so it never double-darkens the
gradient-only path (which is already tinted by design). The `.scrim` (left-fade) is unconditional
— text legibility is needed either way.

**Trailer button.** The spec flagged this as a judgment call: a "Trailer" label with no trailer
route is misleading. I went with **"Detalhes"** linking to `/events/{id}` — same honest choice
the spec suggested (`Detalhes` is the honest equivalent), rather than shipping a label promising
content that doesn't exist. It's an outline-play icon per the mock, just relabeled.

**Live vs. not-live primary CTA.** Live → magenta "Assistir agora" pill → `/live/{id}`
(matches the old component's live gating exactly, just restyled). Not live → same pill position,
same visual style, but linking to `/events/{id}` and reusing the old component's price-aware
copy (`Comprar ingresso · R$ X` or `Explorar evento`) since that logic already existed and the
spec said to "keep the current component's price/CTA logic intent but restyle." Both states
always also render the secondary "Detalhes" link to `/events/{id}`.

## TDD evidence
1. Wrote `HomeHero.test.tsx` first against the *old* markup — ran red (failed: no "AO VIVO"
   badge text, no `/live/show-1` link matching "assistir agora" case-insensitively — old
   copy was "Assistir ao vivo").
2. Reworked `HomeHero.tsx` + `HomeHero.module.scss`.
3. Re-ran — green, 2/2 tests pass (`PASS (2) FAIL (0)`).

Test file: `src/features/events/components/public/home/HomeHero.test.tsx` — mocks `next/link`
as a passthrough anchor (pattern copied from
`src/features/organizations/components/OrganizationCard.test.tsx`). Covers: title renders,
AO VIVO badge shown when live, pt-BR viewer count ("24.381") + "assistindo agora" render,
"3 câmeras" + "Dolby Atmos" render, primary CTA links to `/live/show-1`; and a second case with
`isLive:false` asserting the badge and "Assistir agora" primary are both absent.

## Typecheck
`npx tsc --noEmit` → "No errors found" (0 errors project-wide, none introduced).

## Files
- `src/features/events/components/public/home/HomeHero.tsx` (rewritten)
- `src/features/events/components/public/home/HomeHero.module.scss` (rewritten)
- `src/features/events/components/public/home/HomeHero.test.tsx` (new)

## Self-review
- Prop contract untouched; `HomePageContent.tsx` needed zero edits (verified via grep).
- Used `$action`, `$bg`, `$md` tokens from `_variables.scss` where they matched the spec's hex
  values exactly.
- `lsPulse` keyframes scoped locally to the module as required.
- Inline SVGs used for the live-wave and both play icons, matching the spec's exact paths rather
  than approximating with lucide-react — the spec called this out as the safer choice for exact
  visual match.
- Dot-indicator row is static markup only, no fake carousel state, per instructions.
- Responsive: content padding drops to `28px 20px` below `$md` (768px), title uses `clamp()`,
  no fixed widths that would overflow small viewports.

## Concerns
- `npx eslint` errored on output parsing in this environment (rtk proxy wrapper issue, not a
  real lint failure — the underlying tool didn't return usable JSON). Could not get a clean lint
  pass/fail signal; tsc and vitest are both clean, which are the two gates the task explicitly
  requires running.
- The spec's `.tint` "opacity ~0.35" wording is a note, not gospel — visually approximated by
  layering the same two radial-gradients at `opacity: 0.35` over the photo, since there's no
  screenshot to pixel-match against.

## Review round 2 — polish fixes (commit 88d3c27)

Two fixes requested after review approval:

1. **Icon/label mismatch on secondary CTA.** The "Detalhes" button was using a play-triangle SVG
   (`polygon points="6 4 20 12 6 20"`), which reads as "play/next" not "details". Swapped for
   lucide-react's `Info` icon — already importing `lucide-react` elsewhere in the codebase, no
   new dependency, and it visually matches the pill's stroke weight.

2. **Redundant not-live CTAs.** When `show.isLive` is false, both buttons pointed at
   `/events/{id}` — two buttons, same destination. Fixed by gating the secondary "Detalhes" link
   behind `show.isLive`: it now renders only alongside the live "Assistir agora" primary
   (distinct destinations: `/live/{id}` vs `/events/{id}`). Not-live state now renders exactly
   one CTA — the price-aware events/ticket link.

Test file updated: the live-state test now also asserts the "Detalhes" link exists with
`href="/events/show-1"`; the not-live test was rewritten to assert `getAllByRole('link')` has
length 1 and no "Detalhes"/"Assistir agora" links are queryable.

Verification: `npx vitest run src/features/events/components/public/home/HomeHero.test.tsx` →
`PASS (2) FAIL (0)`. `npx tsc --noEmit` → "No errors found".
