// Property tests for `src/lib/rsvp.js` — design properties 4 and 5.
//
// Both properties are stated over *any* RSVP form values, so the generators here
// deliberately reach past what the rendered form can produce: nullish fields,
// absent keys, non-string types, whitespace-only text, near-miss attendance
// values, numeric strings, `NaN`, and a nullish `values` object itself. The
// `Rsvp` component builds its `values` object from inputs that start
// uncontrolled, and a hand-built POST can carry anything, so none of that is
// hypothetical.
//
// The oracles below are written from the requirement text, never by calling
// `validateRsvp`. An oracle that delegated to the function under test would
// assert only that the function agrees with itself.
import fc from 'fast-check'
import { describe, expect, it } from 'vitest'

import weddingConfig from '../config/weddingConfig.js'
import { ATTENDANCE_CHOICES, encodeRsvpPayload, validateRsvp } from './rsvp.js'

/** Each property runs well above the 100-case floor the design sets. */
const NUM_RUNS = 300

const { minGuests: MIN_GUESTS, maxGuests: MAX_GUESTS, formName: FORM_NAME } = weddingConfig.rsvp

// ---------------------------------------------------------------------------
// Oracles — derived from requirements 8.4, 8.5 and 8.6, independently of rsvp.js
// ---------------------------------------------------------------------------

/**
 * Requirement 8.4: the guest name must not be empty or entirely whitespace.
 *
 * Expressed as "contains at least one non-whitespace character", which is the
 * requirement read directly, rather than as a trim-and-compare. A nullish or
 * absent field carries no name at all, so it fails.
 */
function denotesNonBlankName(value) {
  if (value === null || value === undefined) return false
  const text = typeof value === 'string' ? value : String(value)
  return /\S/.test(text)
}

/**
 * Requirement 8.5: the attendance selection must be one of the two offered
 * choices. Exact match, no trimming and no case folding — these are wire values
 * written by the radio inputs, so anything else is genuinely "unset".
 */
function denotesOfferedChoice(value) {
  return value === 'attending' || value === 'not-attending'
}

/**
 * Requirement 8.6: the guest count must be a whole number between `min` and
 * `max` inclusive.
 *
 * Read as three separate questions, in order: does the value denote a number at
 * all, is that number whole, is it in range. Only a string or a number can
 * denote a count entered in a numeric field; a blank string denotes nothing
 * rather than zero, and a nullish or absent field denotes nothing either.
 * "Whole" is `Math.floor(n) === n` over a finite value, which rejects `2.5`,
 * `NaN` and both infinities without appealing to `Number.isInteger`.
 */
function denotesWholeNumberInRange(value, min = MIN_GUESTS, max = MAX_GUESTS) {
  if (typeof value !== 'number' && typeof value !== 'string') return false
  if (typeof value === 'string' && !/\S/.test(value)) return false

  const n = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(n)) return false
  if (Math.floor(n) !== n) return false
  return n >= min && n <= max
}

/** The exact set of field names validation should report, per the three rules. */
function expectedErrorFields(values) {
  const v = values ?? {}
  const fields = []
  if (!denotesNonBlankName(v.guestName)) fields.push('guestName')
  if (!denotesOfferedChoice(v.attendance)) fields.push('attendance')
  if (!denotesWholeNumberInRange(v.guestCount)) fields.push('guestCount')
  return fields.sort()
}

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

/** Characters that stress URL encoding, plus non-ASCII the guest list needs. */
const SPECIAL_CHARS = [
  ' ',
  '  ',
  '&',
  '+',
  '=',
  '?',
  '#',
  '%',
  '/',
  '\\',
  ';',
  ',',
  ':',
  '@',
  '$',
  '[',
  ']',
  '"',
  "'",
  '\n',
  '\r\n',
  '\t',
  '\u2014', // em dash
  '\u201c', // curly quote
  '\u00f1', // ñ — Spanish/Tagalog
  '\u00e1', // á
  '\u00e9', // é
  '\u1e6f', // ṯ
  '\u6f22\u5b57', // CJK
  '\ud83d\ude0a', // emoji (surrogate pair, a single code point)
  'Mae',
  'Bricx',
]

/** Text built from the stress alphabet. May be empty. */
const specialTextArb = fc
  .array(fc.constantFrom(...SPECIAL_CHARS), { maxLength: 12 })
  .map((parts) => parts.join(''))

/**
 * Full-Unicode text: every code point, surrogates excluded.
 *
 * `unit: 'binary'` is fast-check 4's replacement for the removed
 * `fc.fullUnicodeString()`. Choosing it over the default 16-bit unit is
 * deliberate: the default can emit lone surrogates, which are not text, and any
 * UTF-8 encoder replaces them with U+FFFD — that would fail Property 5's
 * round-trip for a reason that has nothing to do with this module.
 */
const fullUnicodeStringArb = fc.string({ unit: 'binary' })

/** Arbitrary text: full-Unicode strings plus the stress alphabet. */
const anyTextArb = fc.oneof(fullUnicodeStringArb, specialTextArb)

/** Whitespace-only runs, including the exotic space characters `\s` covers. */
const whitespaceOnlyArb = fc
  .array(fc.constantFrom(' ', '\t', '\n', '\r', '\f', '\v', '\u00a0', '\u2003', '\u3000'), {
    minLength: 1,
    maxLength: 6,
  })
  .map((parts) => parts.join(''))

/** Text guaranteed to contain a non-whitespace character, without filtering. */
const nonBlankTextArb = fc
  .tuple(specialTextArb, fc.constantFrom('Mae', 'Bricx', 'a', '\u00f1', '\u6f22', '1'), specialTextArb)
  .map((parts) => parts.join(''))

const nonStringScalarArb = fc.constantFrom(null, undefined, 0, 42, -1, NaN, true, false)

/** Names across every interesting shape: valid, blank, whitespace, non-string. */
const guestNameArb = fc.oneof(
  { weight: 4, arbitrary: nonBlankTextArb },
  { weight: 2, arbitrary: whitespaceOnlyArb },
  { weight: 2, arbitrary: fc.constantFrom('', ' ', '  ', '\t\n', '   \r\n  ') },
  { weight: 3, arbitrary: anyTextArb },
  { weight: 1, arbitrary: nonStringScalarArb },
)

/** Both valid choices, near-misses that must still fail, and arbitrary junk. */
const attendanceArb = fc.oneof(
  { weight: 5, arbitrary: fc.constantFrom(...ATTENDANCE_CHOICES) },
  {
    weight: 3,
    arbitrary: fc.constantFrom(
      ' attending',
      'attending ',
      'Attending',
      'ATTENDING',
      'not attending',
      'notattending',
      'Not-Attending',
      'not-attending\n',
      'maybe',
      '',
    ),
  },
  { weight: 2, arbitrary: anyTextArb },
  { weight: 1, arbitrary: nonStringScalarArb },
)

/** Guest counts: in range, out of range, fractional, string forms, junk. */
const guestCountArb = fc.oneof(
  { weight: 4, arbitrary: fc.integer({ min: MIN_GUESTS, max: MAX_GUESTS }) },
  {
    weight: 2,
    arbitrary: fc.integer({ min: MIN_GUESTS, max: MAX_GUESTS }).map((n) => String(n)),
  },
  { weight: 2, arbitrary: fc.integer({ min: -50, max: 60 }) },
  { weight: 2, arbitrary: fc.integer({ min: -50, max: 60 }).map((n) => String(n)) },
  { weight: 2, arbitrary: fc.double({ min: -20, max: 20, noNaN: true }) },
  {
    weight: 2,
    arbitrary: fc.constantFrom('', '  ', 'abc', '2.5', '0', '11', '-1', '1e1', ' 3 '),
  },
  { weight: 2, arbitrary: anyTextArb },
  {
    weight: 1,
    arbitrary: fc.constantFrom(NaN, null, undefined, Infinity, -Infinity, 0, 11, 2.5, -1),
  },
)

const messageArb = fc.oneof(
  { weight: 4, arbitrary: anyTextArb },
  { weight: 1, arbitrary: nonStringScalarArb },
)

/**
 * A form-values object. `requiredKeys: []` means every key may be absent, which
 * is a distinct case from present-and-`undefined` and is worth generating: the
 * live component can produce either.
 */
const rsvpValuesArb = fc.record(
  {
    guestName: guestNameArb,
    attendance: attendanceArb,
    guestCount: guestCountArb,
    message: messageArb,
  },
  { requiredKeys: [] },
)

/** The property is stated over *any* values, so the object itself may be nullish. */
const anyRsvpValuesArb = fc.oneof(
  { weight: 9, arbitrary: rsvpValuesArb },
  { weight: 1, arbitrary: fc.constantFrom(null, undefined) },
)

// ---------------------------------------------------------------------------
// Property 4
// ---------------------------------------------------------------------------

describe('Property 4: RSVP validation rejects exactly the offending fields', () => {
  // Feature: wedding-invitation-website, Property 4: For any RSVP form values,
  // validation reports an error for the guest name field if and only if the name
  // is empty or entirely whitespace, reports an error for the attendance field
  // if and only if the selection is neither of the two offered choices, reports
  // an error for the guest count field if and only if the count is not a whole
  // number between 1 and 10 inclusive, and reports no errors at all only when
  // all three constraints hold.
  //
  // **Validates: Requirements 8.4, 8.5, 8.6**
  it('reports an error for exactly the fields that violate their rule', () => {
    fc.assert(
      fc.property(anyRsvpValuesArb, (values) => {
        const errors = validateRsvp(values)
        const reported = Object.keys(errors).sort()
        const expected = expectedErrorFields(values)

        // A single set equality carries the whole biconditional in both
        // directions at once: every offending field is reported (no misses) and
        // no other key appears (no false positives, and no error ever raised
        // against the optional `message`).
        expect(reported).toEqual(expected)
      }),
      { numRuns: NUM_RUNS },
    )
  })

  it('returns {} if and only if all three constraints hold', () => {
    fc.assert(
      fc.property(anyRsvpValuesArb, (values) => {
        const v = values ?? {}
        const allHold =
          denotesNonBlankName(v.guestName) &&
          denotesOfferedChoice(v.attendance) &&
          denotesWholeNumberInRange(v.guestCount)

        const errors = validateRsvp(values)
        expect(Object.keys(errors).length === 0).toBe(allHold)
      }),
      { numRuns: NUM_RUNS },
    )
  })

  it('never throws and always returns a map of non-empty strings', () => {
    // Totality, which Property 4 presupposes by being stated over any values.
    fc.assert(
      fc.property(anyRsvpValuesArb, (values) => {
        const errors = validateRsvp(values)

        expect(errors).toBeTypeOf('object')
        expect(errors).not.toBeNull()

        for (const [field, message] of Object.entries(errors)) {
          expect(['guestName', 'attendance', 'guestCount']).toContain(field)
          expect(typeof message).toBe('string')
          // 8.4-8.6 each require a message, so an empty one would satisfy the
          // key set while telling the guest nothing.
          expect(message.trim()).not.toBe('')
        }
      }),
      { numRuns: NUM_RUNS },
    )
  })

  it('respects explicitly supplied guest count limits', () => {
    fc.assert(
      fc.property(
        rsvpValuesArb,
        fc.integer({ min: 1, max: 20 }),
        fc.integer({ min: 0, max: 30 }),
        (values, min, span) => {
          const limits = { minGuests: min, maxGuests: min + span }
          const errors = validateRsvp(values, limits)
          const shouldError = !denotesWholeNumberInRange(
            values.guestCount,
            limits.minGuests,
            limits.maxGuests,
          )

          expect('guestCount' in errors).toBe(shouldError)
        },
      ),
      { numRuns: NUM_RUNS },
    )
  })
})

// ---------------------------------------------------------------------------
// Property 5
// ---------------------------------------------------------------------------

/** Values that pass validation, so Property 5's precondition holds by construction. */
const validRsvpValuesArb = fc.record({
  guestName: nonBlankTextArb,
  attendance: fc.constantFrom(...ATTENDANCE_CHOICES),
  guestCount: fc.oneof(
    fc.integer({ min: MIN_GUESTS, max: MAX_GUESTS }),
    fc.integer({ min: MIN_GUESTS, max: MAX_GUESTS }).map((n) => String(n)),
  ),
  message: fc.oneof(anyTextArb, fc.constant('')),
})

/** Form names: the configured one plus arbitrary non-blank alternatives. */
const formNameArb = fc.oneof(
  { weight: 3, arbitrary: fc.constant(FORM_NAME) },
  { weight: 1, arbitrary: fc.constantFrom('rsvp', 'wedding rsvp', 'rsvp&guests', 'r+s+v+p') },
  { weight: 1, arbitrary: nonBlankTextArb },
)

describe('Property 5: RSVP payload encoding round-trips', () => {
  // Feature: wedding-invitation-website, Property 5: For any RSVP form values
  // that pass validation, decoding the URL-encoded submission body yields back
  // each entered field value unchanged, including values containing spaces,
  // ampersands, plus signs, newlines and non-ASCII characters, and always
  // includes a `form-name` field equal to the form's `name` attribute.
  //
  // One precision on "unchanged", stated rather than glossed over:
  // `encodeRsvpPayload` trims `guestName` on purpose, so that the couple reads
  // the same name the guest was told was valid rather than one padded with
  // whitespace. The round-trip for that field therefore holds against the
  // TRIMMED value — every other field round-trips against the raw value. This is
  // the encoder's whole transformation, and it is asserted exactly, not by
  // loosening the comparison.
  //
  // **Validates: Requirements 8.2, 8.7**
  it('decodes back to each entered value, with guestName trimmed', () => {
    fc.assert(
      fc.property(validRsvpValuesArb, (values) => {
        // Precondition check, not decoration: if a generated case failed
        // validation the property would not apply to it, and a silently
        // vacuous run is worse than a failing one.
        expect(validateRsvp(values)).toEqual({})

        const params = new URLSearchParams(encodeRsvpPayload(values))

        expect(params.get('guestName')).toBe(values.guestName.trim())
        expect(params.get('attendance')).toBe(values.attendance)
        expect(params.get('guestCount')).toBe(String(values.guestCount))
        expect(params.get('message')).toBe(String(values.message ?? ''))
      }),
      { numRuns: NUM_RUNS },
    )
  })

  it('always includes form-name equal to the form name, default or explicit', () => {
    fc.assert(
      fc.property(validRsvpValuesArb, formNameArb, (values, formName) => {
        const explicit = new URLSearchParams(encodeRsvpPayload(values, formName))
        expect(explicit.has('form-name')).toBe(true)
        expect(explicit.get('form-name')).toBe(formName)

        // 8.2 ties the field to the form's `name` attribute, which for the
        // default call means the single configured value shared with the
        // detection stub in index.html.
        const defaulted = new URLSearchParams(encodeRsvpPayload(values))
        expect(defaulted.get('form-name')).toBe(FORM_NAME)
      }),
      { numRuns: NUM_RUNS },
    )
  })

  it('emits each field exactly once and adds nothing else', () => {
    fc.assert(
      fc.property(validRsvpValuesArb, formNameArb, (values, formName) => {
        const keys = [...new URLSearchParams(encodeRsvpPayload(values, formName)).keys()]
        expect(keys).toEqual(['form-name', 'guestName', 'attendance', 'guestCount', 'message'])
      }),
      { numRuns: NUM_RUNS },
    )
  })

  it('does not double-encode', () => {
    // The failure mode this guards: calling `encodeURIComponent` on a value and
    // then handing it to `URLSearchParams`, which escapes the `%` again. A `&`
    // arrives as `%2526` instead of `%26`, a space as `%2520` instead of `+`,
    // and Netlify stores the mangled text.
    //
    // The test: `URLSearchParams` produces `%25` for exactly one input
    // character, a literal `%`. So when no field value contains a `%`, a `%25`
    // anywhere in the body is proof of a second encoding pass. Sound in both
    // directions, and it does not have to enumerate escape sequences.
    const percentFreeTextArb = fc
      .array(
        fc.constantFrom(...SPECIAL_CHARS.filter((char) => !char.includes('%'))),
        { maxLength: 12 },
      )
      .map((parts) => parts.join(''))

    fc.assert(
      fc.property(
        percentFreeTextArb,
        percentFreeTextArb,
        fc.integer({ min: MIN_GUESTS, max: MAX_GUESTS }),
        (namePart, message, guestCount) => {
          const values = {
            guestName: `Mae${namePart}`,
            attendance: 'attending',
            guestCount,
            message,
          }
          const body = encodeRsvpPayload(values, 'rsvp')

          expect(body).not.toContain('%25')
          expect(body).not.toContain('%2526')
          expect(body).not.toContain('%2520')

          // And the positive side: one decode pass is enough to recover the
          // values. Two passes would be needed if anything were double-encoded.
          const params = new URLSearchParams(body)
          expect(params.get('guestName')).toBe(values.guestName.trim())
          expect(params.get('message')).toBe(message)
        },
      ),
      { numRuns: NUM_RUNS },
    )
  })

  it('round-trips the specific characters the property names', () => {
    // Spaces, ampersands, plus signs, newlines and non-ASCII, called out
    // literally so the named cases are covered by construction and not only by
    // the chance that the generator reaches them.
    const fixtures = [
      'Mae & Bricx',
      'a+b+c',
      'line one\nline two',
      'crlf\r\nhere',
      'tab\there',
      'em\u2014dash',
      '100% sure',
      'q=1&r=2#frag?',
      'Gioha\u00f1nah',
      '\u6f22\u5b57\u306e\u540d\u524d',
      '\ud83d\udc92\ud83c\udf3f',
      'Ma\u00f1ana \u2014 mag-aasawa na',
    ]

    for (const text of fixtures) {
      const values = {
        guestName: text,
        attendance: 'not-attending',
        guestCount: 1,
        message: text,
      }
      expect(validateRsvp(values), `fixture ${JSON.stringify(text)} should be valid`).toEqual({})

      const params = new URLSearchParams(encodeRsvpPayload(values))
      expect(params.get('guestName')).toBe(text.trim())
      expect(params.get('message')).toBe(text)
      expect(params.get('form-name')).toBe(FORM_NAME)
    }
  })
})
