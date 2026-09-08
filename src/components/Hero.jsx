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

import logo from '../assets/images/TransparentWeddingLogoPlain(Green).png'
import weddingConfig from '../config/weddingConfig.js'
import { Reveal } from './Reveal.jsx'

// A decorative circular botanical wreath drawn around the hero logo, echoing
// the reference art: a ring of leafy sprigs with a few small blossoms. It is
// pure inline SVG so it inherits the Sage token via `currentColor` (no image
// asset, no Palette hex literal — 14.6), scales crisply at any size, and reads
// as real foliage rather than a plain circle. `aria-hidden` — it is ornament
// wrapping the (also decorative) logo, and the hero's real content is the
// `<h1>` below it.
//
// The sprigs are placed programmatically around the circle so the ring is even
// and the file stays short: one leaf-pair sprig repeated at a set of angles,
// plus four blossoms at the quarter points. Each element is rotated to sit
// tangent to the ring and pushed out to the wreath radius.
function HeroWreath() {
  const CENTER = 100
  const RADIUS = 82
  // Angles (degrees, clockwise from top) where a leafy sprig sits.
  const SPRIG_ANGLES = [22, 52, 68, 112, 128, 158, 202, 232, 248, 292, 308, 338]
  // Quarter-ish points carry a small five-petal blossom instead of a sprig.
  const BLOSSOM_ANGLES = [4, 94, 184, 274]

  const onRing = (angle) => {
    const rad = ((angle - 90) * Math.PI) / 180
    return {
      x: CENTER + RADIUS * Math.cos(rad),
      y: CENTER + RADIUS * Math.sin(rad),
    }
  }

  return (
    <svg
      className="pointer-events-none col-start-1 row-start-1 h-full w-full"
      viewBox="0 0 200 200"
      fill="none"
      aria-hidden="true"
      style={{ color: 'var(--color-sage)' }}
    >
      {/* Leafy sprigs around the ring — each a short curved stem with a pair of
          leaves, rotated to lie along the circle. */}
      {SPRIG_ANGLES.map((angle) => {
        const { x, y } = onRing(angle)
        return (
          <g key={`sprig-${angle}`} transform={`translate(${x} ${y}) rotate(${angle})`}>
            {/* stem */}
            <path
              d="M0 -13 C 3 -4, 3 4, 0 13"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              opacity="0.85"
            />
            {/* leaf pair */}
            <path
              d="M0 -4 C -9 -7, -13 -3, -12 4 C -4 4, 0 1, 0 -4 Z"
              fill="currentColor"
              opacity="0.8"
            />
            <path
              d="M0 2 C 9 -1, 13 3, 12 10 C 4 10, 0 7, 0 2 Z"
              fill="currentColor"
              opacity="0.8"
            />
          </g>
        )
      })}

      {/* Small five-petal blossoms at the quarter points. */}
      {BLOSSOM_ANGLES.map((angle) => {
        const { x, y } = onRing(angle)
        return (
          <g key={`bloom-${angle}`} transform={`translate(${x} ${y})`}>
            <g fill="currentColor" opacity="0.9">
              <ellipse cx="0" cy="-6" rx="3" ry="5.4" />
              <ellipse cx="5.7" cy="-1.9" rx="3" ry="5.4" transform="rotate(72)" />
              <ellipse cx="3.5" cy="4.9" rx="3" ry="5.4" transform="rotate(144)" />
              <ellipse cx="-3.5" cy="4.9" rx="3" ry="5.4" transform="rotate(216)" />
              <ellipse cx="-5.7" cy="-1.9" rx="3" ry="5.4" transform="rotate(288)" />
            </g>
            <circle cx="0" cy="0" r="2.2" fill="currentColor" />
          </g>
        )
      })}
    </svg>
  )
}

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
      {/* Line 0 — the wedding logo/monogram, centred above the couple names
          inside a decorative circular botanical wreath (per the reference art).
          The whole cluster is decorative (`aria-hidden` wreath + `alt=""`
          logo), so it stays out of the accessibility tree and the `<h1>`
          remains the hero's first announced content. No stroke or shadow on the
          mark, per request. Sized fluidly so it scales from phone to desktop
          while staying centred. `delay={1}` opens the staged sequence; the
          lines below shift one step down. */}
      <Reveal delay={1}>
        <div className="relative mx-auto -mt-28 mb-1 grid w-44 max-w-[62vw] place-items-center sm:w-52 md:w-60">
          <HeroWreath />
          <img
            className="relative col-start-1 row-start-1 block h-auto w-24 max-w-[34vw] object-contain sm:w-28 md:w-32"
            src={logo}
            alt=""
            draggable="false"
          />
        </div>
      </Reveal>

      {/* Line 1 — couple names. The `<h1>`, the display face, and the largest
          type in the hero (2.1, 2.2). */}
      <Reveal delay={2}>
        <h1 className="font-display text-6xl font-medium leading-tight tracking-tight text-sage-deep sm:text-7xl md:text-8xl">
          {couple.displayNames}
        </h1>
      </Reveal>

      {/* Line 2 — romantic tagline (2.3). Smallest of the three lines, in the
          body face, in Sage so it recedes gently beneath the names. */}
      <Reveal delay={3}>
        <p className="mt-6 max-w-2xl text-lg font-light italic leading-relaxed text-sage sm:text-xl">
          {couple.tagline}
        </p>
      </Reveal>

      {/* Line 3 — wedding date (2.2). Prominent: larger than the tagline and
          larger than any other hero text element, but below the names. Set in
          the display face with wide tracking so it reads as a date plate. */}
      <Reveal delay={4}>
        <p className="mt-10 font-display-serif text-3xl font-normal uppercase tracking-[0.2em] text-sage-deep sm:text-4xl md:text-5xl">
          {schedule.displayDate}
        </p>
      </Reveal>
    </div>
  )
}
