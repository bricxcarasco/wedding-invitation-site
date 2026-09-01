// RSVP validation and payload encoding — pure functions, no React, no DOM.
//
// Requirements: 8.4 (a message identifying the guest name field), 8.5 (the
// attendance field), 8.6 (the guest count field, range 1-10 inclusive),
// 8.2 / 8.7 (a URL-encoded body carrying `form-name`, which is what the
// `/api/rsvp` endpoint routes the submission on).
//
// Both exports are pure AND total. Neither reads the clock, the DOM, or module
// state, and neither throws for any input — `validateRsvp(undefined)` and
// `validateRsvp({})` return an errors map like any other call. Totality is not
// defensive padding here: Property 4 is stated over *any* RSVP form values, and
// the `Rsvp` component calls `validateRsvp` on a `values` object it builds from
// uncontrolled-to-controlled input, so a missing key is an ordinary case rather
// than a bug to be signalled by an exception.

import weddingConfig from '../config/weddingConfig.js'

/**
 * The two attendance choices the form offers, and the only two values 8.5
 * accepts. Anything else — unset, empty, `'maybe'`, a stray whitespace variant
 * of a valid choice — is an error.
 *
 * Exported so the `Rsvp` component can render its radio group from this list
 * instead of restating the wire values beside the ones validation checks.
 */
export const ATTENDANCE_CHOICES = ['attending', 'not-attending']

/**
 * Canonical field order, top to bottom in the rendered form.
 *
 * `validateRsvp` returns an unordered map, so this is what lets the component
 * decide which control to focus after a failed submission: walk this array and
 * focus the first field present in the errors map. Object key order would be an
 * accident of which checks happen to run first; this is the visual order, which
 * is the one a guest experiences. Keeping it here rather than in the component
 * means the focus order cannot drift from the field set validation knows about.
 */
export const RSVP_FIELD_ORDER = ['guestName', 'attendance', 'guestCount', 'message']

/**
 * Validate RSVP form values.
 *
 * Returns a map keyed by field name — the same names the form controls and the
 * fallback stub in `index.html` use — whose values are the messages to
 * render. An empty object means the submission may proceed. The map shape does
 * double duty in the `Rsvp` component: the message renders inline beside the
 * offending control (which is how 8.4-8.6's "identifying the field" is
 * satisfied by position as well as by wording), and the key set combined with
 * `RSVP_FIELD_ORDER` decides which control receives focus.
 *
 * Messages are deliberately warm rather than terse. They are read by a guest
 * filling in a wedding invitation, not by an operator reading a log.
 *
 * @param {{guestName?: unknown, attendance?: unknown, guestCount?: unknown,
 *          message?: unknown} | null | undefined} values
 * @param {{minGuests: number, maxGuests: number}} [limits]
 * @returns {Record<string, string>} `{}` when valid
 */
export function validateRsvp(values, limits = weddingConfig.rsvp) {
  // Totality starts here: `values` may be `undefined` or `null`, so every read
  // below goes through this local rather than through the parameter.
  const v = values ?? {}
  const { minGuests, maxGuests } = limits ?? weddingConfig.rsvp

  const errors = {}

  // 8.4 — trim FIRST, so a whitespace-only name is rejected rather than
  // accepted as a blank name. `String(… ?? '')` also absorbs a numeric or
  // nullish value without throwing.
  if (!String(v.guestName ?? '').trim()) {
    errors.guestName = 'Please tell us your name so we know who is joining us.'
  }

  // 8.5 — an exact match against one of the two offered choices. No trimming
  // and no case folding: these are wire values set by the radio inputs, not
  // free text a guest types, so anything else genuinely is "unset".
  if (!ATTENDANCE_CHOICES.includes(v.attendance)) {
    errors.attendance = 'Please let us know whether you can join us.'
  }

  // 8.6 — a whole number within the configured range, inclusive.
  //
  // `Number` is doing three jobs at once, and each failure mode lands where it
  // should: `Number('')` and `Number('  ')` both yield `0`, which fails the
  // lower bound; `Number('abc')`, `Number(undefined)` and `Number(NaN)` yield
  // `NaN`, which fails `Number.isInteger`. A non-integer such as `2.5` is
  // rejected explicitly rather than silently floored to 2 — a guest who typed
  // "2.5" should be asked what they meant, not have the site guess.
  //
  // `Number(null)` is `0`, also out of range, so a nullish count is rejected
  // for the same reason an empty string is.
  //
  // GUEST COUNT IS REQUIRED REGARDLESS OF THE ATTENDANCE CHOICE. This is
  // deliberate and confirmed, not an oversight: 8.6 states the rule
  // unconditionally, so there is no `if (attendance === 'attending')` branch
  // guarding this check and none should be added. A declining guest still has
  // to enter a number. The mitigation is label copy in the `Rsvp` component
  // ("How many in your party? Enter 1 if you are replying only for yourself"),
  // not a branch here.
  const count = Number(v.guestCount)
  if (!Number.isInteger(count) || count < minGuests || count > maxGuests) {
    errors.guestCount = `Please enter a whole number of guests from ${minGuests} to ${maxGuests}.`
  }

  // `message` is optional (8.1) and has no constraint, so it never appears here.

  return errors
}

/**
 * Encode RSVP values as an `application/x-www-form-urlencoded` body for the
 * `/api/rsvp` endpoint (8.7).
 *
 * `form-name` is set FIRST and always, because the endpoint routes the
 * submission on that field (8.2); a body without it is rejected however
 * well-formed the rest is. Its value must equal the `name` attribute of both
 * the live form and the fallback stub in `index.html`, which is why it comes
 * from `weddingConfig.rsvp.formName` rather than a literal.
 *
 * The remaining field names — `guestName`, `attendance`, `guestCount`,
 * `message` — match the stub in `index.html` and the endpoint's allow-list
 * exactly. Renaming one side alone silently breaks the submission.
 *
 * `URLSearchParams.toString()` does the whole of the escaping. Nothing here
 * calls `encodeURIComponent` on top of it: that would double-encode, so a `&`
 * would arrive as `%2526` and a space as `%2520`. Leaving the escaping to the
 * platform is what makes Property 5's round-trip hold for values containing
 * spaces, ampersands, plus signs, newlines and non-ASCII characters.
 *
 * Total, like `validateRsvp`: absent fields encode as empty strings rather than
 * as the text `"undefined"`.
 *
 * @param {{guestName?: unknown, attendance?: unknown, guestCount?: unknown,
 *          message?: unknown} | null | undefined} values
 * @param {string} [formName]
 * @returns {string} the URL-encoded request body
 */
export function encodeRsvpPayload(values, formName = weddingConfig.rsvp.formName) {
  const v = values ?? {}

  const params = new URLSearchParams()
  params.set('form-name', String(formName ?? '')) // 8.2 / 8.7 — endpoint routes on this
  // Trimmed to match what validation accepted, so the couple reads the same
  // name the guest was told was valid rather than one padded with whitespace.
  params.set('guestName', String(v.guestName ?? '').trim())
  params.set('attendance', String(v.attendance ?? ''))
  params.set('guestCount', String(v.guestCount ?? ''))
  params.set('message', String(v.message ?? ''))
  return params.toString()
}
