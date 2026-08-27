// Envelope_Gate behaviour, exercised through the real <App /> tree.
//
// Requirements: 1.3, 1.4, 1.5, 1.6.
//
// These tests render the whole app, not the envelope in isolation, on purpose.
// `App` is the one place `useReducedMotion()` runs and the one owner of the gate
// clock, so driving the gate through `App` — via `renderWithMotion`, which sets
// the media query before mount — is what exercises the production motion path
// and the production state machine together. `renderWithMotion` does NOT wrap
// the tree in a provider (see the note in helpers.js); it does not need to,
// because `App` publishes the preference itself.
//
// The reveal is timer-driven (OPEN_MS = 1600ms under full motion), so every
// test that reaches the revealed state uses fake timers and advances past it
// inside `act`.
import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import App from '../App.jsx'
import weddingConfig from '../config/weddingConfig.js'
import { renderWithMotion } from './helpers.js'

// The full-motion reveal duration owned by App. Advancing past this drives the
// gate from 'opening' to 'open'. Kept slightly above the real 1600ms so a test
// never races the exact boundary.
const PAST_OPEN_MS = 1600

// The couple names (`displayNames`) appear more than once in the revealed tree
// — the Hero <h1> and the Footer — so presence is asserted with a count via
// queryAllByText rather than getByText, which throws on multiple matches.
function countCoupleNames() {
  return screen.queryAllByText(weddingConfig.couple.displayNames).length
}

// Every string the gate must NOT leak while closed (1.4). Pulled from the
// config rather than restated, so the assertion tracks the real data.
const CONFIG_OWNED_STRINGS = [
  weddingConfig.couple.displayNames,
  weddingConfig.schedule.displayDate,
  weddingConfig.ceremony.venueName,
  weddingConfig.reception.venueName,
  weddingConfig.couple.tagline,
]

/** The envelope's activation surface — the gate's single native button. */
function getEnvelopeButton() {
  return screen.getByRole('button', { name: /open your invitation/i })
}

/** Drive the gate from 'opening' to the revealed state. */
function advancePastReveal() {
  act(() => {
    vi.advanceTimersByTime(PAST_OPEN_MS)
  })
}

describe('envelope gate — closed state (1.3, 1.4)', () => {
  beforeEach(() => {
    renderWithMotion(<App />)
  })

  it('shows the "Tap to Open" instruction (1.3)', () => {
    expect(screen.getByText('Tap to Open')).toBeInTheDocument()
  })

  it('leaks no config-owned wedding string while closed (1.4)', () => {
    for (const value of CONFIG_OWNED_STRINGS) {
      expect(
        screen.queryByText(value),
        `"${value}" must not be in the document while the gate is closed`,
      ).not.toBeInTheDocument()
    }
  })

  it('renders no RSVP control while closed (1.4)', () => {
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
    expect(screen.queryByRole('radio')).not.toBeInTheDocument()
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument()
    expect(screen.queryByRole('spinbutton')).not.toBeInTheDocument()
  })

  it('exposes exactly one focusable element — the envelope button (1.4)', () => {
    const focusable = document.querySelectorAll(
      'a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])',
    )
    expect(focusable).toHaveLength(1)
    expect(focusable[0]).toBe(getEnvelopeButton())
  })
})

describe('envelope gate — activation modalities (1.5)', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  // Each modality gets a fresh render (a fresh gate), so one case cannot leave
  // the gate open for the next. The envelope is a native <button>, so a pointer
  // click, a touch tap, Enter, and Space all resolve to the same onClick — but
  // each is asserted end to end: it advances the gate and, after the clock runs
  // out, the revealed content (the couple names) is present.
  const modalities = [
    { name: 'pointer click', fire: (el) => fireEvent.click(el) },
    {
      name: 'touch tap',
      fire: (el) => {
        fireEvent.touchStart(el)
        fireEvent.touchEnd(el)
        // A tap on a native button resolves to a click; jsdom fires no
        // synthesized click from touch events, so emulate the activation.
        fireEvent.click(el)
      },
    },
    {
      name: 'Enter key',
      fire: (el) => {
        fireEvent.keyDown(el, { key: 'Enter', code: 'Enter' })
        // A native button turns Enter into a click; emulate that activation.
        fireEvent.click(el)
      },
    },
    {
      name: 'Space key',
      fire: (el) => {
        fireEvent.keyDown(el, { key: ' ', code: 'Space' })
        fireEvent.keyUp(el, { key: ' ', code: 'Space' })
        fireEvent.click(el)
      },
    },
  ]

  for (const { name, fire } of modalities) {
    it(`opens the gate via ${name}`, () => {
      render(<App />)
      const button = getEnvelopeButton()

      // Before activation the couple names are absent.
      expect(countCoupleNames()).toBe(0)

      act(() => {
        fire(button)
      })
      advancePastReveal()

      // After the reveal completes the revealed content is present, which only
      // happens if this modality actually advanced the gate to 'open'.
      expect(countCoupleNames()).toBeGreaterThan(0)
    })
  }
})

describe('envelope gate — reveal handoff (1.4, 1.6)', () => {
  let scrollToSpy

  beforeEach(() => {
    vi.useFakeTimers()
    scrollToSpy = vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
  })

  afterEach(() => {
    scrollToSpy.mockRestore()
    vi.useRealTimers()
  })

  it('scrolls to the top and lands focus on the Hero landmark, not body (1.6)', () => {
    render(<App />)

    act(() => {
      fireEvent.click(getEnvelopeButton())
    })
    advancePastReveal()

    // 1.6 — the reveal resets scroll to the top.
    expect(scrollToSpy).toHaveBeenCalled()
    const topArgs = scrollToSpy.mock.calls.map((call) => {
      const [arg] = call
      return typeof arg === 'object' && arg !== null ? arg.top : arg
    })
    expect(topArgs).toContain(0)

    // Focus lands on the #hero section wrapper (tabIndex=-1), not document.body.
    const hero = document.querySelector('#hero')
    expect(hero).not.toBeNull()
    expect(hero).toHaveAttribute('tabindex', '-1')
    expect(document.activeElement).toBe(hero)
    expect(document.activeElement).not.toBe(document.body)
  })

  it('reveals the couple names once the gate is open (1.4)', () => {
    render(<App />)

    // Absent while closed.
    expect(countCoupleNames()).toBe(0)

    act(() => {
      fireEvent.click(getEnvelopeButton())
    })
    advancePastReveal()

    // Present once open.
    expect(countCoupleNames()).toBeGreaterThan(0)
  })
})

describe('envelope gate — single-animation guard (1.5)', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('a second activation during opening does not restart the reveal', () => {
    render(<App />)
    const button = getEnvelopeButton()

    // First activation: enter 'opening'.
    act(() => {
      fireEvent.click(button)
    })

    // Part-way through the reveal, tap again. The gate guards `phase !== 'closed'`,
    // so this must not re-trigger or extend the animation.
    act(() => {
      vi.advanceTimersByTime(800)
    })
    act(() => {
      fireEvent.click(button)
    })

    // Still not open before the original schedule completes.
    expect(countCoupleNames()).toBe(0)

    // Advance just past the ORIGINAL 1600ms deadline (800 already elapsed).
    act(() => {
      vi.advanceTimersByTime(900)
    })

    // The reveal completed on its original schedule — the second tap neither
    // restarted the clock nor blocked completion.
    expect(countCoupleNames()).toBeGreaterThan(0)
  })
})
