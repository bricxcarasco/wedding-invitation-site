// The gate state machine and the single source of the Reduced_Motion_Preference.
//
// Requirements: 1.4, 1.5, 1.8, 10.6.
//
// This is the ONE place `useReducedMotion()` is called (see the rule comment in
// `src/motion/MotionContext.jsx`). The value is published to the tree through
// `MotionProvider value={reduced}`; every other component reads it via
// `useMotion()` and no other module touches `matchMedia`.
//
// `App` owns the gate clock. `phase` is a one-way three-state machine:
//
//   'closed'  → the Envelope_Gate at rest (InvitationEnvelope, MainInvitation NOT built)
//   'opening' → the one-shot reveal is playing (InvitationEnvelope, MainInvitation NOT built)
//   'open'    → the reveal is done (InvitationEnvelope unmounted, MainInvitation mounted)
//
// There is no close path and no persistence across reloads; nothing in the
// requirements asks for either.

import { useEffect, useState } from 'react'

import { MotionProvider } from './motion/MotionContext.jsx'
import { useReducedMotion } from './hooks/useReducedMotion.js'
import InvitationEnvelope from './components/InvitationEnvelope.jsx'
import { MainInvitation } from './components/MainInvitation.jsx'

// Full opening animation. A slow, smooth three-beat "letter slides out" score
// in InvitationEnvelope.css: flap opens gently, letter rises clear of the
// pocket, then the scene fades. The envelope CSS is timed to finish just under
// this. (Above the 1200–2500ms band req 1.5 names as the minimum-acceptable
// range, deliberately, for a more graceful reveal.)
const OPEN_MS = 3400

// Reduced-motion cross-fade. Inside the ≤300ms band of requirement 1.8, and the
// motion-off policy of 10.6.
const OPEN_MS_REDUCED = 250

export default function App() {
  // The single site-wide read of the preference (10.6). Published below.
  const reduced = useReducedMotion()
  const [phase, setPhase] = useState('closed')

  useEffect(() => {
    // The timer only runs during the reveal. Every other phase is a resting
    // state with no clock.
    if (phase !== 'opening') return

    // The whole timing difference between full motion and reduced motion lives
    // in this one branch: a 1600ms reveal (1.5) or a 250ms cross-fade (1.8).
    const ms = reduced ? OPEN_MS_REDUCED : OPEN_MS

    // The `setPhase` fires asynchronously from the timer callback, so this is
    // not a synchronous `setState` in an effect body — nothing for
    // `react-hooks/set-state-in-effect` to flag. `clearTimeout` cancels a
    // still-pending reveal if the effect re-runs (e.g. the preference flips
    // mid-animation) or the component unmounts.
    const id = setTimeout(() => setPhase('open'), ms)
    return () => clearTimeout(id)
  }, [phase, reduced])

  // Belt and braces alongside the envelope's own guard: only 'closed' → 'opening'
  // is ever taken here, so a stray activation cannot restart or reverse the reveal.
  function handleOpen() {
    setPhase((current) => (current === 'closed' ? 'opening' : current))
  }

  return (
    <MotionProvider value={reduced}>
      {/* Requirement 1.4 — MainInvitation is genuinely NOT CONSTRUCTED until
          the reveal completes. This is a one-or-the-other conditional: exactly
          one of the two components exists in the tree at any moment, and the
          wedding content is never rendered-then-hidden. MainInvitation mounts
          at the 'opening' → 'open' edge, so it stays absent during the opening
          animation itself. */}
      {phase !== 'open' ? (
        <InvitationEnvelope phase={phase} onOpen={handleOpen} />
      ) : (
        <MainInvitation />
      )}
    </MotionProvider>
  )
}
