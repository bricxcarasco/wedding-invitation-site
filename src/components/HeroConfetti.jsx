// HeroConfetti — the one-shot "pop / boom" burst behind the hero copy.
//
// A dense fan of leaves, stars, hearts and glitter erupts from a point in the
// lower-middle of the hero the moment the main site is revealed, scatters
// outward and upward, spins, arcs, and fades — all inside about a second. Plays
// once and is gone.
//
// This is ONLY the burst. The gentle continuous drift used to live here too,
// but it now lives in `SiteConfetti`, which renders a fixed, full-viewport
// layer so the drift is visible across the whole page as the guest scrolls —
// not clipped to the hero. The burst stays here because it is a hero-specific
// opening beat, clipped to the hero section by that section's `overflow-hidden`.
//
// A soft, celebratory mix in the wedding's Sage/Cream palette. Purely
// decorative: `aria-hidden`, click-through, pinned behind the hero text.
//
// WHY MOUNT TIMING IS THE TRIGGER. `MainInvitation` is only constructed once the
// Envelope_Gate reaches phase 'open', so a burst piece's first frame *is* the
// moment the reveal completes. The pop therefore fires exactly on first
// appearance with no timers, state, or effects — the animation simply starts
// when the elements mount.
//
// REDUCED MOTION OMITS, IT DOES NOT HIDE. When `useMotion()` reports `reduce`
// the component returns `null` and renders nothing at all. The CSS carries a
// `prefers-reduced-motion` net too, belt-and-braces.
//
// MOTION BUDGET. Every piece animates `transform` and `opacity` only, driven by
// one CSS keyframe (`confetti-burst`, one-shot) — compositor-only. Shapes are
// built entirely from CSS; no image files.

import { useMotion } from '../motion/context.js'

import './HeroConfetti.css'

// The four confetti shapes, cycled through the burst.
const TYPES = ['leaf', 'star', 'heart', 'glitter']

// ---------------------------------------------------------------------------
// The BURST
//
// Computed once at module load rather than hand-authored: 44 pieces need a
// trajectory each, and a deterministic generator keeps the scatter stable
// across mounts (so React keys never change) while staying readable. Nothing
// here reads the clock or Math.random at render time — the pseudo-random values
// come from a fixed seed, so every session gets the identical burst.
// ---------------------------------------------------------------------------

const BURST_COUNT = 44

// A tiny deterministic PRNG (mulberry32) seeded with a constant, so the burst is
// varied but identical on every load — a reviewable design decision, not a
// different accident each time.
function makeRandom(seed) {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const BURST = (() => {
  const rand = makeRandom(0x5eed)
  const DEG = Math.PI / 180
  return Array.from({ length: BURST_COUNT }, (_, i) => {
    // Fan the spray upward and outward: angles measured from the positive x
    // axis, biased across the upper hemisphere (roughly -20° to -160°, i.e.
    // up-right through up-left), with a little spread past horizontal so a few
    // pieces shoot out sideways. Negative y is upward in screen space.
    const angle = (-20 - rand() * 140) * DEG
    const distance = 130 + rand() * 320 // 130–450px from the origin
    const bx = Math.cos(angle) * distance
    const by = Math.sin(angle) * distance // negative → rises
    return {
      type: TYPES[i % TYPES.length],
      // Origin: a point low-and-centre in the hero, jittered a few percent so
      // it erupts from a small cluster rather than a mathematical point.
      left: `${50 + (rand() - 0.5) * 10}%`,
      top: `${60 + (rand() - 0.5) * 8}%`,
      size: 7 + Math.round(rand() * 9), // 7–16px
      bx: `${bx.toFixed(1)}px`,
      by: `${by.toFixed(1)}px`,
      spin: `${Math.round((rand() - 0.5) * 900)}deg`,
      // A tight launch window so the burst erupts almost together, and a short
      // one-shot duration so the whole pop is over inside ~1.3s.
      delay: `${Math.round(rand() * 140)}ms`,
      duration: `${900 + Math.round(rand() * 400)}ms`,
    }
  })
})()

/**
 * The hero's one-shot celebratory burst.
 *
 * Rendered as a child of the hero `<section>` so it paints behind the hero
 * content and is clipped to that section by its `overflow-hidden`.
 */
export function HeroConfetti() {
  const reduced = useMotion()

  // Omitted entirely under reduce (not hidden): the celebratory burst is
  // exactly the kind of motion the preference asks to skip.
  if (reduced) return null

  return (
    <div className="hero-confetti hero-confetti--burst" aria-hidden="true">
      {BURST.map((piece, index) => (
        <span
          key={`burst-${index}`}
          className={`confetti confetti--burst-piece confetti--${piece.type}`}
          style={{
            left: piece.left,
            top: piece.top,
            width: `${piece.size}px`,
            height: `${piece.size}px`,
            animationDelay: piece.delay,
            animationDuration: piece.duration,
            '--bx': piece.bx,
            '--by': piece.by,
            '--spin': piece.spin,
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
