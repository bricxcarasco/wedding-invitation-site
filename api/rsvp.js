// Vercel Serverless Function — the RSVP submission endpoint.
//
// This replaces Netlify Forms. On Netlify, the RSVP submission was captured by
// the platform's build-time form detector with no server code; Vercel has no
// such feature, so the live React form now POSTs here instead (see
// src/components/Rsvp.jsx). The wire contract is UNCHANGED from what the client
// already sends: an `application/x-www-form-urlencoded` body carrying
// `form-name`, `guestName`, `attendance`, `guestCount`, and `message`.
//
// What this function does today:
//   - Accepts POST only.
//   - Parses the URL-encoded body.
//   - Rejects a body whose `form-name` is not the expected "rsvp" (the same
//     guard Netlify applied by routing on that field), so a stray POST fails
//     loudly rather than being filed silently.
//   - Logs the submission to the function logs (visible in the Vercel dashboard
//     under the deployment's "Logs" / "Functions" tab) and returns 200.
//
// This is a working, free-tier-friendly default: it makes the client's success
// round-trip (8.8) real without any paid add-on or external account. To have
// replies delivered somewhere durable (email, a spreadsheet, a database), add
// a delivery step where marked below — the parsing and validation above stay
// the same. See the README "Retrieving RSVP submissions" section.

// The one field the form is registered under. Kept in lockstep with
// weddingConfig.rsvp.formName and the live form's `name` attribute.
const EXPECTED_FORM_NAME = 'rsvp'

// The fields the client posts. Anything outside this set is ignored rather than
// stored, so a hand-built body cannot smuggle extra keys into the log.
const ALLOWED_FIELDS = ['form-name', 'guestName', 'attendance', 'guestCount', 'message']

/**
 * Read the raw request body as a string. Vercel's Node runtime does not parse
 * `application/x-www-form-urlencoded` for us, so the body arrives as a stream.
 */
function readRawBody(req) {
  return new Promise((resolve, reject) => {
    let data = ''
    req.on('data', (chunk) => {
      data += chunk
      // Guard against an oversized body (~1MB is far more than an RSVP needs).
      if (data.length > 1_000_000) {
        reject(new Error('Request body too large'))
        req.destroy()
      }
    })
    req.on('end', () => resolve(data))
    req.on('error', reject)
  })
}

export default async function handler(req, res) {
  // 8.7 contract: the form only ever POSTs. Everything else is a 405.
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  let params
  try {
    // Vercel may have already parsed the body into `req.body` depending on the
    // content type; handle both the parsed-object and raw-stream cases so the
    // function is robust to the runtime's defaults.
    if (typeof req.body === 'string' && req.body.length > 0) {
      params = new URLSearchParams(req.body)
    } else if (req.body && typeof req.body === 'object') {
      params = new URLSearchParams(req.body)
    } else {
      params = new URLSearchParams(await readRawBody(req))
    }
  } catch {
    return res.status(400).json({ error: 'Could not read the submission body.' })
  }

  // Route on `form-name`, exactly as Netlify did. A missing or wrong value is a
  // rejected submission, not a silent success.
  if (params.get('form-name') !== EXPECTED_FORM_NAME) {
    return res.status(400).json({ error: 'Unrecognized form.' })
  }

  // Collect only the known fields.
  const submission = {}
  for (const field of ALLOWED_FIELDS) {
    if (field === 'form-name') continue
    submission[field] = params.get(field) ?? ''
  }

  // A minimal, unconditional server-side sanity check mirroring the client's
  // rules (the client already validated, but the endpoint should not trust it).
  const guestName = submission.guestName.trim()
  const attendance = submission.attendance
  const guestCount = Number(submission.guestCount)
  const validAttendance = attendance === 'attending' || attendance === 'not-attending'
  const validCount = Number.isInteger(guestCount) && guestCount >= 1 && guestCount <= 10
  if (!guestName || !validAttendance || !validCount) {
    return res.status(422).json({ error: 'The submission was incomplete or invalid.' })
  }

  // --- Delivery step -------------------------------------------------------
  // Today: log to the Vercel function logs. Replace or supplement this with an
  // email send, a Google Sheet append, a database insert, etc. Keep it inside
  // this try so a delivery failure returns 502 and the client shows its retry
  // path (8.9) rather than a false success.
  try {
    console.log('[rsvp] submission received', {
      guestName,
      attendance,
      guestCount,
      message: submission.message,
      at: new Date().toISOString(),
    })
  } catch {
    return res.status(502).json({ error: 'Could not record the submission.' })
  }
  // ------------------------------------------------------------------------

  return res.status(200).json({ ok: true })
}
