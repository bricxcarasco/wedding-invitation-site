// Reduced-motion universal property test — task 8.1.
//
// Requirements: 1.8, 2.5, 4.7, 5.3, 6.8, 10.6.
//
// Feature: wedding-invitation-website, Property 8: For any section of the Main_Invitation and for the Envelope_Gate, when the reduced-motion preference is set to reduce, no rendered element carries a pre-animation state — no non-final opacity, no non-identity transform, no pending reveal class — and no ambient particle element, parallax offset, or hover scale transform is applied anywhere in the tree.
//
// **Validates: Requirements 1.8, 2.5, 4.7, 5.3, 6.8, 10.6**
//
// WHY THIS IS NOT AN `fc.assert`. The property is quantified over "every
// section of the Main_Invitation and the Envelope_Gate", not over generated
// data — the only "input" is the reduced-motion boolean, which is fixed at
// `true` for the whole property. So the universal quantifier is expressed by
// enumerating the sections (the eight section ids plus the footer landmark and
// the envelope) and asserting the invariant holds for each. That IS the "for
// any section" in the property statement; a fast-check generator would add
// randomness where the property has none.
//
// HOW THE TREE REACHES REDUCED MOTION. `renderWithMotion(<App/>, { reducedMotion
// : true })` sets the media query before mount; `App` calls `useReducedMotion`
// once and publishes the value through `MotionProvider`, so the whole tree —
// envelope first, then the revealed sections — runs the real reduced-motion
// policy. No component is wrapped or stubbed.

import { act } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { renderWithMotion } from './helpers.js'
import App from '../App.jsx'

// The open timings from App. The reduced path advances after 250ms; the full
// path after 3400ms (OPEN_MS). `openGate` waits past whichever applies so
// MainInvitation mounts.
const OPEN_MS_REDUCED = 250
const OPEN_MS_FULL = 3400

// Every Main_Invitation section id, in scroll order, plus the enumeration the
// property quantifies over. The footer is a `<footer>` landmark (no id), and the
// envelope is the gate `<main>`; both are named here so the "every section"
// quantifier is explicit rather than implied.
const SECTION_IDS = [
  'hero',
  'countdown',
  'details',
  'our-story',
  'gallery',
  'venue',
  'dress-code',
  'rsvp',
]

/**
 * Advance real DOM + React through the reduced-motion open so MainInvitation is
 * mounted. Uses the actual timer (no fake timers) wrapped in `act`, because the
 * open is a single `setTimeout` in App and a short real wait keeps the test
 * closer to the shipped behaviour than a fake clock would.
 */
async function openGate(container, { reducedMotion = true } = {}) {
  const button = container.querySelector('button[aria-label="Open your invitation"]')
  expect(button, 'the envelope should render its single open button').not.toBeNull()

  // App's open timer is 250ms under reduce and 3400ms otherwise; wait past the
  // one that applies to this render's motion mode so the phase reaches 'open'.
  const openMs = reducedMotion ? OPEN_MS_REDUCED : OPEN_MS_FULL

  await act(async () => {
    button.click()
    await new Promise((r) => setTimeout(r, openMs + 50))
  })
}

/**
 * Assert no element within `root` carries a pending reveal: every element with
 * the `reveal` class also carries `reveal--visible`. Under reduce (and, in
 * jsdom, under the no-IntersectionObserver fallback) an element is never left
 * stuck at its pre-reveal opacity/transform.
 */
function assertNoPendingReveal(root, label) {
  const pending = [...root.querySelectorAll('.reveal:not(.reveal--visible)')]
  expect(
    pending.length,
    `${label}: ${pending.length} element(s) carry .reveal without .reveal--visible`,
  ).toBe(0)
}

/**
 * Assert no `reveal-delay-N` stagger class appears within `root`. Reveal omits
 * delay classes under reduce, so a stagger class would be a trace of a pending
 * animation.
 */
function assertNoStaggerClass(root, label) {
  const staggered = [...root.querySelectorAll('[class]')].filter((el) =>
    /(^|\s)reveal-delay-\d+(\s|$)/.test(el.getAttribute('class') || ''),
  )
  expect(
    staggered.length,
    `${label}: found reveal-delay-N stagger class on ${staggered.length} element(s)`,
  ).toBe(0)
}

/**
 * Assert no `.parallax-layer` within `root` carries a `--parallax-y` inline
 * value. `useParallax` writes nothing under reduce, so the custom property is
 * never set.
 */
function assertNoParallaxOffset(root, label) {
  for (const layer of root.querySelectorAll('.parallax-layer')) {
    const value = layer.style.getPropertyValue('--parallax-y')
    expect(
      value,
      `${label}: a .parallax-layer has --parallax-y="${value}" under reduce`,
    ).toBe('')
  }
}

describe('Property 8: reduced motion leaves every section in its final visual state', () => {
  it('renders the Envelope_Gate with no ambient particle element under reduce', () => {
    const { container } = renderWithMotion(<App />, { reducedMotion: true })

    // The gate is the envelope <main>. Under reduce the mote field and every
    // .ambient span are omitted entirely — not hidden, absent (1.8).
    const ambient = container.querySelectorAll('.ambient')
    expect(ambient.length, 'the envelope should render zero .ambient particles under reduce').toBe(
      0,
    )

    // And there is no pending reveal or parallax offset in the gate either.
    assertNoPendingReveal(container, 'Envelope_Gate')
    assertNoParallaxOffset(container, 'Envelope_Gate')
  })

  it('holds the invariant for every Main_Invitation section once the gate opens', async () => {
    const { container } = renderWithMotion(<App />, { reducedMotion: true })

    await openGate(container)

    // MainInvitation is now mounted: the <main> landmark exists and the gate
    // button is gone.
    const main = container.querySelector('main')
    expect(main, 'MainInvitation should be mounted after the reduced-motion open').not.toBeNull()
    expect(
      container.querySelector('button[aria-label="Open your invitation"]'),
      'the envelope button should be unmounted after the reveal',
    ).toBeNull()

    // ------------------------------------------------------------------
    // The universal quantifier: assert the invariant per enumerated section.
    // ------------------------------------------------------------------
    for (const id of SECTION_IDS) {
      const section = container.querySelector(`#${id}`)
      expect(section, `section #${id} should be present in the revealed tree`).not.toBeNull()

      assertNoPendingReveal(section, `#${id}`)
      assertNoStaggerClass(section, `#${id}`)

      // No ambient particle belongs anywhere in the Main_Invitation either.
      expect(
        section.querySelectorAll('.ambient').length,
        `#${id}: no .ambient particle should appear under reduce`,
      ).toBe(0)
    }

    // The footer landmark (a section of the invitation with no id).
    const footer = container.querySelector('footer')
    expect(footer, 'the footer landmark should be present').not.toBeNull()
    assertNoPendingReveal(footer, 'footer')
    assertNoStaggerClass(footer, 'footer')

    // ------------------------------------------------------------------
    // Whole-tree invariants, stated once over the entire rendered document.
    // ------------------------------------------------------------------
    assertNoPendingReveal(container, 'whole tree')
    assertNoStaggerClass(container, 'whole tree')

    // No ambient particle anywhere in the revealed tree (6.8, 1.8).
    expect(
      container.querySelectorAll('.ambient').length,
      'no .ambient particle should exist anywhere under reduce',
    ).toBe(0)

    // The parallax layer exists (10.3 still renders it) but carries no offset:
    // useParallax attaches nothing and writes no --parallax-y under reduce.
    expect(
      container.querySelectorAll('.parallax-layer').length,
      'the single decorative parallax layer should still render',
    ).toBeGreaterThan(0)
    assertNoParallaxOffset(container, 'whole tree')
  })

  // A light contrast check. The reveal--visible state is NOT motion-gated in
  // jsdom: with no IntersectionObserver, useScrollReveal reports visible
  // immediately in BOTH motion modes, so reveal--visible is present either way
  // and is not a useful discriminator here. What IS genuinely motion-gated and
  // observable in jsdom: the ambient particles in the gate, and the stagger
  // delay classes. Those are what this check contrasts, keeping it deliberately
  // small per the task.
  it('contrast: full motion renders ambient particles and stagger classes the reduced path omits', async () => {
    // --- Full motion: the gate renders ambient particles. ---
    const full = renderWithMotion(<App />, { reducedMotion: false })
    expect(
      full.container.querySelectorAll('.ambient').length,
      'full motion should render ambient particles in the gate',
    ).toBeGreaterThan(0)

    await openGate(full.container, { reducedMotion: false })

    // Full motion applies stagger delay classes somewhere in the revealed tree
    // (Hero's staged lines, the gallery grid, the detail cards).
    const staggeredFull = [...full.container.querySelectorAll('[class]')].filter((el) =>
      /(^|\s)reveal-delay-\d+(\s|$)/.test(el.getAttribute('class') || ''),
    )
    expect(
      staggeredFull.length,
      'full motion should apply at least one reveal-delay-N stagger class',
    ).toBeGreaterThan(0)

    full.unmount()

    // --- Reduced motion: both are absent (already asserted in detail above;
    //     restated here as the other half of the contrast). ---
    const reduced = renderWithMotion(<App />, { reducedMotion: true })
    expect(
      reduced.container.querySelectorAll('.ambient').length,
      'reduced motion should render no ambient particles',
    ).toBe(0)

    await openGate(reduced.container)
    assertNoStaggerClass(reduced.container, 'reduced-motion contrast')
    reduced.unmount()
  })
})
