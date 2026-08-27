// Worked examples for `lib/icalendar.js`.
//
// Property 7 (in `icalendar.property.test.js`) asserts that the serialiser
// round-trips for *any* event. This file pins the handful of concrete values a
// round-trip cannot see, because a round-trip is symmetric: an escaper and an
// unescaper that agree on the wrong convention still round-trip perfectly. So
// the assertions here are deliberately one-sided and literal —
//
//   - the exact bytes `DTSTART:20270213T060000Z` for the real Ceremony_Datetime,
//     which is what 9.3's "expressed in UTC" reduces to once the `+08:00` offset
//     is resolved,
//   - the exact escape `\,` in the LOCATION line, which is the difference
//     between a guest's calendar showing the whole venue and showing "Our Lady
//     of Guadalupe Parish Church",
//   - the exact default filename (9.2),
//   - and the object-URL lifecycle (9.5), which is a side effect and therefore
//     outside the pure serialiser entirely.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import weddingConfig from '../config/weddingConfig.js'
import { buildCeremonyEvent, downloadIcs, toIcs } from './icalendar.js'

const CRLF = '\r\n'
const MAX_LINE_OCTETS = 75
const DEFAULT_FILENAME = 'bricx-and-mae-wedding.ics'

const encoder = new TextEncoder()

/**
 * Reverse RFC 5545 §3.1 folding: drop every CRLF that is followed by a single
 * space. Written here rather than imported, because a helper shared with the
 * module under test would only prove the module agrees with itself.
 *
 * Unambiguous by construction: `escapeText` turns every CR and LF in a value
 * into the two-character escape `\n`, so no CRLF in the output can be anything
 * other than structural.
 */
function unfold(ics) {
  return ics.split(`${CRLF} `).join('')
}

/**
 * Reverse RFC 5545 §3.3.11 escaping in a single left-to-right pass.
 *
 * A single pass, rather than four sequential `replace` calls, because sequential
 * replacement cannot be made correct in either direction. Take the value `\n`
 * (a literal backslash followed by the letter n). The escaper emits `\\n`.
 * Replacing `\n` → newline first matches at offset 1 and yields backslash +
 * newline; replacing `\\` → `\` first yields `\n` and the next pass turns it
 * into a newline. Both are wrong, and the property test generates exactly this
 * string. Consuming two characters at a time is the only decoder that holds.
 */
function unescapeText(value) {
  let out = ''
  for (let i = 0; i < value.length; i += 1) {
    if (value[i] !== '\\' || i + 1 >= value.length) {
      out += value[i]
      continue
    }
    const next = value[i + 1]
    if (next === 'n' || next === 'N') out += '\n'
    else if (next === ',') out += ','
    else if (next === ';') out += ';'
    else if (next === '\\') out += '\\'
    else out += next
    i += 1
  }
  return out
}

/** Raw (still-escaped) value of the `name` property, or `undefined`. */
function rawProperty(ics, name) {
  const prefix = `${name}:`
  const line = unfold(ics)
    .split(CRLF)
    .find((candidate) => candidate.startsWith(prefix))
  return line === undefined ? undefined : line.slice(prefix.length)
}

/** Decoded value of the `name` property. */
function readProperty(ics, name) {
  const raw = rawProperty(ics, name)
  return raw === undefined ? undefined : unescapeText(raw)
}

describe('toIcs — the Ceremony_Datetime in UTC (9.3)', () => {
  const ics = toIcs(buildCeremonyEvent())

  it('serialises 2027-02-13T14:00:00+08:00 as DTSTART:20270213T060000Z', () => {
    // Not `toContain` on a substring of a timestamp: the whole line, so a stray
    // trailing character or a missing `Z` fails.
    expect(ics.split(CRLF)).toContain('DTSTART:20270213T060000Z')
  })

  it('serialises the 90-minute duration as DTEND:20270213T073000Z', () => {
    expect(weddingConfig.calendar.durationMinutes).toBe(90)
    expect(ics.split(CRLF)).toContain('DTEND:20270213T073000Z')
  })

  it('carries the ceremony summary and the venue as the location', () => {
    expect(readProperty(ics, 'SUMMARY')).toBe(weddingConfig.calendar.summary)
    expect(readProperty(ics, 'LOCATION')).toBe(weddingConfig.ceremony.venueName)
  })

  it('does not derive DTSTAMP from the clock, so the output is byte-stable', () => {
    // Two calls, one string. A `Date.now()`-derived DTSTAMP would break this and
    // would also leave Property 7 with nothing stable to compare against.
    expect(toIcs(buildCeremonyEvent())).toBe(ics)
  })
})

describe('toIcs — comma escaping in LOCATION (9.3)', () => {
  // Both venue names contain commas, and a comma is the value separator in a
  // TEXT property. Emitted raw, the guest's calendar app reads everything after
  // the first comma as a second value and shows only the first — the venue
  // silently truncates. This is the assertion that catches that.
  const venues = [
    ['ceremony', weddingConfig.ceremony.venueName],
    ['reception', weddingConfig.reception.venueName],
  ]

  it.each(venues)('%s venueName contains at least one comma to begin with', (_key, venueName) => {
    // Guards the two tests below from silently passing on a comma-free string.
    expect(venueName).toContain(',')
  })

  it.each(venues)('%s LOCATION emits every comma as \\, and none raw', (key, venueName) => {
    const raw = rawProperty(
      toIcs({ uid: 'uid-1', summary: 's', description: 'd', location: venueName, startMs: 0, endMs: 1000 }),
      'LOCATION',
    )

    const expectedCommas = (venueName.match(/,/g) ?? []).length
    // Every comma present, and every one of them preceded by a backslash.
    expect((raw.match(/\\,/g) ?? []).length, `${key} LOCATION: ${raw}`).toBe(expectedCommas)
    expect((raw.match(/,/g) ?? []).length, `${key} LOCATION: ${raw}`).toBe(expectedCommas)
    // No comma sitting at the start of the value or directly after a non-escape.
    expect(/(^|[^\\]),/.test(raw), `unescaped comma in ${key} LOCATION: ${raw}`).toBe(false)
  })

  it.each(venues)('%s LOCATION unescapes back to the exact venue string', (key, venueName) => {
    const ics = toIcs({
      uid: 'uid-1',
      summary: 's',
      description: 'd',
      location: venueName,
      startMs: 0,
      endMs: 1000,
    })
    expect(readProperty(ics, 'LOCATION')).toBe(venueName)
  })

  it('escapes the backslash before the characters whose escapes introduce one', () => {
    // `a\,b` — one literal backslash, one literal comma. Correct output is
    // `a\\\,b`. Escaping `\` last would emit `a\\\\,b`, which decodes to a
    // literal backslash followed by a value separator.
    const ics = toIcs({ uid: 'u', summary: 'a\\,b', description: '', location: '', startMs: 0, endMs: 0 })
    expect(rawProperty(ics, 'SUMMARY')).toBe('a\\\\\\,b')
    expect(readProperty(ics, 'SUMMARY')).toBe('a\\,b')
  })

  it('escapes semicolons and collapses CR, LF and CRLF to \\n', () => {
    const ics = toIcs({
      uid: 'u',
      summary: 'a;b',
      description: 'x\r\ny\nz\rw',
      location: '',
      startMs: 0,
      endMs: 0,
    })
    expect(rawProperty(ics, 'SUMMARY')).toBe('a\\;b')
    expect(rawProperty(ics, 'DESCRIPTION')).toBe('x\\ny\\nz\\nw')
  })
})

describe('toIcs — document structure', () => {
  const ics = toIcs(buildCeremonyEvent())
  const lines = ics.split(CRLF)

  it.each([['VERSION:2.0'], ['CALSCALE:GREGORIAN'], ['METHOD:PUBLISH']])(
    'emits %s',
    (line) => {
      expect(lines).toContain(line)
    },
  )

  it('emits a PRODID identifying the generator', () => {
    const prodid = lines.find((line) => line.startsWith('PRODID:'))
    expect(prodid).toBeDefined()
    expect(prodid.slice('PRODID:'.length).trim()).not.toBe('')
  })

  it.each([['VCALENDAR'], ['VEVENT']])('opens and closes %s exactly once, in order', (component) => {
    const begin = lines.indexOf(`BEGIN:${component}`)
    const end = lines.indexOf(`END:${component}`)

    expect(begin).toBeGreaterThanOrEqual(0)
    expect(end).toBeGreaterThan(begin)
    expect(lines.filter((line) => line === `BEGIN:${component}`)).toHaveLength(1)
    expect(lines.filter((line) => line === `END:${component}`)).toHaveLength(1)
  })

  it('nests VEVENT inside VCALENDAR', () => {
    expect(lines.indexOf('BEGIN:VCALENDAR')).toBeLessThan(lines.indexOf('BEGIN:VEVENT'))
    expect(lines.indexOf('END:VEVENT')).toBeLessThan(lines.indexOf('END:VCALENDAR'))
    expect(lines[0]).toBe('BEGIN:VCALENDAR')
    expect(lines.at(-1)).toBe('END:VCALENDAR')
  })

  it('uses CRLF throughout, with no bare CR and no bare LF', () => {
    // Splitting on CRLF and finding no residual CR or LF in any segment proves
    // every CR is followed by an LF and every LF is preceded by a CR.
    for (const line of lines) {
      expect(line.includes('\r'), `bare CR in ${JSON.stringify(line)}`).toBe(false)
      expect(line.includes('\n'), `bare LF in ${JSON.stringify(line)}`).toBe(false)
    }
  })

  it('keeps every physical line within 75 octets', () => {
    for (const line of lines) {
      expect(encoder.encode(line).length, `line too long: ${JSON.stringify(line)}`).toBeLessThanOrEqual(
        MAX_LINE_OCTETS,
      )
    }
  })
})

describe('buildCeremonyEvent', () => {
  it('derives location from ceremony.venueName rather than a calendar key', () => {
    const event = buildCeremonyEvent()
    expect(event.location).toBe(weddingConfig.ceremony.venueName)
    expect(weddingConfig.calendar).not.toHaveProperty('location')
  })

  it('reads the start instant from schedule.ceremonyDatetime', () => {
    expect(buildCeremonyEvent().startMs).toBe(Date.parse(weddingConfig.schedule.ceremonyDatetime))
  })

  it('produces the same uid on every call', () => {
    // A calendar app dedupes imports on UID. A random or clock-derived UID would
    // give a guest who taps "Add to Calendar" twice two ceremonies.
    expect(buildCeremonyEvent().uid).toBe(buildCeremonyEvent().uid)
    expect(buildCeremonyEvent()).toEqual(buildCeremonyEvent())
  })

  it('honours a supplied config rather than the module default', () => {
    const custom = {
      ...weddingConfig,
      ceremony: { ...weddingConfig.ceremony, venueName: 'Elsewhere, Somewhere' },
      schedule: { ...weddingConfig.schedule, ceremonyDatetime: '2030-01-01T00:00:00+08:00' },
    }
    const event = buildCeremonyEvent(custom)

    expect(event.location).toBe('Elsewhere, Somewhere')
    expect(event.startMs).toBe(Date.parse('2030-01-01T00:00:00+08:00'))
    // Date and venue both moved, so this is legitimately a different event.
    expect(event.uid).not.toBe(buildCeremonyEvent().uid)
  })
})

describe('downloadIcs — object URL lifecycle (9.2, 9.5)', () => {
  const hadCreate = 'createObjectURL' in URL
  const hadRevoke = 'revokeObjectURL' in URL
  const originalCreate = URL.createObjectURL
  const originalRevoke = URL.revokeObjectURL

  let createObjectURL
  let revokeObjectURL
  let anchors

  beforeEach(() => {
    vi.useFakeTimers()

    // jsdom implements neither, so these are assigned rather than spied.
    createObjectURL = vi.fn(() => 'blob:test/object-url')
    revokeObjectURL = vi.fn()
    URL.createObjectURL = createObjectURL
    URL.revokeObjectURL = revokeObjectURL

    anchors = []
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()

    if (hadCreate) URL.createObjectURL = originalCreate
    else delete URL.createObjectURL
    if (hadRevoke) URL.revokeObjectURL = originalRevoke
    else delete URL.revokeObjectURL
  })

  /**
   * Capture generated anchors and neuter `click`. jsdom has no navigation, so a
   * real `a.click()` on a download link logs "Not implemented: navigation to
   * another Document" for every test in this block.
   */
  function stubAnchors() {
    const realCreateElement = document.createElement.bind(document)
    vi.spyOn(document, 'createElement').mockImplementation((tagName, ...rest) => {
      const element = realCreateElement(tagName, ...rest)
      if (String(tagName).toLowerCase() === 'a') {
        element.click = vi.fn()
        anchors.push(element)
      }
      return element
    })
  }

  it('revokes exactly as many object URLs as it creates', () => {
    stubAnchors()

    downloadIcs(buildCeremonyEvent())

    expect(createObjectURL).toHaveBeenCalledTimes(1)
    // Deferred to the next macrotask on purpose: revoking in the same tick can
    // cancel an in-flight blob fetch in some browsers.
    expect(revokeObjectURL).not.toHaveBeenCalled()

    vi.runAllTimers()

    expect(revokeObjectURL).toHaveBeenCalledTimes(createObjectURL.mock.calls.length)
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:test/object-url')
  })

  it('keeps the counts equal across repeated downloads', () => {
    stubAnchors()

    downloadIcs(buildCeremonyEvent())
    downloadIcs(buildCeremonyEvent())
    downloadIcs(buildCeremonyEvent())
    vi.runAllTimers()

    expect(createObjectURL).toHaveBeenCalledTimes(3)
    expect(revokeObjectURL).toHaveBeenCalledTimes(3)
  })

  it('still schedules revocation when anchor creation throws', () => {
    // The reason the `finally` exists. Without it the object URL leaks for the
    // lifetime of the document on the failure path.
    vi.spyOn(document, 'createElement').mockImplementation(() => {
      throw new Error('createElement failed')
    })

    expect(() => downloadIcs(buildCeremonyEvent())).toThrow('createElement failed')

    expect(createObjectURL).toHaveBeenCalledTimes(1)
    expect(revokeObjectURL).not.toHaveBeenCalled()

    vi.runAllTimers()

    expect(revokeObjectURL).toHaveBeenCalledTimes(1)
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:test/object-url')
  })

  it('names the file bricx-and-mae-wedding.ics when no filename is given', () => {
    stubAnchors()

    downloadIcs(buildCeremonyEvent())
    vi.runAllTimers()

    expect(anchors).toHaveLength(1)
    expect(anchors[0].download).toBe(DEFAULT_FILENAME)
    expect(anchors[0].download.endsWith('.ics')).toBe(true)
  })

  it('honours an explicit filename', () => {
    stubAnchors()

    downloadIcs(buildCeremonyEvent(), 'custom-name.ics')
    vi.runAllTimers()

    expect(anchors[0].download).toBe('custom-name.ics')
  })

  it('clicks the anchor once, then removes it from the document', () => {
    stubAnchors()

    downloadIcs(buildCeremonyEvent())
    vi.runAllTimers()

    expect(anchors[0].click).toHaveBeenCalledTimes(1)
    expect(anchors[0].isConnected).toBe(false)
    expect(document.querySelector('a[download]')).toBeNull()
  })

  it('builds the blob as text/calendar', () => {
    stubAnchors()

    downloadIcs(buildCeremonyEvent())
    vi.runAllTimers()

    const [blob] = createObjectURL.mock.calls[0]
    expect(blob).toBeInstanceOf(Blob)
    expect(blob.type).toBe('text/calendar;charset=utf-8')
    expect(blob.size).toBeGreaterThan(0)
  })
})
