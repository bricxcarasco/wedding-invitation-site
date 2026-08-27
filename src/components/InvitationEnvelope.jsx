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
  const captionIdle = !reduced && !opening ? ' gate__caption--idle' : ''

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
          <span className={`envelope block${envelopeIdle}`}>
            <span className="envelope__base" />
            <span className="envelope__card" />
            <span className="envelope__fold envelope__fold--left" />
            <span className="envelope__fold envelope__fold--right" />
            <span className="envelope__fold envelope__fold--bottom" />
            <span className="envelope__flap">
              <span className="envelope__flap-face" />
              <span className="envelope__flap-back" />
            </span>
            <span className="envelope__seal" />
          </span>
        </span>

        {/* The instruction of 1.3, worded exactly as specified. Set in the
            display face at the 16px body floor (11.5) with wide tracking, over
            a hairline rule and a small Sage lozenge — the same letterpress
            vocabulary as the envelope, and still not a word of wedding data. */}
        <span className="gate__caption flex flex-col items-center gap-3">
          <span className="flex items-center gap-3" aria-hidden="true">
            <span className="h-px w-10 bg-sage/30 sm:w-14" />
            <span className="size-1.5 rotate-45 bg-sage/45" />
            <span className="h-px w-10 bg-sage/30 sm:w-14" />
          </span>
          <span
            className={`font-display text-base leading-none tracking-[0.4em] text-sage-deep uppercase${captionIdle}`}
          >
            Tap to Open
          </span>
        </span>
      </button>
    </main>
  )
}
