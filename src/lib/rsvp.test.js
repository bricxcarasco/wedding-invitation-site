// Example tests for `src/lib/rsvp.js` — requirements 8.4 (guest name), 8.5
// (attendance), 8.6 (guest count 1-10 inclusive), 8.2 / 8.7 (the URL-encoded
// body and its `form-name`).
//
// These sit alongside `rsvp.property.test.js`, which states the same rules as
// universal properties. The division of labour is deliberate: the property test
// proves the if-and-only-if across generated inputs, and this file pins the
// specific values a reader of the requirements would ask about — `'  '`, `2.5`,
// `0`, `11`, `' attending'` — plus the two facts no generator can check, namely
// that the encoded field names match the Netlify stub in `index.html` and that
// `form-name` carries the configured form name.
//
// It reads `index.html` from disk rather than asserting against a hardcoded
// list. The field names are a contract between two files that no build step
// checks, so the test has to look at both sides; a list copied into this file
// would keep passing after a rename on either side.
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

import weddingConfig from '../config/weddingConfig.js'
import { ATTENDANCE_CHOICES, RSVP_FIELD_ORDER, encodeRsvpPayload, validateRsvp } from './rsvp.js'

/** A submission that satisfies every rule, used as the base for one-field edits. */
const VALID = {
  guestName: 'Bricx Carasco',
  attendance: 'attending',
  guestCount: 2,
  message: 'Wishing you both the very best.',
}

/** Same shape with one field replaced. Keeps each case a single readable line. */
function withField(field, value) {
  return { ...VALID, [field]: value }
}

/**
 * The field names the encoder emits, other than `form-name`. Taken from the
 * module's own export so the two files cannot disagree about the field set.
 */
const PAYLOAD_FIELDS = RSVP_FIELD_ORDER

// Resolved relative to this file, not `process.cwd()`, which varies with where
// vitest was invoked from.
const HERE = dirname(fileURLToPath(import.meta.url))
const INDEX_HTML = readFileSync(resolve(HERE, '..', '..', 'index.html'), 'utf8')

/**
 * Field names on the Netlify detection stub in `index.html`, read out of the
 * actual markup.
 *
 * Parsed with jsdom's `DOMParser` — available because the suite runs in the
 * jsdom environment — rather than with a regex, so the assertion is about the
 * form the detector will parse rather than about text that happens to appear in
 * the file. The stub carries `hidden`, `inert` and `aria-hidden`, none of which
 * affect parsing.
 */
function stubFieldNames() {
  const doc = new DOMParser().parseFromString(INDEX_HTML, 'text/html')
  const form = doc.querySelector('form[name][data-netlify="true"]')
  // Thrown rather than asserted: this runs at collection time, before any test
  // is executing, so a failed `expect` here would surface as a confusing
  // suite-level error instead of a readable message.
  if (!form) {
    throw new Error('no form[name][data-netlify="true"] found in index.html (requirement 8.3)')
  }

  return {
    formName: form.getAttribute('name'),
    names: [...form.querySelectorAll('[name]')].map((el) => el.getAttribute('name')),
  }
}

describe('validateRsvp', () => {
  describe('guest name (8.4)', () => {
    it('accepts an ordinary name', () => {
      expect(validateRsvp(VALID)).not.toHaveProperty('guestName')
    })

    it.each([
      ['empty string', ''],
      ['single space', ' '],
      ['two spaces', '  '],
      ['tab and newline', '\t\n'],
      ['non-breaking-space-free whitespace run', '   \r\n  '],
      ['absent', undefined],
      ['null', null],
    ])('rejects a %s name', (_label, guestName) => {
      const errors = validateRsvp(withField('guestName', guestName))
      expect(errors).toHaveProperty('guestName')
    })

    it('accepts a name padded with whitespace around real content', () => {
      // Trimming decides emptiness, but padding is not itself a rejection
      // reason — the guest typed a name, so the name is valid. The encoder is
      // what removes the padding.
      const errors = validateRsvp(withField('guestName', '   Giohannah Mae   '))
      expect(errors).not.toHaveProperty('guestName')
    })

    it('accepts a single non-whitespace character', () => {
      expect(validateRsvp(withField('guestName', 'M'))).not.toHaveProperty('guestName')
    })
  })

  describe('attendance (8.5)', () => {
    it.each(ATTENDANCE_CHOICES)('accepts the %s choice', (attendance) => {
      expect(validateRsvp(withField('attendance', attendance))).not.toHaveProperty('attendance')
    })

    it.each([
      ['unset', undefined],
      ['null', null],
      ['empty string', ''],
      ['a third option', 'maybe'],
      ['a boolean', true],
      ['a number', 1],
    ])('rejects %s attendance', (_label, attendance) => {
      expect(validateRsvp(withField('attendance', attendance))).toHaveProperty('attendance')
    })

    it.each([
      ' attending',
      'attending ',
      'Attending',
      'ATTENDING',
      'not attending',
      'notattending',
      'Not-Attending',
      'not-attending\n',
    ])('rejects the near-miss %o', (attendance) => {
      // These are wire values written by the radio inputs, not free text a
      // guest types, so an inexact match really is "unset" rather than a typo
      // worth forgiving. Trimming or case-folding here would let a hand-built
      // POST through with a value Netlify would then store verbatim.
      expect(validateRsvp(withField('attendance', attendance))).toHaveProperty('attendance')
    })
  })

  describe('guest count (8.6)', () => {
    it.each([
      ['empty string', ''],
      ['whitespace only', '  '],
      ['non-numeric text', 'abc'],
      ['a fraction', 2.5],
      ['zero, below the minimum', 0],
      ['eleven, above the maximum', 11],
      ['negative', -1],
      ['NaN', NaN],
      ['null', null],
      ['absent', undefined],
    ])('rejects %s', (_label, guestCount) => {
      expect(validateRsvp(withField('guestCount', guestCount))).toHaveProperty('guestCount')
    })

    it.each([
      ['the minimum as a number', 1],
      ['the maximum as a number', 10],
      ['the minimum as a string', '1'],
      ['the maximum as a string', '10'],
      ['a mid-range number', 4],
      ['a mid-range string', '4'],
    ])('accepts %s', (_label, guestCount) => {
      expect(validateRsvp(withField('guestCount', guestCount))).not.toHaveProperty('guestCount')
    })

    it('rejects a fractional value rather than flooring it', () => {
      // 2.5 must not be silently read as 2. A guest who typed a fraction is
      // asked what they meant.
      expect(validateRsvp(withField('guestCount', 2.5))).toHaveProperty('guestCount')
      expect(validateRsvp(withField('guestCount', '2.5'))).toHaveProperty('guestCount')
    })

    it('honours limits passed in explicitly instead of the config defaults', () => {
      const limits = { minGuests: 2, maxGuests: 3 }
      expect(validateRsvp(withField('guestCount', 1), limits)).toHaveProperty('guestCount')
      expect(validateRsvp(withField('guestCount', 2), limits)).not.toHaveProperty('guestCount')
      expect(validateRsvp(withField('guestCount', 4), limits)).toHaveProperty('guestCount')
    })

    it('DELIBERATE: guest count is still required when attendance is not-attending (8.6)', () => {
      // Requirement 8.6 states the guest count rule unconditionally, so there
      // is no `if (attendance === 'attending')` guard in `validateRsvp` and none
      // should be added. This test is the guard on that decision: making the
      // count optional for a declining guest looks like an obvious usability
      // improvement, and it is the change most likely to be made by someone who
      // has not read 8.6. If this test starts failing, the requirement changed
      // or someone "fixed" a behaviour that was never broken — check 8.6 before
      // touching it. The mitigation for the awkwardness lives in the label copy
      // in `Rsvp.jsx`, not in a branch here.
      const declining = {
        guestName: 'Bricx Carasco',
        attendance: 'not-attending',
        guestCount: '',
        message: 'So sorry to miss it.',
      }

      const errors = validateRsvp(declining)
      expect(errors).toHaveProperty('guestCount')
      expect(errors).not.toHaveProperty('attendance')
      expect(errors).not.toHaveProperty('guestName')

      // And a declining guest who does enter a number passes cleanly.
      expect(validateRsvp({ ...declining, guestCount: 1 })).toEqual({})
    })
  })

  describe('valid submissions', () => {
    it('returns exactly {} for a fully valid input', () => {
      expect(validateRsvp(VALID)).toEqual({})
    })

    it('returns {} with the optional message absent (8.1)', () => {
      const { message: _message, ...withoutMessage } = VALID
      expect(validateRsvp(withoutMessage)).toEqual({})
    })

    it('never reports an error for the optional message field', () => {
      for (const message of ['', '   ', 'x'.repeat(5000), null, undefined, 42]) {
        expect(validateRsvp(withField('message', message))).not.toHaveProperty('message')
      }
    })
  })

  describe('totality', () => {
    it.each([
      ['undefined', undefined],
      ['null', null],
      ['an empty object', {}],
    ])('returns an errors map for %s without throwing', (_label, values) => {
      let errors
      expect(() => {
        errors = validateRsvp(values)
      }).not.toThrow()

      expect(errors).toEqual({
        guestName: expect.any(String),
        attendance: expect.any(String),
        guestCount: expect.any(String),
      })
    })

    it('falls back to the config limits when limits is nullish', () => {
      expect(validateRsvp(VALID, null)).toEqual({})
      expect(validateRsvp(VALID, undefined)).toEqual({})
    })

    it('reports all three fields at once when all three are wrong', () => {
      const errors = validateRsvp({ guestName: ' ', attendance: 'maybe', guestCount: 99 })
      expect(Object.keys(errors).sort()).toEqual(['attendance', 'guestCount', 'guestName'])
    })
  })

  describe('error messages identify their field (8.4, 8.5, 8.6)', () => {
    const allWrong = validateRsvp(undefined)

    it.each(Object.entries(allWrong))('%s message is a non-empty string', (_field, message) => {
      expect(typeof message).toBe('string')
      expect(message.trim()).not.toBe('')
    })

    // Requirements 8.4-8.6 each want a message "identifying the field". The
    // message renders beside its own control, so position carries most of that,
    // but the wording has to stand on its own too — a screen reader announcing
    // the message out of context, or a guest scanning a list of errors, needs to
    // know which field is meant. Each message must therefore name the thing it
    // is about in words a guest would recognise.
    it.each([
      ['guestName', [/\bname\b/i]],
      ['attendance', [/\bjoin\b/i, /\battend/i, /\bcoming\b/i]],
      ['guestCount', [/\bguests?\b/i, /\bnumber\b/i, /\bhow many\b/i]],
    ])('%s message names its field', (field, patterns) => {
      const message = allWrong[field]
      expect(
        patterns.some((pattern) => pattern.test(message)),
        `${field} message ${JSON.stringify(message)} does not identify its field`,
      ).toBe(true)
    })

    it('states the configured range in the guest count message (8.6)', () => {
      const { minGuests, maxGuests } = weddingConfig.rsvp
      expect(allWrong.guestCount).toContain(String(minGuests))
      expect(allWrong.guestCount).toContain(String(maxGuests))
    })
  })
})

describe('encodeRsvpPayload', () => {
  it('sets form-name to the configured form name (8.2)', () => {
    const params = new URLSearchParams(encodeRsvpPayload(VALID))

    expect(params.has('form-name')).toBe(true)
    expect(params.get('form-name')).toBe(weddingConfig.rsvp.formName)
    expect(weddingConfig.rsvp.formName).toBe('rsvp')
  })

  it('puts form-name first in the body', () => {
    // Not cosmetic: Netlify routes the submission on this field, and putting it
    // first means a truncated body fails loudly rather than being filed under
    // no form at all.
    expect(encodeRsvpPayload(VALID).startsWith('form-name=')).toBe(true)
  })

  it('honours an explicitly passed form name', () => {
    const params = new URLSearchParams(encodeRsvpPayload(VALID, 'other-form'))
    expect(params.get('form-name')).toBe('other-form')
  })

  it('carries every entered value', () => {
    const params = new URLSearchParams(encodeRsvpPayload(VALID))

    expect(params.get('guestName')).toBe(VALID.guestName)
    expect(params.get('attendance')).toBe(VALID.attendance)
    expect(params.get('guestCount')).toBe(String(VALID.guestCount))
    expect(params.get('message')).toBe(VALID.message)
  })

  it('trims the guest name', () => {
    const params = new URLSearchParams(encodeRsvpPayload(withField('guestName', '  Mae  ')))
    expect(params.get('guestName')).toBe('Mae')
  })

  it('encodes absent fields as empty strings rather than the text "undefined"', () => {
    const params = new URLSearchParams(encodeRsvpPayload({}))

    for (const field of PAYLOAD_FIELDS) {
      expect(params.has(field), `${field} should be present`).toBe(true)
      expect(params.get(field), `${field} should encode as an empty string`).toBe('')
    }
  })

  it('is total for nullish input', () => {
    for (const values of [undefined, null]) {
      let body
      expect(() => {
        body = encodeRsvpPayload(values)
      }).not.toThrow()
      expect(new URLSearchParams(body).get('form-name')).toBe(weddingConfig.rsvp.formName)
    }
  })

  it('emits each field exactly once', () => {
    const keys = [...new URLSearchParams(encodeRsvpPayload(VALID)).keys()]
    expect(keys).toEqual(['form-name', ...PAYLOAD_FIELDS])
  })

  describe('agreement with the Netlify detection stub in index.html (8.2, 8.3)', () => {
    const { formName, names } = stubFieldNames()

    it('encodes exactly the field names the stub declares', () => {
      // Both sides read from the files as they are. Renaming a field in
      // `rsvp.js` alone, or in `index.html` alone, fails here — which is the
      // failure that would otherwise show up as silently dropped RSVPs after a
      // deploy, because Netlify rejects a POST whose form it cannot match.
      const encoded = [...new URLSearchParams(encodeRsvpPayload(VALID)).keys()].sort()
      expect(encoded).toEqual([...names].sort())
    })

    it('sends the form name the stub registers', () => {
      expect(weddingConfig.rsvp.formName).toBe(formName)
      expect(new URLSearchParams(encodeRsvpPayload(VALID)).get('form-name')).toBe(formName)
    })

    it("matches the stub's own hidden form-name value", () => {
      const doc = new DOMParser().parseFromString(INDEX_HTML, 'text/html')
      const hidden = doc.querySelector('form[data-netlify="true"] input[name="form-name"]')
      expect(hidden, 'the stub has no hidden form-name input (8.2)').not.toBeNull()
      expect(hidden.getAttribute('value')).toBe(formName)
    })
  })
})
