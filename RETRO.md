# Project Retrospective — Piano Teacher Headless Site

**Date:** 2026-07-09  
**Scope:** Pricing Plans feature + login fix + UI tweaks

---

## What went well

### Wix SDK + Astro integration is solid
The `@wix/astro` adapter handled SSR, cookie-based sessions, and the elevated API calls cleanly. Once the right pattern was found (`auth.elevate(fn)(args)`), server-side Wix API calls were reliable and predictable.

### Pricing Plans end-to-end in one session
Installed the app, created 3 plans via REST, built the `/plans` listing page, the `/api/plans/checkout` endpoint, and wired up the member dashboard — all in a single pass. The build stayed green throughout.

### Redirect session pattern was reusable
The `redirects.createRedirectSession` pattern from bookings (`ecomCheckout`) transferred cleanly to `paidPlansCheckout`. One pattern, two features.

### `auth.elevate()` worked consistently
Using `auth.elevate()` from `@wix/essentials` for admin-level queries (plans, bookings) avoided member-context permission errors without needing a separate API key.

---

## What didn't go well

### Wix Plans V3 API required too much trial and error
Multiple round-trips to fix:
- Body must be wrapped in `plan: {}` (not obvious from the error)
- Sub-entities (`perks`, `pricingVariants`) each need explicit GUIDs
- `status: 'ACTIVE'` is required even though it should default
- `pricingVariants[0].id must not be empty` was a separate error from `perks[n].id`

Each of these was a separate 400 with a different message. Better upfront schema validation in the SDK would have caught all of these at once.

### The login page was broken before we started
`login.astro` was using `OAuthStrategy({ clientId })` directly — a bare client-side instance with no server credentials. When `getAuthUrl()` internally calls `redirects.createRedirectSession`, it had nothing to authenticate with.

The `@wix/astro` integration already injects `/api/auth/login` and `/api/auth/callback` using `getContextualAuth()`, and none of that was being used. The fix was 7 lines, but the bug had been live since the auth feature was originally built.

### `logout.astro` has the same problem and wasn't fixed
`logout.astro` also instantiates `OAuthStrategy` directly. It happens to work because the failure path is silently swallowed — the cookie gets deleted regardless. But it means Wix-side session revocation silently fails every time. It's the same root cause, not fixed yet.

### `login/callback.astro` is now dead code
The old callback lived at `/login/callback`, but the built-in route is at `/api/auth/callback`. After the login fix, the custom callback is never reached. It still references the old `wixOAuthData` cookie name (the built-in uses `oAuthState`). Dead and confusing.

### Image sizing required two iterations
The first pass set a fixed `560px` width on the piano photo — wrong starting point, should have used `flex: 1` + `width: 100%` from the beginning to let it scale with the layout.

---

## What can be better

### Use `@wix/astro` built-in auth everywhere
The pattern: custom pages at `/login` and `/logout` that delegate to `/api/auth/login` and `/api/auth/logout` (built-in). No custom OAuth logic in page files. `/login` already follows this now — `/logout` should too.

### Validate SDK patterns against the integration's own source first
Before writing custom OAuth or redirect logic, check `node_modules/@wix/astro/build/dependencies/astro-auth/` — the correct implementation is usually already there.

### Wix REST API calls should go through the SDK types, not raw fetch
Plan creation used raw `fetch` because the SDK didn't expose a `createPlan` method with a clean interface. If the SDK type definitions had been checked first (`@wix/pricing-plans` exports), the body shape would have been clear upfront.

### Error messages should be more specific
The login error shown to users was "Login failed: System error occurred: {}" — the raw Wix API error serialized to an empty object. User-facing errors should map SDK errors to readable messages, not expose internal JSON.

---

## What needs to be fixed

| Issue | Priority | File |
|---|---|---|
| `logout.astro` uses bare `OAuthStrategy` — Wix-side session revocation silently fails | Medium | `src/pages/logout.astro` |
| `login/callback.astro` is dead code — confusing and references wrong cookie name | Low | `src/pages/login/callback.astro` |
| Payment provider not connected — pricing plans checkout will fail for real users | High | Wix Dashboard → Pricing Plans → Payments |
| `orders.memberListOrders()` field names unverified — `order.planName`, `order.endDate` may be wrong | Medium | `src/pages/member/index.astro` |
| Plans page visibility filter uses `p.visibility === "PUBLIC" \|\| p.visibility === 1` — the number fallback is a guess | Low | `src/pages/plans/index.astro` |
| No mobile layout for hero with piano image — `hero-visual` hidden on mobile but transition could be smoother | Low | `src/pages/index.astro` |
