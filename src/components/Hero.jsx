// The Hero's inner content: couple names, romantic tagline, and wedding date.
//
// Requirements: 2.1, 2.2, 2.3, 2.4, 2.5.
//
// COMPOSITION CONTRACT — this component renders ONLY the hero *content*, not a
// section wrapper. `MainInvitation` owns the `<section id="hero" ref tabIndex={-1}>`
// that is the post-reveal focus target (see the DEVIATION note in
// MainInvitation.jsx); `Hero` supplies the `<h1>` and the supporting lines that
// live inside it. So this file exports a component that renders a fragment, with
// no `<section>`, no `ref`, and no `tabIndex` of its own — dropping any of those
// in here would fight MainInvitation for ownership of the focus slot.
//
// Data (2.1, 2.3): every string comes from Wedding_Config. Nothing is restated
// here (14.6) — the file holds layout and type scale, never a couple name, a
// tagline, or a date literal.
//
// Motion (2.4, 2.5): the three lines are each wrapped in `Reveal` with an
// increasing `delay` step (names → tagline → date), so on mount they animate
// into place in sequence. `Reveal` already renders in the final state with no
// delay class under reduced motion, so passing delays is all that is needed —
// 2.5 is satisfied by that wrapper, not by a branch here. Both animated
// properties are `opacity` and `transform` (owned by `.reveal` in index.css),
// well inside 10.5's three-property ceiling and compositor-only per 12.4.
//
// Type scale (2.2): the names are the largest element; the date is the next
// largest — sized larger than the tagline and larger than any other hero text —
// satisfying "equal to or larger than every other text element except the
// couple names". The tagline is the smallest of the three.
//
// Export note: this module exports ONLY `Hero`, so
// `react-refresh/only-export-components` is satisfied.

import weddingConfig from '../config/weddingConfig.js'
import { Reveal } from './Reveal.jsx'

/**
 * The hero content — couple names, tagline, and wedding date — meant to be
 * dropped inside MainInvitation's `<section id="hero">`.
 *
 * Renders a fragment of three staged lines:
 *   1. the couple names as an `<h1>` in the display face (largest);
 *   2. the romantic tagline (smallest);
 *   3. the wedding date, sized prominently (second largest, per 2.2).
 *
 * @returns {import('react').ReactElement}
 */
export function Hero() {
  const { couple, schedule } = weddingConfig

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-4xl flex-col items-center justify-center text-center">
      {/* Line 1 — couple names. The `<h1>`, the display face, and the largest
          type in the hero (2.1, 2.2). `delay={1}` starts the staged sequence. */}
      <Reveal delay={1}>
        <h1 className="font-display text-6xl font-medium leading-tight tracking-tight text-sage-deep sm:text-7xl md:text-8xl">
          {couple.displayNames}
        </h1>
      </Reveal>

      {/* Line 2 — romantic tagline (2.3). Smallest of the three lines, in the
          body face, in Sage so it recedes gently beneath the names. */}
      <Reveal delay={2}>
        <p className="mt-6 max-w-2xl text-lg font-light italic leading-relaxed text-sage sm:text-xl">
          {couple.tagline}
        </p>
      </Reveal>

      {/* Line 3 — wedding date (2.2). Prominent: larger than the tagline and
          larger than any other hero text element, but below the names. Set in
          the display face with wide tracking so it reads as a date plate. */}
      <Reveal delay={3}>
        <p className="mt-10 font-display text-3xl font-normal uppercase tracking-[0.2em] text-sage-deep sm:text-4xl md:text-5xl">
          {schedule.displayDate}
        </p>
      </Reveal>
    </div>
  )
}
