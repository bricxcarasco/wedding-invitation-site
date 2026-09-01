// External-link safety sweep (requirement 4.6).
//
// Requirement 4.6 asks that every link opening in a new tab carries
// rel="noopener noreferrer". Rather than assert this against the two known
// Venue links in isolation, this test renders the WHOLE revealed tree and
// sweeps every `<a target="_blank">` in the document. That way a link added by
// any later section is covered automatically: the moment a new-tab link ships
// without both rel tokens, this test fails, with no edit here required.
//
// The tree is reached the way a guest reaches it — through the Envelope_Gate.
// `App` starts at phase 'closed' (InvitationEnvelope only; MainInvitation is
// genuinely not constructed, per 1.4). Activating the envelope moves it to
// 'opening', and a timer in `App` advances it to 'open' after OPEN_MS (3400ms)
// at which point MainInvitation — and therefore Venue with its map links — is
// mounted. Fake timers let us cross that 3400ms deterministically.
//
// Motion context needs no wrapper here: `App` owns the single
// `useReducedMotion()` call and publishes it through MotionProvider, so
// rendering `<App />` supplies the context to the whole tree by itself.
import { act, fireEvent, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import App from '../App.jsx'
import { renderWithMotion } from './helpers.js'

// Matches App's OPEN_MS. A little slack past 3400ms guarantees the reveal timer
// has fired regardless of any rounding.
const OPEN_MS = 3400

/**
 * Render `<App />`, open the envelope, and run the reveal clock past OPEN_MS so
 * MainInvitation (and every section, Venue included) is mounted.
 */
function openInvitation() {
  renderWithMotion(<App />)

  const openButton = screen.getByRole('button', { name: /open your invitation/i })
  fireEvent.click(openButton)

  // The gate advances 'opening' -> 'open' on a setTimeout in App. Drive it.
  act(() => {
    vi.advanceTimersByTime(OPEN_MS + 100)
  })
}

describe('external links open safely (requirement 4.6)', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders the revealed tree with at least the two venue links', () => {
    openInvitation()

    // Guard against a vacuous pass: if the reveal never happened, there would
    // be zero anchors and every assertion below would trivially hold. The two
    // Venue map links must be present.
    const newTabLinks = Array.from(
      document.querySelectorAll('a[target="_blank"]'),
    )

    expect(
      newTabLinks.length,
      'expected the revealed tree to contain at least the two venue map links',
    ).toBeGreaterThanOrEqual(2)
  })

  it('gives every target="_blank" link both noopener and noreferrer', () => {
    openInvitation()

    const newTabLinks = Array.from(
      document.querySelectorAll('a[target="_blank"]'),
    )

    // Sweep the entire tree, not just the venue links, so links added by later
    // sections are covered by this same assertion.
    for (const link of newTabLinks) {
      const rel = (link.getAttribute('rel') ?? '')
        .toLowerCase()
        .split(/\s+/)
        .filter(Boolean)

      const href = link.getAttribute('href') ?? '(no href)'

      expect(
        rel,
        `link to ${href} opens in a new tab but its rel is missing "noopener"`,
      ).toContain('noopener')
      expect(
        rel,
        `link to ${href} opens in a new tab but its rel is missing "noreferrer"`,
      ).toContain('noreferrer')
    }
  })
})
