// The single reduced-motion media query constant.
//
// Requirements: 10.6 (one policy across every section), 1.8 (the gate's own
// reduced-motion behaviour).
//
// The design gives reduced motion two enforcement layers, and this constant is
// the seam they share:
//
//   Layer 1 — JavaScript. `src/hooks/useReducedMotion.js` imports this value,
//     passes it to `matchMedia`, and publishes the result through
//     `src/motion/MotionContext.jsx`. Everything React *decides* — whether the
//     ambient particles are rendered at all, which envelope duration to use,
//     whether an IntersectionObserver is created — hangs off that boolean.
//
//   Layer 2 — CSS. The `@media (prefers-reduced-motion: reduce)` block in
//     `src/index.css` neutralises authored keyframes and transitions as a
//     safety net for anything the stylesheet owns outright.
//
// CSS cannot import a JavaScript constant, so the query text is necessarily
// written out a second time as a literal in `src/index.css`. THE TWO MUST STAY
// IN STEP: if this string is ever changed, the `@media` block in
// `src/index.css` has to change with it, or the JS layer and the CSS layer will
// silently disagree about what "reduce" means and one of them will keep
// animating. There is no build-time check that catches this — it is a manual
// invariant, which is why it is written down here rather than assumed.

/**
 * The CSS media query that reports the visitor's Reduced_Motion_Preference.
 *
 * @type {string}
 */
export const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)'
