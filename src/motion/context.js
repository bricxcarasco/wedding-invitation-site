// The motion context object and its consumer hook.
//
// Requirements: 10.6, 1.8.
//
// Extension note: this file is `.js` and holds no JSX, and the provider
// component lives next door in `MotionContext.jsx`. The split is forced by
// `react-refresh/only-export-components`, which scans `.jsx` files and rejects
// any non-component export sitting beside a component — a hook named
// `useMotion` exported from the same file as `MotionProvider` trips it. The
// rule is right to complain (Fast Refresh cannot preserve state across a module
// that exports both), so the files are arranged to satisfy it rather than the
// rule being disabled. `src/tests/helpers.js` is `.js` for the same reason.

import { createContext, useContext } from 'react'

/**
 * Carries the Reduced_Motion_Preference as a bare boolean.
 *
 * The default is `false` — "not reduced". A component rendered outside a
 * `MotionProvider` therefore takes the fully animated path rather than throwing,
 * which keeps a section mountable in isolation in a test. `MotionProvider` in
 * `App` covers the real tree, so the default is only ever seen in tests and in
 * Storybook-style one-off renders.
 *
 * Not exported to application code: components use {@link useMotion}, never the
 * context object. `MotionContext.jsx` is the only other importer.
 */
export const MotionContext = createContext(false)

/**
 * Read the Reduced_Motion_Preference published by `MotionProvider`.
 *
 * This is the ONLY way a component is allowed to learn about motion policy.
 * See the rule comment in `src/motion/MotionContext.jsx`.
 *
 * @returns {boolean} `true` when the visitor prefers reduced motion; always a
 *   boolean, never `undefined`
 */
export function useMotion() {
  return useContext(MotionContext) === true
}
