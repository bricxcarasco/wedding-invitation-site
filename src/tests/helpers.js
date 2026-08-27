// The single shared entry point for test utilities. The envelope gate tests
// (6.4), the RSVP form tests (7.11) and the reduced-motion property test (8.1)
// all import from here.
//
// Extension note: this file is `.js`, not `.jsx`, because it contains no JSX.
// That also keeps it outside `react-refresh/only-export-components`, which scans
// `.jsx`/`.tsx` and reads the re-exported `REDUCED_MOTION_QUERY` as a component
// export — then rejects every function beside it. If a later task genuinely
// needs JSX in a shared helper, put that piece in its own `.jsx` file rather
// than renaming this one.
import { act, render } from '@testing-library/react'

import { REDUCED_MOTION_QUERY, setReducedMotion } from './matchMedia.js'

export { REDUCED_MOTION_QUERY, setReducedMotion }

/**
 * Render `ui` with the reduced-motion preference set to `reducedMotion`.
 *
 * Deliberately does NOT import `MotionContext` or wrap the tree in a provider.
 * The design puts exactly one `useReducedMotion()` call in `App`, which
 * publishes the value through `MotionContext` itself, so setting the media query
 * before mounting is sufficient to drive the whole tree — and it keeps this
 * helper decoupled from `src/motion/MotionContext.jsx`, which does not exist yet
 * (task 5.1 writes it). A test that needs to mount a single section in isolation
 * rather than through `App` can pass its own `wrapper` option, which is
 * forwarded to Testing Library unchanged.
 *
 * @param {import('react').ReactElement} ui
 * @param {{ reducedMotion?: boolean } & Record<string, unknown>} [options]
 */
export function renderWithMotion(ui, options = {}) {
  const { reducedMotion = false, ...renderOptions } = options
  setReducedMotion(reducedMotion)
  return render(ui, renderOptions)
}

/**
 * Flip the reduced-motion preference on an already-mounted tree.
 *
 * The change arrives through a media-query listener, which is outside React's
 * event system, so the resulting state update has to be wrapped in `act` or
 * React warns and the assertion runs against a stale render.
 */
export function toggleReducedMotion(value) {
  act(() => {
    setReducedMotion(value)
  })
}
