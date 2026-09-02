// Property test for `src/lib/icalendar.js` — the design's Property 7.
//
// `icalendar.test.js` pins the concrete bytes that a round-trip cannot see: the
// literal `DTSTART:20270213T030000Z` for the real Ceremony_Datetime, the literal
// `\,` in the LOCATION line. This file states what must hold for *any* event.
//
// A note on independence, because a round-trip is the one shape of test that can
// be made vacuous by accident. The unfolder, the unescaper and the
// `YYYYMMDDTHHMMSSZ` parser below are all written here from RFC 5545, and
// nothing but `toIcs` itself is imported from the module. An escaper and an
// unescaper that share the same wrong convention round-trip perfectly, so a
// decoder borrowed from the implementation would assert only that the module
// agrees with itself.
import { describe, expect, it } from 'vitest'
import fc from 'fast-check'

import weddingConfig from '../config/weddingConfig.js'
import { toIcs } from './icalendar.js'

/**
 * The design sets a floor of 100 generated cases. The sibling property tests run
 * 200 (countdown) and 300 (rsvp); this one is pure string work with no `Intl`
 * calls, so it takes the higher number.
 */
const NUM_RUNS = 300

const CRLF = '\r\n'
const MAX_LINE_OCTETS = 75
const MS_PER_SECOND = 1000

const encoder = new TextEncoder()

/** UTF-8 length in octets. The RFC 5545 §3.1 limit counts octets, not characters. */
const octetLength = (text) => encoder.encode(text).length

// ---------------------------------------------------------------------------
// Input-space normalisation
// ---------------------------------------------------------------------------

/**
 * An unpaired surrogate, either half. Non-global on purpose: a `/g` regex used
 * with `.test` carries `lastIndex` between calls and silently starts skipping
 * matches.
 */
const LONE_SURROGATE = /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/

/**
 * Replace unpaired surrogates with U+FFFD.
 *
 * iCalendar is UTF-8 and a lone surrogate is not a character: `TextEncoder`,
 * `Blob`, and every other UTF-8 encoder on the download path substitute U+FFFD
 * for it. Feeding one in would fail the round-trip for a reason that has nothing
 * to do with this module, so the generated input space is constrained to
 * well-formed text. This narrows the *input*; it does not weaken any assertion.
 */
function toWellFormedText(text) {
  return text.replace(
    /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g,
    '\uFFFD',
  )
}

/**
 * Collapse CR and CRLF to LF.
 *
 * This is a property of the format, not a convenience for the test. RFC 5545
 * §3.3.11 gives TEXT exactly one line-break escape, `\n`, and no representation
 * whatsoever for a bare CR — so CR, LF and CRLF are indistinguishable once
 * serialised, and a round-trip through iCalendar necessarily normalises line
 * endings to LF. Property 7 therefore holds up to that normalisation, and
 * `assertTextRoundTrips` additionally checks that the normalisation is the
 * identity for every value containing no CR, so this allowance cannot quietly
 * absorb any other difference.
 */
function normaliseLineEndings(text) {
  return text.replace(/\r\n|\r/g, '\n')
}

// ---------------------------------------------------------------------------
// An independent RFC 5545 reader
// ---------------------------------------------------------------------------

/**
 * Reverse §3.1 folding: drop every CRLF that is followed by a single space.
 *
 * Unambiguous by construction. `escapeText` turns every CR and LF inside a value
 * into the two-character escape `\n`, so no CRLF surviving into the output can be
 * anything other than structural, and no content line can begin with a space.
 */
function unfold(ics) {
  return ics.split(`${CRLF} `).join('')
}

/**
 * Reverse §3.3.11 escaping.
 *
 * On the ordering, since this is where the classic bug lives. The escaper runs
 * backslash FIRST and then the three rules whose output introduces new
 * backslashes, which is the only order that works in that direction. The
 * tempting inverse is to run the same list backwards as four sequential
 * `replace` calls — `\n` → newline, `\,` → comma, `\;` → semicolon, `\\` →
 * backslash. That is wrong, and so is every other sequential order, because
 * sequential replacement cannot tell a backslash that is part of an escape from
 * one that a previous pass just produced or exposed.
 *
 * The witness is the two-character value `\n`: a literal backslash followed by
 * the letter n. The escaper emits `\\n`.
 *
 *   - reverse order: `\n` → newline scans left to right, finds no match at
 *     offset 0 (`\` then `\`), matches at offset 1, and yields backslash +
 *     newline. Wrong.
 *   - forward order: `\\` → `\` yields `\n`, which the next pass turns into a
 *     newline. Also wrong.
 *
 * A single left-to-right pass that consumes two characters per escape has no
 * such ambiguity, because it can never revisit a character it has already
 * emitted. The generators below produce exactly this string, so the distinction
 * is exercised rather than theoretical.
 */
function unescapeText(value) {
  let out = ''
  for (let i = 0; i < value.length; i += 1) {
    if (value[i] !== '\\' || i + 1 >= value.length) {
      out += value[i]
      continue
    }
    const next = value[i + 1]
    // `\N` is an accepted synonym for `\n` in §3.3.11.
    if (next === 'n' || next === 'N') out += '\n'
    else if (next === ',') out += ','
    else if (next === ';') out += ';'
    else if (next === '\\') out += '\\'
    else out += next
    i += 1
  }
  return out
}

/** Physical lines, as they appear on the wire, folds included. */
const physicalLines = (ics) => ics.split(CRLF)

/** Logical content lines, one per property, folds undone. */
const contentLines = (ics) => unfold(ics).split(CRLF)

/** Still-escaped value of the `name` property, or `undefined`. */
function rawProperty(ics, name) {
  const prefix = `${name}:`
  const line = contentLines(ics).find((candidate) => candidate.startsWith(prefix))
  return line === undefined ? undefined : line.slice(prefix.length)
}

/** Decoded value of the `name` property, or `undefined`. */
function readProperty(ics, name) {
  const raw = rawProperty(ics, name)
  return raw === undefined ? undefined : unescapeText(raw)
}

/** The §3.3.5 form-2 UTC date-time: `YYYYMMDDTHHMMSSZ`, and nothing else. */
const UTC_BASIC_RE = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/

/**
 * Build an epoch instant from UTC civil fields.
 *
 * `setUTCFullYear` rather than `Date.UTC`, because `Date.UTC` maps years 0-99 to
 * 1900-1999 and the four-digit format can legitimately carry `0042`. Setting
 * year, month and day in one call also rules out the month-overflow trap of
 * setting them one at a time.
 */
function utcMs(year, month, day, hour, minute, second) {
  const date = new Date(0)
  date.setUTCFullYear(year, month - 1, day)
  date.setUTCHours(hour, minute, second, 0)
  return date.getTime()
}

/**
 * Parse `YYYYMMDDTHHMMSSZ` to an epoch instant, or `NaN` if the text is not that
 * form or carries an out-of-range field.
 *
 * The range checks matter: without them `20260231T000000Z` would silently roll
 * forward to 3 March and the round-trip would still "pass" on a value no
 * calendar app would read the same way.
 */
function parseUtcBasic(text) {
  const match = UTC_BASIC_RE.exec(text ?? '')
  if (match === null) return NaN

  const [year, month, day, hour, minute, second] = match.slice(1).map(Number)
  if (month < 1 || month > 12) return NaN
  if (day < 1 || day > 31) return NaN
  if (hour > 23 || minute > 59 || second > 59) return NaN

  const ms = utcMs(year, month, day, hour, minute, second)
  const back = new Date(ms)
  // Rejects a day-of-month that does not exist in that month.
  if (back.getUTCMonth() + 1 !== month || back.getUTCDate() !== day) return NaN
  return ms
}

/** Instants the four-digit year field can represent at all. */
const REPRESENTABLE_MIN_MS = utcMs(0, 1, 1, 0, 0, 0)
const REPRESENTABLE_MAX_MS = utcMs(9999, 12, 31, 23, 59, 59) + 999

// ---------------------------------------------------------------------------
// Assertions
// ---------------------------------------------------------------------------

/**
 * A TEXT property decodes back to the value that went in, up to the format's
 * inherent line-ending normalisation.
 */
function assertTextRoundTrips(ics, name, value) {
  const expected = normaliseLineEndings(value)
  // The guard on the allowance: with no CR in the input, the expectation is the
  // input itself, so `normaliseLineEndings` cannot be hiding anything else.
  if (!value.includes('\r')) expect(expected).toBe(value)

  expect(readProperty(ics, name), `${name} did not round-trip`).toBe(expected)
}

/**
 * A date-time property re-parses to the instant that went in, expressed in UTC.
 *
 * The exact invariant is the input *floored to the second*, not the input:
 * `YYYYMMDDTHHMMSSZ` carries whole seconds, so up to 999 ms is dropped by
 * design. Floored rather than truncated toward zero, because `-1` ms is
 * 1969-12-31T23:59:59.999Z, which formats to `19691231T235959Z` and so re-parses
 * to `-1000`.
 */
function assertInstantRoundTrips(ics, name, epochMs) {
  const raw = rawProperty(ics, name)
  expect(raw, `${name} missing`).toBeDefined()
  expect(raw, `${name} is not an RFC 5545 UTC date-time`).toMatch(UTC_BASIC_RE)
  expect(parseUtcBasic(raw), `${name}: ${raw}`).toBe(
    Math.floor(epochMs / MS_PER_SECOND) * MS_PER_SECOND,
  )
}

/** Everything the property claims about the shape of the document. */
function assertStructurallyWellFormed(ics) {
  const physical = physicalLines(ics)

  for (const line of physical) {
    // CRLF throughout: having split on CRLF, a residual CR or LF in any segment
    // would be a line break that is not a CRLF.
    expect(line.includes('\r'), `bare CR in ${JSON.stringify(line)}`).toBe(false)
    expect(line.includes('\n'), `bare LF in ${JSON.stringify(line)}`).toBe(false)

    expect(
      octetLength(line),
      `line exceeds ${MAX_LINE_OCTETS} octets: ${JSON.stringify(line)}`,
    ).toBeLessThanOrEqual(MAX_LINE_OCTETS)

    // A fold that split a surrogate pair leaves half a pair on each physical
    // line. UTF-8 encoding that produces U+FFFD, which is how the corruption
    // shows up in the guest's calendar.
    expect(
      LONE_SURROGATE.test(line),
      `fold split a surrogate pair: ${JSON.stringify(line)}`,
    ).toBe(false)
  }

  const lines = contentLines(ics)

  for (const line of lines) {
    // Every logical line starts with a property name. A leftover leading space
    // here would mean unfolding did not put the line back together.
    expect(line, 'unfolding left a continuation line behind').toMatch(/^[A-Za-z][A-Za-z0-9-]*[;:]/)
  }

  for (const component of ['VCALENDAR', 'VEVENT']) {
    expect(lines.filter((line) => line === `BEGIN:${component}`)).toHaveLength(1)
    expect(lines.filter((line) => line === `END:${component}`)).toHaveLength(1)
    expect(lines.indexOf(`END:${component}`)).toBeGreaterThan(
      lines.indexOf(`BEGIN:${component}`),
    )
  }

  expect(lines[0]).toBe('BEGIN:VCALENDAR')
  expect(lines.at(-1)).toBe('END:VCALENDAR')
  expect(lines.indexOf('BEGIN:VCALENDAR')).toBeLessThan(lines.indexOf('BEGIN:VEVENT'))
  expect(lines.indexOf('END:VEVENT')).toBeLessThan(lines.indexOf('END:VCALENDAR'))

  // Folding is not optional: any content line over the limit must have been
  // broken into at least `ceil(octets / 75)` segments. A lower bound, since a
  // continuation segment carries only 74 octets of payload.
  const folds = physical.length - lines.length
  const minFolds = lines.reduce(
    (total, line) => total + Math.ceil(octetLength(line) / MAX_LINE_OCTETS) - 1,
    0,
  )
  expect(folds, 'a content line over the octet limit was not folded').toBeGreaterThanOrEqual(
    minFolds,
  )

  return folds
}

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

/**
 * Fragments chosen for what they do to the escaper and the folder: the three
 * escaped characters, backslashes already adjacent to them, line breaks in all
 * three conventions, multi-byte characters of every UTF-8 width, combining
 * marks, a ZWJ sequence, and the real config strings the module actually ships.
 */
const NASTY_PARTS = [
  '',
  ' ',
  '  ',
  ',',
  ';',
  '\\',
  '\\\\',
  '\\n', // literal backslash + n — the witness for the unescaper's ordering
  '\\,',
  '\\;',
  ',,',
  ';;',
  'a\\,b',
  '\\;\\,\\\\',
  '\n',
  '\r\n',
  '\r',
  '\t',
  ':',
  '"',
  "'",
  '=',
  '%',
  '&',
  '+',
  '/',
  '?',
  '#',
  '\u00f1', // ñ — 2 octets
  '\u00e9', // é
  'e\u0301', // e + combining acute — 3 octets, one grapheme, two code points
  'a\u0301\u0328', // stacked combining marks
  '\u2014', // em dash — 3 octets
  '\u201c',
  '\u00a0',
  '\u3000',
  '\ufeff', // BOM in the middle of a value
  '\u6f22\u5b57', // CJK — 3 octets each
  '\u30ab\u30bf\u30ab\u30ca',
  '\ud83d\ude0a', // emoji — 4 octets, a surrogate pair in UTF-16
  '\ud83c\udf89',
  '\ud83d\udc69\u200d\ud83d\udc67', // ZWJ sequence
  weddingConfig.ceremony.venueName,
  weddingConfig.reception.venueName,
  weddingConfig.calendar.summary,
]

/** Text assembled from the stress alphabet. May be empty. */
const nastyTextArb = fc
  .array(fc.constantFrom(...NASTY_PARTS), { maxLength: 14 })
  .map((parts) => parts.join(''))

/**
 * Full-Unicode text.
 *
 * `fc.string({ unit: 'binary' })` is fast-check 4's stand-in for the removed
 * `fc.fullUnicodeString()`, and is preferred over the default 16-bit unit
 * because the default reaches code units rather than code points.
 * `toWellFormedText` then guarantees the result is text — see its comment.
 */
const unicodeTextArb = fc.string({ unit: 'binary' }).map(toWellFormedText)

/** A single character repeated far past the octet limit, so folds are forced. */
const repeatedRunArb = fc
  .tuple(
    fc.constantFrom('a', ',', ';', '\\', '\u00f1', 'e\u0301', '\u6f22', '\ud83c\udf89'),
    fc.integer({ min: 90, max: 400 }),
  )
  .map(([unit, count]) => unit.repeat(count))

/** Values long enough to need several folds, from both directions. */
const longTextArb = fc.oneof(
  fc.string({ unit: 'binary', minLength: 120, maxLength: 400 }).map(toWellFormedText),
  repeatedRunArb,
  fc.tuple(repeatedRunArb, nastyTextArb).map((parts) => parts.join('')),
)

/** Any text a field might carry, weighted toward the interesting shapes. */
const anyTextArb = fc.oneof(
  { weight: 4, arbitrary: nastyTextArb },
  { weight: 3, arbitrary: unicodeTextArb },
  { weight: 2, arbitrary: longTextArb },
  { weight: 1, arbitrary: fc.constant('') },
)

/** Guaranteed over 75 octets, so the value cannot avoid being folded. */
const guaranteedLongTextArb = fc
  .tuple(repeatedRunArb, anyTextArb)
  .map((parts) => parts.join(''))

const CEREMONY_MS = Date.parse(weddingConfig.schedule.ceremonyDatetime)

/**
 * Instants spanning everything the format can express, deliberately dense around
 * the places a truncate-versus-floor mistake hides: either side of the epoch, and
 * sub-second offsets from the real ceremony.
 */
const instantArb = fc.oneof(
  { weight: 4, arbitrary: fc.integer({ min: REPRESENTABLE_MIN_MS, max: REPRESENTABLE_MAX_MS }) },
  { weight: 3, arbitrary: fc.integer({ min: Date.UTC(1990, 0, 1), max: Date.UTC(2060, 0, 1) }) },
  { weight: 2, arbitrary: fc.integer({ min: -2000, max: 2000 }) },
  {
    weight: 1,
    arbitrary: fc.integer({ min: -1500, max: 1500 }).map((delta) => CEREMONY_MS + delta),
  },
)

/**
 * Any calendar event. `dtstampMs` is present about half the time, which exercises
 * both the explicit value and the `?? startMs` fallback.
 */
const eventArb = fc
  .record({
    uid: anyTextArb,
    summary: anyTextArb,
    description: anyTextArb,
    location: anyTextArb,
    startMs: instantArb,
    durationMs: fc.integer({ min: 0, max: 14 * 24 * 60 * 60 * MS_PER_SECOND }),
    dtstampMs: fc.option(instantArb, { nil: undefined }),
  })
  .map(({ durationMs, ...event }) => ({
    ...event,
    endMs: Math.min(event.startMs + durationMs, REPRESENTABLE_MAX_MS),
  }))

/** Events whose SUMMARY and LOCATION are both certain to fold. */
const longFieldEventArb = fc
  .tuple(eventArb, guaranteedLongTextArb, guaranteedLongTextArb)
  .map(([event, summary, location]) => ({ ...event, summary, location }))

// ---------------------------------------------------------------------------
// Property 7
// ---------------------------------------------------------------------------

// Feature: wedding-invitation-website, Property 7: iCalendar serialisation
// round-trips and is structurally well-formed. For any calendar event, the
// generated iCalendar text parses back to the same summary, the same location,
// and the same start instant expressed in UTC, regardless of whether the text
// fields contain commas, semicolons, backslashes, newlines or non-ASCII
// characters; and the output has matched BEGIN/END pairs for both VCALENDAR and
// VEVENT, CRLF line endings, and no unfolded line exceeding 75 octets.
//
// Validates: Requirements 9.3
describe('Property 7: iCalendar serialisation round-trips and is structurally well-formed', () => {
  it('round-trips every text field and every instant, for any event', () => {
    fc.assert(
      fc.property(eventArb, (event) => {
        const ics = toIcs(event)

        assertStructurallyWellFormed(ics)

        // The two fields 9.3 names, plus the other TEXT properties, which carry
        // the same escaping and so make the same claim.
        assertTextRoundTrips(ics, 'SUMMARY', event.summary)
        assertTextRoundTrips(ics, 'LOCATION', event.location)
        assertTextRoundTrips(ics, 'DESCRIPTION', event.description)
        assertTextRoundTrips(ics, 'UID', event.uid)

        assertInstantRoundTrips(ics, 'DTSTART', event.startMs)
        assertInstantRoundTrips(ics, 'DTEND', event.endMs)
        assertInstantRoundTrips(ics, 'DTSTAMP', event.dtstampMs ?? event.startMs)
      }),
      { numRuns: NUM_RUNS },
    )
  })

  it('round-trips values long enough to require several folds', () => {
    fc.assert(
      fc.property(longFieldEventArb, (event) => {
        const ics = toIcs(event)

        const folds = assertStructurallyWellFormed(ics)
        // SUMMARY and LOCATION are each over the limit, so at minimum one fold
        // apiece. Without this the generators could drift short and leave the
        // whole folding path unexercised while the test still passed.
        expect(folds, 'expected the long fields to be folded').toBeGreaterThanOrEqual(2)

        assertTextRoundTrips(ics, 'SUMMARY', event.summary)
        assertTextRoundTrips(ics, 'LOCATION', event.location)
        assertInstantRoundTrips(ics, 'DTSTART', event.startMs)
      }),
      { numRuns: NUM_RUNS },
    )
  })

  it('is pure, so the same event always produces byte-identical text', () => {
    fc.assert(
      fc.property(eventArb, (event) => {
        // `toIcs` takes DTSTAMP from `event.dtstampMs ?? event.startMs` and never
        // from the clock. That is what makes the round-trip above meaningful:
        // a clock-derived DTSTAMP would give every call different bytes.
        const first = toIcs(event)
        expect(toIcs(event)).toBe(first)
        expect(toIcs({ ...event })).toBe(first)

        if (event.dtstampMs === undefined) {
          expect(rawProperty(first, 'DTSTAMP')).toBe(rawProperty(first, 'DTSTART'))
        }
      }),
      { numRuns: NUM_RUNS },
    )
  })
})
