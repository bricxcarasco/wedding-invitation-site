# Implementation Plan: Wedding Invitation Website

## Overview

Build the static Vite + React 19 + Tailwind v4 invitation site in the order the design's data flow runs: scaffold first so the project is runnable from task 1, then the generated gallery placeholders and the config, then the pure `src/lib/` modules with their property tests, then the motion layer, then the envelope gate, then the content sections in scroll order, then cross-cutting verification, README, and a final lint/build/test/bundle-size pass.

Language: **plain JavaScript with JSX** (design, Technology Decisions). No TypeScript, no `tsc` step. Runtime dependencies are limited to `react` and `react-dom`.

Every section component appends itself to `MainInvitation.jsx` in scroll order as it is built, so the site stays runnable and visibly grows section by section rather than landing in one wiring step at the end.

**All content ships complete.** There are no human inputs, no unfilled placeholders, and no `// TODO(couple):` markers anywhere in the deliverable. The gallery images are generated locally by a committed script, the two Google Maps URLs are built deterministically from the venue names, and the prose and alt text are written as final copy. What the couple may want to personalise later is listed in the Notes section and documented in the README.

## Tasks

- [x] 1. Project scaffold and global styling
  - [x] 1.1 Initialise the Vite + React 19 project
    - Create `package.json` with `"type": "module"`, runtime deps `react` and `react-dom` only, dev deps `vite`, `@vitejs/plugin-react`, `@tailwindcss/vite`, `tailwindcss`, `eslint` + React plugins, `vitest`, `jsdom`, `@testing-library/react`, `@testing-library/user-event`, `@testing-library/jest-dom`, `fast-check`, all at pinned versions
    - Define scripts `dev`, `build`, `lint`, `preview`, plus `test` and `test:run`. No `tsc` step
    - Create `vite.config.js` with `@vitejs/plugin-react` and `@tailwindcss/vite`, and the `test` block (`environment: 'jsdom'`, `setupFiles: ['./src/tests/setup.js']`, `globals: true`)
    - Create `eslint.config.js` as a flat config covering `**/*.{js,jsx}`
    - Create `src/main.jsx` mounting `App` into `#root`, and a minimal `src/App.jsx` placeholder so `npm run dev` serves a page immediately
    - _Requirements: 13.1, 13.3, 13.5, 13.6, 13.7, 9.4_
  - [x] 1.2 Write `index.html`, `netlify.toml`, and the Netlify detection stub
    - `index.html` with `<div id="root">`, the module script for `main.jsx`, and viewport meta. **No font preload and no font `<link>` of any kind** — the site ships no webfont, so the initial request set is HTML + CSS + JS only
    - Add the Netlify form detection stub as a **sibling of `#root`**, never inside it: `<form name="rsvp" data-netlify="true" hidden inert aria-hidden="true" style="display:none">` containing a hidden `form-name` input plus `guestName`, `attendance`, `guestCount`, `message` controls, each with `tabindex="-1"`. Field names only — no couple name, date, venue, or readable label anywhere in the stub
    - `netlify.toml` with `[build] command = "npm run build"` and `publish = "dist"`
    - OPTIONAL (polish, not a stated requirement): `public/favicon.svg` in a Palette colour
    - _Requirements: 8.3, 1.4, 13.2, 13.3, 12.1_
  - [x] 1.3 Write `src/index.css`
    - `@import "tailwindcss"` plus an `@theme` block declaring the four Palette tokens (`#55705f`, `#a3b899`, `#ede0cd`, `#c0c0c0`) and the two font stacks
    - Font stacks are **self-contained, zero-byte, and system-resolved** — no `@font-face`, no webfont file, no external request:
      - display: `'Cormorant Garamond', Didot, 'Playfair Display', Georgia, 'Times New Roman', serif`
      - body: `Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif`
    - Record the rationale in a comment: no acceptance criterion requires a custom typeface, so shipping none costs zero font bytes, makes no external request, raises no licence question, and keeps the initial request set to HTML + CSS + JS, which strengthens 12.1
    - `html { scroll-behavior: smooth; }` and a 16px base font size on `html`
    - The `.reveal` / `.reveal--visible` transition pair (opacity + transform only), `.gallery-img` hover transform, `.parallax-layer` transform reading `--parallax-y`, `.ambient` keyframes, and a shared ≥44×44px interactive-target utility
    - The global `@media (prefers-reduced-motion: reduce)` block neutralising animation and transition durations and delays, and forcing `.reveal`, `.gallery-img:hover`, `.parallax-layer`, `.ambient` to their final state. `scroll-behavior: smooth` stays **outside** this block, per the design's reading of 10.1 and 10.6
    - OPTIONAL (polish, not a stated requirement): add one self-hosted display `woff2` later — create `src/assets/fonts/`, add a single `@font-face` with `font-display: swap`, prepend its family to the display stack. Nothing else changes
    - _Requirements: 7.2, 10.1, 10.4, 10.5, 10.6, 11.4, 11.5, 12.1, 13.5, 14.4_
  - [x] 1.4 Set up the test harness
    - Create `src/tests/setup.js` importing `@testing-library/jest-dom/vitest` and registering a `matchMedia` shim so `useReducedMotion` is controllable per test
    - Add a helper that renders under a chosen reduced-motion value, reused by the gate, RSVP, and reduced-motion tests
    - Confirm `npm run test:run` exits zero with no test files failing to collect
    - _Requirements: 13.7_

- [x] 2. Generated gallery placeholders and wedding config
  - [x] 2.1 Write and run `scripts/generate-placeholders.mjs`
    - Commit a small Node script at `scripts/generate-placeholders.mjs`, run once with `node scripts/generate-placeholders.mjs`, that emits exactly seven WebP files into `src/assets/gallery/` at the required filenames and 1200 × 800: `01-rings.webp`, `02-couple-portrait.webp`, `03-ceremony.webp`, `04-flowers.webp`, `05-venue.webp`, `06-outdoor-scenery.webp`, `07-reception-details.webp`
    - Each file renders a distinct, tasteful, **palette-only** composition evoking its subject — soft Sage / Light Sage / Cream / Silver gradients plus a simple geometric motif: concentric rings (`01-rings`), two overlapping soft ellipses (`02-couple-portrait`), an arch (`03-ceremony`), radial petal forms (`04-flowers`), a horizon band (`05-venue`), layered hills (`06-outdoor-scenery`), a table-setting arrangement of circles (`07-reception-details`) — with the subject name set in the display face. They must read as intentional design placeholders in the wedding palette, never as grey boxes or broken images
    - Encode with `sharp` added as a devDependency, or, if avoiding a native dependency is preferred, emit lossless WebP through a minimal encoder. Either way every file must be a valid `.webp` and land under 300KB
    - Nothing is downloaded and nothing is hotlinked, so there is no third-party licence obligation. Write `src/assets/gallery/CREDITS.md` recording each of the seven files as an agent-generated palette placeholder with no external source and no licence obligation, and pointing at this script for regeneration
    - `src/assets/gallery/` holds exactly the seven images and `CREDITS.md`, nothing else
    - _Requirements: 6.1, 6.2, 6.3, 12.2, 13.5_
  - [x] 2.2 Write `src/config/weddingConfig.js` — structure, values, and the two Google Maps URLs
    - Named exports `CEREMONY_DATETIME = '2026-02-13T14:00:00+08:00'` and `palette` (four `{ name, hex }` entries); default export `weddingConfig`
    - `couple` (groomName, brideName, displayNames `'Bricx & Mae'`, tagline), `schedule` (ceremonyDatetime, displayDate `'February 13, 2026'`, displayTime `'2:00 PM'`), `ceremony` and `reception` (label, venueName, mapsUrl), `palette`, `story`, `dressCode.guidance`, `gallery` (seven `{ subject, src, alt, width: 1200, height: 800 }` entries importing from `src/assets/gallery/`), `calendar` (summary, description, durationMinutes — **no** `location` key), `rsvp` (formName `'rsvp'`, minGuests 1, maxGuests 10)
    - Build one **deterministic, always-valid** Google Maps URL per venue using Google's documented universal cross-platform form, `https://www.google.com/maps/search/?api=1&query=<URL-encoded venue name and locality>`, with the query being `encodeURIComponent(venueName)` of that venue's own name. Do **not** fabricate a `maps.app.goo.gl` short link — those are minted server-side and a guessed one 404s. These resolve correctly on desktop, Android, and iOS
    - Add a code comment beside the two URLs noting that the couple may later paste a precise Maps share link or place-ID URL over either value with no other change required
    - This is the only file in the repository that holds any of these values
    - _Requirements: 14.1, 14.2, 14.3, 14.5, 14.6, 3.6, 4.4, 4.5_
  - [x] 2.3 Write the final prose copy and gallery alt text in `weddingConfig.js`
    - No TODO markers, no draft tags, no placeholder ellipses. This is shipped copy
    - `couple.tagline`: original, elegant, short
    - `story`: 60–200 words (the bound is enforced by the config test in 2.4) in the couple's collective first-person voice — warm and specific rather than generic greeting-card filler. **Invent no biographical facts** about how Bricx and Mae met; that history is not known here, so write about the shared present and the invitation itself instead
    - `dressCode.guidance`: semi-formal / garden-formal attire harmonising with the sage palette, phrased as a warm invitation rather than a rule list
    - Real, descriptive `alt` text for all seven `gallery` entries describing what the generated placeholder currently depicts, not what a future photograph might show
    - _Requirements: 2.3, 5.1, 7.1, 14.1, 14.4, 14.5, 6.5_
  - [x]* 2.4 Write the config shape test
    - `src/tests/config.test.js`: required keys present; `Date.parse(CEREMONY_DATETIME)` is finite; `palette` has exactly four entries each matching `/^#[0-9a-f]{6}$/i`; `gallery` has ≥7 entries each with a non-empty `alt` and 1200 × 800 dimensions; `story` word count is within 60–200
    - For each of `ceremony` and `reception`, assert `mapsUrl` starts with `https://`, parses as a URL whose host is a Google Maps host, and **contains `encodeURIComponent(venueName)` for that same venue** — a real check that the link points at the right place, not a bare "is absolute" assertion
    - _Requirements: 5.1, 6.1, 7.2, 7.3, 14.1, 14.2, 14.3, 14.4, 14.5_
  - [x]* 2.5 Write the asset guard test
    - `src/tests/assets.test.js`: every file in `src/assets/gallery/` other than `CREDITS.md` is a `.webp` ≤300KB; the seven expected filenames are all present; no extra image files exist elsewhere under `src/assets/`
    - _Requirements: 6.2, 12.2_

- [x] 3. Pure logic modules in `src/lib/`
  - [x] 3.1 Implement `src/lib/countdown.js`
    - Export `CEREMONY_MS = Date.parse(CEREMONY_DATETIME)` and `breakdown(nowMs, targetMs = CEREMONY_MS)`
    - Internal `phtFields`, `phtEpoch`, `DAYS_IN_MONTH`, `addMonthsPht` using only `getUTC*` getters and `Date.UTC`, with day-of-month clamping
    - `breakdown` follows the design's five steps: `<= 0` returns `{ isPast: true }`; civil month estimate; downward `while` correction; residual; floor-division into days/hours/minutes/seconds
    - No `Date.now()` inside the module's math — the instant is always a parameter
    - _Requirements: 3.1, 3.3, 3.4, 3.6_
  - [x]* 3.2 Write unit tests for `countdown.js`
    - `src/lib/countdown.test.js`: month-boundary and clamping examples (Jan 31 → Feb 28, leap-year Feb 29, 30/31-day transitions); exact boundary at `CEREMONY_MS` returns `isPast`; one millisecond before it does not
    - _Requirements: 3.1, 3.4_
  - [x]* 3.3 Write property test for countdown well-formedness
    - **Property 1: Countdown breakdown is well-formed** — in `src/lib/countdown.property.test.js`, `numRuns: 200`
    - **Validates: Requirements 3.1, 3.6**
  - [x]* 3.4 Write property test for timezone invariance
    - **Property 2: Countdown is timezone-invariant** — same file, `numRuns: 200`, exercising multiple host offsets
    - **Validates: Requirements 3.3**
  - [x]* 3.5 Write property test for countdown state totality
    - **Property 3: Countdown state is total, with the boundary inclusive of the ceremony instant** — same file, `numRuns: 200`
    - **Validates: Requirements 3.4, 3.5**
  - [x] 3.6 Implement `src/lib/icalendar.js`
    - `buildCeremonyEvent(config)` returning `{ uid, summary, description, location, startMs, endMs }`, with `location` read from `config.ceremony.venueName` and `startMs` from `CEREMONY_MS` — never a second copy of the venue string
    - `toIcs(event)` emitting RFC 5545 text: `DTSTART`/`DTEND`/`DTSTAMP` as `YYYYMMDDTHHMMSSZ` from `getUTC*`; escaping in the order `\` → `;` → `,` → CR/LF; 75-octet line folding with CRLF plus one space; `VCALENDAR`/`VEVENT` pairs with `VERSION`, `PRODID`, `CALSCALE`, `METHOD`
    - `downloadIcs(event, filename)` creating a Blob and object URL, clicking a generated anchor, and scheduling `URL.revokeObjectURL` in a `finally` via `setTimeout(…, 0)`
    - Browser platform APIs only; no new dependency
    - _Requirements: 9.2, 9.3, 9.4, 9.5, 14.6_
  - [x]* 3.7 Write unit tests for `icalendar.js`
    - `src/lib/icalendar.test.js`: `2026-02-13T14:00:00+08:00` serialises to `DTSTART:20260213T060000Z`; the comma in each venue name is emitted escaped; `createObjectURL` and `revokeObjectURL` call counts are equal after flushing timers; revocation still scheduled when anchor creation throws
    - _Requirements: 9.3, 9.5_
  - [x]* 3.8 Write property test for iCalendar serialisation
    - **Property 7: iCalendar serialisation round-trips and is structurally well-formed** — in `src/lib/icalendar.property.test.js`
    - **Validates: Requirements 9.3**
  - [x] 3.9 Implement `src/lib/rsvp.js`
    - `validateRsvp(values, limits = weddingConfig.rsvp)` returning an errors map keyed by field name, `{}` when valid: trimmed-empty name; attendance not one of `'attending'` / `'not-attending'`; guest count not an integer within `minGuests`–`maxGuests`. Guest count is required regardless of the attendance choice, exactly as 8.6 states — no conditional
    - `encodeRsvpPayload(values, formName = weddingConfig.rsvp.formName)` building a `URLSearchParams` body that always sets `form-name` first, then `guestName` (trimmed), `attendance`, `guestCount`, `message`
    - Both pure and total
    - _Requirements: 8.2, 8.4, 8.5, 8.6, 8.7_
  - [x]* 3.10 Write unit tests for `rsvp.js`
    - `src/lib/rsvp.test.js`: whitespace-only name rejected; `''`, `'  '`, `'abc'`, `2.5`, `0`, `11` all rejected for guest count; unset attendance rejected; guest count still required when attendance is `'not-attending'`; valid input yields `{}`
    - _Requirements: 8.4, 8.5, 8.6_
  - [x]* 3.11 Write property test for RSVP validation
    - **Property 4: RSVP validation rejects exactly the offending fields** — in `src/lib/rsvp.property.test.js`
    - **Validates: Requirements 8.4, 8.5, 8.6**
  - [x]* 3.12 Write property test for RSVP payload encoding
    - **Property 5: RSVP payload encoding round-trips** — same file, generating values containing spaces, ampersands, plus signs, newlines, and non-ASCII characters
    - **Validates: Requirements 8.2, 8.7**

- [x] 4. Checkpoint - pure logic complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Motion layer
  - [x] 5.1 Implement the reduced-motion source of truth
    - `src/motion/query.js` exporting `REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)'`
    - `src/hooks/useReducedMotion.js` reading `matchMedia(REDUCED_MOTION_QUERY)`, subscribing to `change`, returning a boolean
    - `src/motion/MotionContext.jsx` exporting `MotionProvider` and `useMotion()`. No component outside these two files may call `matchMedia`
    - _Requirements: 10.6, 1.8_
  - [x] 5.2 Implement `useScrollReveal` and `Reveal`
    - `src/hooks/useScrollReveal.js`: one module-level singleton `IntersectionObserver` (threshold `0.15`, rootMargin `'0px 0px -10% 0px'`) with a `WeakMap` element → callback; returns `[ref, isVisible]`; unobserves after the first intersection; under `reduce` returns `[ref, true]` and creates no observer
    - `src/components/Reveal.jsx` applying `.reveal` and toggling `.reveal--visible`, accepting a delay prop for stagger via `transition-delay` utilities
    - _Requirements: 10.2, 10.6, 12.4, 12.5_
  - [x] 5.3 Implement `useParallax` and `ParallaxLayer`
    - `src/hooks/useParallax.js`: passive `scroll` listener setting a dirty flag, one `requestAnimationFrame` per frame writing `--parallax-y` onto the node via `style.setProperty`, cleanup removing the listener and cancelling any pending frame. Never writes React state. Under `reduce` attaches nothing
    - `src/components/ParallaxLayer.jsx`: a single fixed `aria-hidden` decorative layer carrying `.parallax-layer`
    - _Requirements: 10.3, 10.6, 12.4, 12.5_

- [x] 6. Envelope gate
  - [x] 6.1 Implement the `App` gate state machine
    - Rewrite `src/App.jsx`: `useReducedMotion()` called exactly once here and published through `MotionProvider`; `phase` state of `'closed' | 'opening' | 'open'`; effect on `'opening'` scheduling `setPhase('open')` after `OPEN_MS = 1600` or `OPEN_MS_REDUCED = 250` under `reduce`, with `clearTimeout` cleanup
    - Render `InvitationEnvelope` while `phase !== 'open'`, `MainInvitation` only while `phase === 'open'`, so the invitation subtree is never constructed before the reveal
    - _Requirements: 1.4, 1.5, 1.8, 10.6_
  - [x] 6.2 Implement `InvitationEnvelope`
    - A single native `<button>` filling the envelope's rendered area, accessible name "Open your invitation", so pointer click, touch tap, `Enter`, and `Space` all activate it with no key handler
    - Centred flex layout, Palette gradient background, "Tap to Open" instruction text
    - Eight to twelve absolutely positioned `aria-hidden` `.ambient` particle spans with staggered `animation-delay`, not rendered at all under `reduce`
    - Handler guards on `phase !== 'closed'` so a repeat tap cannot restart the animation
    - _Requirements: 1.1, 1.2, 1.3, 1.5, 1.7, 1.8, 11.4_
  - [x] 6.3 Implement the `MainInvitation` shell
    - `src/components/MainInvitation.jsx`: **`MainInvitation` owns the focus target itself.** It renders its own wrapper element carrying `tabIndex={-1}` and holds the ref to it, so the focus behaviour is complete and testable at this task with no dependency on a Hero that does not exist yet
    - Mount effect calling `window.scrollTo({ top: 0, behavior: 'auto' })` and then `ref.current.focus({ preventScroll: true })`
    - Render `ParallaxLayer` plus an ordered slot list that tasks 7.1–7.12 fill in scroll order; the focus wrapper is the first slot, which `Hero` occupies in 7.1
    - _Requirements: 1.6, 10.3_
  - [x]* 6.4 Write the envelope gate tests
    - `src/tests/envelopeGate.test.jsx`: while closed, assert absence of every config-owned string (couple names, display date, both venue names, tagline) and of any RSVP control, and a focusable-element count of exactly one; activation via pointer click, touch tap, `Enter`, and `Space` each advance the gate; on reveal `window.scrollTo` is called with top 0 and focus lands on the Hero landmark rather than `document.body`; a second activation during `'opening'` does not restart the animation
    - Runs after 7.1, because the focus assertion targets the Hero landmark occupying `MainInvitation`'s focus wrapper
    - _Requirements: 1.3, 1.4, 1.5, 1.6_

- [x] 7. Content sections, in scroll order
  - [x] 7.1 Implement `Hero` and wire it into `MainInvitation`
    - Couple names from `couple.displayNames`, tagline from `couple.tagline`, wedding date from `schedule.displayDate`; the date is sized above every Hero text element except the names
    - Staged entrance using `Reveal` with staggered `transition-delay`; final-state render with no delay classes under `reduce`
    - `Hero` occupies the `tabIndex={-1}` focus wrapper `MainInvitation` created in 6.3, with the `<h1>` as its first heading — the ref stays owned by `MainInvitation`
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_
  - [x] 7.2 Implement `useCountdown` and `Countdown`, and wire into `MainInvitation`
    - `src/hooks/useCountdown.js`: lazy `useState` initialiser computing the first `breakdown` during initial render; a single 1000ms `setInterval` whose effect depends only on `state.isPast` and `targetMs`; `clearInterval` in cleanup; early return once past
    - `Countdown`: five labelled units (Months, Days, Hours, Minutes, Seconds) inside a `role="timer"` `aria-live="off"` container, digits `aria-hidden`, plus a visually hidden non-live prose summary; post-ceremony branch returns "And so, our forever begins." as different children rather than hiding the units with CSS
    - _Requirements: 3.1, 3.2, 3.4, 3.5, 3.6, 3.7_
  - [x]* 7.3 Write the countdown timer lifecycle tests
    - `src/tests/countdownTimer.test.jsx`, fake timers: the display recomputes at 1000ms; exactly one interval exists across several ticks; `clearInterval` is called on unmount; crossing the ceremony instant enters the post-wedding state within one tick
    - _Requirements: 3.2, 3.4, 3.7_
  - [x] 7.4 Implement `WeddingDetails` and `AddToCalendarButton`, and wire into `MainInvitation`
    - Ceremony card with label "Ceremony", time "2:00 PM", and the ceremony venue name; reception card with label "Reception" and the reception venue name — all read from `config.ceremony` / `config.reception` / `config.schedule`
    - Each card wrapped in `Reveal`; single column at mobile widths
    - `AddToCalendarButton`: control labelled "Add to Calendar" calling `buildCeremonyEvent` → `downloadIcs` with filename `bricx-and-mae-wedding.ics`
    - _Requirements: 4.1, 4.2, 4.3, 4.7, 9.1, 9.2, 9.5, 10.2, 11.2, 11.4_
  - [x] 7.5 Implement `OurStory` and wire it into `MainInvitation`
    - Render `config.story` inside `Reveal`; final position and opacity under `reduce`
    - _Requirements: 5.1, 5.2, 5.3, 10.2_
  - [x] 7.6 Implement `Gallery` and wire it into `MainInvitation`
    - Map `config.gallery`; each `<img>` carries `src`, `alt`, `width={1200}`, `height={800}`, `loading="lazy"`, `decoding="async"`, `className="gallery-img"`
    - CSS Grid: one column at mobile, two at tablet and laptop, three at desktop; box uses `aspect-ratio: 3 / 2` with `object-fit: cover`
    - Each image wrapped in `Reveal` with grid stagger; hover `scale(1.04)`, suppressed under `reduce`
    - OPTIONAL (polish, design's error-handling table rather than a stated requirement): `onError` handler painting a Cream-to-Light-Sage gradient in the reserved box while keeping `alt` available
    - _Requirements: 6.1, 6.3, 6.4, 6.5, 6.6, 6.8, 10.2, 11.2, 11.3, 12.1_
  - [x]* 7.7 Write the gallery image attribute test
    - `src/tests/galleryImages.test.jsx`: every gallery `<img>` has `loading="lazy"` and explicit `width` / `height`; every `alt` is non-empty; no `src` is an absolute external URL
    - _Requirements: 6.3, 6.4, 6.5_
  - [x] 7.8 Implement `Venue` and wire it into `MainInvitation`
    - Two anchors labelled "View Ceremony Location" and "View Reception Location", `href` from `config.ceremony.mapsUrl` / `config.reception.mapsUrl`, `target="_blank"`, `rel="noopener noreferrer"`
    - Each accessible name includes its venue name; each carries a visually hidden "(opens in a new tab)"; rendered as ≥44px-tall targets; section wrapped in `Reveal`
    - _Requirements: 4.4, 4.5, 4.6, 10.2, 11.4_
  - [x] 7.9 Implement `DressCode` and wire it into `MainInvitation`
    - `config.dressCode.guidance` plus four swatches mapped from `config.palette`, each rendering its colour name and hex value as adjacent text; section wrapped in `Reveal`
    - _Requirements: 7.1, 7.2, 7.3, 10.2_
  - [x] 7.10 Implement `Rsvp` and wire it into `MainInvitation`
    - `<form noValidate name="rsvp" method="POST" data-netlify="true">` with a hidden `form-name` input whose value equals the `name` attribute and matches the stub from task 1.2
    - Controlled `values` state and a `status` of `'idle' | 'submitting' | 'error' | 'success'`; fields `guestName` (text, required), `attendance` (two-option radio group in a `<fieldset>`/`<legend>` with no default selection), `guestCount` (number 1–10, required, labelled so a declining guest knows to enter 1), `message` (optional textarea)
    - Guest count stays unconditionally required per 8.6; the label copy is the mitigation for the declining guest, not a conditional
    - On submit run `validateRsvp`; on errors render each message in `<p id="{field}-error">` wired by `aria-describedby`, set `aria-invalid`, focus the first offending field, and send no request
    - On valid input `fetch('/', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: encodeRsvpPayload(values) })`; check `res.ok` explicitly and throw so a non-2xx joins the same `catch` as a rejection
    - `'success'` renders the confirmation in place of the fields; `'error'` renders a `role="alert"`, leaves `values` untouched, moves focus to the alert, and keeps submit enabled because `disabled` is bound to `'submitting'` alone; in flight, submit is disabled with `aria-busy` and a "Sending…" label
    - Section wrapped in `Reveal`
    - _Requirements: 8.1, 8.2, 8.4, 8.5, 8.6, 8.7, 8.8, 8.9, 8.10, 10.2, 11.4_
  - [x]* 7.11 Write the RSVP form tests
    - `src/tests/rsvpForm.test.jsx`: field presence and required flags; submit disabled while in flight; `res.ok` renders the success state in place of the fields; the hidden `form-name` value equals the form `name` and equals the stub's name in `index.html`
    - **Property 6: Failed submission preserves the guest's input and the ability to retry** — covering both failure modes, a rejected promise and a resolved `res.ok === false`
    - **Validates: Requirements 8.1, 8.8, 8.9, 8.10**
  - [x] 7.12 Implement `Footer` and wire it into `MainInvitation`
    - Closing line plus couple names read from config; completes the scroll order
    - _Requirements: 14.6_

- [x] 8. Cross-cutting verification
  - [x]* 8.1 Write the reduced-motion universal property test
    - **Property 8: Reduced motion leaves every section in its final visual state** — `src/tests/reducedMotion.property.test.jsx`, asserting over the Envelope_Gate and every Main_Invitation section that under `reduce` no element carries a pending `.reveal` state, no non-final opacity or non-identity transform, no `.ambient` particle, and no parallax offset
    - **Validates: Requirements 1.8, 2.5, 4.7, 5.3, 6.8, 10.6**
  - [x]* 8.2 Write the external-link `rel` sweep test
    - `src/tests/externalLinks.test.jsx`: query every `target="_blank"` anchor in the fully-rendered tree and assert both `noopener` and `noreferrer` tokens, so the invariant covers links added later
    - _Requirements: 4.6_
  - [x]* 8.3 Write the source scan tests
    - `src/tests/sourceScan.test.js`: no occurrence of `process.env` or `import.meta.env` anywhere under `src/` or in the root config files
    - No component file restates a config-owned literal — scan `src/components/` for the couple names, display date, display time, both venue names, and the four hex values, allowing them only in `weddingConfig.js` and `index.css`'s `@theme` block
    - _Requirements: 13.4, 14.6_
  - [x]* 8.4 Write the build-output detection stub test
    - `src/tests/buildOutput.test.js`: run the build, then assert `dist/index.html` still contains the `rsvp` form with `data-netlify="true"`, a matching `form-name`, the four field names matching the live form, and the `hidden` / `inert` / `aria-hidden` attributes
    - _Requirements: 8.3_

- [x] 9. Documentation
  - [x] 9.1 Write `README.md`
    - Netlify deployment steps and how to retrieve RSVP submissions from the Netlify dashboard
    - The Netlify free tier limit of 100 form submissions per month
    - **Personalisation points** — the site ships complete, and these are the things the couple is most likely to want to change: replace the generated gallery placeholders with real photographs; paste precise Google Maps share links or place-ID URLs over the two generated search URLs; rewrite the story, tagline, and dress code guidance in their own words; optionally add a self-hosted display webfont. Every one of them is a single edit in `weddingConfig.js` or a filename-for-filename asset swap
    - **The placeholder generator** — what `scripts/generate-placeholders.mjs` produces, that the seven committed files are agent-generated palette compositions with no third-party licence obligation, and how to re-run it (`node scripts/generate-placeholders.mjs`) after editing the palette or motifs
    - The filename-for-filename gallery replacement procedure: export to WebP at 1200 × 800, confirm ≤300KB, overwrite the same filename, keep the `.webp` extension, including the one-line `cwebp` invocation
    - **The alt-text update step** — the seven `alt` strings currently describe the generated placeholders, so they must be rewritten in `weddingConfig.js` to describe the real photographs once those land
    - The manual verification checklist: the 320 / 375 / 768 / 1024 / 1440 / 2560px width sweep, the OS reduced-motion toggle path and what to re-check after toggling, and a production-preview network waterfall check confirming only envelope assets load first
    - _Requirements: 6.7, 8.11, 13.8, 11.1, 12.1_

- [x] 10. Final verification pass, including the gzipped bundle gate
  - Run `npm run lint`, `npm run build`, and `npm run test:run`; all three must exit zero. Fix anything they surface
  - **Measure the gzipped bundle**: gzip every JS and CSS chunk in `dist/assets/` and sum the compressed sizes. The total must be **≤300KB gzipped** (requirement 12.3). Record the measured figure. If it exceeds the threshold, treat it as a failure and reduce it rather than noting it
  - Confirm `package.json` still declares only `react` and `react-dom` as runtime dependencies, and that no webfont file is shipped
  - _Requirements: 12.3, 13.1, 13.5, 13.6, 13.7, 9.4_

- [x] 11. Final checkpoint
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- **All content is agent-generated and complete.** There is no human-input backlog, no unfilled placeholder, and no `// TODO(couple):` marker in the deliverable. The gallery images come from `scripts/generate-placeholders.mjs` (task 2.1), the two Maps URLs are built deterministically from the venue names (task 2.2), and the tagline, story, dress code guidance, and all seven `alt` strings are written as shipped copy (task 2.3). The site can be deployed as-is.
- **What the couple will most likely want to personalise later**, all documented in the README (task 9.1) and each a single edit:
  - Real photographs in place of the seven generated palette placeholders, swapped filename-for-filename with no code change
  - Precise Google Maps share links or place-ID URLs over the two generated `search/?api=1&query=…` URLs
  - Their own wording for the story, the tagline, and the dress code guidance
  - An optional self-hosted display webfont, prepended to the display stack in `index.css` (bullet in task 1.3)
  - The seven `alt` strings, rewritten to describe the real photographs once those land
- No webfont ships. The display and body stacks resolve against system faces, so the initial request set is exactly HTML + CSS + JS — zero font bytes, no external request, no licence question. No acceptance criterion asks for a custom typeface.
- Guest count is required unconditionally, including for guests who decline, exactly as 8.6 states. The mitigation is label copy telling a declining guest to enter 1, not a conditional. This is deliberate and settled.
- Tasks marked with `*` are test sub-tasks and can be skipped for a faster first deploy. They are not filler: the design's testing strategy leans on them for the requirements jsdom can actually check, so skipping them means those requirements rest on manual review alone.
- Bullets tagged `OPTIONAL (polish…)` are the only genuinely discretionary items — the favicon in 1.2, the display webfont in 1.3, and the gallery `onError` fallback in 7.6. Everything else in an unstarred task traces to a numbered requirement.
- `MainInvitation.jsx` is touched by tasks 6.3 and 7.1–7.12, and `weddingConfig.js` by 2.2 and 2.3, which is why those tasks are scheduled in separate waves.
- Task 6.4 is scheduled after 7.1 because its focus assertion targets the Hero landmark, which only exists once Hero occupies the focus wrapper.
- Requirements 11.1–11.5, 12.1, and the visual claims in 1.1, 1.2, 2.2, 6.6, 10.1, 10.3–10.5 are verified by the README checklist written in task 9.1, not by automated tests. Requirement 12.3 is gated by the gzip measurement in task 10. The design records why for each.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2", "1.3", "1.4"] },
    { "id": 2, "tasks": ["2.1"] },
    { "id": 3, "tasks": ["2.2"] },
    { "id": 4, "tasks": ["2.3"] },
    { "id": 5, "tasks": ["2.4", "2.5", "3.1", "3.6", "3.9"] },
    { "id": 6, "tasks": ["3.2", "3.3", "3.7", "3.8", "3.10", "3.11", "5.1"] },
    { "id": 7, "tasks": ["3.4", "3.12", "5.2", "5.3"] },
    { "id": 8, "tasks": ["3.5", "6.2", "6.3"] },
    { "id": 9, "tasks": ["4"] },
    { "id": 10, "tasks": ["6.1"] },
    { "id": 11, "tasks": ["7.1"] },
    { "id": 12, "tasks": ["6.4", "7.2"] },
    { "id": 13, "tasks": ["7.3", "7.4"] },
    { "id": 14, "tasks": ["7.5"] },
    { "id": 15, "tasks": ["7.6"] },
    { "id": 16, "tasks": ["7.7", "7.8"] },
    { "id": 17, "tasks": ["7.9"] },
    { "id": 18, "tasks": ["7.10"] },
    { "id": 19, "tasks": ["7.11", "7.12"] },
    { "id": 20, "tasks": ["8.1", "8.2", "8.3", "8.4"] },
    { "id": 21, "tasks": ["9.1"] },
    { "id": 22, "tasks": ["10"] },
    { "id": 23, "tasks": ["11"] }
  ]
}
```
