// HeroConfetti — the decorative falling-confetti layer behind the hero copy.
//
// A soft, celebratory drift of leaves, stars, hearts, and glitter in the
// wedding's Sage/Cream palette. It is atmosphere, not information: purely
// decorative, `aria-hidden`, click-through, and pinned behind the hero text.
//
// WHY THIS IS SAFE TO MOUNT UNCONDITIONALLY. `MainInvitation` is only
// constructed once the Envelope_Gate reaches phase 'open', so a piece of
// confetti's first frame *is* the moment the reveal completes — the "start
// after the transition to the main site is done" requirement is satisfied by
// mount timing alone, with no timers, state, or effects here.
//
// REDUCED MOTION OMITS, IT DOES NOT HIDE. When `useMotion()` reports `reduce`
// the component returns `null` and renders nothing at all — the same principle
// as the envelope's ambient motes. `display: none` on a running animation is
// still a running animation; rendering nothing is the honest answer. The CSS
// carries a `prefers-reduced-motion` net too, belt-and-braces.
//
// MOTION BUDGET. Every piece animates `transform` and `opacity` only, driven by
// one CSS keyframe (`confetti-fall`) — compositor-only, no layout properties in
// flight. Shapes are built entirely from CSS; no image files.

import { useMotion } from '../motion/context.js'

import './HeroConfetti.css'

// A hand-authored scatter of 24 pieces — inside the 18–28 band. Fixed rather
// than randomised for the same reason as the envelope's MOTES table: a static
// table renders identically on every mount, so the scatter is a reviewable
// design decision and React never reconciles changing keys.
//
// The naturalness comes from all the columns disagreeing. `left` spreads across
// the width; `size` runs small so the field reads as depth not stickers; and
// the delays and durations share no common rhythm, so the fall never
// resynchronises into a visible pulse. `top` starts above the top edge so every
// piece drifts in from off-screen. `drift` is the horizontal sway amplitude,
// signed so pieces lean both ways. The four types are mixed roughly evenly
// (6 each).
const PIECES = [
  { type: 'leaf', left: '4%', top: '-8%', size: 14, delay: '0ms', duration: '13s', drift: '22px' },
  { type: 'glitter', left: '9%', top: '-14%', size: 6, delay: '3200ms', duration: '9s', drift: '-14px' },
  { type: 'star', left: '15%', top: '-6%', size: 12, delay: '6100ms', duration: '15s', drift: '18px' },
  { type: 'heart', left: '21%', top: '-12%', size: 11, delay: '1400ms', duration: '11s', drift: '-20px' },
  { type: 'glitter', left: '27%', top: '-5%', size: 5, delay: '8300ms', duration: '8s', drift: '12px' },
  { type: 'leaf', left: '33%', top: '-16%', size: 16, delay: '2600ms', duration: '16s', drift: '-24px' },
  { type: 'star', left: '38%', top: '-7%', size: 10, delay: '9700ms', duration: '12s', drift: '16px' },
  { type: 'heart', left: '44%', top: '-11%', size: 13, delay: '4900ms', duration: '14s', drift: '-18px' },
  { type: 'glitter', left: '49%', top: '-6%', size: 6, delay: '700ms', duration: '10s', drift: '10px' },
  { type: 'leaf', left: '55%', top: '-13%', size: 13, delay: '7200ms', duration: '13s', drift: '20px' },
  { type: 'star', left: '60%', top: '-8%', size: 11, delay: '2100ms', duration: '15s', drift: '-16px' },
  { type: 'heart', left: '66%', top: '-15%', size: 10, delay: '10400ms', duration: '11s', drift: '22px' },
  { type: 'glitter', left: '71%', top: '-5%', size: 5, delay: '5600ms', duration: '9s', drift: '-12px' },
  { type: 'leaf', left: '77%', top: '-12%', size: 15, delay: '3900ms', duration: '16s', drift: '-22px' },
  { type: 'star', left: '82%', top: '-7%', size: 12, delay: '8800ms', duration: '12s', drift: '14px' },
  { type: 'heart', left: '88%', top: '-14%', size: 11, delay: '1800ms', duration: '14s', drift: '-20px' },
  { type: 'glitter', left: '93%', top: '-6%', size: 6, delay: '6700ms', duration: '8s', drift: '16px' },
  { type: 'leaf', left: '96%', top: '-10%', size: 12, delay: '10100ms', duration: '15s', drift: '18px' },
  { type: 'star', left: '2%', top: '-9%', size: 10, delay: '4300ms', duration: '13s', drift: '-14px' },
  { type: 'heart', left: '12%', top: '-16%', size: 12, delay: '9100ms', duration: '16s', drift: '20px' },
  { type: 'glitter', left: '36%', top: '-5%', size: 5, delay: '5100ms', duration: '10s', drift: '-10px' },
  { type: 'star', left: '52%', top: '-11%', size: 11, delay: '11200ms', duration: '11s', drift: '22px' },
  { type: 'leaf', left: '63%', top: '-14%', size: 14, delay: '2900ms', duration: '14s', drift: '-24px' },
  { type: 'heart', left: '80%', top: '-13%', size: 10, delay: '7900ms', duration: '15s', drift: '16px' },
]

/**
 * The hero's falling-confetti atmosphere layer.
 *
 * Rendered as the first child of the hero `<section>` so it paints behind the
 * hero content, and clipped to that section by the section's `overflow-hidden`.
 */
export function HeroConfetti() {
  const reduced = useMotion()

  // Omitted entirely under reduce (not hidden): no element is left carrying a
  // suspended animation.
  if (reduced) return null

  return (
    <div className="hero-confetti" aria-hidden="true">
      {PIECES.map((piece) => (
        <span
          key={piece.type + piece.left + piece.delay}
          className={`confetti confetti--${piece.type}`}
          style={{
            left: piece.left,
            top: piece.top,
            width: `${piece.size}px`,
            height: `${piece.size}px`,
            animationDelay: piece.delay,
            animationDuration: piece.duration,
            '--drift': piece.drift,
          }}
        />
      ))}
    </div>
  )
}

// Exported both ways to match the mixed convention across the other components,
// so an importer picking either style cannot break the build. Both are the same
// component, satisfying `react-refresh/only-export-components`.
export default HeroConfetti
