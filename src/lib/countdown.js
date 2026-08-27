// Countdown time arithmetic — pure functions, no React, no side effects.
//
// The current instant is never read inside this module. `breakdown` takes it as
// a parameter, which is what makes the countdown properties testable: the caller
// (the `useCountdown` hook) owns `Date.now()`, and every function here is a
// deterministic function of its arguments.
//
// Requirements: 3.1 (five consistent units), 3.3 (timezone-anchored to +08:00),
// 3.4 (the boundary at exactly the Ceremony_Datetime is post-wedding),
// 3.6 (the Ceremony_Datetime comes from Wedding_Config as one editable value).

import { CEREMONY_DATETIME } from '../config/weddingConfig.js'

/**
 * The Ceremony_Datetime as a single epoch-millisecond integer: 1802498400000.
 *
 * `Date.parse` resolves the `+08:00` offset at parse time, so this value is
 * identical in every runtime regardless of the host timezone (3.3, 3.6).
 */
export const CEREMONY_MS = Date.parse(CEREMONY_DATETIME)

/**
 * Philippine Standard Time's offset from UTC, in milliseconds.
 *
 * A fixed constant rather than a `Intl.DateTimeFormat` timezone lookup, and
 * that is exact rather than approximate: PHT has observed no daylight saving
 * since 1978 and has a permanent `+08:00` offset. A fixed shift is also far
 * cheaper than an ICU lookup and carries no locale-dependent behaviour.
 */
const PHT_OFFSET_MS = 8 * 60 * 60 * 1000

/**
 * Civil (year, month, day, …) fields of an instant, as seen in `+08:00`.
 *
 * The instant is shifted into the PHT frame and then read back with `getUTC*`
 * getters only. No local-time getter (`getFullYear`, `getMonth`, `getHours`, …)
 * is ever called, so the host timezone never enters the computation (3.3).
 *
 * @param {number} epochMs
 * @returns {{y: number, m: number, d: number, h: number, mi: number, s: number, ms: number}}
 *   `m` is zero-based, matching the `Date` convention.
 */
function phtFields(epochMs) {
  const d = new Date(epochMs + PHT_OFFSET_MS)
  return {
    y: d.getUTCFullYear(),
    m: d.getUTCMonth(),
    d: d.getUTCDate(),
    h: d.getUTCHours(),
    mi: d.getUTCMinutes(),
    s: d.getUTCSeconds(),
    ms: d.getUTCMilliseconds(),
  }
}

/**
 * Inverse of `phtFields`: civil fields in `+08:00` back to an epoch instant.
 *
 * Built from `Date.UTC`, which is timezone-free, then shifted back out of the
 * PHT frame.
 *
 * @param {{y: number, m: number, d: number, h: number, mi: number, s: number, ms: number}} fields
 * @returns {number}
 */
function phtEpoch({ y, m, d, h, mi, s, ms }) {
  return Date.UTC(y, m, d, h, mi, s, ms) - PHT_OFFSET_MS
}

/**
 * Number of days in civil month `m` (zero-based) of year `y`.
 *
 * Day 0 of month `m + 1` is the last day of month `m`. Read with `getUTCDate`
 * on a `Date.UTC` value, so again no local-time getter.
 */
const DAYS_IN_MONTH = (y, m) => new Date(Date.UTC(y, m + 1, 0)).getUTCDate()

/**
 * Add `n` whole calendar months to an instant in the PHT frame, clamping the
 * day-of-month to the length of the target month.
 *
 * Clamping is what keeps Months and Days consistent: 2025-01-31 + 1 month is
 * 2025-02-28, never 2025-03-03. `Date.UTC` would happily roll the overflow
 * forward into March, so the day is clamped before it is handed over.
 *
 * Time-of-day fields are carried across unchanged.
 *
 * @param {number} epochMs
 * @param {number} n whole months to add
 * @returns {number}
 */
function addMonthsPht(epochMs, n) {
  const f = phtFields(epochMs)
  const total = f.y * 12 + f.m + n
  const y = Math.floor(total / 12)
  const m = total - y * 12
  return phtEpoch({ ...f, y, m, d: Math.min(f.d, DAYS_IN_MONTH(y, m)) })
}

const MS_PER_DAY = 86400000
const MS_PER_HOUR = 3600000
const MS_PER_MINUTE = 60000
const MS_PER_SECOND = 1000

/**
 * The remaining time from `nowMs` to `targetMs`, as whole calendar months plus
 * a days/hours/minutes/seconds remainder.
 *
 * Returns `{ isPast: true }` once `nowMs` reaches or passes `targetMs`, and
 * `{ isPast: false, months, days, hours, minutes, seconds }` before that. The
 * two cases are exhaustive and mutually exclusive, so callers can branch on
 * `isPast` alone.
 *
 * Days are the remainder *after* whole calendar months are removed, not an
 * independent floor of the total duration — which is why this needs civil
 * arithmetic in the `+08:00` frame rather than plain division. Doing the month
 * arithmetic in the visitor's frame instead would let two visitors observing
 * the same instant see different month counts.
 *
 * Two facts make the final split exact:
 *
 *   1. PHT has observed no daylight saving since 1978 and has a permanent
 *      `+08:00` offset, so a civil day in the PHT frame is *always* exactly
 *      86,400,000 ms. There is no 23- or 25-hour day to skew `days`.
 *   2. The residual is strictly less than the length of the month following the
 *      month-anchor, so `days` can never reach a value that should have been
 *      counted as another month.
 *
 * Every unit is non-negative by construction: the `isPast` early return removes
 * the negative-total case; the correction loop clamps `months` at zero from
 * below and at `targetMs` from above, so the residual is `>= 0`; and
 * floor-division of a non-negative residual yields non-negative parts.
 *
 * @param {number} nowMs the observing instant, in epoch milliseconds
 * @param {number} [targetMs] the instant counted toward; the Ceremony_Datetime
 *   by default
 * @returns {{isPast: true} | {isPast: false, months: number, days: number, hours: number, minutes: number, seconds: number}}
 */
export function breakdown(nowMs, targetMs = CEREMONY_MS) {
  // Step 1. The only place the post-wedding decision is made. `<= 0` rather
  // than `< 0` puts the boundary at *exactly* the Ceremony_Datetime on the
  // post-wedding side (3.4).
  if (targetMs - nowMs <= 0) return { isPast: true }

  // Step 2. Estimate whole months from the civil fields in the +08:00 frame.
  const n = phtFields(nowMs)
  const t = phtFields(targetMs)
  let months = (t.y - n.y) * 12 + (t.m - n.m)

  // Step 3. Correct downward. The estimate overshoots by at most one, because a
  // calendar-month difference of k never spans less time than k whole months
  // minus one — but this is a `while` rather than a single decrement so that
  // day-of-month clamping cannot leave the count wrong. The `months > 0` guard
  // means it cannot drive the count below zero.
  while (months > 0 && addMonthsPht(nowMs, months) > targetMs) months -= 1

  // Step 4. Post-condition of step 3: addMonthsPht(nowMs, months) <= targetMs,
  // so the residual is non-negative.
  let residual = targetMs - addMonthsPht(nowMs, months)

  // Step 5. Successive floor-division of the residual.
  const days = Math.floor(residual / MS_PER_DAY)
  residual -= days * MS_PER_DAY
  const hours = Math.floor(residual / MS_PER_HOUR)
  residual -= hours * MS_PER_HOUR
  const minutes = Math.floor(residual / MS_PER_MINUTE)
  residual -= minutes * MS_PER_MINUTE
  const seconds = Math.floor(residual / MS_PER_SECOND)

  return { isPast: false, months, days, hours, minutes, seconds }
}

/**
 * A four-unit breakdown — total days, hours, minutes, seconds — for a countdown
 * that does not roll days up into months. Days is the whole number of 24-hour
 * days in the remaining duration, so it can exceed 30 (e.g. 300+ days out).
 *
 * This is a separate, simpler function from `breakdown` on purpose: `breakdown`
 * does civil-calendar month arithmetic in the +08:00 frame and its properties
 * depend on that; this one is plain division of the elapsed milliseconds. A
 * civil day in PHT is always exactly 86,400,000 ms (no DST since 1978), so
 * dividing the raw difference by MS_PER_DAY gives an exact day count with no
 * timezone dependence — the same reason `breakdown`'s day split is exact.
 *
 * @param {number} nowMs the observing instant, in epoch milliseconds
 * @param {number} [targetMs] the instant counted toward; the Ceremony_Datetime
 *   by default
 * @returns {{isPast: true} | {isPast: false, days: number, hours: number, minutes: number, seconds: number}}
 */
export function simpleBreakdown(nowMs, targetMs = CEREMONY_MS) {
  // Same inclusive boundary as `breakdown` (3.4): at or past the ceremony is
  // post-wedding.
  if (targetMs - nowMs <= 0) return { isPast: true }

  let residual = targetMs - nowMs
  const days = Math.floor(residual / MS_PER_DAY)
  residual -= days * MS_PER_DAY
  const hours = Math.floor(residual / MS_PER_HOUR)
  residual -= hours * MS_PER_HOUR
  const minutes = Math.floor(residual / MS_PER_MINUTE)
  residual -= minutes * MS_PER_MINUTE
  const seconds = Math.floor(residual / MS_PER_SECOND)

  return { isPast: false, days, hours, minutes, seconds }
}