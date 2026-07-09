# Piano Teacher

A Wix Headless site for a piano teacher — built with Astro + React on the Wix platform.

Live site: **[my piano teacher](https://www.my-piano-teacher.com/)**

---

## Features

### Lesson Booking
- Three lesson types managed through **Wix Bookings**:
  - **Private Lesson** — 1-on-1, 60 min, $60
  - **Couples Lesson** — shared lesson for two, 60 min, $80
  - **Group Lesson** — up to 6 students (CLASS type), $35
- Real-time availability calendar — week view with slot selection
- Schema-driven booking form (fields sourced from Wix Bookings)
- Online payment via Wix-hosted checkout (paid → checkout redirect; free → direct confirmation)
- Booking confirmation page

### Member Area
- Students sign in / sign up via Wix-hosted OAuth (PKCE flow)
- Personal dashboard shows upcoming confirmed bookings
- For Couples and Group lessons, members can search for and add a co-participant from the site's member list
- Routes: `/login`, `/login/callback`, `/logout`, `/member`

### Interactive Piano Game
- Two-octave keyboard (C4–B5), playable by mouse, touch, or keyboard
- Web Audio API triangle oscillator with ADSR envelope for piano-like tone
- Keyboard shortcut map: `z`–`m` for white keys, `s d f g h j` for black keys
- Built-in songs: Twinkle Twinkle Little Star, Mary Had a Little Lamb
- Scrolling note strip above the keyboard — highlights the current note as the song plays
- Members can add custom songs (note sequence + BPM), persisted in `localStorage`

### Practice Sheet (member-only)
- Member-gated `/practice` page — redirects to login if not authenticated
- Choose **skill level** (Beginner / Intermediate / Advanced) and content source (Curated / Generated)
- **Curated melodies**: 2 hand-authored pieces per level (e.g. Morning Walk, Ode to Joy, Horizon Line)
- **Generated melodies**: seeded PRNG (mulberry32) produces reproducible scales, arpeggios, or stepwise melodies within the level's note pool and rhythm rules
- Custom **SVG staff renderer** — no external notation library; draws treble clef, 5-line staff, 4/4 time signature, note heads (filled quarter/eighth, hollow half/whole), stems, eighth-note flags (bezier), bar lines, ledger lines for middle C
- Finger numbers (1–5) above each note for beginner/intermediate; note letter names below
- **Playback**: Web Audio engine highlights each note in gold as it sounds; Play/Stop controls; timing driven by cascading `setTimeout` at the sheet's BPM
- **New Sheet** button generates a fresh melody without a page reload

---

## Stack

| Layer | Technology |
|---|---|
| Framework | [Astro](https://astro.build) v5 (SSR, `output: "server"`) |
| UI islands | React 18 (`client:only="react"`) |
| Platform | [Wix Headless](https://dev.wix.com/docs/go-headless) via `@wix/astro` |
| Bookings | `@wix/bookings`, `@wix/forms`, `@wix/redirects`, `@wix/auto_sdk_ecom_cart-v-2` |
| Audio | Web Audio API (no dependencies) |
| Deployment | `wix release` → Wix cloud hosting |

---

## Project Structure

```
piano-teacher/
└── app/                        # Wix Headless Astro project
    ├── src/
    │   ├── layouts/
    │   │   └── Layout.astro    # Shared nav, footer, CSS design tokens
    │   ├── pages/
    │   │   ├── index.astro     # Home page
    │   │   ├── services/
    │   │   │   ├── index.astro         # SSR services listing
    │   │   │   └── [slug].astro        # SSR service detail + booking flow
    │   │   ├── booking-confirmation.astro
    │   │   ├── login.astro             # OAuth initiation (redirects to Wix login)
    │   │   ├── login/callback.astro    # OAuth callback (exchanges code for tokens)
    │   │   ├── logout.astro            # Clears session cookie
    │   │   ├── member/index.astro      # Member dashboard (bookings + profile)
    │   │   ├── api/members/search.ts   # Member search API (for co-participant picker)
    │   │   ├── play.astro              # Piano game page
    │   │   └── practice.astro          # Practice sheet page (member-gated)
    │   ├── components/
    │   │   ├── bookingDriver.ts        # Wix booking sequence (createBooking → cart → checkout)
    │   │   ├── AvailabilityCalendar.tsx # Week calendar, slot picker (APPOINTMENT + CLASS)
    │   │   ├── BookingForm.tsx         # Schema-driven booking form
    │   │   ├── ServiceBookingFlow.tsx  # Step coordinator (calendar → form)
    │   │   ├── CoParticipantSelector.tsx # Member search + picker for couples/group lessons
    │   │   ├── ServiceCard.astro       # Service listing card
    │   │   ├── PianoGame.tsx           # Interactive piano keyboard + songs
    │   │   ├── PracticeSheet.tsx       # Practice sheet UI (level/type controls, playback)
    │   │   └── StaffSheet.tsx          # Pure SVG staff notation renderer
    │   ├── lib/
    │   │   ├── memberAuth.ts           # Session cookie parsing utilities
    │   │   ├── music.ts                # Shared pitch model (FREQ, note types, DIATONIC_STEPS)
    │   │   ├── audio.ts                # Shared Web Audio engine (playNote)
    │   │   └── practiceMelodies.ts     # Melody generator, curated melodies, fingering logic
    │   └── styles/
    │       └── components-bookings.css # Booking component styles (design-token CSS)
    ├── wix.config.json                 # Wix app + site IDs
    └── astro.config.mjs
```

---

## Local Development

```bash
cd app
npm install
npx @wix/cli@latest dev
```

The dev server proxies Wix SDK calls through your linked site. Requires a Wix account logged in via `wix login`.

## Deploy

```bash
cd app
npm run build   # always build first — wix release deploys dist/ as-is
wix release
```

---

## Wix Bookings Setup

The three services are created in Wix Bookings under the **Piano Lessons** category:

| Service | Type | Duration | Price |
|---|---|---|---|
| Private Lesson | APPOINTMENT | 60 min | $60 |
| Couples Lesson | APPOINTMENT | 60 min | $80 |
| Group Lesson | CLASS (max 6) | — | $35 |

**To enable booking availability:**
- Private + Couples lessons: set working hours for the staff member in the Wix dashboard → Bookings → Staff
- Group lesson: create recurring class sessions in the Wix dashboard → Bookings → Calendar
