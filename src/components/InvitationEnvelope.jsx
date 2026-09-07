// The Envelope_Gate — the closed envelope every guest meets first.
//
// Requirements: 1.1, 1.2, 1.3, 1.5, 1.7, 1.8, 11.4.
//
// Three things about this component are load-bearing and worth stating up
// front, because each of them is a requirement rather than a preference.
//
//   1. IT CONTAINS NO WEDDING DATA (1.4). `weddingConfig` is deliberately not
//      imported. No couple name, no date, no venue, no tagline, and no
//      Palette hex appears in this file or its stylesheet — the card inside the
//      envelope carries two Sage hairlines where print would go, and the seal is
//      a plain wax disc rather than a monogram, precisely so the artwork can
//      look finished without leaking a single word of the invitation. `App`
//      enforces the same rule structurally by not constructing
//      `MainInvitation` until the phase reaches 'open'; this file's job is not
//      to undo that.
//
//   2. THE ACTIVATION SURFACE IS ONE NATIVE `<button>` (1.5, 1.7, 11.4). It
//      wraps the whole envelope, so a pointer click, a touch tap anywhere on
//      the envelope, `Enter`, and `Space` all activate it with no `onKeyDown`
//      code to get wrong, and the correct role, focus ring, and
//      assistive-technology behaviour come for free. It is also the ONLY
//      focusable element the gate renders — nothing else here takes a
//      `tabIndex`, an `href`, or a form control — which is what makes the
//      focusable-element count of exactly one in the 1.4 check hold.
//
//   3. REDUCED MOTION OMITS, IT DOES NOT HIDE (1.8). When `useMotion()` reports
//      `reduce`, the mote spans are not returned at all and the two idle-motion
//      classes are not applied. `display: none` on a running animation would
//      still be a running animation; returning nothing is the difference
//      between honouring the preference and papering over it.
//
// Motion is CSS-only and confined to `transform` and `opacity` (12.4), with at
// most two distinct properties in flight at any moment (10.5). No timers, no
// rAF, no state — `App` owns the clock and unmounts this component at
// `OPEN_MS`. See `./InvitationEnvelope.css` for the artwork and the score.

import { useMotion } from '../motion/context.js'

import './InvitationEnvelope.css'

// Ten ambient motes — inside the eight-to-twelve band of 1.2. Hand-placed
// rather than randomised: a fixed table renders identically on every mount, so
// the scatter is a design decision that can be reviewed rather than a different
// accident on every page load, and React never has to reconcile changing keys.
//
// The scatter comes from all four columns disagreeing with each other. Sizes run
// 3–10px so the field reads as depth rather than a row of identical dots;
// `bottom` straddles the viewport edge so some motes are already mid-drift on
// arrival; and the delays and durations share no common factor, which is what
// keeps the group from ever resynchronising into a visible pulse. `.ambient` in
// index.css supplies the shared `ambient-drift` loop these values modulate.
const MOTES = [
  { left: '7%', bottom: '-4%', size: 7, delay: '0ms', duration: '15s' },
  { left: '17%', bottom: '13%', size: 4, delay: '2400ms', duration: '19s' },
  { left: '27%', bottom: '-8%', size: 10, delay: '5200ms', duration: '13s' },
  { left: '38%', bottom: '6%', size: 5, delay: '1100ms', duration: '21s' },
  { left: '47%', bottom: '-6%', size: 6, delay: '7600ms', duration: '16s' },
  { left: '57%', bottom: '17%', size: 3, delay: '3300ms', duration: '23s' },
  { left: '67%', bottom: '-3%', size: 8, delay: '9800ms', duration: '14s' },
  { left: '76%', bottom: '10%', size: 5, delay: '600ms', duration: '18s' },
  { left: '85%', bottom: '-7%', size: 7, delay: '6400ms', duration: '20s' },
  { left: '93%', bottom: '4%', size: 4, delay: '4100ms', duration: '17s' },
]

/**
 * The closed-envelope landing state.
 *
 * @param {object} props
 * @param {'closed' | 'opening'} [props.phase] Gate phase, owned by `App`.
 *   `'closed'` is the resting state; `'opening'` plays the one-shot reveal.
 *   `App` unmounts this component when it advances to `'open'`.
 * @param {() => void} [props.onOpen] Called once, when the visitor activates
 *   the envelope while it is still closed.
 */
export default function InvitationEnvelope({ phase = 'closed', onOpen }) {
  const reduced = useMotion()
  const opening = phase === 'opening'

  // The single-animation guard requirement 1.5 asks for. A second tap, a held
  // `Enter` autorepeating, or a stray synthetic click during the 1600ms
  // sequence all land here and are dropped, so the animation cannot restart and
  // `App` cannot be pushed back into 'opening' from 'opening'.
  function handleActivate() {
    if (phase !== 'closed') return
    onOpen?.()
  }

  // Idle motion is opt-in, not opt-out: these stay empty under `reduce` so no
  // element is left carrying a suspended animation (1.8).
  const envelopeIdle = !reduced && !opening ? ' envelope--idle' : ''
  const captionIdle = !reduced && !opening ? ' gate__cta--idle' : ''

  // The opening class the CSS score hangs off. Without this the flap and card
  // keyframes (scoped under `.envelope--opening`) never match anything, which
  // is exactly why the flap never moved: only the `.gate--opening` rules fired.
  const envelopeOpening = opening ? ' envelope--opening' : ''

  return (
    <main
      className={`gate relative flex min-h-screen w-full items-center justify-center overflow-hidden px-6 py-10${
        opening ? ' gate--opening' : ''
      }`}
    >
      {/* Decorative ground, vignette, and the bloom the envelope dissolves
          into. Three separate layers rather than one so the bloom can be
          animated without repainting the gradients underneath it. */}
      <div className="gate__ground absolute inset-0" aria-hidden="true" />
      <div className="gate__vignette absolute inset-0" aria-hidden="true" />

      {/* Decorative botanical frame — a responsive double-line border in Sage
          (rgb(85,112,95) === var(--color-sage)) with botanical accents at two
          corners: a small floral spray at the top-right and a leaf spray at the
          bottom-left, echoing the reference art. Purely ornamental: it is
          `aria-hidden`, click-through (so a tap still opens the envelope), and
          scales fluidly with the viewport via clamped insets. The accents are
          inline SVG so they read as real flowers/leaves rather than stray
          strokes. */}
      <div className="gate__frame absolute inset-0" aria-hidden="true">
        <span className="gate__frame-line gate__frame-line--outer" />
        <span className="gate__frame-line gate__frame-line--inner" />

        {/* Top-right: flowers */}
        <svg
          className="gate__accent gate__accent--tr"
          viewBox="0 0 120 120"
          fill="none"
          aria-hidden="true"
        >
          {/* stems */}
          <path
            d="M96 104 C 92 78, 84 56, 70 40"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
            opacity="0.55"
          />
          <path
            d="M96 104 C 100 82, 104 64, 100 44"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
            opacity="0.55"
          />
          <path
            d="M96 104 C 96 84, 96 70, 96 60"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
            opacity="0.55"
          />
          {/* small leaf on a stem */}
          <path
            d="M88 74 C 80 70, 74 72, 72 78 C 80 82, 86 80, 88 74 Z"
            fill="currentColor"
            opacity="0.5"
          />
          {/* Flower 1 — five petals + center */}
          <g className="gate__flower" transform="translate(70 38)">
            <g fill="currentColor" opacity="0.85">
              <ellipse cx="0" cy="-9" rx="4.6" ry="8" />
              <ellipse cx="8.6" cy="-2.8" rx="4.6" ry="8" transform="rotate(72)" />
              <ellipse cx="5.3" cy="7.3" rx="4.6" ry="8" transform="rotate(144)" />
              <ellipse cx="-5.3" cy="7.3" rx="4.6" ry="8" transform="rotate(216)" />
              <ellipse cx="-8.6" cy="-2.8" rx="4.6" ry="8" transform="rotate(288)" />
            </g>
            <circle cx="0" cy="0" r="3.4" fill="currentColor" />
          </g>
          {/* Flower 2 — smaller */}
          <g className="gate__flower" transform="translate(101 42) scale(0.7)">
            <g fill="currentColor" opacity="0.8">
              <ellipse cx="0" cy="-9" rx="4.6" ry="8" />
              <ellipse cx="8.6" cy="-2.8" rx="4.6" ry="8" transform="rotate(72)" />
              <ellipse cx="5.3" cy="7.3" rx="4.6" ry="8" transform="rotate(144)" />
              <ellipse cx="-5.3" cy="7.3" rx="4.6" ry="8" transform="rotate(216)" />
              <ellipse cx="-8.6" cy="-2.8" rx="4.6" ry="8" transform="rotate(288)" />
            </g>
            <circle cx="0" cy="0" r="3.4" fill="currentColor" />
          </g>
          {/* a tiny bud */}
          <circle cx="96" cy="58" r="3.2" fill="currentColor" opacity="0.7" />
        </svg>

        {/* Bottom-left: leaves */}
        <svg
          className="gate__accent gate__accent--bl"
          viewBox="0 0 120 120"
          fill="none"
          aria-hidden="true"
        >
          {/* main stem */}
          <path
            d="M18 14 C 26 40, 34 64, 40 96"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
            opacity="0.6"
          />
          {/* pairs of leaves along the stem */}
          <g fill="currentColor" opacity="0.7">
            <path d="M24 34 C 14 30, 8 34, 8 44 C 20 46, 26 42, 24 34 Z" />
            <path d="M27 34 C 37 28, 44 30, 46 40 C 34 44, 28 42, 27 34 Z" />
            <path d="M31 56 C 21 52, 15 56, 15 66 C 27 68, 33 64, 31 56 Z" />
            <path d="M34 56 C 44 50, 51 52, 53 62 C 41 66, 35 64, 34 56 Z" />
            <path d="M37 78 C 27 74, 21 78, 21 88 C 33 90, 39 86, 37 78 Z" />
            <path d="M40 78 C 50 72, 57 74, 59 84 C 47 88, 41 86, 40 78 Z" />
          </g>
          {/* leaf tip at the top of the stem */}
          <path
            d="M18 14 C 12 20, 12 28, 18 32 C 24 28, 24 20, 18 14 Z"
            fill="currentColor"
            opacity="0.7"
          />
        </svg>
      </div>

      {/* The continuously moving ambient element of 1.2 — floating motes over
          the Palette gradient. Omitted entirely under `reduce` (1.8): the
          wrapper and every span disappear from the tree, so there is no hidden
          animation left running. */}
      {!reduced && (
        <div className="gate__moteField absolute inset-0" aria-hidden="true">
          {MOTES.map((mote) => (
            <span
              key={mote.left + mote.delay}
              className="ambient gate__mote"
              style={{
                left: mote.left,
                bottom: mote.bottom,
                width: `${mote.size}px`,
                height: `${mote.size}px`,
                animationDelay: mote.delay,
                animationDuration: mote.duration,
              }}
            />
          ))}
        </div>
      )}

      {/* The gate's one focusable element. `.control` from index.css supplies
          the ≥44×44 floor (11.4), the hover lift (10.4), and the Sage
          `:focus-visible` ring; it is sized far above that floor here, filling
          the envelope so a mobile tap anywhere on the artwork opens it (1.7). */}
      <button
        type="button"
        aria-label="Open your invitation"
        onClick={handleActivate}
        className="control gate__button relative z-10 flex flex-col items-center gap-7 rounded-sm p-3 sm:gap-9"
      >
        <span className="envelope-stage block">
          <span className={`envelope block${envelopeIdle}${envelopeOpening}`}>
            {/* Back wall of the envelope (behind everything). */}
            <span className="envelope__back" />
            {/* The letter/card — starts tucked inside, slides up on open. The
                "You're Invited" line is hidden until the envelope is opened. */}
            <span className="envelope__card">
              <span className="envelope__card-title" aria-hidden="true">
                You&rsquo;re Invited
              </span>
            </span>
            {/* Front pocket: the body that covers the lower half of the card. */}
            <span className="envelope__body" />
            {/* The top flap: a downward triangle hinged at its top edge. It
                rotates open (backward) and drops behind the letter. */}
            <span className="envelope__flap" />
            {/* Wax seal on the flap. */}
            <span className="envelope__seal" />
          </span>
        </span>

        {/* The instruction of 1.3. The single native <button> above is still
            the one focusable activation surface (a tap anywhere on the gate
            opens it, 1.5/1.7), so this "OPEN INVITATION" element is a styled
            *visual* button rather than a second focusable control — it inherits
            the real button's click and keyboard behaviour for free while giving
            the pill look and the smooth hover/tap animation requested. The
            small line beneath it explains the gesture. Still no wedding data
            (1.4). */}
        <span className="gate__caption flex flex-col items-center gap-3">
          <span
            className={`gate__cta font-display-serif text-base leading-none tracking-[0.32em] text-cream-soft uppercase${captionIdle}`}
          >
            Open Invitation
          </span>
          <span className="gate__cta-hint font-body text-xs tracking-[0.12em] text-sage-deep/70">
            Tap to reveal your invitation
          </span>
        </span>
      </button>
    </main>
  )
}
