// A controllable `window.matchMedia` shim for the jsdom test environment.
//
// jsdom implements no `matchMedia` at all, so any component reaching the motion
// layer would throw `matchMedia is not a function` on mount. The design gives
// reduced motion exactly one JS source of truth — `useReducedMotion` reads
// `matchMedia(REDUCED_MOTION_QUERY)` and subscribes to its `change` event, once,
// in `App` — which means driving the media query is enough to drive the whole
// tree's motion policy from a test. That is what this module exists to do.
//
// Two deliberate choices:
//
//   * `matches` is resolved from a single boolean through a query *resolver*
//     rather than a table of exact query strings, so the shim does not have to
//     agree character-for-character with the constant in `src/motion/query.js`
//     (which task 5.1 owns and which does not exist yet).
//   * One `MediaQueryList` object is cached per query string rather than a fresh
//     one per call. Real browsers hand back a new object each time; caching keeps
//     every listener — the hook's and the test's — in one place to notify, which
//     is the only property the tests care about.

// Mirrors the design's `REDUCED_MOTION_QUERY` in `src/motion/query.js`. Kept as
// a local literal because that module is not written yet; the shim's resolver
// matches any `prefers-reduced-motion` query, so the two cannot drift in a way
// that silently breaks a test.
export const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)'

/** Current value of the simulated `prefers-reduced-motion` preference. */
let reducedMotion = false

/** query string -> { list, listeners, lastMatches } */
const registry = new Map()

/**
 * Resolve `matches` for a query against the current simulated preference.
 * Anything that is not a reduced-motion query reports `false`, which is what
 * jsdom's absent layout engine would honestly report for width/height queries.
 */
function resolveMatches(query) {
  const normalised = String(query).toLowerCase()
  if (!normalised.includes('prefers-reduced-motion')) return false
  return normalised.includes('no-preference') ? !reducedMotion : reducedMotion
}

function createChangeEvent(list) {
  const event = new Event('change')
  event.matches = list.matches
  event.media = list.media
  return event
}

function createEntry(query) {
  const listeners = new Set()
  const media = String(query)

  const list = {
    media,
    get matches() {
      return resolveMatches(media)
    },
    onchange: null,
    addEventListener(type, listener) {
      if (type === 'change' && listener) listeners.add(listener)
    },
    removeEventListener(type, listener) {
      if (type === 'change') listeners.delete(listener)
    },
    // Legacy Safari / older-browser surface. `useReducedMotion` targets the
    // modern one, but a shim that omits these would make the hook untestable
    // if it ever adds the documented fallback.
    addListener(listener) {
      if (listener) listeners.add(listener)
    },
    removeListener(listener) {
      listeners.delete(listener)
    },
    dispatchEvent(event) {
      for (const listener of [...listeners]) {
        if (typeof listener === 'function') listener(event)
        else if (listener && typeof listener.handleEvent === 'function') listener.handleEvent(event)
      }
      if (typeof list.onchange === 'function') list.onchange(event)
      return true
    },
  }

  return { list, listeners, lastMatches: list.matches }
}

function matchMediaShim(query) {
  const key = String(query)
  let entry = registry.get(key)
  if (!entry) {
    entry = createEntry(key)
    registry.set(key, entry)
  }
  return entry.list
}

/** Install the shim onto `window` (and the global scope, if they differ). */
export function installMatchMedia() {
  window.matchMedia = matchMediaShim
  if (globalThis !== window) globalThis.matchMedia = matchMediaShim
  return matchMediaShim
}

/**
 * Set whether `(prefers-reduced-motion: reduce)` matches, and fire `change` on
 * every registered `MediaQueryList` whose match state actually flipped — the
 * same thing a browser does when the OS setting is toggled mid-session, which
 * is the path the reduced-motion tests need to exercise.
 *
 * Call this *before* rendering. To flip it on an already-mounted tree, use
 * `toggleReducedMotion` from `./helpers.js`, which wraps this in `act`.
 */
export function setReducedMotion(value) {
  const next = Boolean(value)
  if (next === reducedMotion) return
  reducedMotion = next

  for (const entry of registry.values()) {
    const current = entry.list.matches
    if (current === entry.lastMatches) continue
    entry.lastMatches = current
    entry.list.dispatchEvent(createChangeEvent(entry.list))
  }
}

/** Read back the simulated preference. */
export function getReducedMotion() {
  return reducedMotion
}

/**
 * Drop every registered list and its listeners and return to the default
 * not-reduced state, so one test's preference cannot leak into the next.
 */
export function resetMatchMedia() {
  registry.clear()
  reducedMotion = false
  installMatchMedia()
}
