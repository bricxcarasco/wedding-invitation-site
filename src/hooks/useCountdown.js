// The Countdown_Timer tick.
//
// Requirements: 3.2 (recompute at <=1000ms without interaction or reload),
// 3.4 (enter Post_Wedding_State within 1000ms of the Ceremony_Datetime),
// 3.6 (the Ceremony_Datetime is a single editable value, defaulted here from
// CEREMONY_MS), 3.7 (clear the recurring timer on unmount).
//
// This hook owns the only `Date.now()` read in the countdown feature. Every
// value it returns comes from `simpleBreakdown`, whose math is a pure function
// of its arguments (see `src/lib/countdown.js`); keeping the clock here is what
// makes that module testable.
//
// The display shows four units — Days, Hours, Minutes, Seconds — so it uses
// `simpleBreakdown` (total days, no months) rather than the calendar-month
// `breakdown`. Days therefore counts up past 30.

import { useEffect, useState } from 'react'

import { CEREMONY_MS, simpleBreakdown } from '../lib/countdown.js'

/**
 * The live remaining-time breakdown to `targetMs`, recomputed once a second.
 *
 * @param {number} [targetMs] the instant counted toward; the Ceremony_Datetime
 *   by default (3.6).
 * @returns {{isPast: true} | {isPast: false, days: number, hours: number, minutes: number, seconds: number}}
 *   the same shape `simpleBreakdown` returns; callers branch on `isPast`.
 */
export function useCountdown(targetMs = CEREMONY_MS) {
  // Lazy initialiser: the first breakdown is computed *during* the initial
  // render, so the component never paints an empty or zeroed frame before the
  // first tick lands.
  const [state, setState] = useState(() => simpleBreakdown(Date.now(), targetMs))

  useEffect(() => {
    // Nothing left to tick toward once the ceremony has passed. The early
    // return means the interval below is never created in the post state.
    if (state.isPast) return

    // Exactly one interval exists at a time. The effect depends only on
    // `state.isPast` and `targetMs`, NOT on the per-second numbers, so a
    // seconds change does not tear the interval down and recreate it. The
    // timer is created once on mount, and once more only at the pre-to-post
    // transition — where this effect re-runs, clears the old interval, and
    // takes the early return above.
    //
    // The `setState` here runs inside the interval callback, which is async
    // relative to render, so `react-hooks/set-state-in-effect` (React Compiler)
    // is satisfied — there is no synchronous setState in the effect body.
    const id = setInterval(() => {
      setState(simpleBreakdown(Date.now(), targetMs))
    }, 1000)

    // Runs on unmount and on every re-run, so 3.7 holds unconditionally.
    return () => clearInterval(id)
  }, [state.isPast, targetMs])

  return state
}