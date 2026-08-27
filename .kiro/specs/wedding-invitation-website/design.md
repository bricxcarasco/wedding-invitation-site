# Design Document

## Overview

The Invitation_Site is a static Vite + React 19 single-page application. There is no router, no server runtime, and no environment variable. The entire site is one document that exists in two mutually exclusive states: the Envelope_Gate, and the Main_Invitation.

The design is organised around four ideas:

1. **One gate, one tree.** The Main_Invitation is genuinely absent from the React tree until the envelope is opened. Nothing about the wedding is in the DOM before then.
2. **One source of truth for data.** Every wedding-specific value lives in `Wedding_Config`. Components read; they never restate.
3. **One source of truth for motion.** A single media-query constant feeds one React hook and one global CSS block. Components ask the hook; they never call `matchMedia` themselves.
4. **Pure logic at the edges.** Time arithmetic, iCalendar serialisation, RSVP validation and RSVP payload encoding are pure functions in `src/lib/`, separate from the components that call them. These are the parts worth testing automatically.

## Technology Decisions

### Build and framework

| Choice | Decision | Rationale |
|---|---|---|
| Bundler | Vite 7 | Single-step `npm run build` producing `dist/`, which is exactly what `netlify.toml` publishes (13.1, 13.2). |
| Framework | React 19 | Locked in the clarify phase. Used for the gate state machine and section composition, not for animation. |
| Styling | Tailwind CSS v4 via `@tailwindcss/vite` | v4 needs no `tailwind.config.js` and no PostCSS chain; the theme is declared with `@theme` inside `src/index.css`, so the Palette lives beside the rest of the global CSS. |
| Language | **Plain JavaScript with JSX** | Resolved from the open question in 13.6. |
| Linting | ESLint flat config in `eslint.config.js` | Matches the sibling `react-supabase-crud` project's convention. Provides `npm run lint` (13.6, 13.7). |
| Module type | `"type": "module"` in `package.json` | Required by 13.6, and required by Vite's ESM config loading. |

**Why JavaScript and not TypeScript.** Three reasons, in order of weight. First, there is no data-model complexity to protect: the only structured values are a config object literal and a five-field time breakdown, both of which a unit test pins down more usefully than a type. Second, the couple is expected to hand-edit `weddingConfig.js` directly; a plain object literal with comments is editable by someone who has never seen a type annotation, whereas a typed module invites type errors in a file that is meant to be a data form. Third, it keeps `npm run build` a single Vite invocation with no `tsc -b` step in front of it, which keeps the Netlify build fast and keeps 13.7's zero-exit-status requirement dependent on one tool instead of two.

### Animation: no animation library

**Decision: CSS transitions and keyframes, plus one small `IntersectionObserver` hook. No animation library.**

Requirement 12.3 caps the production JavaScript bundle at 300KB gzipped. React 19 plus `react-dom` is roughly 45KB gzipped; application code should land near 10KB. That leaves large headroom, so the budget is not the binding argument on its own. The binding argument is requirement 12.4, which mandates that continuous animation be driven by CSS `transform`/`opacity` or `requestAnimationFrame` rather than per-frame React state. A general-purpose animation library's core value is exactly the thing 12.4 forbids: interpolating values through the component lifecycle. Adding `framer-motion` (roughly 35–50KB gzipped even when tree-shaken to a handful of primitives) would buy declarative ergonomics for animations that this site expresses in about 60 lines of CSS keyframes, and would then need to be configured back into the compositor-only mode that plain CSS gives for free.

Every animation in the site is one of four kinds, and all four are native:

- **Ambient drift on the envelope** (1.2) — a CSS `@keyframes` translate/opacity loop on a handful of absolutely positioned particle elements. Runs on the compositor, no JS.
- **Envelope open** (1.5) — a one-shot CSS transition on `transform` and `opacity`, driven by a class change, with a `setTimeout` matching the CSS duration token to advance the state machine.
- **Staged entrance and scroll reveal** (2.4, 10.2) — a `.reveal` class toggled once per element by `IntersectionObserver`, with staggering expressed as `transition-delay` utilities.
- **Parallax** (10.3) — a rAF-throttled scroll handler that writes a CSS custom property onto one DOM node.

### Dependencies

Runtime: `react`, `react-dom`. Nothing else. This satisfies 9.4 (no calendar dependency) and keeps 13.5 trivially true.

Development: `vite`, `@vitejs/plugin-react`, `@tailwindcss/vite`, `tailwindcss`, `eslint` and its React plugins, `vitest`, `jsdom`, `@testing-library/react`, `@testing-library/user-event`, `@testing-library/jest-dom`, `fast-check`, plus `sharp` for the one-off gallery placeholder generation. All MIT or equivalently permissive. Dev dependencies do not enter the bundle, so they are outside the 12.3 budget.

### Fonts

No webfont is shipped. The `@theme` block declares two font stacks built entirely from faces the host already has:

- **Display** (couple names, section headings): `'Cormorant Garamond', Didot, 'Playfair Display', Georgia, 'Times New Roman', serif`
- **Body**: `Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif`

Rationale: no acceptance criterion asks for a custom typeface, so the two `woff2` files were pure cost. Dropping them means zero font bytes in the budget, no `@font-face` rule, no preload, no external or first-party font request, and no licence question at all — the initial request set is exactly HTML + CSS + JS, which makes 12.1 stronger rather than weaker. Both stacks lead with an elegant face that is common enough to be present on many machines and degrade through named fallbacks to a guaranteed generic, so the typography reads as intentional on every platform.

Adding a self-hosted display face later is optional polish: drop a `woff2` into a new `src/assets/fonts/`, add one `@font-face` with `font-display: swap`, and prepend its family to the display stack. Nothing else changes.

## Architecture

### High-level structure

```
index.html
  ├── <div id="root">              ← React owns this subtree
  └── <form name="rsvp" hidden>    ← Netlify detection stub, React never touches it
```

```
main.jsx
  └── App.jsx                       gate state machine + MotionProvider
        ├── InvitationEnvelope      mounted while phase is 'closed' | 'opening'
        └── MainInvitation          mounted only while phase is 'open'
              ├── ParallaxLayer     fixed decorative background
              ├── Hero
              ├── Countdown
              ├── WeddingDetails    (contains AddToCalendarButton)
              ├── OurStory
              ├── Gallery
              ├── Venue
              ├── DressCode
              ├── Rsvp
              └── Footer
```

`MainInvitation` is a composition wrapper, not an additional content section. It exists to own the post-reveal scroll reset and focus target in one place rather than spreading that concern across `App` and `Hero`.

### Envelope-gate reveal: data flow

`App` holds a single state value with three phases. The transition is one-way; there is no close path and no persistence across reloads, because nothing in the requirements asks for either.

```
        load
          │
          ▼
    ┌───────────┐   activate (click / tap / Enter / Space)   ┌───────────┐
    │  'closed' │ ────────────────────────────────────────▶  │ 'opening' │
    └───────────┘                                            └───────────┘
   InvitationEnvelope                                    InvitationEnvelope
   MainInvitation NOT in tree                            MainInvitation NOT in tree
                                                               │
                                          setTimeout(OPEN_MS)   │
                                                               ▼
                                                         ┌───────────┐
                                                         │  'open'   │
                                                         └───────────┘
                                                  InvitationEnvelope unmounted
                                                  MainInvitation mounted
                                                  scroll reset to top
                                                  focus moved to Hero landmark
```

```jsx
// App.jsx (shape, abridged)
const OPEN_MS = 1600;          // within the 1200–2500ms band of req 1.5
const OPEN_MS_REDUCED = 250;   // within the ≤300ms band of req 1.8

function App() {
  const reduced = useReducedMotion();
  const [phase, setPhase] = useState('closed');

  useEffect(() => {
    if (phase !== 'opening') return;
    const ms = reduced ? OPEN_MS_REDUCED : OPEN_MS;
    const id = setTimeout(() => setPhase('open'), ms);
    return () => clearTimeout(id);
  }, [phase, reduced]);

  return (
    <MotionProvider value={reduced}>
      {phase !== 'open'
        ? <InvitationEnvelope phase={phase} onOpen={() => setPhase('opening')} />
        : <MainInvitation />}
    </MotionProvider>
  );
}
```

Two properties of this shape matter.

**Absence, not concealment (1.4).** Because the `MainInvitation` element is never constructed while `phase !== 'open'`, none of its children run, no config-derived text is inserted into the document, and no form control exists to be focused, read by a screen reader, found by in-page search, or reached with Tab. This is materially stronger than `hidden`, `display: none`, `visibility: hidden`, or an `aria-hidden` wrapper, all of which leave the content in the document and several of which leave it in the accessibility tree or the find-in-page index. The phase-based conditional is the enforcement mechanism, and the automated check for 1.4 asserts absence of every config-owned string plus a focusable-element count of exactly one.

**The gate outlives its own animation.** `MainInvitation` mounts at the `'opening' → 'open'` edge, not at the `'closed' → 'opening'` edge, so the wedding content is still absent during the opening animation itself. The Hero's staged entrance (2.4) covers the mount, so the handoff reads as one continuous motion rather than a swap.

### Reconciling requirement 1.4 with requirement 8.3

These two requirements pull in opposite directions and the tension has to be resolved deliberately.

Requirement 8.3 needs a copy of the Rsvp_Form present in the **built** `index.html`, because Netlify's form detector runs at deploy time against the static HTML and never executes JavaScript. A form that only exists after React renders it is invisible to the detector, and submissions to an unregistered form name are rejected. Requirement 1.4 needs no RSVP field to be readable or focusable before the envelope is opened. A single form cannot be both statically present in `index.html` and absent from the pre-open document.

**Resolution: two forms with disjoint jobs.**

1. **A detection stub in `index.html`, outside the React root.** Its only purpose is to be parsed by Netlify at build time. It is never rendered to the user and never touched by React.

```html
<!-- index.html — sibling of #root, never mounted by React.
     Exists solely so Netlify's build-time form detector registers the "rsvp" form.
     Kept out of the accessibility tree, out of tab order, and out of find-in-page. -->
<form name="rsvp" data-netlify="true" hidden inert aria-hidden="true" style="display:none">
  <input type="hidden" name="form-name" value="rsvp" />
  <input type="text" name="guestName" tabindex="-1" />
  <input type="text" name="attendance" tabindex="-1" />
  <input type="number" name="guestCount" tabindex="-1" />
  <textarea name="message" tabindex="-1"></textarea>
</form>
```

Why this does not breach 1.4:
- `hidden` plus `display: none` removes the subtree from rendering, from the accessibility tree, and from find-in-page, and makes every descendant non-focusable.
- `aria-hidden="true"` and `inert` are redundant with the above but make the intent explicit and survive a stylesheet failure. `inert` additionally guarantees the controls cannot receive focus programmatically.
- `tabindex="-1"` on each control is a third layer, so the stub stays out of tab order even if `hidden` is somehow overridden.
- Critically, **the stub contains no wedding data**. It carries field *names* only, so even in a total-CSS-failure scenario it exposes no couple name, no date, no venue, and no readable label. Requirement 1.4 prohibits readable couple names, ceremony date, venue names, and RSVP fields; the stub's controls are unreadable and unfocusable, and the rest of the prohibited content is not in the file at all.

Being outside `#root` also means React's reconciler never sees it, so it cannot be removed by a re-render and cannot collide with the live form's DOM.

2. **The live form inside the `Rsvp` component.** Fully interactive, controlled by React state, mounted only when `phase === 'open'`. It carries the same `name="rsvp"` and `data-netlify="true"` (8.2) and submits via `fetch` with a URL-encoded body whose `form-name` field matches the stub's name (8.7). The stub and the live form must agree on the form name and on every field name; a test asserts that agreement so the pair cannot drift.

## Modules

### `src/config/weddingConfig.js` — Wedding_Config

Single default export plus a few named exports for values other modules import directly. Every value requirement 14 enumerates appears here exactly once, and nowhere else in the codebase (14.6).

```js
import rings         from '../assets/gallery/01-rings.webp';
import couple        from '../assets/gallery/02-couple-portrait.webp';
import ceremonyPhoto from '../assets/gallery/03-ceremony.webp';
import flowers       from '../assets/gallery/04-flowers.webp';
import venuePhoto    from '../assets/gallery/05-venue.webp';
import scenery       from '../assets/gallery/06-outdoor-scenery.webp';
import reception     from '../assets/gallery/07-reception-details.webp';

/** The Ceremony_Datetime as a fixed absolute instant. Offset-anchored on purpose. */
export const CEREMONY_DATETIME = '2026-02-13T14:00:00+08:00';

/** The Palette. Four entries, each a name and a #rrggbb value. (14.4, 7.2, 7.3) */
export const palette = [
  { name: 'Sage',        hex: '#55705f' },
  { name: 'Light Sage',  hex: '#a3b899' },
  { name: 'Cream',       hex: '#ede0cd' },
  { name: 'Silver Gray', hex: '#c0c0c0' },
];

const weddingConfig = {
  // 14.1
  couple: {
    groomName:    'Bricx Carasco',
    brideName:    'Giohannah Mae Manambit',
    displayNames: 'Bricx & Mae',
    tagline:      'Two hearts, one story, beginning forever.',
  },

  // 14.2
  schedule: {
    ceremonyDatetime: CEREMONY_DATETIME,
    displayDate:      'February 13, 2026',
    displayTime:      '2:00 PM',
  },

  // 14.3 — one venue name and one Google Maps URL per venue.
  // The URLs use Google's documented universal cross-platform search form,
  // which resolves correctly on desktop, Android and iOS. A short
  // maps.app.goo.gl link cannot be constructed offline — those are minted
  // server-side — so a guessed one would 404. The couple may later paste a
  // precise share link or a place-ID URL over either value; nothing else changes.
  ceremony: {
    label:     'Ceremony',
    venueName: 'Our Lady of Guadalupe Parish Church, Pagsanjan, Laguna',
    mapsUrl:   'https://www.google.com/maps/search/?api=1&query=Our%20Lady%20of%20Guadalupe%20Parish%20Church%2C%20Pagsanjan%2C%20Laguna',
  },
  reception: {
    label:     'Reception',
    venueName: 'La Revelacion Farm Resort, Brgy. Calusiche, Pagsanjan, Laguna',
    mapsUrl:   'https://www.google.com/maps/search/?api=1&query=La%20Revelacion%20Farm%20Resort%2C%20Brgy.%20Calusiche%2C%20Pagsanjan%2C%20Laguna',
  },

  palette,

  /**
   * 60–200 words, final copy — no TODO marker. A test enforces the bound so an
   * edit cannot silently break 5.1. Written in the couple's collective
   * first-person voice about the shared present and the invitation itself; it
   * invents no biographical detail about how Bricx and Mae met, because that is
   * not known here and a fabricated history would be worse than none.
   */
  story: '…',

  dressCode: {
    guidance: '…',   // 7.1 — semi-formal / garden-formal, phrased as a warm invitation
  },

  // 14.5 — every entry pairs a bundled import with alternative text. Each `alt`
  // is real descriptive copy of what the generated placeholder currently depicts,
  // to be rewritten when real photographs replace the files (README step).
  // width/height are carried here so Gallery can satisfy 6.4 from config.
  gallery: [
    { subject: 'rings',              src: rings,         alt: '…', width: 1200, height: 800 },
    { subject: 'couple-portrait',    src: couple,        alt: '…', width: 1200, height: 800 },
    { subject: 'ceremony',           src: ceremonyPhoto, alt: '…', width: 1200, height: 800 },
    { subject: 'flowers',            src: flowers,       alt: '…', width: 1200, height: 800 },
    { subject: 'venue',              src: venuePhoto,    alt: '…', width: 1200, height: 800 },
    { subject: 'outdoor-scenery',    src: scenery,       alt: '…', width: 1200, height: 800 },
    { subject: 'reception-details',  src: reception,     alt: '…', width: 1200, height: 800 },
  ],

  // Consumed by lib/icalendar.js. Location intentionally mirrors ceremony.venueName
  // by reference at call time, not by a second copy of the string.
  calendar: {
    summary:         'Wedding of Bricx & Mae',
    description:     'We would love to have you with us.',
    durationMinutes: 90,
  },

  rsvp: {
    formName:  'rsvp',
    minGuests: 1,
    maxGuests: 10,
  },
};

export default weddingConfig;
```

Note on `calendar.location`: it is **not** stored. `buildCeremonyEvent()` reads `weddingConfig.ceremony.venueName`, so the venue string exists once (14.6, 9.3).

### `src/lib/countdown.js` — time arithmetic

Two exported pure functions and one constant. No React, no `Date.now()` inside the math; the current instant is always a parameter, which is what makes the properties testable.

```js
export const CEREMONY_MS = Date.parse(CEREMONY_DATETIME);  // 1770962400000
export function breakdown(nowMs, targetMs = CEREMONY_MS) { … }
```

`breakdown` returns either `{ isPast: true }` or `{ isPast: false, months, days, hours, minutes, seconds }`.

**Timezone anchoring (3.3).** `Date.parse('2026-02-13T14:00:00+08:00')` resolves the offset at parse time and yields one epoch-millisecond integer, identical in every runtime regardless of the host timezone. `Date.now()` is likewise an epoch value. The subtraction `targetMs - nowMs` is therefore already timezone-independent, and nothing in the math ever reads a local-time getter (`getHours`, `getMonth`, `getFullYear`) on a `Date` constructed from an epoch value in local mode. The visitor's timezone never enters the computation.

**Month arithmetic (3.1).** Months and Days must be consistent: Days must be the remainder *after* whole calendar months are taken out, not an independent floor of the total duration. Because calendar months have unequal lengths, this needs civil-calendar arithmetic, and that arithmetic has to happen in the `+08:00` frame — the frame the wedding date is expressed in — not the visitor's frame, or two visitors could see different month counts for the same instant.

The trick is to shift into the PHT frame and then use only UTC getters:

```js
const PHT_OFFSET_MS = 8 * 60 * 60 * 1000;

// Civil (year, month, day, …) fields of an instant, as seen in +08:00.
// Read with getUTC* so the host timezone is never consulted.
function phtFields(epochMs) {
  const d = new Date(epochMs + PHT_OFFSET_MS);
  return {
    y: d.getUTCFullYear(), m: d.getUTCMonth(), d: d.getUTCDate(),
    h: d.getUTCHours(), mi: d.getUTCMinutes(), s: d.getUTCSeconds(),
    ms: d.getUTCMilliseconds(),
  };
}

// Inverse of phtFields: civil fields in +08:00 back to an epoch instant.
function phtEpoch({ y, m, d, h, mi, s, ms }) {
  return Date.UTC(y, m, d, h, mi, s, ms) - PHT_OFFSET_MS;
}

const DAYS_IN_MONTH = (y, m) => new Date(Date.UTC(y, m + 1, 0)).getUTCDate();

// Add whole calendar months in the PHT frame, clamping the day-of-month.
// 2025-01-31 + 1 month → 2025-02-28, never 2025-03-03.
function addMonthsPht(epochMs, n) {
  const f = phtFields(epochMs);
  const total = f.y * 12 + f.m + n;
  const y = Math.floor(total / 12);
  const m = total - y * 12;
  return phtEpoch({ ...f, y, m, d: Math.min(f.d, DAYS_IN_MONTH(y, m)) });
}
```

`breakdown` then runs a five-step algorithm:

1. If `targetMs - nowMs <= 0`, return `{ isPast: true }`. This is the only place the post-wedding decision is made, and `<= 0` makes the boundary at *exactly* the Ceremony_Datetime resolve to post-wedding (3.4).
2. Estimate whole months from the civil fields: `months = (t.y - n.y) * 12 + (t.m - n.m)`, where `n = phtFields(nowMs)` and `t = phtFields(targetMs)`.
3. Correct downward: `while (months > 0 && addMonthsPht(nowMs, months) > targetMs) months -= 1;`. The estimate can overshoot by at most one, because a calendar-month difference of *k* never spans less time than *k* whole months minus one; the loop is written as a `while` rather than a single decrement so day-of-month clamping cannot leave it wrong. It also cannot drive `months` below zero.
4. `residual = targetMs - addMonthsPht(nowMs, months)`. By step 3's post-condition `addMonthsPht(nowMs, months) <= targetMs`, so `residual >= 0`.
5. Split `residual` into days, hours, minutes, seconds by successive floor-division on 86 400 000 / 3 600 000 / 60 000 / 1000.

Two facts make step 5 exact. Philippine Standard Time has observed no daylight saving since 1978 and has a permanent `+08:00` offset, so a civil day in the PHT frame is always exactly 86 400 000 ms — there is no 23- or 25-hour day to skew the Days figure. And because step 4's residual is strictly less than the length of the month following the anchor, `days` can never reach a value that should have been another month.

Every unit is non-negative by construction: the `isPast` early return removes the negative-total case, step 3 clamps `months` at zero from below and at `targetMs` from above, and floor-division of a non-negative residual yields non-negative parts.

### `src/hooks/useCountdown.js` — the tick

```js
export function useCountdown(targetMs = CEREMONY_MS) {
  const [state, setState] = useState(() => breakdown(Date.now(), targetMs));

  useEffect(() => {
    if (state.isPast) return;                      // nothing left to tick toward
    const id = setInterval(() => {
      setState(breakdown(Date.now(), targetMs));
    }, 1000);
    return () => clearInterval(id);                // 3.7
  }, [state.isPast, targetMs]);

  return state;
}
```

- The lazy `useState` initialiser computes the first breakdown during the initial render, so the component never paints an empty or zeroed frame.
- Exactly one `setInterval` exists at a time. The effect's only dependencies are `state.isPast` and `targetMs`, so a per-second state change does not tear down and recreate the interval — the timer is created once, on mount, and once more only at the pre-to-post transition, where the effect re-runs, clears the interval, and returns early.
- The cleanup function calls `clearInterval` on unmount and on every re-run, satisfying 3.7 unconditionally.
- Period is 1000ms, satisfying the ≤1000ms recompute requirement (3.2) and bounding the transition into Post_Wedding_State at ≤1000ms (3.4).
- One `setState` per second is not per-frame work, so this does not conflict with 12.4. That requirement targets continuous animation, all of which is CSS or rAF here.

### `src/lib/icalendar.js` — Calendar_Download

Browser platform APIs only; no third-party dependency (9.4).

```js
export function buildCeremonyEvent(config = weddingConfig) { … }  // → event object
export function toIcs(event) { … }                                // → iCalendar text
export function downloadIcs(event, filename) { … }                // → side effect
```

`buildCeremonyEvent` assembles `{ uid, summary, description, location, startMs, endMs }`, taking `location` from `config.ceremony.venueName` and `startMs` from `CEREMONY_MS`.

`toIcs` emits RFC 5545 text:

- `DTSTART`/`DTEND`/`DTSTAMP` formatted as UTC basic-format timestamps, `YYYYMMDDTHHMMSSZ`, built from `getUTC*` getters. `2026-02-13T14:00:00+08:00` becomes `20260213T060000Z`, satisfying 9.3's "expressed in UTC".
- Text-valued properties escaped per §3.3.11, in this order: `\` → `\\`, then `;` → `\;`, `,` → `\,`, and CR/LF → `\n`. Order matters — escaping the backslash last would double-escape the sequences the other rules introduce. This is not cosmetic: both venue names contain commas, which an unescaped serialiser would emit as property-value separators, silently truncating the location in the guest's calendar app.
- Lines folded at 75 octets with CRLF followed by a single space, and the whole document joined with CRLF.
- `BEGIN`/`END` pairs for `VCALENDAR` and `VEVENT`, with `VERSION:2.0`, `PRODID`, `CALSCALE:GREGORIAN`, `METHOD:PUBLISH`.

`downloadIcs` performs the DOM side effect:

```js
const blob = new Blob([toIcs(event)], { type: 'text/calendar;charset=utf-8' });
const url = URL.createObjectURL(blob);
try {
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;              // 'bricx-and-mae-wedding.ics'  (9.2)
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
} finally {
  setTimeout(() => URL.revokeObjectURL(url), 0);   // 9.5
}
```

Revocation is deferred to the next macrotask rather than run synchronously in the `finally`. Some browsers begin fetching the blob asynchronously after `click()`, and revoking in the same tick can cancel the download. `setTimeout(…, 0)` still satisfies 9.5's "when the download has been triggered", and the `finally` guarantees the revocation is scheduled even if anchor creation throws. The test asserts `createObjectURL` and `revokeObjectURL` call counts are equal after flushing timers.

### `src/lib/rsvp.js` — validation and encoding

```js
export function validateRsvp(values, limits = weddingConfig.rsvp) {
  const errors = {};

  if (!String(values.guestName ?? '').trim()) {
    errors.guestName = 'Please enter your name.';
  }
  if (values.attendance !== 'attending' && values.attendance !== 'not-attending') {
    errors.attendance = 'Please let us know whether you can join us.';
  }
  const count = Number(values.guestCount);
  if (!Number.isInteger(count) || count < limits.minGuests || count > limits.maxGuests) {
    errors.guestCount = `Guest count must be a whole number from ${limits.minGuests} to ${limits.maxGuests}.`;
  }
  return errors;                        // {} means valid
}

export function encodeRsvpPayload(values, formName = weddingConfig.rsvp.formName) {
  const params = new URLSearchParams();
  params.set('form-name', formName);    // 8.2 / 8.7 — Netlify routes on this
  params.set('guestName', String(values.guestName ?? '').trim());
  params.set('attendance', values.attendance);
  params.set('guestCount', String(values.guestCount));
  params.set('message', String(values.message ?? ''));
  return params.toString();
}
```

Both are pure and total. `validateRsvp` returns a map keyed by field name, which the `Rsvp` component uses both to render the message beside the offending control and to decide which control to focus. Empty-name detection trims first, so a whitespace-only name is rejected rather than accepted as a blank name. `Number('')` and `Number('  ')` both yield `0`, which fails the lower-bound check; `Number('abc')` yields `NaN`, which fails `Number.isInteger`. Non-integers such as `2.5` are rejected explicitly rather than being silently floored.

The guest count is required regardless of the attendance choice, because 8.6 states the rule unconditionally. The label makes this legible for a declining guest ("How many in your party? Enter 1 if you are replying only for yourself").

### `src/hooks/useReducedMotion.js` and `src/motion/MotionContext.jsx`

**Reduced motion has exactly one source of truth per layer, and both layers key off the same constant.**

```js
// src/motion/query.js — the single constant, imported by both layers
export const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';
```

**Layer 1 — JavaScript, for anything React decides.** `useReducedMotion` reads `matchMedia(REDUCED_MOTION_QUERY)`, subscribes to its `change` event, and returns a boolean. It is called **once**, in `App`, and the value is published through `MotionContext`. Components consume `useMotion()`, which reads the context. No component calls `matchMedia`, and the site installs exactly one media-query listener, so a user toggling the OS setting mid-visit re-renders the whole tree consistently rather than leaving sections in disagreeing states.

The JS layer governs decisions CSS cannot express:

| Decision | Under `reduce` |
|---|---|
| Ambient particle elements in `InvitationEnvelope` | Not rendered at all (1.8's "omit") |
| Envelope open duration | `OPEN_MS_REDUCED` = 250ms cross-fade (1.8) |
| `useScrollReveal` | Returns already-revealed; no `IntersectionObserver` is created (4.7, 5.3, 6.8, 10.6) |
| `useParallax` | Attaches no scroll listener and schedules no rAF (10.6) |
| Hero stagger | `Hero` renders in final state, no delay classes (2.5) |

**Layer 2 — CSS, for anything the stylesheet owns.** One global block in `src/index.css` neutralises authored motion. This is a safety net, not a duplicate policy: it catches CSS-only animation (the keyframes themselves) and protects against a JS path being added later without the hook.

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    animation-delay: 0ms !important;
    transition-delay: 0ms !important;
  }
  .reveal, .reveal--visible { opacity: 1 !important; transform: none !important; }
  .gallery-img:hover        { transform: none !important; }   /* 6.8 */
  .parallax-layer           { transform: none !important; }   /* 10.3 → 10.6 */
  .ambient                  { display: none !important; }     /* 1.8 */
}
```

`html { scroll-behavior: smooth; }` is deliberately **not** in this block. Requirement 10.1 states it unconditionally, and 10.6's list of effects to disable — scroll reveals, parallax, particle motion, text reveals, image zoom — does not include it. The requirements are followed as written.

The one thing this design refuses to do is let a component decide its own motion policy. Ad hoc `matchMedia` calls scattered through nine components would be nine chances for one section to keep animating under `reduce`, and the reduced-motion correctness property below is stated over *all* sections precisely because the policy is centralised enough for that to be provable.

### `src/hooks/useScrollReveal.js` and `src/components/Reveal.jsx`

A module-level singleton `IntersectionObserver` with a `WeakMap` from element to callback, so N revealing elements cost one observer rather than N (12.5).

```js
// threshold 0.15, rootMargin '0px 0px -10% 0px' — fires slightly before the
// element is fully in view, so the animation is already settling as it arrives.
```

`useScrollReveal()` returns `[ref, isVisible]`. Under `reduce` it returns `[ref, true]` immediately and never registers with the observer. Otherwise it registers on mount, sets `isVisible` on the first intersecting entry, then **unobserves** — the reveal is one-shot, matching "first enters the viewport" in 4.3, 5.2 and 6.5, and keeping the observer's element set shrinking rather than growing.

`Reveal` is a thin wrapper that applies `.reveal` and toggles `.reveal--visible`:

```css
.reveal            { opacity: 0; transform: translateY(24px);
                     transition: opacity 700ms ease-out, transform 700ms ease-out; }
.reveal--visible   { opacity: 1; transform: none; }
```

Two animated properties, both compositor-friendly, which keeps every section inside 10.5's three-property ceiling. One `setState` per element, once, over the lifetime of the page — not per-frame work, so 12.4 holds. Staggering within a section (the Hero's staged entrance, the gallery grid) uses `transition-delay` utilities, which add no JavaScript.

### `src/hooks/useParallax.js` and `src/components/ParallaxLayer.jsx`

One fixed, decorative background layer behind the scrolling content, satisfying 10.3 at close to zero cost.

```js
// Under `reduce`: no listener, no rAF, no writes. Returns a ref and does nothing.
// Otherwise:
//   passive 'scroll' listener sets a dirty flag
//   one rAF, scheduled only when dirty, reads window.scrollY and writes
//     node.style.setProperty('--parallax-y', `${scrollY * FACTOR}px`)
//   cleanup removes the listener and cancels any pending frame
```

```css
.parallax-layer { transform: translate3d(0, var(--parallax-y, 0px), 0); will-change: transform; }
```

Three points of cheapness. The scroll listener is `passive`, so it never blocks the compositor. Work is coalesced into at most one rAF per frame, which is exactly the bound 12.5 sets. And the value is written to a CSS custom property on a DOM node rather than into React state, so scrolling triggers zero renders — the requirement 12.4 draws a line against. `background-attachment: fixed` was considered and rejected: it is the cheapest possible parallax on paper but forces expensive repaints on iOS Safari and is widely ignored on mobile, so it would fail the spirit of 12.3–12.5 while technically passing.

Smooth scrolling (10.1) is a single global declaration, `html { scroll-behavior: smooth; }`. No scroll-hijacking library, no JS easing loop, nothing to budget.

## Components

| Component | Responsibility | Key requirements |
|---|---|---|
| `InvitationEnvelope` | Closed-envelope landing state, ambient drift, "Tap to Open" affordance, activation handling, open animation | 1.1, 1.2, 1.3, 1.5, 1.7, 1.8 |
| `MainInvitation` | Composition wrapper; scroll reset and focus target on reveal | 1.6, 10.2 |
| `Hero` | Couple names, tagline, wedding date; staged entrance | 2.1–2.5 |
| `Countdown` | Five units or Post_Wedding_State message | 3.1–3.7 |
| `WeddingDetails` | Ceremony and reception cards; hosts `AddToCalendarButton` | 4.1–4.3, 4.7, 9.1, 11.2 |
| `OurStory` | Narrative message from config | 5.1–5.3 |
| `Gallery` | Seven bundled placeholders, lazy loading, hover scale | 6.1, 6.3–6.6, 6.8, 11.2, 11.3, 12.1 |
| `Venue` | Two labelled external map links | 4.4–4.6 |
| `DressCode` | Attire guidance plus four Palette swatches | 7.1–7.3 |
| `Rsvp` | Live Netlify form, validation, submission, success and error states | 8.1, 8.2, 8.4–8.10 |
| `Footer` | Closing line and couple names | — |
| `AddToCalendarButton` | Triggers `.ics` generation and download | 9.1, 9.2, 9.5 |
| `ParallaxLayer` | Single decorative parallax background | 10.3 |
| `Reveal` | Scroll-reveal wrapper used by all revealing sections | 10.2, 10.6 |

### `InvitationEnvelope`

The activation surface is a single `<button>` wrapping the envelope artwork, not a `div` with a click handler. A native button gives pointer click, touch tap, `Enter` and `Space` activation for free — all four modalities 1.5 enumerates — plus focus ring, `role="button"`, and correct behaviour under assistive technology, with no `onKeyDown` code to get wrong. The button fills the envelope's rendered area so a mobile tap anywhere on the envelope activates it (1.7), and it is sized well above the 44×44 minimum (11.4).

Guard: `if (phase !== 'closed') return;` in the handler, so a double-tap during the animation cannot restart it. Requirement 1.5 specifies a *single* opening animation.

Ambient element (1.2): eight to twelve absolutely positioned, `aria-hidden` particle spans over a Palette gradient, animated by a CSS `@keyframes` loop on `transform` and `opacity` with staggered `animation-delay`. Not rendered at all under `reduce`.

### `MainInvitation` — reveal-time focus and scroll

```jsx
function MainInvitation() {
  const heroRef = useRef(null);
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });   // 1.6
    heroRef.current?.focus({ preventScroll: true }); // focus follows the reveal
  }, []);
  …
}
```

`behavior: 'auto'` overrides the global smooth scrolling for this one programmatic jump, because a smooth scroll to a page that just mounted at scroll position zero is either a no-op or a visible lurch.

Focus management matters here: the envelope button was the focused element, and unmounting it would drop focus to `document.body`, stranding keyboard and screen-reader users at an unannounced document start. Focus moves to the Hero's `<h1>` wrapper, which carries `tabIndex={-1}` — programmatically focusable, not tab-reachable. `preventScroll: true` stops the focus call from fighting the scroll reset.

### `Countdown`

Renders `useCountdown()` output. Pre-ceremony: five labelled units in a responsive row, each unit a value and a label, wrapped in a container with `role="timer"` and `aria-live="off"`. `aria-live` is off deliberately — a per-second live region would flood a screen reader with announcements. A visually hidden, non-live summary sentence gives assistive technology the remaining time as prose, and the ticking digits are `aria-hidden`.

Post-ceremony: the five units are replaced by "And so, our forever begins." (3.5). The units are not hidden with CSS; the branch returns different children, so the stale numbers are genuinely gone.

### `Gallery`

CSS Grid: one column at mobile (11.2), two at tablet and laptop, three at desktop (11.3). Each image renders from a config entry:

```jsx
<img
  src={item.src}
  alt={item.alt}
  width={item.width}       /* 1200 */
  height={item.height}     /*  800 */
  loading="lazy"           /* 6.4, 12.1 */
  decoding="async"
  className="gallery-img"
/>
```

Explicit `width`/`height` matching the intrinsic dimensions let the browser reserve layout space before the bytes arrive, so lazy loading does not cause cumulative layout shift. The rendered box uses `aspect-ratio: 3 / 2` with `object-fit: cover`, so the attributes stay honest about the file while the layout stays fluid.

Hover: `transform: scale(1.04)` on `.gallery-img:hover`, inside the 1.02–1.10 band of 6.6, with `transition: transform 400ms`. Transform only — one animated property, well inside the 10.5 ceiling, and compositor-only per 12.4. Suppressed under `reduce` (6.8).

Failure handling: an `onError` handler adds a class that paints a Cream-to-Light-Sage gradient in the image's reserved box. The `alt` text remains available, so a missing file degrades to a labelled placeholder rather than a broken-image icon in the middle of the gallery.

### Placeholder images

**Sourcing and licence.** The seven files that ship are **generated locally**, not downloaded. A committed Node script, `scripts/generate-placeholders.mjs`, run once, emits all seven WebP files at the exact required filenames and dimensions. Each is a palette-only composition — soft Sage / Light Sage / Cream / Silver gradients with a simple geometric motif evoking its subject (concentric rings, two overlapping ellipses, an arch, radial petal forms, a horizon band, layered hills, a table-setting arrangement of circles) plus the subject name set in the display face. They read as intentional design placeholders in the wedding palette rather than as grey boxes or broken images.

Because nothing is downloaded and nothing is hotlinked, there is no third-party licence obligation at all: 13.5 is satisfied by construction, and `src/assets/gallery/CREDITS.md` records each file as an agent-generated palette placeholder rather than carrying a source URL and licence row. Every file is committed and served from the Vite build output, satisfying 6.3 and eliminating any external-host dependency.

Replacing the placeholders with real photographs is the documented follow-up (6.7), not a precondition for shipping — the site is complete and coherent as it stands. The replacement procedure below is filename-for-filename, so it needs no code change.

**Location.** `src/assets/gallery/` — one dedicated folder, nothing else in it but the seven images and `CREDITS.md` (6.2).

**Format and dimensions.** WebP, 1200 × 800 (3:2). The generator encodes with `sharp` as a devDependency, or emits lossless WebP through a minimal encoder if avoiding a native dependency is preferred; either way each file is a valid `.webp` well under the ≤300KB per-file cap of 12.2 (flat palette gradients compress to a few tens of KB), with an automated check asserting the byte size of every file in the folder. 1200px wide covers a two-up desktop grid at 2× density without shipping full-resolution originals. A uniform aspect ratio keeps the `width`/`height` attributes (6.4) consistent across all seven entries and keeps the grid tidy without per-image CSS.

**Filenames** encode order and subject, covering the seven subjects 6.1 enumerates:

```
01-rings.webp   02-couple-portrait.webp   03-ceremony.webp   04-flowers.webp
05-venue.webp   06-outdoor-scenery.webp   07-reception-details.webp
```

**Replacement procedure** (6.7, documented in the README): export the real photograph to WebP at 1200 × 800, confirm it is under 300KB, and overwrite the file of the same name. No code change is needed — Vite re-hashes the import automatically. The README includes a one-line `cwebp` invocation for the conversion and notes that the extension must stay `.webp` for the import to resolve, and that `alt` text in `weddingConfig.js` should be updated to describe the real photograph.

### `Venue`

Two anchors, one per venue, labelled "View Ceremony Location" and "View Reception Location" (4.4, 4.5), with `href` read from config, `target="_blank"`, and `rel="noopener noreferrer"` (4.6). `noopener` denies the opened tab a handle on `window.opener`; `noreferrer` withholds the referrer. Each anchor's accessible name includes the venue name so the two links are distinguishable out of context, and each carries a visually hidden "(opens in a new tab)" so the target change is announced. Rendered as ≥44px-tall buttons (11.4). A test queries every `target="_blank"` anchor in the whole tree and asserts both `rel` tokens, so the invariant covers future links too, not just these two.

### `Rsvp` — form, submission, and error handling

Controlled inputs held in one `values` state object; status held in one `status` value: `'idle' | 'submitting' | 'error' | 'success'`.

```
                      ┌──────┐
                      │ idle │◀───────────────────────┐
                      └──┬───┘                        │
             submit      │                            │ user edits a field
                         ▼                            │
                  validateRsvp(values)                │
                    │            │                    │
            errors ≠ {}       errors = {}             │
                    │            │                    │
                    ▼            ▼                    │
        render messages,   ┌────────────┐             │
        focus first bad    │ submitting │             │
        field, stay idle   └─────┬──────┘             │
                                 │                    │
                    ┌────────────┴────────────┐       │
                 res.ok                 reject / !ok  │
                    │                         │       │
                    ▼                         ▼       │
              ┌─────────┐               ┌───────┐     │
              │ success │               │ error │─────┘
              └─────────┘               └───────┘
```

`<form noValidate onSubmit={…}>` with `data-netlify="true"`, `name="rsvp"`, `method="POST"`, and a hidden `form-name` input whose value equals the `name` attribute (8.2). `noValidate` hands validation messaging to React, because native constraint bubbles are non-queryable, inconsistently styled, and disappear on blur — none of which satisfies "display a validation message identifying the field" (8.4–8.6) in a way that survives a screen reader or a test. The `required`, `min` and `max` attributes stay on the controls for semantics and assistive-technology exposure; `validateRsvp` is what actually gates the submission.

Fields (8.1): `guestName` text (required), `attendance` as a two-option radio group with no default selection so "unset" is a reachable state 8.5 can be triggered from, `guestCount` number 1–10 (required), `message` textarea (optional).

Error presentation: each message renders in a `<p id="{field}-error">` associated by `aria-describedby`, with `aria-invalid="true"` on the control. On a failed validation the first offending field receives focus, so a keyboard user is placed at the problem instead of hunting for it. Messages are rendered inline, so 8.4–8.6's "identifying the field" is satisfied by position as well as by wording.

Submission (8.7):

```js
await fetch('/', {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: encodeRsvpPayload(values),
});
```

Posting to `/` with a URL-encoded body containing `form-name` is Netlify's AJAX submission contract. On `res.ok`, status becomes `'success'` and the component renders the Rsvp_Success_State in place of the fields (8.8).

**Failure path (8.9).** Two distinct failures are handled identically from the guest's point of view, and both are treated as failures:

- The `fetch` promise rejects — offline, DNS failure, request aborted.
- The promise resolves with `res.ok === false` — a 4xx or 5xx from Netlify, most commonly an unregistered form name or the free-tier submission cap.

The second case is the one naive implementations miss, because `fetch` does not reject on HTTP error status. The handler checks `res.ok` explicitly and throws, funnelling both into one `catch`.

In the `'error'` state the component:

- renders an error message in a `role="alert"` region, so it is announced without the guest needing to find it;
- **leaves `values` untouched**, so every field the guest typed is still populated — the submit handler never clears state, and clearing only happens on transition to `'success'`;
- re-enables the submit control, because `disabled={status === 'submitting'}` is bound to the in-flight state alone, so leaving `'submitting'` re-enables it in both the success and failure directions;
- moves focus to the alert so a keyboard user is not left with focus on a button whose click apparently did nothing.

Retrying is just pressing submit again. There is no retry counter, no backoff, and no queue: the request is a single small POST, the guest is present and can judge whether to retry, and silent background retries risk duplicate RSVPs.

In-flight (8.10): `disabled` plus `aria-busy="true"` on the form and a "Sending…" label on the button, so the disabled state is visible rather than merely functional.

## Data Flow Summary

```
weddingConfig.js ──┬──▶ Hero, WeddingDetails, OurStory, Gallery, Venue, DressCode, Footer
                   ├──▶ lib/countdown.js  (CEREMONY_DATETIME → CEREMONY_MS)
                   │        └──▶ useCountdown ──▶ Countdown
                   ├──▶ lib/icalendar.js  (summary, venueName, CEREMONY_MS)
                   │        └──▶ AddToCalendarButton ──▶ Blob download
                   └──▶ lib/rsvp.js       (formName, min/maxGuests)
                            └──▶ Rsvp ──▶ fetch POST / ──▶ Netlify Forms

REDUCED_MOTION_QUERY ──▶ useReducedMotion ──▶ MotionContext ──▶ every component
                     └──▶ @media block in index.css
```

Data flows one way, out of config. No component writes to config, and no wedding-specific literal is restated downstream (14.6).

## File and Folder Structure

```
wedding-invitation/
├── .kiro/specs/wedding-invitation-website/
│   ├── requirements.md
│   ├── design.md
│   └── tasks.md
├── public/
│   └── favicon.svg
├── scripts/
│   └── generate-placeholders.mjs         ← emits the seven gallery WebP placeholders
├── src/
│   ├── assets/
│   │   └── gallery/                      ← the single dedicated asset folder (6.2)
│   │       ├── 01-rings.webp
│   │       ├── 02-couple-portrait.webp
│   │       ├── 03-ceremony.webp
│   │       ├── 04-flowers.webp
│   │       ├── 05-venue.webp
│   │       ├── 06-outdoor-scenery.webp
│   │       ├── 07-reception-details.webp
│   │       └── CREDITS.md
│   ├── components/
│   │   ├── InvitationEnvelope.jsx
│   │   ├── MainInvitation.jsx
│   │   ├── Hero.jsx
│   │   ├── Countdown.jsx
│   │   ├── WeddingDetails.jsx
│   │   ├── OurStory.jsx
│   │   ├── Gallery.jsx
│   │   ├── Venue.jsx
│   │   ├── DressCode.jsx
│   │   ├── Rsvp.jsx
│   │   ├── Footer.jsx
│   │   ├── AddToCalendarButton.jsx
│   │   ├── ParallaxLayer.jsx
│   │   └── Reveal.jsx
│   ├── config/
│   │   └── weddingConfig.js
│   ├── hooks/
│   │   ├── useCountdown.js
│   │   ├── useReducedMotion.js
│   │   ├── useScrollReveal.js
│   │   └── useParallax.js
│   ├── lib/
│   │   ├── countdown.js
│   │   ├── countdown.test.js
│   │   ├── countdown.property.test.js
│   │   ├── icalendar.js
│   │   ├── icalendar.test.js
│   │   ├── icalendar.property.test.js
│   │   ├── rsvp.js
│   │   ├── rsvp.test.js
│   │   └── rsvp.property.test.js
│   ├── motion/
│   │   ├── query.js
│   │   └── MotionContext.jsx
│   ├── tests/
│   │   ├── setup.js
│   │   ├── envelopeGate.test.jsx
│   │   ├── countdownTimer.test.jsx
│   │   ├── galleryImages.test.jsx
│   │   ├── rsvpForm.test.jsx
│   │   ├── externalLinks.test.jsx
│   │   ├── reducedMotion.property.test.jsx
│   │   ├── sourceScan.test.js
│   │   ├── buildOutput.test.js
│   │   ├── config.test.js
│   │   └── assets.test.js
│   ├── App.jsx
│   ├── main.jsx
│   └── index.css
├── eslint.config.js
├── index.html                            ← contains the Netlify detection stub
├── netlify.toml
├── package.json
├── vite.config.js
└── README.md
```

`netlify.toml`:

```toml
[build]
  command = "npm run build"
  publish = "dist"
```

`package.json` scripts: `dev`, `build`, `lint`, `preview` (13.6), plus `test` and `test:run`. No `tsc` step. No environment variable is read anywhere in `src/` or in the config files, satisfying 13.4; a test scans the source tree for `process.env` and `import.meta.env` to keep it that way.

## Error Handling

| Condition | Handling |
|---|---|
| RSVP request rejects (offline, DNS, abort) | `catch` → `'error'` state; message in `role="alert"`; entered values retained; submit re-enabled; focus moved to alert (8.9) |
| RSVP responds non-2xx (unregistered form, free-tier cap, 5xx) | `res.ok` checked explicitly and thrown, joining the same `'error'` path — `fetch` does not reject on HTTP error status |
| RSVP client-side validation failure | Stays `'idle'`; per-field messages; `aria-invalid`; focus on first offending field; no request sent (8.4–8.6) |
| Double submit | Submit disabled while `'submitting'` (8.10); handler early-returns if not `'idle'` or `'error'` |
| Gallery image fails to load | `onError` paints a Palette gradient in the reserved box; `alt` text remains available; layout unaffected because `width`/`height` reserved the space |
| Repeated envelope activation during the animation | Handler guards on `phase !== 'closed'`, so only one opening animation runs (1.5) |
| `.ics` generation throws mid-way | `finally` still schedules `revokeObjectURL`, so no object URL leaks (9.5) |
| Config `story` edited outside 60–200 words | Caught by an automated config test rather than at runtime (5.1) |
| Ceremony datetime edited to an unparseable string | Caught by an automated config test asserting `CEREMONY_MS` is finite. No runtime branch: a silent fallback would be worse than a failing build, and the value is a build-time constant |
| Component throws during render | No error boundary. A boundary would have nothing useful to fall back to on a single-page invitation with no user data at risk, and would add code that never runs. Deliberate omission |

## Accessibility

- **Envelope activation** — a native `<button>`, so click, tap, `Enter` and `Space` all work with no key handling code (1.5), and the control is announced with the correct role and an accessible name of "Open your invitation".
- **Focus on reveal** — focus moves from the unmounting envelope button to the Hero heading wrapper (`tabIndex={-1}`, `preventScroll: true`), so keyboard and screen-reader users are placed at the top of the revealed content rather than being dropped on `document.body`.
- **Pre-open tab order** — exactly one focusable element exists while the gate is closed: the envelope button. The Netlify detection stub is `hidden`, `inert`, `aria-hidden`, and its controls carry `tabindex="-1"` (1.4).
- **Touch targets** — every interactive control has a minimum 44 × 44px hit area at mobile widths via a shared padding utility (11.4), including the map links, the Add to Calendar button, the radio group options, and the submit button.
- **External links** — `rel="noopener noreferrer"` on every `target="_blank"` anchor (4.6), each with a visually hidden "(opens in a new tab)" and a venue-qualified accessible name.
- **Countdown announcements** — `role="timer"` with `aria-live="off"`; the digits are `aria-hidden` and a visually hidden prose summary carries the information, so a screen reader is not interrupted once per second.
- **Form semantics** — every control has a visible `<label>`; the attendance radios sit in a `<fieldset>` with a `<legend>`; errors are wired with `aria-describedby` and `aria-invalid`; the submission error is a `role="alert"`; the form carries `aria-busy` while in flight.
- **Body text** — at least 16px computed at mobile widths (11.5); the base font size is set on `html` rather than per-component so no section can undercut it.
- **Motion** — the whole `prefers-reduced-motion` policy above; decorative particles and the parallax layer are `aria-hidden`.
- **Palette swatches** — the colour name and hex value are rendered as text next to each swatch (7.3), so colour is never the only carrier of information.

## Performance Budget

| Item | Estimate | Requirement |
|---|---|---|
| `react` + `react-dom` (gzipped) | ~45KB | 12.3 (≤300KB) |
| Application JavaScript (gzipped) | ~10KB | 12.3 |
| **Total JS, gzipped** | **~55KB** | ~18% of budget |
| Webfont bytes | 0KB — system font stacks only | 12.1, 12.3 |
| Each placeholder image | well under 300KB (flat palette gradients) | 12.2 (≤300KB each) |
| Initial requests | HTML, one CSS file, one JS bundle, envelope background | 12.1 |

No animation library, no icon library, no date library, no calendar library, no webfont. Gallery images are excluded from the initial load by `loading="lazy"` (12.1), so first paint carries the envelope only. The budget is gated in the final verification pass: the built chunks are gzipped after `npm run build` and the total must be ≤300KB gzipped.

## Testing Strategy

The site is a static, single-purpose marketing-style page. Most of its requirements are visual, layout, or motion claims that jsdom cannot evaluate and that a headless browser could only evaluate at a setup cost out of proportion to seven sections. The strategy is therefore deliberately split: **automate the pure logic, verify the presentation by hand against a written checklist.**

**Runner: Vitest**, chosen for consistency with Vite — it reuses `vite.config.js`, so the JSX transform, aliases and asset handling in tests match the build exactly, with no second toolchain to keep in sync. `jsdom` environment, `@testing-library/react` for component tests, `fast-check` for property tests. All dev-only.

### Covered by automated tests

*Pure logic — the highest-value target, and where the property tests live:*

- `lib/countdown.js` — breakdown well-formedness, timezone invariance, and the post-wedding boundary at exactly the Ceremony_Datetime. Month-boundary and clamping cases (Jan 31, leap-year Feb 29, month-length transitions) as example tests alongside the properties. Covers 3.1, 3.3, 3.4.
- `lib/icalendar.js` — round-trip of summary, location and UTC start; escaping of commas, semicolons, backslashes and newlines; line folding at 75 octets; `BEGIN`/`END` pairing. Plus the concrete assertion that `2026-02-13T14:00:00+08:00` serialises to `DTSTART:20260213T060000Z`. Covers 9.3.
- `lib/rsvp.js` — validation rejects exactly the offending fields across generated inputs; payload encoding round-trips and always includes `form-name`. Covers 8.2, 8.4, 8.5, 8.6, 8.7.

*Component behaviour:*

- Envelope gate: closed-state absence of every config-owned string and of any form control; focusable-element count of exactly one; activation via all four modalities; scroll reset on reveal. Covers 1.3, 1.4, 1.5, 1.6.
- Countdown timer lifecycle with fake timers: recompute at 1000ms, single interval, `clearInterval` on unmount. Covers 3.2, 3.7.
- RSVP form: field presence and required flags, in-flight disabled state, success state on `res.ok`, and the failure path across both failure modes. Covers 8.1, 8.8, 8.9, 8.10.
- Reduced motion across all sections, as a single universal assertion. Covers 1.8, 2.5, 4.7, 5.3, 6.8, 10.6.
- Gallery images: `loading="lazy"` and explicit `width`/`height` on every image; no external `src`. Covers 6.3, 6.4.
- All `target="_blank"` anchors carry both `rel` tokens. Covers 4.6.
- Config shape: required keys present, `story` word count within 60–200, palette has four valid hex entries, gallery has ≥7 entries each with non-empty `alt`, and each `mapsUrl` is an absolute `https://` Google Maps URL containing its own URL-encoded venue name. Covers 5.1, 6.1, 7.2, 7.3, 14.1–14.5.
- Source scans: no component file restates a config-owned literal (14.6); no `process.env` or `import.meta.env` anywhere in `src` (13.4).
- Asset scan: every file in `src/assets/gallery/` is ≤300KB and lives in that one folder. Covers 6.2, 12.2.
- Build output: `index.html` contains the detection stub with the matching form name and field names, and the stub is `hidden`/`inert`/`aria-hidden`. Covers 8.3.

### Verified manually, against a checklist in the README

These are the claims automation cannot reach in this stack, with the reason recorded so the gap is a decision rather than an oversight.

| Requirement | Why manual |
|---|---|
| 1.1, 1.2, 1.7 | Viewport centring, ambient motion, and hit-area geometry need real layout |
| 2.2 | Relative font sizing needs computed Tailwind styles |
| 2.4 | Animation sequencing is perceptual; asserting delay classes would test the implementation, not the behaviour |
| 6.6 | Hover transform value needs computed styles |
| 6.7, 8.11, 13.8 | Documentation content |
| 10.1, 10.3, 10.4, 10.5 | Global CSS declaration, parallax motion, hover states, animated-property count — code review and visual check |
| 11.1–11.5 | Layout and computed-size measurement across a 320–2560px sweep. jsdom performs no layout; adding a browser-automation dependency for these five claims is disproportionate for a seven-section static page |
| 12.1 | Network waterfall inspection on a production preview |
| 12.3 | Gzip measurement of the built chunks after `npm run build` |
| 12.4, 12.5 | Implementation constraints, verified by review of `useScrollReveal` and `useParallax` — the only two modules that own scroll work |
| 13.1, 13.2, 13.3, 13.5, 13.6, 13.7 | Build, config, dependency and manifest smoke checks run once per change |

The manual checklist is short, concrete, and lists the exact viewport widths (320, 375, 768, 1024, 1440, 2560) and the reduced-motion toggle path, so it is repeatable rather than a vague "look at it".

### Property test configuration

Each property test runs a minimum of 100 generated cases (`fast-check` default is 100; explicit `numRuns: 200` for the countdown properties, whose input space spans years). Each test is tagged with its design property:

```js
// Feature: wedding-invitation-website, Property 1: For any instant strictly before
// the Ceremony_Datetime, the countdown breakdown is well-formed …
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Countdown breakdown is well-formed

For any instant strictly before the Ceremony_Datetime, the computed breakdown reports all five units — months, days, hours, minutes, seconds — as integers, every one of them non-negative, with days, hours, minutes and seconds each strictly below the next unit's carry threshold, and re-adding the reported months, days, hours, minutes and seconds to that instant in the `+08:00` calendar frame lands exactly on the Ceremony_Datetime.

**Validates: Requirements 3.1, 3.6**

### Property 2: Countdown is timezone-invariant

For any instant and any pair of host timezone offsets, the breakdown computed against the Ceremony_Datetime is identical in both, so two visitors observing at the same moment from different timezones see the same five values.

**Validates: Requirements 3.3**

### Property 3: Countdown state is total, with the boundary inclusive of the ceremony instant

For any instant, the countdown yields exactly one of two states: the five-unit breakdown when the instant is strictly before the Ceremony_Datetime, or the Post_Wedding_State when the instant is at or after it — never both, never neither, and never a breakdown containing a negative value.

**Validates: Requirements 3.4, 3.5**

### Property 4: RSVP validation rejects exactly the offending fields

For any RSVP form values, validation reports an error for the guest name field if and only if the name is empty or entirely whitespace, reports an error for the attendance field if and only if the selection is neither of the two offered choices, reports an error for the guest count field if and only if the count is not a whole number between 1 and 10 inclusive, and reports no errors at all only when all three constraints hold.

**Validates: Requirements 8.4, 8.5, 8.6**

### Property 5: RSVP payload encoding round-trips

For any RSVP form values that pass validation, decoding the URL-encoded submission body yields back each entered field value unchanged, including values containing spaces, ampersands, plus signs, newlines and non-ASCII characters, and always includes a `form-name` field equal to the form's `name` attribute.

**Validates: Requirements 8.2, 8.7**

### Property 6: Failed submission preserves the guest's input and the ability to retry

For any RSVP form values that pass validation, and for any submission failure mode — a rejected request or a non-success HTTP status — the form afterwards displays an error message, still contains every value the visitor entered, and leaves the submit control enabled.

**Validates: Requirements 8.9**

### Property 7: iCalendar serialisation round-trips and is structurally well-formed

For any calendar event, the generated iCalendar text parses back to the same summary, the same location, and the same start instant expressed in UTC, regardless of whether the text fields contain commas, semicolons, backslashes, newlines or non-ASCII characters; and the output has matched `BEGIN`/`END` pairs for both `VCALENDAR` and `VEVENT`, CRLF line endings, and no unfolded line exceeding 75 octets.

**Validates: Requirements 9.3**

### Property 8: Reduced motion leaves every section in its final visual state

For any section of the Main_Invitation and for the Envelope_Gate, when the reduced-motion preference is set to reduce, no rendered element carries a pre-animation state — no non-final opacity, no non-identity transform, no pending reveal class — and no ambient particle element, parallax offset, or hover scale transform is applied anywhere in the tree.

**Validates: Requirements 1.8, 2.5, 4.7, 5.3, 6.8, 10.6**

## Requirements Traceability

| Requirement | Satisfied by |
|---|---|
| 1.1, 1.2, 1.3, 1.7 | `InvitationEnvelope` — centred flex layout, CSS-keyframe ambient particles over a Palette gradient, "Tap to Open" text, full-area native `<button>` |
| 1.4 | `App` phase state machine — `MainInvitation` is not constructed while `phase !== 'open'`; detection stub carries no wedding data and is `hidden`/`inert`/`aria-hidden`/`tabindex="-1"` |
| 1.5 | Native `<button>` (all four activation modalities), `OPEN_MS = 1600`, single-animation guard on `phase !== 'closed'` |
| 1.6 | `MainInvitation` mount effect — `window.scrollTo({ top: 0, behavior: 'auto' })` |
| 1.8 | `useReducedMotion` → `OPEN_MS_REDUCED = 250`; ambient element not rendered; `@media` block |
| 2.1, 2.2, 2.3 | `Hero` reading `couple.displayNames`, `schedule.displayDate`, `couple.tagline` from config; type scale in `index.css` |
| 2.4, 2.5 | `Reveal` with staggered `transition-delay` utilities; final-state render under `reduce` |
| 3.1, 3.3, 3.4, 3.5 | `lib/countdown.js` `breakdown()` — PHT-frame civil arithmetic with day-of-month clamping, `<= 0` post-wedding boundary |
| 3.2, 3.7 | `useCountdown` — single 1000ms `setInterval`, `clearInterval` in effect cleanup |
| 3.6 | `CEREMONY_DATETIME` exported once from `weddingConfig.js` |
| 4.1, 4.2, 4.3, 4.7 | `WeddingDetails` cards from `config.ceremony` / `config.reception`, each wrapped in `Reveal` |
| 4.4, 4.5, 4.6 | `Venue` anchors with config `mapsUrl` (universal cross-platform `https://www.google.com/maps/search/?api=1&query=…` form, one per venue), `target="_blank"`, `rel="noopener noreferrer"` |
| 5.1, 5.2, 5.3 | `OurStory` rendering `config.story` inside `Reveal`; word-count test |
| 6.1, 6.2, 6.3 | Seven WebP files in `src/assets/gallery/`, imported through `config.gallery`, no external `src` |
| 6.4, 6.5, 6.6, 6.8 | `Gallery` — `loading="lazy"` plus `width`/`height` from config, `Reveal` per image, `scale(1.04)` hover, all motion suppressed under `reduce` |
| 6.7 | README replacement procedure |
| 7.1, 7.2, 7.3 | `DressCode` rendering `config.dressCode.guidance` and mapping `config.palette` to swatch + name + hex |
| 8.1, 8.2 | `Rsvp` form fields, `data-netlify="true"`, hidden `form-name` matching `name` |
| 8.3 | Static detection stub in `index.html`, outside `#root` |
| 8.4, 8.5, 8.6 | `validateRsvp` + inline per-field messages, `aria-invalid`, focus on first offending field |
| 8.7 | `encodeRsvpPayload` + `fetch('/')` with `application/x-www-form-urlencoded` |
| 8.8 | `'success'` status renders Rsvp_Success_State in place of the fields |
| 8.9 | `'error'` status — `role="alert"`, `values` untouched, `disabled` bound to `'submitting'` only, focus to alert; `res.ok` checked explicitly |
| 8.10 | `disabled={status === 'submitting'}` plus `aria-busy` |
| 8.11 | README |
| 9.1, 9.2, 9.5 | `AddToCalendarButton` → `downloadIcs` — Blob, object URL, `download` attribute, deferred `revokeObjectURL` in `finally` |
| 9.3 | `lib/icalendar.js` `toIcs` — `DTSTART` as `20260213T060000Z`, `SUMMARY`, `LOCATION` from `ceremony.venueName`, RFC 5545 escaping |
| 9.4 | Runtime dependencies limited to `react` and `react-dom` |
| 10.1 | `html { scroll-behavior: smooth; }` in `index.css`, deliberately outside the reduced-motion block |
| 10.2 | `Reveal` wrapping `WeddingDetails`, `OurStory`, `Gallery`, `Venue`, `DressCode`, `Rsvp` |
| 10.3 | `ParallaxLayer` + `useParallax` writing `--parallax-y` in one rAF |
| 10.4 | Shared hover/focus utility applied to every control |
| 10.5 | `.reveal` animates two properties; hover animates one; ambient animates two |
| 10.6 | `useReducedMotion` → `MotionContext` (JS layer) plus the `@media` block (CSS layer), both keyed to `REDUCED_MOTION_QUERY` |
| 11.1–11.5 | Tailwind responsive utilities, single-column mobile grids, ≥44px target utility, 16px base on `html`; verified by the manual width sweep |
| 12.1 | `loading="lazy"` on gallery images; only envelope assets in the initial request set |
| 12.2 | WebP at 1200 × 800, each file well under 300KB; asset size test |
| 12.3 | No animation, icon, date, calendar library or webfont; ~55KB gzipped total, gated by a gzip measurement of the built chunks against a ≤300KB threshold in the final verification pass |
| 12.4 | CSS `transform`/`opacity` for all continuous motion; `useParallax` writes a CSS custom property, never React state |
| 12.5 | Singleton `IntersectionObserver` for reveals; passive scroll listener coalesced into one rAF for parallax |
| 13.1, 13.2 | Vite build to `dist/`; `netlify.toml` with `command` and `publish` |
| 13.3 | No `netlify/functions`, no server, no database |
| 13.4 | No env access in `src/`; enforced by a source scan test |
| 13.5 | `react`, `react-dom`, and permissively licensed dev tooling; no webfont and no third-party imagery — the seven gallery placeholders are generated by `scripts/generate-placeholders.mjs`, so no external licence applies |
| 13.6 | `dev`, `build`, `lint`, `preview` scripts and `"type": "module"` in `package.json` |
| 13.7 | Single-step Vite build with no `tsc`; ESLint flat config |
| 13.8 | README |
| 14.1–14.5 | `weddingConfig.js` export shape |
| 14.6 | One-way data flow out of config; `calendar.location` derived from `ceremony.venueName` rather than duplicated; source-scan test for restated literals |
