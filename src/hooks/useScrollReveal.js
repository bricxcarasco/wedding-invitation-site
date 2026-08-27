// One-shot scroll reveal, backed by a single shared IntersectionObserver.
//
// Requirements: 10.2 (Scroll_Reveal on the six revealing sections), 10.6 (no
// reveal animation under `reduce`), 12.4 (no per-frame React state), 12.5
// (scroll-driven work confined to IntersectionObserver callbacks).
//
// Also the mechanism behind the "first enters the viewport" wording in 4.3, 5.2
// and 6.5 — hence one-shot: the class is toggled once and the element is
// dropped from the observer, so a section that scrolls back out does not fade
// away and back in again.
//
// ============================================================================
// WHY A SINGLETON OBSERVER
// ============================================================================
// Requirement 12.5 caps scroll-driven work at IntersectionObserver callbacks or
// a once-per-frame handler. An observer per revealing element would technically
// satisfy that too, but the site reveals six sections plus seven gallery images
// plus the Hero's staged lines — roughly twenty elements, so roughly twenty
// observers, each with its own root/threshold bookkeeping and its own callback
// invocation. One observer with twenty targets is the same information for a
// fraction of the cost, and it is a fixed cost: adding a section adds a target,
// not an observer.
//
// The element -> callback mapping is a `WeakMap`, not a `Map`. A `Map` would
// hold a strong reference to every element ever revealed, so a detached node
// (the envelope's subtree after the gate opens, or any conditionally rendered
// section) could not be collected while this module is alive. Entries are also
// deleted explicitly on reveal and on unmount, so the `WeakMap` is a safety net
// rather than the primary cleanup path.
// ============================================================================

import { useEffect, useRef, useState } from 'react'

import { useMotion } from '../motion/context.js'

/**
 * Observer options, per the design.
 *
 * `rootMargin`'s -10% bottom inset shrinks the observation box up from the
 * bottom edge, so an element counts as intersecting slightly *before* it is
 * fully in view. The 700ms transition is therefore already settling as the
 * element arrives at a comfortable reading position, instead of starting from
 * zero opacity once it is centred.
 *
 * `threshold: 0.15` means a tall section reveals once about a sixth of it is
 * inside that box, rather than waiting for its top edge alone (threshold 0) or
 * for the whole thing (threshold 1, which never fires for an element taller
 * than the viewport).
 */
const OBSERVER_OPTIONS = {
  threshold: 0.15,
  rootMargin: '0px 0px -10% 0px',
}

/**
 * The one observer, created on first use. `null` until then.
 *
 * Deliberately NOT created at module load. This module is imported by every
 * revealing section, so a top-level `new IntersectionObserver(...)` would throw
 * on import in any non-DOM runtime — a prerender pass, a Node-side smoke test,
 * or a test file that imports a component purely to read a constant off it.
 * Lazy creation also means the reduced-motion path can honestly claim that no
 * observer exists: nothing constructs one, so there is nothing to disable.
 *
 * Lifetime note for tests: created once and then kept for the life of the
 * module, which is the whole point in a browser but means a test that stubs
 * `IntersectionObserver` must install its stub BEFORE the first render that
 * reveals anything. A stub installed later is ignored, because the instance
 * built from the earlier global is still here. Vitest reuses the module across
 * tests in a file, so the constructed-instance count is per file, not per test.
 *
 * @type {IntersectionObserver | null}
 */
let sharedObserver = null

/**
 * element -> "you are visible now" callback.
 * @type {WeakMap<Element, () => void>}
 */
const revealCallbacks = new WeakMap()

/**
 * `true` when the environment implements `IntersectionObserver`.
 *
 * Read at call time rather than captured at module scope: jsdom ships no
 * `IntersectionObserver`, and a test that installs a stub does so after this
 * module has been imported. A cached answer would be permanently wrong for one
 * of the two.
 */
function hasIntersectionObserver() {
  return typeof IntersectionObserver === 'function'
}

/**
 * The shared observer's callback.
 *
 * Unobserves before invoking the reveal callback, so the element is out of the
 * observer's set regardless of what the callback does. The observer's target
 * set therefore only ever shrinks as the visitor scrolls down the page.
 *
 * @param {IntersectionObserverEntry[]} entries
 * @param {IntersectionObserver} [observer] the instance, as passed by the DOM
 */
function handleEntries(entries, observer) {
  // Fall back to the module singleton: a hand-rolled test stub is not obliged
  // to pass itself as the second argument, and this is the only observer there
  // could be either way.
  const instance = observer ?? sharedObserver

  for (const entry of entries) {
    if (!entry.isIntersecting) continue

    const onReveal = revealCallbacks.get(entry.target)
    revealCallbacks.delete(entry.target)
    instance?.unobserve(entry.target)
    onReveal?.()
  }
}

/**
 * Start observing `element`, creating the shared observer if this is the first
 * caller.
 *
 * @param {Element} element
 * @param {() => void} onReveal invoked once, on first intersection
 * @returns {(() => void) | null} an unregister function, or `null` if the
 *   environment has no `IntersectionObserver` and nothing was registered
 */
function observeOnce(element, onReveal) {
  if (!hasIntersectionObserver()) return null

  sharedObserver ??= new IntersectionObserver(handleEntries, OBSERVER_OPTIONS)

  revealCallbacks.set(element, onReveal)
  sharedObserver.observe(element)

  return () => {
    revealCallbacks.delete(element)
    sharedObserver?.unobserve(element)
  }
}

/**
 * Reveal an element the first time it scrolls into view.
 *
 * ```jsx
 * const [ref, isVisible] = useScrollReveal()
 * return <section ref={ref} className={isVisible ? 'reveal reveal--visible' : 'reveal'} />
 * ```
 *
 * Most callers should use `<Reveal>` rather than this hook directly; the hook is
 * exported for the cases where the revealing element cannot be a wrapper (an
 * `<img>` inside a fixed grid cell, say).
 *
 * **Cost.** Exactly one `setState` per element, once, for the lifetime of the
 * page — which is what 12.4 asks for. There is no scroll listener here at all;
 * the parallax layer owns the only one on the site.
 *
 * **Under reduced motion** (read through `useMotion()`, never `matchMedia` — see
 * the rule comment in `src/motion/MotionContext.jsx`) this returns
 * `[ref, true]` on the first render and registers nothing, so the element is
 * mounted in its final state and no observer is ever constructed (10.6).
 *
 * **Without `IntersectionObserver`** the hook also reports visible immediately
 * rather than throwing or leaving content permanently at `opacity: 0`. jsdom
 * implements no `IntersectionObserver`, so this is the path a component test
 * takes unless it installs a stub: content is revealed, which is the right
 * default for a test asserting that text or an image is present. It is equally
 * the right default in a real browser too old to support the API — content
 * visible beats content invisible.
 *
 * @returns {[import('react').RefObject<Element | null>, boolean]} the ref to
 *   attach, and whether the element should be in its revealed state
 */
export function useScrollReveal() {
  const reducedMotion = useMotion()
  const ref = useRef(null)
  const [hasIntersected, setHasIntersected] = useState(false)

  useEffect(() => {
    // No observer, no listener, no work. The early return is the whole of
    // 10.6's obligation for this hook.
    if (reducedMotion) return

    const element = ref.current
    if (!element) return

    // The returned unregister function (or `undefined` when the environment
    // has no IntersectionObserver) becomes the effect cleanup, so unmounting
    // drops the element from the observer's set and from the WeakMap.
    return observeOnce(element, () => {
      setHasIntersected(true)
    }) ?? undefined
  }, [reducedMotion])

  // Composed at render time on purpose. Resolving the reduced-motion and
  // unsupported-API cases into `hasIntersected` from inside the effect would be
  // a synchronous `setState` in an effect body, which
  // `react-hooks/set-state-in-effect` rejects under the React Compiler rules
  // this project lints with — correctly, since a value derivable during render
  // has no business being state at all. The observer callback still calls
  // `setHasIntersected`, but that fires from a DOM event rather than from the
  // effect body, which is exactly the distinction the rule draws.
  const isVisible = reducedMotion || !hasIntersectionObserver() || hasIntersected

  return [ref, isVisible]
}
