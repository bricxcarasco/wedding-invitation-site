// SiteBackground — the site-wide fixed background photograph.
//
// A single fixed, full-viewport, decorative layer that paints `hero-bg.jpg`
// behind EVERY section. Because it is `position: fixed` it stays put while the
// guest scrolls, so the same photo backs the whole page rather than only the
// hero.
//
// LAYERING. It sits on `-z-10`, the same negative z-index the ParallaxLayer used
// to occupy, so it paints behind every in-flow block. `src/index.css` sets the
// background colour on `body` (not `html`), so that colour propagates to the
// canvas rather than being painted as a `body` box — which is exactly what keeps
// a negative-z-index fixed layer visible above it (see the ParallaxLayer note).
//
// READABILITY VEIL. A translucent Cream wash (`.site-bg-photo::after`, in
// SiteBackground.css) is layered ON TOP of the photo so the Sage text and the
// Sage/Cream confetti keep comfortable contrast over a busy photograph. It is
// translucent, so the photo still reads clearly through it. The per-section
// banding in MainInvitation (`bg-cream-soft/80`) is likewise translucent and
// sits ABOVE this layer, so it tints the photo on alternating sections without
// ever hiding it.
//
// DECORATION, AND NOTHING BUT. `aria-hidden` keeps it out of the accessibility
// tree; `pointer-events-none` means it never swallows a click or tap aimed at
// the content in front of it. A screen-reader user and a keyboard user both
// experience the page as if this layer did not exist.
//
// NO MOTION. The layer paints once and never animates, so it adds nothing to the
// motion budget and needs no reduced-motion handling — it is shown identically
// whether or not the guest prefers reduced motion.

import heroBg from '../assets/images/hero-bg.jpg'

import './SiteBackground.css'

/**
 * The fixed, full-viewport background photo shared across the whole site.
 *
 * `bg-cover` scales the image to FILL the viewport on both axes while preserving
 * its aspect ratio — it crops rather than stretches — and `bg-center` keeps the
 * focal point centred as it crops. `bg-fixed` pins the image to the viewport so
 * it does not scroll with the content.
 *
 * @returns {import('react').ReactElement}
 */
export function SiteBackground() {
  return (
    <div
      aria-hidden="true"
      className="site-bg-photo pointer-events-none fixed inset-0 -z-10 bg-cover bg-center bg-no-repeat"
      style={{ backgroundImage: `url(${heroBg})` }}
    />
  )
}

export default SiteBackground
