// The one place in the site that talks to `matchMedia`.
//
// Requirements: 10.6 (disable motion across every section under `reduce`),
// 1.8 (the Envelope_Gate's shortened cross-fade and omitted ambient element).
//
// This hook is called EXACTLY ONCE, in `App`, and its value is published to the
// tree through `MotionProvider`. See the rule comment in
// `src/motion/MotionContext.jsx` for why that matters.

import { useSyncExternalStore } from 'react'

import { REDUCED_MOTION_QUERY } from '../motion/query.js'

/**
 * The live `MediaQueryList` for {@link REDUCED_MOTION_QUERY}, or `null` where no
 * media-query engine exists.
 *
 * Deliberately *not* memoised at module scope. Two reasons:
 *
 *   1. SSR / prerender safety. The site is statically rendered by Vite so there
 *      is no server render today, but a module-level `matchMedia()` call would
 *      throw at import time in any non-DOM runtime, and that is a needlessly
 *      fragile thing to leave lying around for one saved object allocation.
 *   2. Test isolation. `src/tests/setup.js` reinstalls a fresh `matchMedia`
 *      shim before every test. A cached `MediaQueryList` would outlive its
 *      registry, so listeners would be attached to a discarded object and
 *      preference changes would never arrive. Reading `window.matchMedia`
 *      afresh on each call keeps the hook honest about the current environment.
 *
 * @returns {MediaQueryList | null}
 */
function getMediaQueryList() {
  if (typeof window === 'undefined') return null
  if (typeof window.matchMedia !== 'function') return null
  return window.matchMedia(REDUCED_MOTION_QUERY)
}

/**
 * `useSyncExternalStore` subscribe callback.
 *
 * Defined at module scope so its identity is stable across renders — React
 * resubscribes whenever this function changes, and an inline closure would
 * therefore tear down and reinstall the listener on every single render.
 *
 * Only the modern `addEventListener('change', …)` surface is used. The legacy
 * `MediaQueryList.addListener` fallback is intentionally omitted: `matches`-list
 * event-target support has been baseline since Safari 14 (2020), and the site
 * targets modern browsers (12.x performance budget, Tailwind v4, React 19 —
 * none of which support the browsers that would need the fallback). The test
 * shim in `src/tests/matchMedia.js` implements both surfaces, so nothing in the
 * harness depends on the choice either way.
 *
 * @param {() => void} onStoreChange
 * @returns {() => void} unsubscribe
 */
function subscribe(onStoreChange) {
  const mql = getMediaQueryList()
  if (!mql) return () => {}

  mql.addEventListener('change', onStoreChange)
  return () => {
    mql.removeEventListener('change', onStoreChange)
  }
}

/**
 * `useSyncExternalStore` client snapshot: the current preference as a boolean.
 *
 * Returns a primitive, so React's snapshot comparison is a plain `===` and no
 * memoisation is required to avoid an infinite re-render loop.
 *
 * @returns {boolean}
 */
function getSnapshot() {
  const mql = getMediaQueryList()
  return mql ? mql.matches === true : false
}

/**
 * `useSyncExternalStore` server snapshot.
 *
 * `false` — "not reduced" — is the correct default for an environment that
 * cannot report a preference: it matches the CSS media query's own behaviour
 * (an unsupported query does not match) and it means the fully animated markup
 * is what gets prerendered, which the client then corrects on hydration if the
 * real preference is `reduce`. The alternative would bake a reduced-motion tree
 * into the static HTML for every visitor.
 *
 * @returns {boolean}
 */
function getServerSnapshot() {
  return false
}

/**
 * Read the visitor's Reduced_Motion_Preference as a boolean.
 *
 * `true` means the visitor has asked for reduced motion.
 *
 * Implemented with `useSyncExternalStore` rather than the more common
 * `useState` + `useEffect` pairing. `matchMedia` is exactly what that hook
 * exists for — a mutable value owned outside React — and the choice buys three
 * things here:
 *
 *   * **No `setState` in an effect.** The belt-and-braces resync that a
 *     `useState`-based hook needs (re-reading `mql.matches` in the effect body,
 *     to catch a preference change that landed between render and effect) is
 *     rejected by `react-hooks/set-state-in-effect` under the React Compiler
 *     rules this project lints with. `useSyncExternalStore` re-checks the
 *     snapshot itself immediately after subscribing, so that gap is closed by
 *     React rather than by a rule violation.
 *   * **No tearing.** Every consumer of the store sees one snapshot per render
 *     pass, even under concurrent rendering.
 *   * **A first-class SSR path** via `getServerSnapshot`, instead of an
 *     initialiser that has to guess.
 *
 * All three callbacks live at module scope, so subscription happens once per
 * mount and the listener is removed on unmount by React's own teardown.
 *
 * @returns {boolean} the current preference; never `undefined`
 */
export function useReducedMotion() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}
