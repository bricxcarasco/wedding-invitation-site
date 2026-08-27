// The site's only scroll listener.
//
// Requirements: 10.3 (a parallax depth effect on at least one background layer),
// 10.6 (no parallax under `reduce`), 12.4 (drive continuous animation with
// transform/opacity or rAF, never per-frame React state), 12.5 (scroll-driven
// work throttled to at most once per animation frame).
//
// The whole point of this hook is what it does NOT do: it never calls
// `setState`. The offset is written straight onto a DOM node as the CSS custom
// property `--parallax-y`, which `.parallax-layer` in `src/index.css` consumes
// through `transform: translate3d(0, var(--parallax-y, 0px), 0)`. Scrolling
// therefore produces zero React renders and zero layout — one compositor-only
// property on one node. That is the line 12.4 draws, and a `useState` here would
// cross it on every frame of every scroll.

import { useEffect, useRef } from 'react'

import { useMotion } from '../motion/context.js'

/**
 * How far the layer drifts per pixel scrolled.
 *
 * Deliberately small. This is an elegant wedding invitation, not a parallax
 * demo: at `0.06` a 1000px scroll moves the background 60px, which reads as
 * depth without ever announcing itself or racing the content it sits behind.
 * `ParallaxLayer` is sized with enough overscan to absorb this drift.
 */
export const DEFAULT_PARALLAX_FACTOR = 0.06

/**
 * The CSS custom property `.parallax-layer` reads its translation from.
 * Declared here because this hook is the only writer.
 */
export const PARALLAX_PROPERTY = '--parallax-y'

/**
 * Attach a rAF-throttled parallax offset to one element.
 *
 * Returns a ref to put on the element that carries `.parallax-layer`. Nothing
 * else is returned, because there is nothing for React to re-render on.
 *
 * ## Under reduced motion
 *
 * No listener is attached, no frame is scheduled, and nothing is written — the
 * effect returns before touching the DOM (10.6). The ref still comes back, so
 * the caller's markup is unchanged and the element simply sits still.
 *
 * A stale `--parallax-y` left over from before the visitor flipped the OS
 * setting mid-visit is deliberately *not* cleared. It cannot have any effect:
 * the global reduced-motion block in `src/index.css` forces
 * `.parallax-layer { transform: none !important }`, so the custom property has
 * no consumer while `reduce` is active. Removing it would mean writing to the
 * DOM on the path whose entire contract is "writes nothing".
 *
 * ## Resize
 *
 * No `resize` listener, on purpose. The offset is a pure function of
 * `window.scrollY`, and every way `scrollY` can change — user scroll, anchor
 * navigation, `scrollTo`, and the clamping a browser applies when a viewport
 * grows past the end of the document — dispatches `scroll`. A resize that does
 * not move `scrollY` cannot change the correct offset, so a second listener
 * would buy nothing but another callback to budget against 12.5.
 *
 * ## Initial write on mount
 *
 * One frame is scheduled on mount, before any scroll event. Without it a page
 * restored mid-scroll — a reload with the browser's scroll restoration, or a
 * back navigation — would fall back to `var(--parallax-y, 0px)` and render the
 * layer un-offset until the visitor happened to scroll, a visible jump. The
 * initial paint runs through the identical rAF path as every later one, so
 * there is one write site and one formula, not two.
 *
 * @param {number} [factor] pixels of drift per pixel scrolled; defaults to
 *   {@link DEFAULT_PARALLAX_FACTOR}. Pass a negative value to drift the other
 *   way.
 * @returns {import('react').RefObject<HTMLElement | null>}
 */
export function useParallax(factor = DEFAULT_PARALLAX_FACTOR) {
  const ref = useRef(null)
  const reducedMotion = useMotion()

  // Normalised during render, not inside the effect, so it is a stable
  // primitive in the dependency array below. A caller handing over `NaN` would
  // otherwise produce `translate3d(0, NaNpx, 0)`, which is invalid at
  // computed-value time and would drop the transform entirely.
  const depth = Number.isFinite(factor) ? factor : DEFAULT_PARALLAX_FACTOR

  useEffect(() => {
    // 10.6 — the reduced-motion path attaches nothing and writes nothing.
    if (reducedMotion) return

    // Non-DOM environment. Effects do not run during a server render, so this
    // is belt and braces rather than a live code path; it costs one comparison
    // and means the module cannot throw if it is ever pulled into a prerender.
    if (typeof window === 'undefined') return

    // No rAF (a very old browser, or a test environment that has not shimmed
    // it). There is no acceptable fallback: a `setTimeout` loop or an unthrottled
    // write inside the scroll handler would both break 12.5's once-per-frame
    // bound. So the effect declines to animate and the layer stays static,
    // which is the same visual outcome as reduced motion.
    if (typeof window.requestAnimationFrame !== 'function') return

    const node = ref.current
    if (!node) return

    // 0 is never a valid handle returned by requestAnimationFrame, so it doubles
    // as "no frame pending" without a second boolean.
    let frame = 0

    // Starts true so the mount paint below has something to do. See the
    // "Initial write on mount" note above.
    let dirty = true

    /**
     * The single write site. Runs at most once per animation frame.
     */
    const paint = () => {
      frame = 0
      if (!dirty) return
      dirty = false
      node.style.setProperty(PARALLAX_PROPERTY, `${window.scrollY * depth}px`)
    }

    /**
     * Request a frame unless one is already pending.
     *
     * This guard IS the throttle 12.5 asks for: however many scroll events fire
     * between two frames, they collapse into the one rAF that is already in
     * flight, and it reads `window.scrollY` once when it runs. The `dirty` flag
     * is the other half — it keeps a frame that has nothing new to say from
     * touching the DOM at all.
     */
    const schedule = () => {
      if (frame !== 0) return
      frame = window.requestAnimationFrame(paint)
    }

    const handleScroll = () => {
      dirty = true
      schedule()
    }

    // `passive: true` promises the browser this handler will never call
    // `preventDefault`, which lets it composite the scroll without waiting on
    // JavaScript. A non-passive scroll listener on `window` is one of the
    // classic ways to make a page feel like it stutters on a phone (12.5).
    const listenerOptions = { passive: true }
    window.addEventListener('scroll', handleScroll, listenerOptions)

    schedule()

    return () => {
      window.removeEventListener('scroll', handleScroll, listenerOptions)
      if (frame !== 0 && typeof window.cancelAnimationFrame === 'function') {
        window.cancelAnimationFrame(frame)
      }
      frame = 0
    }
  }, [reducedMotion, depth])

  return ref
}
