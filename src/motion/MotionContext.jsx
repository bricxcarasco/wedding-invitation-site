// Publishes the Reduced_Motion_Preference to the tree.
//
// Requirements: 10.6, 1.8.
//
// Two files, one concern. This one holds the provider component and nothing
// else; the context object and the `useMotion()` consumer hook live in
// `./context.js`. `react-refresh/only-export-components` rejects a `.jsx` file
// that exports both a component and a plain function — exporting `useMotion`
// alongside `MotionProvider` here produces:
//
//   error  Fast refresh only works when a file only exports components.
//          Use a new file to share constants or functions between components
//
// (verified against this project's eslint config, not assumed). The rule is
// correct, so the files are arranged to satisfy it rather than the rule being
// suppressed. Import paths for the rest of the site:
//
//   import { MotionProvider } from './motion/MotionContext.jsx'   // App only
//   import { useMotion }      from '../motion/context.js'         // everywhere else

import { MotionContext } from './context.js'

/**
 * Publish a reduced-motion boolean to every descendant.
 *
 * ============================================================================
 * THE RULE THIS FILE EXISTS TO ENFORCE
 * ============================================================================
 * `useReducedMotion()` is called in exactly ONE place in the whole site: `App`.
 * Its value arrives here as `value` and is read by descendants through
 * `useMotion()`. No other module may call `matchMedia`, and no other module may
 * call `useReducedMotion`.
 *
 * That is not stylistic tidiness, it is what makes the reduced-motion guarantee
 * checkable:
 *
 *   * **One listener, one truth.** A visitor who toggles the OS setting
 *     mid-visit gets a single `change` event that re-renders the whole tree from
 *     one boolean. Nine components each running their own `matchMedia` would be
 *     nine listeners settling in their own order, and nothing would stop one
 *     section from ending up in a state that disagrees with its neighbours.
 *   * **Correctness Property 8 is stated over *all* sections** — "when the
 *     reduced-motion preference is set to reduce, no rendered element carries a
 *     pre-animation state … anywhere in the tree". A property quantified over
 *     the entire tree is only provable because the policy has a single source.
 *     Every ad hoc `matchMedia` call added elsewhere is a hole in that proof
 *     that no test would necessarily catch.
 *
 * So: if a component needs to know about motion, it calls `useMotion()`. If it
 * seems to need its own media query, the design is wrong somewhere and the fix
 * belongs here, not there.
 * ============================================================================
 *
 * No `useMemo` and no wrapper object: the context value *is* the boolean, so
 * React's `Object.is` check means consumers re-render only when the preference
 * genuinely flips. Wrapping it in `{ reducedMotion }` would create a fresh
 * object on every provider render and re-render every consumer for nothing.
 *
 * @param {object} props
 * @param {boolean} [props.value] `true` when the visitor prefers reduced motion
 * @param {import('react').ReactNode} props.children
 */
export function MotionProvider({ value = false, children }) {
  return <MotionContext value={Boolean(value)}>{children}</MotionContext>
}
