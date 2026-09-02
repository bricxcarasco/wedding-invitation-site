// Countdown_Timer lifecycle, exercised through the real <Countdown /> component.
//
// Requirements: 3.2 (recompute at ≤1000ms with no interaction or reload),
// 3.4 (enter the Post_Wedding_State within one tick of the Ceremony_Datetime),
// 3.7 (clear the recurring timer on unmount).
//
// `Countdown` wraps its body in `Reveal`, which calls `useMotion()`, so it must
// be mounted under a `MotionProvider` — `renderWithMotion` deliberately does not
// add one. All timing is driven with fake timers plus a controlled system clock:
// `useCountdown` owns the only `Date.now()` read, and under fake timers
// `Date.now()` follows `vi.setSystemTime`, so setting the clock and advancing
// timers together is enough to drive every branch deterministically.
import { act, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { Countdown } from '../components/Countdown.jsx'
import { MotionProvider } from '../motion/MotionContext.jsx'

// A fixed "now" for the ticking tests. Any instant works; using a literal keeps
// the target arithmetic below easy to read.
const NOW_MS = Date.parse('2026-01-01T00:00:00+08:00')

function renderCountdown(props = {}) {
  return render(
    <MotionProvider value={false}>
      <Countdown {...props} />
    </MotionProvider>,
  )
}

/** The current seconds cell text, or null in the post-wedding state. */
function readSeconds() {
  // Each unit column renders a circular badge (label lives beneath the badge)
  // then the label. "Seconds" is the fourth and final unit. Grab the digits
  // sitting in the badge within the same column.
  const label = screen.queryByText('Seconds')
  if (!label) return null
  const column = label.parentElement
  // The number is the last <span> in the badge; querySelectorAll returns them
  // in document order, so the trailing one carrying the tabular-nums digits is
  // the value. It is the only span with `tabular-nums`.
  const digits = column.querySelector('span.tabular-nums')
  return digits.textContent
}

describe('countdown timer lifecycle (3.2, 3.7)', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(NOW_MS)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('recomputes the seconds value once a second (3.2)', () => {
    // Target well in the future so the pre-ceremony units render and only the
    // seconds change as the clock advances.
    const targetMs = NOW_MS + 90 * 24 * 60 * 60 * 1000

    renderCountdown({ targetMs })

    const readings = [readSeconds()]

    // Advance three whole seconds, one tick at a time, moving the system clock
    // in lock-step so each recompute sees a new "now".
    for (let i = 0; i < 3; i += 1) {
      act(() => {
        vi.setSystemTime(NOW_MS + (i + 1) * 1000)
        vi.advanceTimersByTime(1000)
      })
      readings.push(readSeconds())
    }

    // Each successive reading differs from the one before it — the display is
    // genuinely recomputing on the interval, not frozen at the first frame.
    for (let i = 1; i < readings.length; i += 1) {
      expect(readings[i]).not.toBe(readings[i - 1])
    }
  })

  it('keeps exactly one interval alive across several ticks (3.2, 3.7)', () => {
    const targetMs = NOW_MS + 90 * 24 * 60 * 60 * 1000

    renderCountdown({ targetMs })

    // Exactly one timer is registered while mounted.
    expect(vi.getTimerCount()).toBe(1)

    // It stays at one across ticks — the interval is not torn down and
    // recreated each second (the effect depends on isPast/targetMs, not the
    // per-second numbers).
    for (let i = 0; i < 4; i += 1) {
      act(() => {
        vi.setSystemTime(NOW_MS + (i + 1) * 1000)
        vi.advanceTimersByTime(1000)
      })
      expect(vi.getTimerCount()).toBe(1)
    }
  })

  it('clears the interval on unmount (3.7)', () => {
    const targetMs = NOW_MS + 90 * 24 * 60 * 60 * 1000

    const { unmount } = renderCountdown({ targetMs })
    expect(vi.getTimerCount()).toBe(1)

    act(() => {
      unmount()
    })

    // No timer survives the unmount.
    expect(vi.getTimerCount()).toBe(0)
  })
})

describe('countdown timer — crossing the ceremony instant (3.4)', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('enters the post-wedding state within one tick of the target passing (3.4)', () => {
    // Start just before the target: the ceremony is 500ms away, so the
    // pre-ceremony units render on first paint.
    const startMs = Date.parse('2027-02-13T11:00:00+08:00') - 500
    const targetMs = startMs + 500

    vi.setSystemTime(startMs)
    renderCountdown({ targetMs })

    // The heading is always present — it is now the section's permanent title,
    // not a post-wedding swap-in.
    expect(screen.getByText('And so, our forever begins.')).toBeInTheDocument()

    // Pre-ceremony: the four ticking unit labels are present.
    for (const label of ['Days', 'Hours', 'Minutes', 'Seconds']) {
      expect(screen.getByText(label)).toBeInTheDocument()
    }

    // Advance one tick past the target. The next interval callback sees a
    // system clock at or beyond the ceremony instant.
    act(() => {
      vi.setSystemTime(targetMs + 100)
      vi.advanceTimersByTime(1000)
    })

    // Post_Wedding_State: the heading remains, but the ticking unit badges are
    // gone — the units are removed from the DOM, not hidden.
    expect(screen.getByText('And so, our forever begins.')).toBeInTheDocument()
    for (const label of ['Days', 'Hours', 'Minutes', 'Seconds']) {
      expect(screen.queryByText(label)).not.toBeInTheDocument()
    }
  })
})
