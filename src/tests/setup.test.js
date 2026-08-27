// Harness smoke test. Everything later in the plan depends on the matchers
// being registered and on the matchMedia shim being both readable and
// controllable, so those two facts are asserted here rather than discovered as a
// confusing failure inside a component test.
import { describe, expect, it, vi } from 'vitest'

import { REDUCED_MOTION_QUERY, setReducedMotion } from './helpers.js'

describe('test harness', () => {
  it('registers the jest-dom matchers', () => {
    const el = document.createElement('p')
    el.textContent = 'harness'
    document.body.append(el)

    // A jest-dom matcher, not a built-in Vitest one.
    expect(el).toBeInTheDocument()
    expect(el).toHaveTextContent('harness')

    el.remove()
    expect(el).not.toBeInTheDocument()
  })

  it('exposes matchMedia and defaults reduced motion to not-reduced', () => {
    expect(typeof window.matchMedia).toBe('function')

    const mql = window.matchMedia(REDUCED_MOTION_QUERY)
    expect(mql.matches).toBe(false)
    expect(mql.media).toBe(REDUCED_MOTION_QUERY)
    expect(typeof mql.addEventListener).toBe('function')
    expect(typeof mql.removeEventListener).toBe('function')
    expect(typeof mql.addListener).toBe('function')
    expect(typeof mql.removeListener).toBe('function')
    expect(typeof mql.dispatchEvent).toBe('function')
  })

  it('flips matches and notifies change listeners when the preference is set', () => {
    const mql = window.matchMedia(REDUCED_MOTION_QUERY)
    const modern = vi.fn()
    const legacy = vi.fn()
    mql.addEventListener('change', modern)
    mql.addListener(legacy)

    setReducedMotion(true)

    expect(mql.matches).toBe(true)
    expect(modern).toHaveBeenCalledTimes(1)
    expect(legacy).toHaveBeenCalledTimes(1)
    expect(modern.mock.calls[0][0]).toMatchObject({
      type: 'change',
      matches: true,
      media: REDUCED_MOTION_QUERY,
    })

    // Setting the same value again is not a change, so nothing fires.
    setReducedMotion(true)
    expect(modern).toHaveBeenCalledTimes(1)

    setReducedMotion(false)
    expect(mql.matches).toBe(false)
    expect(modern).toHaveBeenCalledTimes(2)
    expect(modern.mock.calls[1][0].matches).toBe(false)
  })

  it('stops notifying a removed listener', () => {
    const mql = window.matchMedia(REDUCED_MOTION_QUERY)
    const listener = vi.fn()
    mql.addEventListener('change', listener)
    mql.removeEventListener('change', listener)

    setReducedMotion(true)

    expect(mql.matches).toBe(true)
    expect(listener).not.toHaveBeenCalled()
  })

  it('resets the preference between tests', () => {
    // The previous test left reduced motion on. If the reset hooks did not run,
    // this fails — which is the leak the harness is meant to prevent.
    expect(window.matchMedia(REDUCED_MOTION_QUERY).matches).toBe(false)
  })
})
