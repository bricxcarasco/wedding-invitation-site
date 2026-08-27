// The Countdown_Timer section: a live count of the time remaining until the
// Ceremony_Datetime, headed by the couple's tagline.
//
// Requirements: 3.1 (labelled units before the ceremony), 3.2/3.4 (the
// once-a-second tick and the <=1000ms transition, both owned by `useCountdown`),
// 3.6 (the target is the single Ceremony_Datetime, defaulted inside
// `useCountdown`), 3.7 (interval cleanup, in `useCountdown`). Palette from
// `@theme` tokens only, no raw hex (14.6).
//
// Design: "And so, our forever begins." is now the section's permanent heading,
// always shown above the timer rather than swapped in after the ceremony. Below
// it, four units — Days, Hours, Minutes, Seconds — render as circular ring
// badges: the number centered in the display font inside a soft sage-filled
// circle, with a subtle progress arc (an inline SVG <circle> whose
// stroke-dashoffset reflects the unit's fraction of its cycle) and the unit
// label in small letter-spaced uppercase sage beneath.
//
// Announcement strategy (see design "Accessibility"): the ticking display
// carries `role="timer"` with `aria-live="off"` — a per-second live region
// would flood a screen reader with one announcement every second. The digits
// are therefore `aria-hidden`, and a single visually-hidden, non-live prose
// sentence carries the remaining time for assistive technology.
//
// The ring arc uses stroke-dashoffset, which updates once per tick with the
// state rather than per frame — no requestAnimationFrame is introduced. It is
// not one of the transform/opacity animated properties, but it is not animated
// at all: it is a static attribute recomputed on each render.
//
// Export note: this `.jsx` file exports ONLY the `Countdown` component, so
// `react-refresh/only-export-components` is satisfied. The units array, the
// summary helper and the badge helper stay module-private.

import { Reveal } from './Reveal.jsx'
import { useCountdown } from '../hooks/useCountdown.js'

/**
 * The four units, in display order, paired with the `simpleBreakdown` key each
 * reads and the size of that unit's cycle (used for the progress arc). Days has
 * no natural cycle — it counts up unbounded toward the ceremony — so its ring
 * is drawn full. A single source of truth so the visible row and the prose
 * summary cannot drift apart (3.1).
 */
const UNITS = [
  { key: 'days', label: 'Days', cycle: null },
  { key: 'hours', label: 'Hours', cycle: 24 },
  { key: 'minutes', label: 'Minutes', cycle: 60 },
  { key: 'seconds', label: 'Seconds', cycle: 60 },
]

// Geometry of the SVG ring, in the element's own viewBox units. The arc is a
// circle stroked along its circumference; stroke-dasharray is the full
// circumference and stroke-dashoffset hides the unfilled remainder.
const RING_RADIUS = 46
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS

/**
 * Format a unit value for display. `padStart` to a *minimum* of two places
 * serves every unit at once: single digits read as "09", while a three-digit
 * day count (300+ days out) is already longer than the pad width and renders in
 * full, untruncated.
 *
 * @param {number} value
 * @returns {string}
 */
function formatValue(value) {
  return String(value).padStart(2, '0')
}

/**
 * The stroke-dashoffset for a unit's progress arc: the fraction of the ring left
 * unfilled. Days (no cycle) draws a full ring, i.e. offset 0.
 *
 * @param {number} value
 * @param {number | null} cycle
 * @returns {number}
 */
function arcOffset(value, cycle) {
  if (!cycle) return 0
  const fraction = value / cycle
  return RING_CIRCUMFERENCE * (1 - fraction)
}

/**
 * The remaining time as a prose sentence for the visually-hidden summary, e.g.
 * "123 days, 4 hours, 5 minutes, 6 seconds remaining until the ceremony."
 *
 * @param {{days: number, hours: number, minutes: number, seconds: number}} state
 * @returns {string}
 */
function summarize(state) {
  const parts = UNITS.map(({ key, label }) => `${state[key]} ${label.toLowerCase()}`)
  return `${parts.join(', ')} remaining until the ceremony.`
}

/**
 * The Countdown_Timer.
 *
 * Renders a self-contained `<section id="countdown">` (MainInvitation wires it
 * into its slot afterward), wrapped in `Reveal` for the entrance the rest of
 * the sections share. The heading is always present; the badges show only while
 * the ceremony is still ahead.
 *
 * @param {object} [props]
 * @param {number} [props.targetMs] override the target instant; defaults inside
 *   `useCountdown` to the Ceremony_Datetime (3.6). Present mainly for testing.
 */
export function Countdown({ targetMs } = {}) {
  const state = useCountdown(targetMs)

  return (
    <Reveal as="section" id="countdown" className="text-center">
      <h2 className="font-display text-3xl italic text-sage-deep md:text-5xl">
        And so, our forever begins.
      </h2>

      {state.isPast ? (
        // Post_Wedding_State. The heading above still shows; below it a short
        // warm line replaces the ticking badges. Rarely seen — the ceremony is
        // in the future — but handled so no NaN/negative badge can render.
        <p className="mt-8 text-lg text-sage md:text-xl">The celebration has begun.</p>
      ) : (
        <div
          role="timer"
          aria-live="off"
          className="mx-auto mt-10 flex max-w-2xl flex-wrap items-start justify-center gap-x-6 gap-y-8 sm:gap-x-10"
        >
          {UNITS.map(({ key, label, cycle }) => (
            <div key={key} className="flex flex-col items-center" aria-hidden="true">
              <span className="relative inline-flex h-20 w-20 items-center justify-center md:h-24 md:w-24">
                {/* The progress-arc ring. `text-sage` sets `currentColor` so the
                    arc uses the palette token via stroke="currentColor"; the
                    faint track underneath is the same colour at low opacity. */}
                <svg
                  className="absolute inset-0 h-full w-full -rotate-90 text-sage"
                  viewBox="0 0 100 100"
                  fill="none"
                >
                  <circle
                    cx="50"
                    cy="50"
                    r={RING_RADIUS}
                    stroke="currentColor"
                    strokeOpacity="0.2"
                    strokeWidth="4"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r={RING_RADIUS}
                    stroke="currentColor"
                    strokeWidth="4"
                    strokeLinecap="round"
                    strokeDasharray={RING_CIRCUMFERENCE}
                    strokeDashoffset={arcOffset(state[key], cycle)}
                  />
                </svg>
                {/* The soft sage-filled disc the number sits on, inset within
                    the ring. */}
                <span className="absolute inset-2 rounded-full bg-cream-soft" />
                <span className="relative font-display text-3xl leading-none text-sage-deep tabular-nums md:text-4xl">
                  {formatValue(state[key])}
                </span>
              </span>
              <span className="mt-3 text-xs uppercase tracking-[0.25em] text-sage md:text-sm">
                {label}
              </span>
            </div>
          ))}

          {/* Non-live prose for assistive technology: the same information the
              silent digits carry, in one sentence, announced only when the
              timer region is navigated to rather than once per second. */}
          <p className="visually-hidden">{summarize(state)}</p>
        </div>
      )}
    </Reveal>
  )
}
