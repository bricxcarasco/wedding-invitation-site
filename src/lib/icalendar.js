// Calendar_Download — iCalendar (RFC 5545) generation for the ceremony.
//
// Requirement 9.4: browser platform APIs only. No ical library, no date
// library, no uuid library. `TextEncoder`, `Date`, `Blob`, `URL` and
// `document` are all platform surface.
//
// The module splits deliberately into two pure functions and one side effect:
//
//   buildCeremonyEvent(config)  pure   — Wedding_Config → event object
//   toIcs(event)                pure   — event object   → iCalendar text
//   downloadIcs(event, name)    effect — iCalendar text → file download
//
// Keeping the serialiser pure is what makes Property 7 testable without a DOM:
// the same event always produces byte-identical text, so a round-trip assertion
// has something stable to assert against. Nothing above `downloadIcs` reads the
// clock, the host timezone, or `document`.

import weddingConfig from '../config/weddingConfig.js'

/**
 * Filename for the downloaded file (9.2). The default lives HERE rather than at
 * the call site: `AddToCalendarButton` (task 7.4) calls `downloadIcs(event)`
 * with one argument and gets the right name, so the string is not restated in a
 * component. `filename` stays a parameter only so a test can assert the
 * `download` attribute is honoured for an arbitrary value.
 */
const DEFAULT_ICS_FILENAME = 'bricx-and-mae-wedding.ics'

/** Identifies the generator, per RFC 5545 §3.7.3. */
const PRODID = '-//Bricx and Mae//Wedding Invitation//EN'

/**
 * RFC 5545 §3.1: a content line SHOULD NOT exceed 75 octets, excluding the line
 * break. Octets, not characters — see `foldLine`.
 */
const MAX_LINE_OCTETS = 75

const CRLF = '\r\n'

const encoder = new TextEncoder()

/** UTF-8 length of `text` in octets. */
function octetLength(text) {
  return encoder.encode(text).length
}

/**
 * Deterministic 32-bit FNV-1a, base-36 encoded.
 *
 * Used only to compress the event's identifying fields into a short, stable
 * token for the UID. It is not a security primitive, and it deliberately is not
 * `crypto.subtle.digest` — that API is async, which would make
 * `buildCeremonyEvent` return a promise for no benefit.
 */
function fnv1a32(input) {
  let hash = 0x811c9dc5
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193) >>> 0
  }
  return hash.toString(36)
}

/**
 * Format an epoch-millisecond instant as an RFC 5545 UTC date-time in basic
 * format, `YYYYMMDDTHHMMSSZ` (§3.3.5, form 2).
 *
 * Built exclusively from `getUTC*` getters, so the visitor's timezone never
 * enters the output. `2027-02-13T11:00:00+08:00` parses to 1802487600000 and
 * formats to `20270213T030000Z`, which is what 9.3's "expressed in UTC" means.
 */
function toUtcBasic(epochMs) {
  const date = new Date(epochMs)
  if (Number.isNaN(date.getTime())) {
    throw new TypeError(`icalendar: not a valid timestamp: ${epochMs}`)
  }
  const pad = (value, width = 2) => String(value).padStart(width, '0')
  return (
    pad(date.getUTCFullYear(), 4) +
    pad(date.getUTCMonth() + 1) +
    pad(date.getUTCDate()) +
    'T' +
    pad(date.getUTCHours()) +
    pad(date.getUTCMinutes()) +
    pad(date.getUTCSeconds()) +
    'Z'
  )
}

/**
 * Escape a TEXT property value per RFC 5545 §3.3.11.
 *
 * The order is load-bearing: backslash FIRST, then the characters whose escapes
 * introduce new backslashes. Escaping `\` last would double-escape every
 * sequence the other three rules just produced, turning `a,b` into `a\\,b` —
 * which unescapes to the literal `a\` followed by a value separator.
 *
 * This is not cosmetic. Both venue names in Wedding_Config contain commas, and a
 * comma is the separator between multiple values in a TEXT property. Emitted
 * raw, "Our Lady of Guadalupe Parish Church, Pagsanjan, Laguna" arrives in the
 * guest's calendar truncated at the first comma.
 *
 * CR, LF and CRLF all collapse to the single escape `\n`. RFC 5545 has no
 * representation for a bare CR, so that normalisation is inherent to the format
 * rather than a choice made here.
 */
function escapeText(value) {
  return String(value ?? '')
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r\n|\r|\n/g, '\\n')
}

/**
 * Fold one content line to at most `MAX_LINE_OCTETS` octets per physical line
 * (RFC 5545 §3.1), breaking with CRLF followed by a single space.
 *
 * Two details that a naive `slice(0, 75)` gets wrong:
 *
 *  1. The limit counts OCTETS, not characters. A non-ASCII character costs 2-4
 *     octets in UTF-8, and splitting mid-sequence produces invalid UTF-8 that
 *     an importer renders as replacement characters. Iterating with `for…of`
 *     walks code points, so surrogate pairs stay intact too.
 *  2. The continuation space is part of the physical line, so it spends one of
 *     the 75 octets. Continuation segments therefore carry 74 octets of payload.
 */
function foldLine(line) {
  if (octetLength(line) <= MAX_LINE_OCTETS) return line

  const segments = []
  let segment = ''
  let segmentOctets = 0
  let limit = MAX_LINE_OCTETS

  for (const char of line) {
    const width = octetLength(char)
    if (segmentOctets + width > limit) {
      segments.push(segment)
      segment = ''
      segmentOctets = 0
      limit = MAX_LINE_OCTETS - 1 // the leading space of a continuation line
    }
    segment += char
    segmentOctets += width
  }
  segments.push(segment)

  return segments.join(`${CRLF} `)
}

/**
 * Assemble the ceremony event from Wedding_Config.
 *
 * @param {typeof weddingConfig} [config]
 * @returns {{ uid: string, summary: string, description: string,
 *            location: string, startMs: number, endMs: number }}
 */
export function buildCeremonyEvent(config = weddingConfig) {
  const { summary, description, durationMinutes } = config.calendar

  // 14.6 / 9.3: the location is READ from `ceremony.venueName`. `calendar` holds
  // no `location` key, so the venue string exists exactly once in the
  // repository and cannot drift from the one the Venue section displays.
  const location = config.ceremony.venueName

  // The design phrases this as "startMs from CEREMONY_MS". It is parsed off the
  // `config` argument instead, and the two are the same number by construction,
  // not by coincidence: `lib/countdown.js` defines
  // `CEREMONY_MS = Date.parse(CEREMONY_DATETIME)`, and
  // `schedule.ceremonyDatetime` IS that same `CEREMONY_DATETIME` binding, so
  // `startMs === CEREMONY_MS` for the default config.
  //
  // Reading the instant off `config` rather than importing the constant is what
  // keeps the `config` parameter honest: `buildCeremonyEvent(otherConfig)`
  // produces an event dated to `otherConfig`, which a module-level constant
  // would silently override. Still one source of truth — the same string in
  // Wedding_Config that `countdown.js` reads.
  const startMs = Date.parse(config.schedule.ceremonyDatetime)
  if (Number.isNaN(startMs)) {
    throw new TypeError(
      `icalendar: unparseable ceremonyDatetime: ${config.schedule.ceremonyDatetime}`,
    )
  }

  const endMs = startMs + durationMinutes * 60_000

  // A calendar app uses UID to decide whether an imported event is one it
  // already holds. A random or clock-derived UID means a guest who taps "Add to
  // Calendar" twice ends up with two ceremonies, so this is derived purely from
  // the event's own fixed data and is byte-identical on every call, in every
  // browser, forever.
  //
  // `description` is excluded from the digest on purpose: rewriting the
  // invitation blurb should update the existing entry, not fork a second one.
  // Moving the date or the venue legitimately does yield a new event.
  const identity = `${startMs}|${endMs}|${summary}|${location}`
  const uid = `wedding-${startMs.toString(36)}-${fnv1a32(identity)}@bricx-and-mae-wedding.invalid`

  return { uid, summary, description, location, startMs, endMs }
}

/**
 * Serialise an event to iCalendar text (RFC 5545).
 *
 * Pure and idempotent: the same event yields the same string every time.
 * DTSTAMP is taken from `event.dtstampMs` when present and otherwise falls back
 * to `startMs` rather than to `Date.now()`, which is what keeps that promise —
 * a clock-derived DTSTAMP would make every call produce different bytes and
 * leave Property 7 with nothing stable to compare.
 *
 * @param {{ uid: string, summary?: string, description?: string,
 *           location?: string, startMs: number, endMs: number,
 *           dtstampMs?: number }} event
 * @returns {string}
 */
export function toIcs(event) {
  const dtstampMs = event.dtstampMs ?? event.startMs

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    `PRODID:${PRODID}`,
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${escapeText(event.uid)}`,
    `DTSTAMP:${toUtcBasic(dtstampMs)}`,
    `DTSTART:${toUtcBasic(event.startMs)}`,
    `DTEND:${toUtcBasic(event.endMs)}`,
    `SUMMARY:${escapeText(event.summary)}`,
    `DESCRIPTION:${escapeText(event.description)}`,
    `LOCATION:${escapeText(event.location)}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ]

  return lines.map(foldLine).join(CRLF)
}

/**
 * Trigger a download of `event` as an `.ics` file (9.2, 9.5).
 *
 * The only function in this module that touches the DOM.
 *
 * @param {Parameters<typeof toIcs>[0]} event
 * @param {string} [filename]
 */
export function downloadIcs(event, filename = DEFAULT_ICS_FILENAME) {
  const blob = new Blob([toIcs(event)], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  try {
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.rel = 'noopener'
    document.body.appendChild(a)
    a.click()
    a.remove()
  } finally {
    // Deferred to the next macrotask rather than revoked synchronously here:
    // some browsers start fetching the blob asynchronously after `click()`, and
    // revoking in the same tick cancels the download. `setTimeout(…, 0)` still
    // satisfies 9.5's "when the download has been triggered", and living in
    // `finally` means the revocation is scheduled even if anchor creation
    // throws — so the object URL cannot leak on the failure path either.
    setTimeout(() => URL.revokeObjectURL(url), 0)
  }
}
