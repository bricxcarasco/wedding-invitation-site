// SiteConfetti — the gentle, continuous falling confetti across the WHOLE site.
//
// This is the idle "atmosphere" drift (leaves, stars, hearts, glitter in the
// Sage/Cream palette). It used to live inside the hero and was clipped to it;
// it now renders on a `position: fixed`, full-viewport layer pinned behind all
// content, so the confetti keeps drifting down the visible area no matter where
// the guest has scrolled. The one-shot celebratory pop stays in `HeroConfetti`.
//
// Purely decorative: `aria-hidden`, click-through (`pointer-events: none`), and
// on a low z-index so every section's content sits on top and stays readable.
//
// REDUCED MOTION OMITS, IT DOES NOT HIDE. When `useMotion()` reports `reduce`
// the component returns `null` — nothing rendered, no suspended animation. The
// CSS carries a `prefers-reduced-motion` net too, belt-and-braces.
//
// MOTION BUDGET. Every piece animates `transform` and `opacity` only, driven by
// one looping CSS keyframe (`confetti-fall`) — compositor-only, no layout
// properties in flight. Shapes are built entirely from CSS; no image files.

import { useMotion } from '../motion/context.js'

import './HeroConfetti.css'

// A hand-authored scatter of drift pieces spread across the viewport width.
// Fixed rather than randomised so the scatter is a reviewable design decision
// and React never reconciles changing keys.
//
// The naturalness comes from all the columns disagreeing. `left` spreads across
// the width; `size` runs small so the field reads as depth not stickers; the
// delays and durations share no common rhythm, so the fall never resynchronises
// into a visible pulse. `top` starts above the top edge so every piece drifts in
// from off-screen. `drift` is the horizontal sway amplitude, signed so pieces
// lean both ways. The four types are mixed roughly evenly.
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

// A short lead-in so the site-wide drift eases in just after the hero burst
// settles rather than competing with it on first reveal.
const DRIFT_LEAD_IN_MS = 650

/**
 * The site-wide falling-confetti atmosphere.
 *
 * Rendered once, high in `MainInvitation`, as a fixed full-viewport layer so it
 * is visible across every section as the guest scrolls.
 */
export function SiteConfetti() {
  const reduced = useMotion()

  // Omitted entirely under reduce (not hidden): no element is left carrying a
  // suspended animation.
  if (reduced) return null

  return (
    <div className="site-confetti" aria-hidden="true">
      {PIECES.map((piece) => (
        <span
          key={piece.type + piece.left + piece.delay}
          className={`confetti confetti--${piece.type}`}
          style={{
            left: piece.left,
            top: piece.top,
            width: `${piece.size}px`,
            height: `${piece.size}px`,
            animationDelay: `${parseInt(piece.delay, 10) + DRIFT_LEAD_IN_MS}ms`,
            animationDuration: piece.duration,
            '--drift': piece.drift,
          }}
        />
      ))}
    </div>
  )
}

// Exported both ways to match the mixed convention across the other components.
export default SiteConfetti
