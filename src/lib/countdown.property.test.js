// Property tests for `countdown.js` — the design's Properties 1, 2 and 3.
//
// The example tests in `countdown.test.js` pin down the specific instants that
// break naive month arithmetic. These state what must hold for *every* instant,
// over an input space that spans decades.
//
// A note on independence. Every reference computation below is built by a
// deliberately different route than the module under test:
//
//   - the `+08:00` civil fields come from `Intl.DateTimeFormat` with
//     `timeZone: 'Asia/Manila'`, i.e. from the ICU timezone database, rather
//     than from the module's hardcoded eight-hour shift. That also turns the
//     design's premise — that Philippine time is permanently `+08:00` — into
//     something the property asserts rather than assumes;
//   - month lengths come from a literal table plus the Gregorian leap rule,
//     rather than from `new Date(Date.UTC(y, m + 1, 0)).getUTCDate()`.
//
// A reference implementation that merely restated `countdown.js` would assert
// nothing, so the extra machinery is the point rather than incidental.
import { describe, expect, it } from 'vitest'
import fc from 'fast-check'

import { CEREMONY_MS, breakdown } from './countdown.js'

/** The design mandates 200 generated cases for the countdown properties. */
const NUM_RUNS = 200

const MS_PER_SECOND = 1000
const MS_PER_MINUTE = 60 * MS_PER_SECOND
const MS_PER_HOUR = 60 * MS_PER_MINUTE
const MS_PER_DAY = 24 * MS_PER_HOUR

/** Philippine Standard Time, named rather than numeric so ICU resolves it. */
const PHT_TIME_ZONE = 'Asia/Manila'
const PHT_OFFSET_MS = 8 * MS_PER_HOUR

/**
 * The floor of the generated instant range.
 *
 * The Philippines last observed daylight saving in 1990, so from 2000 onward the
 * `Asia/Manila` offset is a flat `+08:00` and a civil day is exactly 86 400 000
 * ms — the fact the whole days/hours split rests on. The properties assert that
 * offset at each generated instant rather than trusting this comment, so moving
 * the floor back past 1990 would fail loudly instead of producing quiet nonsense.
 */
const RANGE_START_MS = Date.UTC(2000, 0, 1)

// ---------------------------------------------------------------------------
// Independent reference machinery
// ---------------------------------------------------------------------------

const phtFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: PHT_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
})

/**
 * Civil fields of an instant in Philippine time, resolved through the ICU
 * timezone database.
 *
 * `month` is zero-based to match `Date.UTC`. Sub-second precision is taken from
 * the epoch value directly: every IANA offset is a whole number of minutes, so
 * the millisecond-within-second is identical in every frame.
 */
function phtCivilFields(epochMs) {
  const parts = Object.fromEntries(
    phtFormatter.formatToParts(new Date(epochMs)).map((part) => [part.type, part.value]),
  )
  return {
    year: Number(parts.year),
    month: Number(parts.month) - 1,
    day: Number(parts.day),
    // `hourCycle: 'h23'` should never produce 24, but the modulo costs nothing
    // and removes a whole class of ICU-version surprise.
    hour: Number(parts.hour) % 24,
    minute: Number(parts.minute),
    second: Number(parts.second),
    millisecond: ((epochMs % MS_PER_SECOND) + MS_PER_SECOND) % MS_PER_SECOND,
  }
}

/** Philippine time's actual offset from UTC at an instant, per ICU. */
function phtOffsetMsAt(epochMs) {
  const c = phtCivilFields(epochMs)
  return (
    Date.UTC(c.year, c.month, c.day, c.hour, c.minute, c.second, c.millisecond) - epochMs
  )
}

const MONTH_LENGTHS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]

const isLeapYear = (year) => (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0

/** Month length from the Gregorian rule, not from a `Date` round-trip. */
const daysInMonth = (year, month) =>
  month === 1 && isLeapYear(year) ? 29 : MONTH_LENGTHS[month]

/**
 * Add whole calendar months to an instant in the Philippine civil frame,
 * clamping the day-of-month to the length of the destination month.
 *
 * This is the operation `breakdown` uses to place its month anchor. It is
 * rebuilt here because the module does not export it, and because a genuinely
 * separate implementation is what makes the round-trip below a check rather
 * than a restatement.
 */
function addPhtMonths(epochMs, monthsToAdd) {
  const c = phtCivilFields(epochMs)
  const totalMonths = c.year * 12 + c.month + monthsToAdd
  const year = Math.floor(totalMonths / 12)
  const month = totalMonths - year * 12
  const day = Math.min(c.day, daysInMonth(year, month))
  return (
    Date.UTC(year, month, day, c.hour, c.minute, c.second, c.millisecond) - PHT_OFFSET_MS
  )
}

/** Non-negative remainder, so the sub-second tail is never a negative number. */
const modMs = (value, modulus) => ((value % modulus) + modulus) % modulus

// ---------------------------------------------------------------------------
// Generators
// ---------------------------------------------------------------------------

/** Any instant strictly before the Ceremony_Datetime, spanning 26 years. */
const instantBeforeCeremony = fc.integer({
  min: RANGE_START_MS,
  max: CEREMONY_MS - 1,
})

/**
 * An instant built from `+08:00` civil fields rather than drawn uniformly from a
 * millisecond range.
 *
 * A uniform millisecond draw lands on the 29th, 30th or 31st of a month about a
 * tenth of the time and on a month *end* almost never, which leaves the
 * day-of-month clamp — the subtlest branch in the module — barely exercised.
 * Generating the civil fields directly and clamping `day` to the real length of
 * the drawn month puts days 28 through 31 in roughly four draws in thirty-one
 * each while keeping every generated value a genuine calendar date.
 */
const phtCivilInstant = fc
  .record({
    year: fc.integer({ min: 2000, max: 2040 }),
    month: fc.integer({ min: 0, max: 11 }),
    day: fc.integer({ min: 1, max: 31 }),
    hour: fc.integer({ min: 0, max: 23 }),
    minute: fc.integer({ min: 0, max: 59 }),
    second: fc.integer({ min: 0, max: 59 }),
    millisecond: fc.integer({ min: 0, max: 999 }),
  })
  .map(({ year, month, day, hour, minute, second, millisecond }) => {
    const clampedDay = Math.min(day, daysInMonth(year, month))
    return (
      Date.UTC(year, month, clampedDay, hour, minute, second, millisecond) - PHT_OFFSET_MS
    )
  })

/** Two distinct civil instants in order, as `[earlier, later]`. */
const orderedPhtInstantPair = fc
  .tuple(phtCivilInstant, phtCivilInstant)
  .filter(([a, b]) => a !== b)
  .map(([a, b]) => (a < b ? [a, b] : [b, a]))

/**
 * Offsets deliberately including the quarter- and half-hour zones, because a
 * whole-hour-only sample would not distinguish a correct implementation from one
 * that happens to work for whole-hour offsets.
 */
const HOST_OFFSET_MINUTES = [
  -720, -600, -480, -420, -360, -300, -270, -240, -210, -180, -120, -60, 0, 60, 120, 180, 210,
  240, 270, 300, 330, 345, 360, 390, 420, 480, 525, 540, 570, 600, 660, 720, 765, 780, 840,
]

const hostOffsetMinutes = fc.constantFrom(...HOST_OFFSET_MINUTES)

/** Offsets from the ceremony instant that a totality bug would hide behind. */
const BOUNDARY_OFFSETS_MS = [
  -400 * MS_PER_DAY,
  -30 * MS_PER_DAY,
  -MS_PER_DAY,
  -MS_PER_HOUR,
  -MS_PER_SECOND,
  -2,
  -1,
  0,
  1,
  2,
  MS_PER_SECOND,
  MS_PER_HOUR,
  MS_PER_DAY,
  30 * MS_PER_DAY,
  400 * MS_PER_DAY,
]

/** Instants on both sides of the boundary, at it, and a long way from it. */
const instantAnywhere = fc.oneof(
  { arbitrary: fc.integer({ min: RANGE_START_MS, max: Date.UTC(2040, 0, 1) }), weight: 2 },
  { arbitrary: fc.constantFrom(...BOUNDARY_OFFSETS_MS).map((d) => CEREMONY_MS + d), weight: 1 },
  { arbitrary: fc.integer({ min: -5000, max: 5000 }).map((d) => CEREMONY_MS + d), weight: 1 },
  { arbitrary: fc.constantFrom(Date.UTC(2200, 5, 1), Date.UTC(3000, 0, 1)), weight: 1 },
)

// ---------------------------------------------------------------------------
// Property 1
// ---------------------------------------------------------------------------

/**
 * The whole of Property 1, stated once, for an observing instant strictly before
 * a target instant.
 *
 * Written as a helper so the invariant has exactly one spelling and the two runs
 * below differ only in the input space they sample.
 */
function assertWellFormedBreakdown(nowMs, targetMs) {
  const result = breakdown(nowMs, targetMs)

  // The instant is strictly before the target, so this is the five-unit branch
  // by construction.
  expect(result.isPast).toBe(false)

  const { months, days, hours, minutes, seconds } = result

  // Integers, every one of them, none negative.
  for (const [unit, value] of Object.entries({ months, days, hours, minutes, seconds })) {
    expect(Number.isInteger(value), `${unit} should be an integer, got ${value}`).toBe(true)
    expect(value, `${unit} should be non-negative`).toBeGreaterThanOrEqual(0)
  }

  // Carry thresholds. Hours, minutes and seconds have fixed ones. Days does not
  // — calendar months are unequal — but 31 is a hard ceiling: consecutive month
  // anchors are at most 31 days apart (Feb 28 to Mar 31 is the widest gap the
  // day-of-month clamp can open), and the residual is strictly less than that
  // gap. A reported `days` of 31 or more would mean a whole month went
  // uncounted.
  expect(days, 'days should be below the widest possible month gap').toBeLessThanOrEqual(30)
  expect(hours, 'hours should carry into days at 24').toBeLessThanOrEqual(23)
  expect(minutes, 'minutes should carry into hours at 60').toBeLessThanOrEqual(59)
  expect(seconds, 'seconds should carry into minutes at 60').toBeLessThanOrEqual(59)

  // The premise the days/hours split rests on: Philippine time is a flat +08:00
  // across this whole span, so a civil day really is 86 400 000 ms. Checked
  // against ICU, not against the module.
  expect(phtOffsetMsAt(nowMs), 'Philippine offset at the observed instant').toBe(PHT_OFFSET_MS)
  expect(phtOffsetMsAt(targetMs), 'Philippine offset at the target').toBe(PHT_OFFSET_MS)

  // The month anchor, rebuilt independently. It must land between the observed
  // instant and the target.
  const anchorMs = addPhtMonths(nowMs, months)
  expect(phtOffsetMsAt(anchorMs), 'Philippine offset at the month anchor').toBe(PHT_OFFSET_MS)
  expect(
    anchorMs,
    'the month anchor should not precede the observed instant',
  ).toBeGreaterThanOrEqual(nowMs)
  expect(anchorMs, 'the month anchor should not pass the target').toBeLessThanOrEqual(targetMs)

  // The months figure is maximal: one more whole calendar month overshoots. This
  // is the other half of "days is a remainder, not another month".
  expect(
    addPhtMonths(nowMs, months + 1),
    'one more whole month should overshoot the target',
  ).toBeGreaterThan(targetMs)

  // The round trip. `breakdown` truncates the sub-second tail of the residual
  // when it floor-divides into whole seconds, so re-adding the five reported
  // units cannot land on the target instant itself unless the total remaining
  // duration happens to be a whole number of seconds. What holds exactly, for
  // every instant, is that it lands on the target floored to the second
  // *relative to the observed instant*.
  //
  // The discarded amount is `residual % 1000`, and that equals
  // `(target - now) % 1000`: the anchor carries the observed instant's
  // millisecond field unchanged and the +08:00 shift is a whole number of hours,
  // so the anchor is congruent to `now` modulo 1000.
  const truncatedSubSecondMs = modMs(targetMs - nowMs, MS_PER_SECOND)
  const readdedMs =
    anchorMs +
    days * MS_PER_DAY +
    hours * MS_PER_HOUR +
    minutes * MS_PER_MINUTE +
    seconds * MS_PER_SECOND

  expect(
    readdedMs,
    're-adding the five reported units should land on the target instant, ' +
      'less only the sub-second tail the breakdown truncates',
  ).toBe(targetMs - truncatedSubSecondMs)

  // And the truncation is bounded by one second, so the five units are a
  // faithful reading of the remaining time rather than merely self-consistent.
  expect(truncatedSubSecondMs).toBeLessThan(MS_PER_SECOND)
}

describe('Property 1: Countdown breakdown is well-formed', () => {
  // Feature: wedding-invitation-website, Property 1: For any instant strictly
  // before the Ceremony_Datetime, the countdown breakdown is well-formed — all
  // five units are non-negative integers, days/hours/minutes/seconds each sit
  // strictly below the next unit's carry threshold, and re-adding the reported
  // months, days, hours, minutes and seconds to that instant in the +08:00
  // calendar frame lands exactly on the Ceremony_Datetime.
  //
  // Validates: Requirements 3.1, 3.6
  it('reports five non-negative integer units that re-add to the Ceremony_Datetime', () => {
    fc.assert(
      fc.property(instantBeforeCeremony, (nowMs) => {
        // 3.6: the target is the Ceremony_Datetime read from Wedding_Config, so
        // this run goes through the default parameter rather than passing one.
        assertWellFormedBreakdown(nowMs, CEREMONY_MS)
        expect(breakdown(nowMs)).toEqual(breakdown(nowMs, CEREMONY_MS))
      }),
      { numRuns: NUM_RUNS },
    )
  })

  // The same invariant, over generated targets as well as generated instants.
  //
  // This is here because the run above cannot reach the day-of-month clamp, and
  // that is worth stating plainly rather than leaving as a coverage gap. The
  // Ceremony_Datetime falls on the 13th of February. The month anchor always
  // lands on the observed instant's own day-of-month in either January or
  // February 2027, and whenever that day is the 29th, 30th or 31st the clamped
  // February anchor (the 28th) overshoots the 13th, so the correction loop steps
  // back to January — where no clamping applies. The clamp is therefore
  // unreachable with this particular target, and an implementation that dropped
  // it entirely would satisfy the run above. Verified by mutation: a no-clamp
  // variant of `breakdown` passes the fixed-target run and fails this one.
  //
  // Generating the target as well restores the clamp to the input space, and it
  // is the honest reading of 3.6 besides — the couple can move the wedding by
  // editing one config value, so the arithmetic has to hold for the date they
  // pick, not only for the one it holds for today.
  it('holds for any target instant, where the day-of-month clamp becomes reachable', () => {
    fc.assert(
      fc.property(orderedPhtInstantPair, ([nowMs, targetMs]) => {
        assertWellFormedBreakdown(nowMs, targetMs)
      }),
      { numRuns: NUM_RUNS },
    )
  })
})

// ---------------------------------------------------------------------------
// Property 2
// ---------------------------------------------------------------------------

/**
 * Every `Date` member whose result depends on the host timezone.
 *
 * The local-mode setters are here alongside the getters: `setMonth` interprets
 * its argument in the host frame exactly as `getMonth` reports in it, so either
 * one leaks the visitor's zone into the arithmetic.
 */
const HOST_ZONE_DEPENDENT_METHODS = [
  'getFullYear',
  'getMonth',
  'getDate',
  'getDay',
  'getHours',
  'getMinutes',
  'getSeconds',
  'getMilliseconds',
  'getTimezoneOffset',
  'getYear',
  'setFullYear',
  'setMonth',
  'setDate',
  'setHours',
  'setMinutes',
  'setSeconds',
  'setMilliseconds',
  'setYear',
  'toString',
  'toDateString',
  'toTimeString',
  'toLocaleString',
  'toLocaleDateString',
  'toLocaleTimeString',
]

/**
 * Runs `fn` with every host-timezone-dependent `Date` member instrumented, and
 * returns both its result and the list of instrumented members it touched.
 *
 * Three surfaces are covered, which between them are the only ways the host
 * timezone can enter a JavaScript date computation:
 *
 *   1. reading a local-time field, or writing one — the prototype methods above;
 *   2. constructing a `Date` in local mode, which is any form other than
 *      `new Date(<number>)`: `new Date(y, m, d, …)` and `new Date(<string>)`
 *      both resolve against the host zone, and their *epoch* value differs
 *      between visitors even when read back through a UTC getter;
 *   3. `Date.now()` and `Date.parse()`, neither of which belongs inside pure
 *      arithmetic whose instant is supposed to arrive as a parameter.
 *
 * Instrumentation records rather than throws. Recording is exactly as strong —
 * the caller asserts the list is empty — and when it does fire the failure
 * message names the member, which a thrown error inside generated-case
 * machinery would bury.
 */
function recordHostZoneAccess(fn) {
  const accesses = []
  const RealDate = globalThis.Date
  const originalMethods = new Map()

  for (const name of HOST_ZONE_DEPENDENT_METHODS) {
    const original = RealDate.prototype[name]
    // `getYear` / `setYear` are legacy annex-B members; skip them if absent
    // rather than installing a trap over `undefined`.
    if (typeof original !== 'function') continue
    originalMethods.set(name, original)
    RealDate.prototype[name] = function instrumented(...args) {
      accesses.push(name)
      return original.apply(this, args)
    }
  }

  class InstrumentedDate extends RealDate {
    constructor(...args) {
      if (args.length !== 1 || typeof args[0] !== 'number') {
        accesses.push(`new Date(${args.map((arg) => typeof arg).join(', ')})`)
      }
      super(...args)
    }

    static now() {
      accesses.push('Date.now()')
      return RealDate.now()
    }

    static parse(...args) {
      accesses.push('Date.parse()')
      return RealDate.parse(...args)
    }
  }

  globalThis.Date = InstrumentedDate
  try {
    return { value: fn(), accesses }
  } finally {
    globalThis.Date = RealDate
    for (const [name, original] of originalMethods) {
      RealDate.prototype[name] = original
    }
  }
}

/** The wall clock a visitor at `offsetMinutes` reads at instant `epochMs`. */
function wallClockAt(epochMs, offsetMinutes) {
  const shifted = new Date(epochMs + offsetMinutes * MS_PER_MINUTE)
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth(),
    day: shifted.getUTCDate(),
    hour: shifted.getUTCHours(),
    minute: shifted.getUTCMinutes(),
    second: shifted.getUTCSeconds(),
    millisecond: shifted.getUTCMilliseconds(),
  }
}

/** The instant a visitor at `offsetMinutes` is at when their wall clock reads `wall`. */
function epochFromWallClock(wall, offsetMinutes) {
  return (
    Date.UTC(wall.year, wall.month, wall.day, wall.hour, wall.minute, wall.second, wall.millisecond) -
    offsetMinutes * MS_PER_MINUTE
  )
}

describe('Property 2: Countdown is timezone-invariant', () => {
  // Why this is not tested by setting `process.env.TZ` twice: V8 caches the
  // host timezone on first use, so a mid-process reassignment does not reliably
  // take effect, and Vitest exposes no timezone switch to force it. Running the
  // same computation twice under one unchanged zone and finding the answers
  // equal would be a tautology dressed as a property.
  //
  // Two child processes with different `TZ` values would be a real experiment,
  // but a weak one: it samples two zones out of hundreds and it proves nothing
  // about *why* the answers agree. The statement asserted instead is stronger
  // and exact — the host timezone is not an input to the computation at all,
  // because none of the three mechanisms that could carry it in is ever used.
  // A property that holds for every possible zone beats one checked in two.
  //
  // The two instrument self-checks below keep that from being vacuous.

  it('self-check: the instrument detects a local-time field read', () => {
    const { value, accesses } = recordHostZoneAccess(() => new Date(0).getHours())

    expect(typeof value).toBe('number')
    expect(accesses).toContain('getHours')
  })

  it('self-check: the instrument detects local-mode construction and Date.now', () => {
    const { accesses } = recordHostZoneAccess(() => {
      Date.now()
      // Local-mode construction: the epoch value this produces differs between
      // visitors, and `getTime` is not itself instrumented, so only the
      // constructor trap can catch it.
      return new Date(2026, 1, 13).getTime()
    })

    expect(accesses).toEqual(
      expect.arrayContaining(['Date.now()', 'new Date(number, number, number)']),
    )
  })

  it('self-check: the instrument restores every member it replaced', () => {
    const before = HOST_ZONE_DEPENDENT_METHODS.map((name) => Date.prototype[name])
    const realDate = globalThis.Date

    recordHostZoneAccess(() => new Date(0).getHours())

    expect(globalThis.Date).toBe(realDate)
    expect(HOST_ZONE_DEPENDENT_METHODS.map((name) => Date.prototype[name])).toEqual(before)
  })

  // Feature: wedding-invitation-website, Property 2: For any instant and any
  // pair of host timezone offsets, the breakdown computed against the
  // Ceremony_Datetime is identical in both, so two visitors observing at the
  // same moment from different timezones see the same five values.
  //
  // Validates: Requirements 3.3
  it('never consults the host timezone, for any instant', () => {
    fc.assert(
      fc.property(instantAnywhere, (nowMs) => {
        const { value, accesses } = recordHostZoneAccess(() => breakdown(nowMs))

        expect(
          accesses,
          `breakdown(${nowMs}) reached for the host timezone via ${accesses.join(', ')}`,
        ).toEqual([])

        // The instrumentation is transparent: it must not have changed the answer.
        expect(value).toEqual(breakdown(nowMs))
      }),
      { numRuns: NUM_RUNS },
    )
  })

  it('gives two visitors in different timezones the same five values at the same moment', () => {
    fc.assert(
      fc.property(
        instantBeforeCeremony,
        hostOffsetMinutes,
        hostOffsetMinutes,
        (nowMs, offsetA, offsetB) => {
          // Each visitor's runtime reads its own wall clock, then resolves that
          // reading back to an instant against its own offset. Same moment,
          // different local readings.
          const wallA = wallClockAt(nowMs, offsetA)
          const wallB = wallClockAt(nowMs, offsetB)

          if (offsetA !== offsetB) {
            expect(wallA, 'different offsets should give genuinely different wall clocks').not.toEqual(
              wallB,
            )
          }

          const observedByA = epochFromWallClock(wallA, offsetA)
          const observedByB = epochFromWallClock(wallB, offsetB)

          // Both resolve to the one instant, which is the whole reason an
          // epoch-anchored target works.
          expect(observedByA).toBe(nowMs)
          expect(observedByB).toBe(nowMs)

          const seenByA = breakdown(observedByA)
          const seenByB = breakdown(observedByB)

          expect(seenByA).toEqual(seenByB)
          expect(seenByA.isPast).toBe(false)
        },
      ),
      { numRuns: NUM_RUNS },
    )
  })

  it('anchors the Ceremony_Datetime to +08:00 rather than to the host zone', () => {
    // 2027-02-13 14:00 +08:00 is 2027-02-13 06:00 UTC. `Date.UTC` reads no local
    // field, so this equality is the same in every host timezone — and it is
    // what makes the subtraction inside `breakdown` timezone-free to begin with.
    expect(CEREMONY_MS).toBe(Date.UTC(2027, 1, 13, 6, 0, 0))
    expect(phtOffsetMsAt(CEREMONY_MS)).toBe(PHT_OFFSET_MS)
  })
})

// ---------------------------------------------------------------------------
// Property 3
// ---------------------------------------------------------------------------

const UNIT_KEYS = ['months', 'days', 'hours', 'minutes', 'seconds']

/**
 * Asserts the two-state contract at one instant: exactly one of the two shapes,
 * never a mixture, never a negative unit.
 */
function assertExactlyOneState(nowMs) {
  const result = breakdown(nowMs)
  const expectedPast = nowMs >= CEREMONY_MS

  expect(typeof result, `breakdown(${nowMs}) should return an object`).toBe('object')
  expect(result).not.toBeNull()
  expect(typeof result.isPast, `breakdown(${nowMs}).isPast should be a boolean`).toBe('boolean')

  // The boundary is inclusive of the ceremony instant: at exactly the
  // Ceremony_Datetime the state is Post_Wedding_State, not a zeroed countdown.
  expect(result.isPast, `breakdown(${nowMs}) took the wrong branch`).toBe(expectedPast)

  const presentUnits = UNIT_KEYS.filter((key) => key in result)

  if (expectedPast) {
    // Never both. A stale unit riding along behind `isPast: true` would let a
    // consumer render numbers after the wedding.
    expect(presentUnits, 'the post-wedding state should carry no time units').toEqual([])
    expect(Object.keys(result)).toEqual(['isPast'])
    return
  }

  // Never neither. All five units, every one a non-negative integer.
  expect(presentUnits, 'the pre-wedding state should carry all five units').toEqual(UNIT_KEYS)

  for (const key of UNIT_KEYS) {
    const value = result[key]
    expect(Number.isInteger(value), `${key} should be an integer, got ${value}`).toBe(true)
    expect(value, `${key} should never be negative`).toBeGreaterThanOrEqual(0)
  }
}

describe('Property 3: Countdown state is total, with the boundary inclusive of the ceremony instant', () => {
  // Feature: wedding-invitation-website, Property 3: For any instant, the
  // countdown yields exactly one of two states — the five-unit breakdown when
  // the instant is strictly before the Ceremony_Datetime, or the
  // Post_Wedding_State when at or after it — never both, never neither, and
  // never a breakdown containing a negative value.
  //
  // Validates: Requirements 3.4, 3.5
  it('yields exactly one of the two states for any instant', () => {
    fc.assert(
      fc.property(instantAnywhere, (nowMs) => {
        assertExactlyOneState(nowMs)
      }),
      { numRuns: NUM_RUNS },
    )
  })

  it('holds at every offset around the boundary, deterministically', () => {
    // The generator above samples these, but sampling is not coverage. The
    // instants that decide requirement 3.4 — exactly at the ceremony, one
    // millisecond either side — are checked outright so no seed can skip them.
    for (const offsetMs of BOUNDARY_OFFSETS_MS) {
      assertExactlyOneState(CEREMONY_MS + offsetMs)
    }
  })

  it('is post-wedding at exactly the Ceremony_Datetime and pre-wedding one millisecond earlier', () => {
    // Requirement 3.4 reads "reaches or passes", so the boundary belongs to the
    // Post_Wedding_State. This is the one assertion that distinguishes `<= 0`
    // from `< 0` in the implementation, and both spellings satisfy every other
    // assertion in this file.
    expect(breakdown(CEREMONY_MS)).toEqual({ isPast: true })
    expect(breakdown(CEREMONY_MS - 1).isPast).toBe(false)
    expect(breakdown(CEREMONY_MS + 1)).toEqual({ isPast: true })
  })

  it('accepts an explicit target and keeps the same boundary there', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: RANGE_START_MS, max: Date.UTC(2040, 0, 1) }),
        fc.integer({ min: -3, max: 3 }),
        (targetMs, deltaMs) => {
          // 3.6 lets the couple move the wedding by editing one value, so the
          // boundary has to sit at whatever target it is handed, not only at
          // the current Ceremony_Datetime.
          const result = breakdown(targetMs + deltaMs, targetMs)
          expect(result.isPast).toBe(deltaMs >= 0)
        },
      ),
      { numRuns: NUM_RUNS },
    )
  })
})
