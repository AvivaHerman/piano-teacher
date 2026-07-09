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
