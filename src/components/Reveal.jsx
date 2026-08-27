// The scroll-reveal wrapper used by every revealing section.
//
// Requirements: 10.2 (Scroll_Reveal on `WeddingDetails`, `OurStory`, `Gallery`,
// `Venue`, `DressCode`, `Rsvp`), 10.6 (final visual state under `reduce`), plus
// 2.4, 4.3, 5.2 and 6.5 at the individual-section level.
//
// Thin by design: it owns the `.reveal` / `.reveal--visible` class pair and the
// stagger class, and nothing else. The CSS lives in `src/index.css` (task 1.3)
// and the observer lives in `src/hooks/useScrollReveal.js`; this file only
// decides which class names a given element carries. Requirement 10.5's
// three-property ceiling is a property of that CSS — `.reveal` transitions
// `opacity` and `transform`, and nothing here adds a third.
//
// Export note: this module exports ONLY `Reveal`. `react-refresh/only-export-components`
// rejects a non-component export sitting beside a component in a `.jsx` file,
// so the delay-class lookup below stays a module-private function rather than a
// shared export. If a later task needs it, it moves to a `.js` file — the same
// arrangement `src/motion/context.js` uses.

import { useScrollReveal } from '../hooks/useScrollReveal.js'
import { useMotion } from '../motion/context.js'

/** Highest stagger step defined in `src/index.css` (`.reveal-delay-6`, 480ms). */
const MAX_DELAY_STEP = 6

/**
 * Map a stagger step to its `transition-delay` utility class.
 *
 * **Why a number rather than a raw class string.** `delay` is a step index —
 * `1`–`6`, matching `.reveal-delay-1`…`.reveal-delay-6` at 80ms increments —
 * because that is the shape callers actually want at the call site:
 * `{items.map((item, i) => <Reveal delay={i + 1}>)}` reads as sequencing, while
 * `` delay={`reveal-delay-${i + 1}`} `` makes every caller reconstruct a class
 * name this project owns and gives a typo no way to fail loudly. It also keeps
 * the utility set an implementation detail of the stylesheet: if the increments
 * or the class names change, they change in `index.css` and here, not across
 * nine components. Anyone who genuinely needs an arbitrary class can pass one
 * through `className`, which is merged, so nothing is actually foreclosed.
 *
 * Out-of-range, zero, and non-integer values yield no class rather than an
 * error. A stagger is decoration; a section that renders unstaggered is a
 * cosmetic miss, whereas a section that fails to render is a broken invitation.
 *
 * @param {number} step
 * @returns {string} the utility class, or `''` for "no delay"
 */
function delayClass(step) {
  if (!Number.isInteger(step) || step < 1 || step > MAX_DELAY_STEP) return ''
  return `reveal-delay-${step}`
}

/**
 * Reveal `children` when the wrapper first scrolls into view.
 *
 * ```jsx
 * <Reveal as="section" id="our-story" className="mx-auto max-w-2xl">…</Reveal>
 *
 * {images.map((image, index) => (
 *   <Reveal as="li" key={image.src} delay={(index % 6) + 1}>…</Reveal>
 * ))}
 * ```
 *
 * `as` exists so the reveal can *be* the semantic element rather than sit inside
 * an extra `div`. The gallery grid needs `<li>` children for its list markup and
 * the details cards want to be `<article>`/`<li>` inside their own container —
 * an unavoidable wrapper `div` in either position would either break the
 * list/grid parent-child relationship or add a layout box that has to be
 * neutralised with `display: contents` (which, notably, would also stop the
 * `transform` in `.reveal` from applying at all).
 *
 * `className` is merged after the reveal classes, and every remaining prop is
 * forwarded to the rendered element, so callers add layout, `id`, `aria-*` and
 * event handlers exactly as they would on a plain element.
 *
 * Under reduced motion the element mounts with `.reveal--visible` already
 * applied and carries no delay class, so it is in its final position and opacity
 * with nothing pending (10.6, and 2.5's "no entrance animation" for the Hero's
 * staggered lines). The CSS `@media` block neutralises the transition as a
 * second layer, but the markup is correct on its own — which is what makes
 * Correctness Property 8 checkable against the DOM.
 *
 * @param {object} props
 * @param {import('react').ElementType} [props.as='div'] element or component to
 *   render
 * @param {number} [props.delay=0] stagger step, `1`–`6`; `0` for none
 * @param {string} [props.className] additional classes, merged not replaced
 * @param {import('react').ReactNode} [props.children]
 */
export function Reveal({ as: Element = 'div', delay = 0, className, children, ...rest }) {
  const [ref, isVisible] = useScrollReveal()
  const reducedMotion = useMotion()

  const classes = ['reveal']
  if (isVisible) classes.push('reveal--visible')
  // Skipped under `reduce`: a delay on an element that is already in its final
  // state would be inert anyway, but omitting the class means the DOM contains
  // no trace of a pending animation for a reduced-motion assertion to find.
  if (!reducedMotion) {
    const stagger = delayClass(delay)
    if (stagger) classes.push(stagger)
  }
  if (className) classes.push(className)

  return (
    <Element ref={ref} className={classes.join(' ')} {...rest}>
      {children}
    </Element>
  )
}
