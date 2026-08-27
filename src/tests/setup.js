// Vitest global setup, loaded by `vite.config.js` via `test.setupFiles`.
//
// Two jobs: register the jest-dom matchers, and install the controllable
// matchMedia shim plus the per-test reset that keeps reduced-motion state from
// leaking between tests. The shim itself lives in `./matchMedia.js` so the
// helper in `./helpers.jsx` can import the same instance rather than reaching
// into a setup file.
import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, beforeEach } from 'vitest'

import { installMatchMedia, resetMatchMedia } from './matchMedia.js'

// Install immediately as well as per-test: a module imported at the top of a
// test file may call `matchMedia` while evaluating, before any hook runs.
installMatchMedia()

beforeEach(() => {
  // Default to not-reduced, so the ordinary animated path is what a test sees
  // unless it opts in.
  resetMatchMedia()
})

afterEach(() => {
  // `globals: true` makes Testing Library's auto-cleanup active, but calling it
  // explicitly is idempotent and keeps the harness correct if that flag ever
  // changes. Unmount first, so component listeners are removed before the
  // registry is cleared.
  cleanup()
  resetMatchMedia()
})
