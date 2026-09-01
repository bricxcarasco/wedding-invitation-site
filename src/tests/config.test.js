// Wedding_Config shape and content guard.
//
// weddingConfig.js is the single source of truth for every wedding-specific
// value (14.6), which makes it the single point of failure: a hand-edit that
// drops a key, mistypes a hex, rewrites the story past its word bound, or
// pastes a map link pointing at the wrong venue would break a requirement
// without breaking a build. Nothing else in the repository would notice. This
// file is what notices.
//
// It deliberately imports nothing from `./helpers.js`. Those utilities exist to
// mount React trees under a chosen reduced-motion preference; this suite renders
// nothing and touches no DOM, so it needs none of them, and an unused import
// would only fail lint.
import { describe, expect, it } from 'vitest'

import weddingConfig, { CEREMONY_DATETIME, palette } from '../config/weddingConfig.js'

const HEX_PATTERN = /^#[0-9a-f]{6}$/i

// Requirement 5.1's bound on the `story` copy, inclusive at both ends. The
// floor was lowered from 60 to accommodate a short scripture quotation (the
// couple replaced the long first-person narrative with a Bible verse); the
// ceiling stays at 200 so a longer narrative can still be dropped back in.
const STORY_MIN_WORDS = 20
const STORY_MAX_WORDS = 200

/** Requirement 6.1's floor on the gallery, and the intrinsic size 6.4 needs. */
const GALLERY_MIN_ENTRIES = 7
const GALLERY_IMAGE_WIDTH = 1200
const GALLERY_IMAGE_HEIGHT = 800

/**
 * The subjects requirement 6.1 enumerates, in config's kebab-case spelling.
 * Listed independently of the config rather than derived from it — deriving the
 * expectation from the value under test would assert nothing.
 */
const REQUIRED_GALLERY_SUBJECTS = [
  'rings',
  'couple-portrait',
  'ceremony',
  'flowers',
  'venue',
  'outdoor-scenery',
  'reception-details',
]

/**
 * Hosts Google serves Maps from. `www.google.com` is what `mapsSearchUrl`
 * builds today; the others are here so that pasting a precise share link or a
 * place-ID URL over either `mapsUrl` — which the config comment explicitly
 * invites — does not fail this suite for the wrong reason.
 */
const GOOGLE_MAPS_HOSTS = new Set([
  'www.google.com',
  'google.com',
  'maps.google.com',
  'www.google.com.ph',
  'google.com.ph',
  'maps.app.goo.gl',
  'goo.gl',
])

/** Word count the way requirement 5.1 is read: whitespace-separated tokens. */
function countWords(text) {
  return text.split(/\s+/).filter((word) => word.length > 0).length
}

describe('Wedding_Config', () => {
  describe('required string values (14.1, 14.2, 14.3)', () => {
    // Path-and-value pairs rather than a nested walk, so a failure names the
    // exact config path a reader can go and open.
    const requiredStrings = [
      ['couple.groomName', weddingConfig.couple?.groomName],
      ['couple.brideName', weddingConfig.couple?.brideName],
      ['couple.displayNames', weddingConfig.couple?.displayNames],
      ['couple.tagline', weddingConfig.couple?.tagline],
      ['schedule.ceremonyDatetime', weddingConfig.schedule?.ceremonyDatetime],
      ['schedule.displayDate', weddingConfig.schedule?.displayDate],
      ['schedule.displayTime', weddingConfig.schedule?.displayTime],
      ['ceremony.label', weddingConfig.ceremony?.label],
      ['ceremony.venueName', weddingConfig.ceremony?.venueName],
      ['ceremony.mapsUrl', weddingConfig.ceremony?.mapsUrl],
      ['reception.label', weddingConfig.reception?.label],
      ['reception.venueName', weddingConfig.reception?.venueName],
      ['reception.mapsUrl', weddingConfig.reception?.mapsUrl],
      ['story', weddingConfig.story],
      ['dressCode.guidance', weddingConfig.dressCode?.guidance],
      ['calendar.summary', weddingConfig.calendar?.summary],
      ['calendar.description', weddingConfig.calendar?.description],
      ['rsvp.formName', weddingConfig.rsvp?.formName],
    ]

    it.each(requiredStrings)('%s is a non-empty string', (path, value) => {
      expect(typeof value, `${path} should be a string`).toBe('string')
      expect(value.trim(), `${path} should not be blank`).not.toBe('')
    })

    it('exposes every top-level group the site reads from', () => {
      expect(Object.keys(weddingConfig)).toEqual(
        expect.arrayContaining([
          'couple',
          'schedule',
          'ceremony',
          'reception',
          'palette',
          'story',
          'dressCode',
          'gallery',
          'calendar',
          'rsvp',
        ]),
      )
    })
  })

  describe('Ceremony_Datetime (14.2, 3.6)', () => {
    it('parses to a finite instant', () => {
      const parsed = Date.parse(CEREMONY_DATETIME)
      expect(
        Number.isFinite(parsed),
        `CEREMONY_DATETIME ${JSON.stringify(CEREMONY_DATETIME)} is not a parseable date`,
      ).toBe(true)
    })

    it('is the same value as schedule.ceremonyDatetime', () => {
      // Two bindings, one instant. If these ever drift, the countdown and the
      // .ics file would disagree about when the wedding is.
      expect(weddingConfig.schedule.ceremonyDatetime).toBe(CEREMONY_DATETIME)
    })
  })

  describe('Palette (14.4, 7.2, 7.3)', () => {
    it('is the same array on the named export and the default export', () => {
      expect(weddingConfig.palette).toBe(palette)
    })

    it('has exactly four entries', () => {
      expect(Array.isArray(palette)).toBe(true)
      expect(palette).toHaveLength(4)
    })

    it.each(palette)('$name is a named #rrggbb token', ({ name, hex }) => {
      expect(typeof name).toBe('string')
      expect(name.trim(), 'palette entry name should not be blank').not.toBe('')
      expect(typeof hex).toBe('string')
      expect(hex, `palette entry ${name} has an invalid hex`).toMatch(HEX_PATTERN)
    })
  })

  describe('Gallery (6.1, 6.4, 14.5)', () => {
    const { gallery } = weddingConfig

    it(`has at least ${GALLERY_MIN_ENTRIES} entries`, () => {
      expect(Array.isArray(gallery)).toBe(true)
      expect(gallery.length).toBeGreaterThanOrEqual(GALLERY_MIN_ENTRIES)
    })

    it.each(gallery.map((entry, index) => ({ ...entry, index })))(
      'entry $index ($subject) carries a bundled src, alt text and intrinsic size',
      ({ index, subject, src, alt, width, height }) => {
        const at = `gallery[${index}] (${subject})`

        expect(typeof subject, `${at} subject should be a string`).toBe('string')
        expect(subject.trim(), `${at} subject should not be blank`).not.toBe('')

        expect(src, `${at} src should resolve to a bundled asset`).toBeTruthy()

        expect(typeof alt, `${at} alt should be a string`).toBe('string')
        expect(alt.trim(), `${at} alt should not be blank`).not.toBe('')

        expect(width, `${at} width`).toBe(GALLERY_IMAGE_WIDTH)
        expect(height, `${at} height`).toBe(GALLERY_IMAGE_HEIGHT)
      },
    )

    it('gives every entry a distinct subject', () => {
      const subjects = gallery.map((entry) => entry.subject)
      expect(subjects, 'gallery subjects should be unique').toHaveLength(new Set(subjects).size)
    })

    it.each(REQUIRED_GALLERY_SUBJECTS)('covers the %s subject', (subject) => {
      expect(gallery.map((entry) => entry.subject)).toContain(subject)
    })
  })

  describe('Story (5.1)', () => {
    it(`is between ${STORY_MIN_WORDS} and ${STORY_MAX_WORDS} words`, () => {
      const words = countWords(weddingConfig.story)
      expect(
        words,
        `story is ${words} words, outside the ${STORY_MIN_WORDS}-${STORY_MAX_WORDS} bound requirement 5.1 sets`,
      ).toBeGreaterThanOrEqual(STORY_MIN_WORDS)
      expect(
        words,
        `story is ${words} words, outside the ${STORY_MIN_WORDS}-${STORY_MAX_WORDS} bound requirement 5.1 sets`,
      ).toBeLessThanOrEqual(STORY_MAX_WORDS)
    })
  })

  describe('Venue map links (14.3, 4.4, 4.5)', () => {
    it.each([
      ['ceremony', weddingConfig.ceremony],
      ['reception', weddingConfig.reception],
    ])('%s mapsUrl is an https Google Maps URL pointing at its own venue', (key, venue) => {
      const { venueName, mapsUrl } = venue

      expect(mapsUrl.startsWith('https://'), `${key} mapsUrl should be https: ${mapsUrl}`).toBe(true)

      // Throws on a malformed URL, which is the failure we want to see.
      const parsed = new URL(mapsUrl)
      expect(
        GOOGLE_MAPS_HOSTS.has(parsed.host),
        `${key} mapsUrl host ${parsed.host} is not a Google Maps host`,
      ).toBe(true)

      // The assertion that actually matters: the link carries this venue's own
      // name, URL-encoded. An absolute-and-well-formed URL can still point at
      // the wrong place; this cannot.
      expect(
        mapsUrl,
        `${key} mapsUrl does not contain the encoded form of its own venueName`,
      ).toContain(encodeURIComponent(venueName))
    })

    it('gives the two venues different links', () => {
      expect(weddingConfig.ceremony.mapsUrl).not.toBe(weddingConfig.reception.mapsUrl)
      expect(weddingConfig.ceremony.venueName).not.toBe(weddingConfig.reception.venueName)
    })
  })

  describe('Calendar (14.6, 9.3)', () => {
    it('holds no location key', () => {
      // buildCeremonyEvent() derives the location from `ceremony.venueName`, so
      // the venue string exists exactly once in the repository. Re-adding a
      // `calendar.location` would create the second copy 14.6 forbids, and it
      // would be a plausible-looking edit — hence this guard.
      expect(Object.keys(weddingConfig.calendar)).not.toContain('location')
      expect('location' in weddingConfig.calendar).toBe(false)
    })

    it('sets a positive event duration', () => {
      const { durationMinutes } = weddingConfig.calendar
      expect(typeof durationMinutes).toBe('number')
      expect(Number.isFinite(durationMinutes)).toBe(true)
      expect(durationMinutes).toBeGreaterThan(0)
    })
  })

  describe('Rsvp (8.1, 8.6)', () => {
    it('bounds the guest count to 1 through 10', () => {
      const { minGuests, maxGuests } = weddingConfig.rsvp
      expect(minGuests).toBe(1)
      expect(maxGuests).toBe(10)
      expect(minGuests).toBeLessThan(maxGuests)
    })
  })
})
