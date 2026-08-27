// The site's one parallax background layer.
//
// Requirements: 10.3 (a parallax depth effect on at least one background layer),
// 10.5 (at most three concurrent animated properties per section — this layer
// animates exactly one, `transform`), 10.6 (still under `reduce`), 14.6 (no
// Palette hex in a component; every colour below is a Tailwind token from the
// `@theme` block in `src/index.css`).
//
// Exports the component and nothing else. `react-refresh/only-export-components`
// rejects a non-component export sitting beside a component in a `.jsx` file, so
// the shared constants live in `src/hooks/useParallax.js`, which is `.js`.

import { useParallax } from '../hooks/useParallax.js'

/**
 * A single fixed, decorative, `aria-hidden` wash that drifts behind the
 * scrolling content.
 *
 * ## Decoration, and nothing but
 *
 * `aria-hidden="true"` keeps the element and its (empty) subtree out of the
 * accessibility tree, and there is nothing focusable inside it, so it never
 * enters the tab order. `pointer-events-none` means it cannot swallow a click or
 * a tap aimed at the content in front of it — it covers the entire viewport, so
 * without that it would eat every interaction on the page. A screen-reader user
 * and a keyboard user both experience this element as if it did not exist, which
 * is exactly right: it carries no information.
 *
 * ## Why it sits behind the content
 *
 * `fixed` + `-z-10`. The negative z-index puts it behind every in-flow block in
 * the root stacking context. It does not disappear behind the page background,
 * because `src/index.css` sets `background-color` on `body` while leaving `html`
 * transparent, so that colour is propagated to the canvas rather than painted as
 * a `body` box background — leaving negative-z-index content visible above it.
 *
 * ## Overscan
 *
 * The box is 200vh tall and starts 50vh above the viewport, so the drift written
 * by `useParallax` never pulls an edge into view at the default factor. The
 * gradient also starts at Cream, the same tone as the page background, so even
 * an extreme scroll depth on a very long page cannot produce a visible seam.
 *
 * @param {object} props
 * @param {string} [props.className] appended last, so a caller can retune
 *   position, height, or gradient
 * @param {number} [props.factor] drift per pixel scrolled; omit for the hook's
 *   gentle default
 */
export function ParallaxLayer({ className = '', factor }) {
  const ref = useParallax(factor)

  return (
    <div
      ref={ref}
      aria-hidden="true"
      className={`parallax-layer pointer-events-none fixed inset-x-0 -top-[50vh] -z-10 h-[200vh] bg-linear-to-b from-cream via-sage-light/25 to-sage/15 ${className}`}
    />
  )
}
