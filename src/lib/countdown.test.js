// Example tests for `countdown.js` — the concrete cases.
//
// The property tests in `countdown.property.test.js` state what must hold for
// every instant. This file states what must hold for the specific instants that
// break naive implementations, with expected values worked out by hand from the
// calendar rather than read off the implementation. A regression that keeps the
// properties satisfied while quietly changing an answer — a dropped clamp, an
// off-by-one in the month correction, a `<` where `<=` belongs — shows up here.
//
// Requirements: 3.1 (five consistent units), 3.4 (the boundary at exactly the
// Ceremony_Datetime is post-wedding).
import { describe, expect, it } from 'vitest'

import { CEREMONY_MS, breakdown, simpleBreakdown } from './countdown.js'

/**
 * An instant written as a `+08:00` civil time, which is the frame every figure
 * in this file is reasoned about in.
 *
 * `Date.parse` on an offset-bearing string resolves the offset at parse time, so
 * this is host-timezone-independent and does not restate the module's own
 * offset arithmetic — the fixtures are built by a different route than the code
 * under test.
 */
function pht(iso) {
  const ms = Date.parse(`${iso}+08:00`)
  if (!Number.isFinite(ms)) throw new Error(`unparseable fixture instant: ${iso}`)
  return ms
}

/** The full five-unit shape, so a missing or extra key fails rather than passes. */
function expectUnits(result, { months, days, hours, minutes, seconds }) {
  expect(result).toEqual({ isPast: false, months, days, hours, minutes, seconds })
}

describe('CEREMONY_MS', () => {
  it('is the epoch value of 2027-02-13T11:00:00+08:00', () => {
    // The design names this number outright. Asserting the literal — rather than
    // re-deriving it from the same config string the module reads — is what
    // catches an accidental edit to CEREMONY_DATETIME that still parses.
    expect(CEREMONY_MS).toBe(1802487600000)
  })

  it('is 2027-02-13T03:00:00Z, the same instant expressed in UTC', () => {
    expect(CEREMONY_MS).toBe(Date.UTC(2027, 1, 13, 3, 0, 0))
  })
})

describe('breakdown — the post-wedding boundary (3.4)', () => {
  it('is post-wedding at exactly the Ceremony_Datetime', () => {
    // `targetMs - nowMs === 0` takes the `<= 0` branch. This single case is the
    // whole of requirement 3.4's "reaches or passes".
    expect(breakdown(CEREMONY_MS)).toEqual({ isPast: true })
  })

  it('is not post-wedding one millisecond before the Ceremony_Datetime', () => {
    // 1ms of remaining time is still remaining time. All five units read zero
    // because the sub-second remainder is truncated by the floor-division in
    // step 5 — the countdown displays 0s for the final second, which is correct
    // and is not the same thing as having entered the Post_Wedding_State.
    expectUnits(breakdown(CEREMONY_MS - 1), {
      months: 0,
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
    })
  })

  it('is post-wedding one millisecond after the Ceremony_Datetime', () => {
    expect(breakdown(CEREMONY_MS + 1)).toEqual({ isPast: true })
  })

  it('reports nothing but `isPast` once the wedding has passed', () => {
    // The design's contract is that the two return shapes are distinguishable by
    // `isPast` alone, with no stale numbers riding along behind it.
    expect(Object.keys(breakdown(CEREMONY_MS + 86400000))).toEqual(['isPast'])
  })

  it('stays post-wedding far past the Ceremony_Datetime', () => {
    expect(breakdown(pht('2030-06-01T00:00:00'))).toEqual({ isPast: true })
  })
})

describe('breakdown — month-end clamping (3.1)', () => {
  // Every expected value below is derived from the calendar, not from running the
  // code: the anchor is `now` shifted forward by whole months with the
  // day-of-month clamped to the shorter month, and the remainder is counted off
  // the anchor.
  it.each([
    // Jan 31 → Feb 28 in a non-leap year. The answer that matters: one whole
    // month with nothing left over. A naive `days = floor(total / 86400000)`
    // implementation reports `months 0, days 28`, which is the bug this case
    // exists to catch.
    {
      label: 'Jan 31 → Feb 28, non-leap year',
      now: '2027-01-31T00:00:00',
      target: '2027-02-28T00:00:00',
      expected: { months: 1, days: 0, hours: 0, minutes: 0, seconds: 0 },
    },
    // Same shape in a leap year: Jan 31 clamps to Feb 29, which is the last day
    // of the month, so again nothing is left over.
    {
      label: 'Jan 31 → Feb 29, leap year',
      now: '2028-01-31T00:00:00',
      target: '2028-02-29T00:00:00',
      expected: { months: 1, days: 0, hours: 0, minutes: 0, seconds: 0 },
    },
    // Jan 29 → Feb 28 in a non-leap year: 29 clamps to 28, the last day, so the
    // remainder is again zero even though the day-of-month changed.
    {
      label: 'Jan 29 → Feb 28, non-leap year',
      now: '2027-01-29T00:00:00',
      target: '2027-02-28T00:00:00',
      expected: { months: 1, days: 0, hours: 0, minutes: 0, seconds: 0 },
    },
    // Jan 29 → Feb 29 in a leap year: no clamping needed, exact month.
    {
      label: 'Jan 29 → Feb 29, leap year',
      now: '2028-01-29T00:00:00',
      target: '2028-02-29T00:00:00',
      expected: { months: 1, days: 0, hours: 0, minutes: 0, seconds: 0 },
    },
    // Feb 29 as the *origin*: the leap day plus one month is Mar 29.
    {
      label: 'Feb 29 → Mar 29, leap year origin',
      now: '2028-02-29T00:00:00',
      target: '2028-03-29T00:00:00',
      expected: { months: 1, days: 0, hours: 0, minutes: 0, seconds: 0 },
    },
    // The anchor clamps and then days accumulate off the clamped anchor:
    // Jan 31 + 1 month → Feb 28; Feb 28 + 30 days → Mar 30. Two whole months
    // would land on Mar 31, past the target, so the correction loop must step
    // back to one. Independently checked: Feb 28 00:00 +08 plus 30 × 86 400 000
    // ms is Mar 30 00:00 +08.
    {
      label: 'Jan 31 → Mar 30, anchor clamps to Feb 28 then 30 days',
      now: '2026-01-31T00:00:00',
      target: '2026-03-30T00:00:00',
      expected: { months: 1, days: 30, hours: 0, minutes: 0, seconds: 0 },
    },
    // One day short of the clamped anchor, so the month is given up entirely and
    // the whole span becomes days: Jan 31 → Feb 27 is 27 days.
    {
      label: 'Jan 31 → Feb 27, correction loop gives up the month',
      now: '2026-01-31T00:00:00',
      target: '2026-02-27T00:00:00',
      expected: { months: 0, days: 27, hours: 0, minutes: 0, seconds: 0 },
    },
    // One day past the clamped anchor.
    {
      label: 'Jan 31 → Mar 1, one day past the clamped anchor',
      now: '2026-01-31T00:00:00',
      target: '2026-03-01T00:00:00',
      expected: { months: 1, days: 1, hours: 0, minutes: 0, seconds: 0 },
    },
    // Two whole months, both endpoints on the 31st, so no clamping survives.
    {
      label: 'Jan 31 → Mar 31, two whole months',
      now: '2026-01-31T00:00:00',
      target: '2026-03-31T00:00:00',
      expected: { months: 2, days: 0, hours: 0, minutes: 0, seconds: 0 },
    },
    // Two consecutive clamps: Dec 31 + 1 month → Jan 31, + 1 more → Feb 28.
    {
      label: 'Dec 31 → Feb 28, two months across a year boundary',
      now: '2026-12-31T00:00:00',
      target: '2027-02-28T00:00:00',
      expected: { months: 2, days: 0, hours: 0, minutes: 0, seconds: 0 },
    },
  ])('$label', ({ now, target, expected }) => {
    expectUnits(breakdown(pht(now), pht(target)), expected)
  })
})

describe('breakdown — 30/31-day month transitions (3.1)', () => {
  it.each([
    // 31-day month into a 30-day month: the day clamps down and the span is
    // exactly one month.
    {
      label: 'Mar 31 → Apr 30, 31-day into 30-day',
      now: '2026-03-31T00:00:00',
      target: '2026-04-30T00:00:00',
      expected: { months: 1, days: 0, hours: 0, minutes: 0, seconds: 0 },
    },
    {
      label: 'Aug 31 → Sep 30, 31-day into 30-day',
      now: '2026-08-31T00:00:00',
      target: '2026-09-30T00:00:00',
      expected: { months: 1, days: 0, hours: 0, minutes: 0, seconds: 0 },
    },
    // The asymmetry that makes this arithmetic non-obvious: the reverse
    // direction is *not* a whole month. Apr 30 + 1 month is May 30, so May 31
    // is one month and one day away. Compare with the Mar 31 → Apr 30 row
    // above, which is one month exactly. Month subtraction is not symmetric,
    // and that is correct.
    {
      label: 'Apr 30 → May 31, 30-day into 31-day is one month and a day',
      now: '2026-04-30T00:00:00',
      target: '2026-05-31T00:00:00',
      expected: { months: 1, days: 1, hours: 0, minutes: 0, seconds: 0 },
    },
    {
      label: 'Sep 30 → Oct 31, 30-day into 31-day is one month and a day',
      now: '2026-09-30T00:00:00',
      target: '2026-10-31T00:00:00',
      expected: { months: 1, days: 1, hours: 0, minutes: 0, seconds: 0 },
    },
    // July and August are both 31 days and adjacent, the one place in the
    // calendar where two long months meet.
    {
      label: 'Jul 31 → Aug 31, adjacent 31-day months',
      now: '2026-07-31T00:00:00',
      target: '2026-08-31T00:00:00',
      expected: { months: 1, days: 0, hours: 0, minutes: 0, seconds: 0 },
    },
    // A full year across every month length, ending on the same civil date.
    {
      label: 'Feb 13 → Feb 13 the following year is twelve months exactly',
      now: '2025-02-13T14:00:00',
      target: '2026-02-13T14:00:00',
      expected: { months: 12, days: 0, hours: 0, minutes: 0, seconds: 0 },
    },
  ])('$label', ({ now, target, expected }) => {
    expectUnits(breakdown(pht(now), pht(target)), expected)
  })
})

describe('breakdown — mixed units against the Ceremony_Datetime', () => {
  // These count toward the real Ceremony_Datetime, 2027-02-13 11:00 +08:00, and
  // therefore also exercise the default `targetMs` parameter. Every expected
  // figure was worked out from the calendar and then confirmed by an
  // independent `Date.UTC` computation of anchor + remainder === target.
  it.each([
    // Two whole months would reach Feb 25 06:30:15, past the target, so the
    // correction loop steps back to one: anchor Jan 25 06:30:15.
    // Jan 25 → Feb 13 is 6 days to the end of January plus 13 into February,
    // 19 days; 06:30:15 → 11:00:00 is 4h 29m 45s.
    {
      label: '2026-12-25 06:30:15 → 1 month, 19 days, 4:29:45',
      now: '2026-12-25T06:30:15',
      expected: { months: 1, days: 19, hours: 4, minutes: 29, seconds: 45 },
    },
    // Exactly six calendar months earlier, same civil time of day, so the
    // remainder is empty. Aug 13 → Feb 13 spans months of 31, 30, 31, 30, 31
    // and 31 days, which plain division could never render as a whole 6.
    {
      label: '2026-08-13 11:00:00 → 6 months exactly',
      now: '2026-08-13T11:00:00',
      expected: { months: 6, days: 0, hours: 0, minutes: 0, seconds: 0 },
    },
    // A month behind but at a later time of day, so the month is given up and
    // the span becomes days: Jan 13 12:30 → Feb 13 12:30 is 31 days, and the
    // target is 1h 30m before that, leaving 30 days 22h 30m.
    {
      label: '2027-01-13 12:30:00 → 0 months, 30 days, 22:30:00',
      now: '2027-01-13T12:30:00',
      expected: { months: 0, days: 30, hours: 22, minutes: 30, seconds: 0 },
    },
    // Same civil day as the wedding: 08:23:45.678 → 11:00:00.000 is
    // 2h 36m 14.322s. The 322ms tail is truncated, so seconds reads 14.
    {
      label: 'the wedding morning → 0 months, 0 days, 2:36:14 (322ms truncated)',
      now: '2027-02-13T08:23:45.678',
      expected: { months: 0, days: 0, hours: 2, minutes: 36, seconds: 14 },
    },
    // One second out.
    {
      label: 'one second before the ceremony → seconds 1',
      now: '2027-02-13T10:59:59',
      expected: { months: 0, days: 0, hours: 0, minutes: 0, seconds: 1 },
    },
    // One minute out.
    {
      label: 'one minute before the ceremony → minutes 1',
      now: '2027-02-13T10:59:00',
      expected: { months: 0, days: 0, hours: 0, minutes: 1, seconds: 0 },
    },
    // The previous civil day at the same time: February 2027 has 28 days and
    // this crosses no month boundary, so it is a plain 1 day.
    {
      label: 'the day before the ceremony → days 1',
      now: '2027-02-12T11:00:00',
      expected: { months: 0, days: 1, hours: 0, minutes: 0, seconds: 0 },
    },
  ])('$label', ({ now, expected }) => {
    expectUnits(breakdown(pht(now)), expected)
  })

  it('defaults targetMs to the Ceremony_Datetime', () => {
    // 3.6: the target is read from Wedding_Config, so the default and the
    // explicit argument must be the same instant.
    const now = pht('2025-11-05T07:15:30')
    expect(breakdown(now)).toEqual(breakdown(now, CEREMONY_MS))
  })
})

describe('breakdown — carry thresholds on a hand-built duration', () => {
  it('never reports 24 hours, 60 minutes or 60 seconds', () => {
    // 1 day less 1ms before the target. A carry bug shows up as `days 0,
    // hours 24` or `hours 23, minutes 60`; the correct reading is the largest
    // value each unit can hold.
    expectUnits(breakdown(CEREMONY_MS - 86400000 + 1), {
      months: 0,
      days: 0,
      hours: 23,
      minutes: 59,
      seconds: 59,
    })
  })

  it('reports a full day rather than 24 hours', () => {
    expectUnits(breakdown(CEREMONY_MS - 86400000), {
      months: 0,
      days: 1,
      hours: 0,
      minutes: 0,
      seconds: 0,
    })
  })
})

describe('simpleBreakdown — four-unit total-days breakdown', () => {
  const MS_PER_DAY = 86400000
  const MS_PER_HOUR = 3600000
  const MS_PER_MINUTE = 60000
  const MS_PER_SECOND = 1000

  it('splits a 2d 3h 4m 5s gap into exactly those units', () => {
    const target = pht('2026-01-01T00:00:00')
    const now =
      target - (2 * MS_PER_DAY + 3 * MS_PER_HOUR + 4 * MS_PER_MINUTE + 5 * MS_PER_SECOND)
    expect(simpleBreakdown(now, target)).toEqual({
      isPast: false,
      days: 2,
      hours: 3,
      minutes: 4,
      seconds: 5,
    })
  })

  it('is post-wedding at exactly the target (3.4)', () => {
    // Same inclusive boundary as `breakdown`: at the instant itself, isPast.
    expect(simpleBreakdown(CEREMONY_MS, CEREMONY_MS)).toEqual({ isPast: true })
  })

  it('is post-wedding one millisecond past the target', () => {
    expect(simpleBreakdown(CEREMONY_MS + 1, CEREMONY_MS)).toEqual({ isPast: true })
  })

  it('lets days exceed 30 — a 300-day gap reads days: 300, not rolled into months', () => {
    const target = pht('2027-01-01T00:00:00')
    const now = target - 300 * MS_PER_DAY
    expect(simpleBreakdown(now, target)).toEqual({
      isPast: false,
      days: 300,
      hours: 0,
      minutes: 0,
      seconds: 0,
    })
  })

  it('defaults targetMs to the Ceremony_Datetime (3.6)', () => {
    const now = pht('2025-11-05T07:15:30')
    expect(simpleBreakdown(now)).toEqual(simpleBreakdown(now, CEREMONY_MS))
  })
})
