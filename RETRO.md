# Project Retro — Piano Teacher Site

## What Went Well

**Paper/pencil theme landed great**
Pure CSS — lined paper background with `repeating-linear-gradient`, red margin line, Caveat + Patrick Hand fonts. No extra images, no dependencies. Feels handwritten without sacrificing readability.

**Hero photo fade effect**
CSS `mask-image` with two intersecting linear gradients (horizontal × vertical) gives a clean edge-dissolve into the paper background. Took one iteration to get the composition right but the technique is solid.

**OAuth PKCE auth flow**
Login → Wix-hosted OAuth → callback → `wixSession` cookie works end-to-end. Member detection via `refreshToken.role === "member"` is simple and reliable. The guarded `/member` route pattern is reusable.

**Bookings integration**
`bookingDriver.ts` encapsulates the full booking sequence (createBooking → createCart → calculateCart → redirect/placeOrder) cleanly. The module is framework-agnostic and well-documented.

**`@wix/astro` ambient auth pattern**
No manual `createClient` / token management needed anywhere except the login flow itself. SDK calls in Astro frontmatter and React components just work.

---

## What Didn't Go Well

**Stale dist/ caused missing Sign In button on deploy**
`wix release` was run at 14:05, then `Layout.astro` was edited at 14:38 with the auth-conditional nav. The compiled chunk in `dist/` was stale. Live site silently served the old nav. Cost ~30 min to diagnose by comparing file timestamps.

**Pricing Plans app not installed on the Wix site**
Hit `APP_NOT_INSTALLED` when trying to query plans via the API. The Pricing Plans feature has to be explicitly enabled from the Wix dashboard (Business Apps → Pricing Plans) before any API calls or redirects work. Discovered late, after researching the checkout flow.

**npm network error**
`npm install @wix/pricing-plans` failed with a proxy/network error in the dev environment. Had to leave the pricing feature half-built.

**Hero photo took two tries**
First photo was a flat top-down overhead shot — wrong aesthetic entirely. User's reference images showed low-angle, shallow DOF, keys fading into bright light. Lesson: confirm composition before uploading; "piano keyboard photo" is underspecified.

**Unsplash short IDs 404'd**
Short photo IDs from Unsplash search results (`jFc549i-jpw`) didn't resolve on the CDN. Needed to visit each photo's own page to get the full URL. Pexels worked first try.

---

## What Can Be Better

**Pricing plans are still incomplete**
The entire feature (page + subscribe redirect + nav link) is blocked on:
1. Installing Pricing Plans from Wix dashboard
2. Creating plans there (name, price, billing cycle, perks)
3. Running `npm install @wix/pricing-plans` (once network is available)
4. Building `pricing.astro` + `subscribe/[planId].astro`

The checkout redirect is simple — `createRedirectSession({ paidPlansCheckout: { planId } })` — Wix handles login + payment in one flow.

**Mobile nav needs a hamburger menu**
On small screens the nav links wrap awkwardly. Hero visual already hides on mobile. A hamburger/drawer would clean up the small-screen experience.

**No 404 page**
Custom 404 would keep the paper/pencil theme consistent on bad URLs.

**Member area is minimal**
The `/member` dashboard is a placeholder. Could show upcoming bookings, active subscription plan, song playlist — the data is all available via the Wix SDK.

**No loading/error states in booking flow**
BookingServices component doesn't surface API errors gracefully. A failed `createBooking` call currently leaves the user with no feedback.

---

## Needs to Fix Before Next Release

| # | Item | Effort |
|---|------|--------|
| 1 | Install Pricing Plans app from Wix dashboard → create plans | 15 min (manual) |
| 2 | `npm install @wix/pricing-plans` | 1 min (once network works) |
| 3 | Build `/pricing` page + `/subscribe/[planId]` redirect | ~2 h |
| 4 | Add "Plans" link to nav | 5 min |
| 5 | Confirm `wix release` is always run after any Layout/nav change | process |

---

## Key Lessons

- Always `wix release` after any Layout change — the compiled chunks don't rebuild incrementally.
- For photo references, ask for composition details up front (angle, depth of field, light direction).
- The Pricing Plans app must be dashboard-installed before any API or redirect call touches it — check app status early.
- `paidPlansCheckout: { planId }` in `createRedirectSession` is the entire subscribe checkout flow. No cart, no order creation needed.

---

## Retro — Practice Sheet Feature

### What Went Well

**Custom SVG staff renderer worked great**
No notation library installed, no npm failures — just inline SVG with a `DIATONIC_STEPS` map to convert note names to Y positions. `noteY(step, row) = staffTop(row) + (8 - step) * 7` turned out to be a clean and readable formula. The renderer handles multi-row staves, ledger lines for middle C, eighth-note flags (bezier curves), and hollow vs. filled note heads — all without any dependency.

**Shared music/audio modules cleaned up PianoGame duplication**
Extracting `FREQ`, `SongNote`/`Song` types, and `playNote` into `music.ts` and `audio.ts` was the right move. Both PianoGame and PracticeSheet now share one Web Audio engine and one pitch model. Zero behavior regression on the piano game.

**Seeded PRNG (mulberry32) solved reproducibility elegantly**
No `Math.random()` at module load, no SSR hydration mismatch. Seed generated from `performance.now()` inside the click handler — deterministic replay, SSR-safe.

**Hybrid content (curated + generated) was the right default**
Beginner members get polished, recognizable melodies (Morning Walk, Ode to Joy) without feeling like they landed in a tech demo. The generated path gives infinite variety once they've seen the curated set.

**Member gate pattern was already proven**
The `parseSession` + `isMember` + `Astro.redirect` guard from the `/member` page copied over in 3 lines. Consistent pattern, no surprises.

### What Didn't Go Well

**`wix release` without `npm run build` caused a 404 on /practice**
Deployed via `wix release` and got a hard 404 — because `dist/server/pages/practice.astro.mjs` didn't exist. `wix release` uploads whatever is in `dist/` verbatim; it never rebuilds. Cost ~20 min to diagnose. The fix is a process rule: **always `npm run build` before `wix release`**.

**`wix build` is not usable in this project**
Running `wix build` fails with "Unsupported package manager detected." Wix CLI can't detect the package manager in this environment. Must use `npm run build` instead.

### What Can Be Better

**Staff renderer has no repeat signs or dynamics**
Currently every sheet is plain notation — no dynamics, no articulation markings, no repeat bars. Fine for a reading exercise, but a more musical sheet would add those.

**Generated melodies can feel mechanical**
The stepwise generator produces valid melodies but they're not always musically interesting. A small improvement would be adding a "contour bias" (arch shape) and favouring landing on strong beats for phrase endings.

**No print/export for the practice sheet**
The staff is an SVG, so `window.print()` or an SVG download button would be trivial to add and genuinely useful for students who want a paper copy.

---

## Retro — Musical Note Background Decorations

### What Went Well

**Inline SVG approach matched the hand-drawn theme perfectly**
Tilted noteheads (`transform="rotate(-18)"`), round-capped stems (`stroke-linecap="round"`), and bezier flags look genuinely hand-sketched at low opacity. No image assets, no external files — the decorations are a few dozen bytes of SVG per section.

**7% opacity is the sweet spot**
High enough to read as a musical motif, low enough to never compete with content. First attempt came in right without needing iteration.

**CSS `position: absolute; inset: 0; z-index: 0` containment pattern**
Placing `.music-bg` / `.section-notes` as absolute children of `position: relative` sections keeps the decorations perfectly clipped to each section's bounds. `.hero-content` and `.hero-visual` stay above them via `z-index: 1`.

### What Didn't Go Well

**CSS was missing on first deploy (context window rollover)**
The HTML markup was written in one session and the CSS rules were pending when the context window ran out and a new session started. The decorations existed in the DOM but were unstyled — notes appeared at full opacity, unpositioned. Small process issue: HTML + CSS should be committed together, not split across sessions.

### What Can Be Better

**Notes are static — could sway or drift subtly**
A very slow CSS `animation` (translate + rotate, 8–12 s, `animation-direction: alternate`) would make the background feel alive without being distracting. Opt-in with `@media (prefers-reduced-motion: no-preference)`.

**Only three sections decorated**
Hero, lessons, and game-promo have notes. The footer and booking-confirmation page are bare. Extending the motif to the footer (just a small treble clef) would complete the theme.
