// Vercel Serverless Function — the RSVP submission endpoint.
//
// This replaces Netlify Forms. On Netlify, the RSVP submission was captured by
// the platform's build-time form detector with no server code; Vercel has no
// such feature, so the live React form now POSTs here instead (see
// src/components/Rsvp.jsx). The wire contract is UNCHANGED from what the client
// already sends: an `application/x-www-form-urlencoded` body carrying
// `form-name`, `guestName`, `attendance`, `guestCount`, and `message`.
//
// What this function does:
//   - Accepts POST only.
//   - Parses the URL-encoded body.
//   - Rejects a body whose `form-name` is not the expected "rsvp" (the same
//     guard Netlify applied by routing on that field), so a stray POST fails
//     loudly rather than being filed silently.
//   - Appends the reply as a row to a Google Sheet, then returns 200.
//
// Google Sheet delivery (no npm dependency, no service-account key):
//   The sheet is fronted by a Google Apps Script Web App. This function POSTs
//   the reply as JSON to that web app's URL, and the script appends a row. The
//   URL is read from the `RSVP_SHEETS_WEBHOOK_URL` environment variable so the
//   endpoint is not hard-coded and can differ per environment. Set it in the
//   Vercel dashboard (Project → Settings → Environment Variables). The exact
//   Apps Script to paste into the sheet is in the README, section
//   "Retrieving RSVP submissions".
//
//   If `RSVP_SHEETS_WEBHOOK_URL` is NOT set, the function falls back to logging
//   the reply to the Vercel function logs and still returns 200, so the site is
//   deployable and the success round-trip (8.8) works before the sheet is
//   wired up. Once the variable is set, replies flow to the sheet instead.

// The one field the form is registered under. Kept in lockstep with
// weddingConfig.rsvp.formName and the live form's `name` attribute.
const EXPECTED_FORM_NAME = 'rsvp'

// How long to wait on the Apps Script web app before treating the append as
// failed. Apps Script is usually fast but can cold-start; 10s is generous
// without leaving the guest waiting forever.
const SHEETS_TIMEOUT_MS = 10_000

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

/**
 * Append one RSVP row to the Google Sheet via the Apps Script web app.
 *
 * Throws on any non-2xx response or network/timeout error, so the caller can
 * turn a failed append into a 502 and let the client show its retry path
 * rather than telling the guest "thank you" for a reply that was never saved.
 *
 * The payload is JSON — simpler for the Apps Script to parse with
 * `JSON.parse(e.postData.contents)` than a form encoding. `timestamp` is set
 * here (server side) so the row's time does not depend on the client's clock.
 */
async function appendToSheet(webhookUrl, row) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), SHEETS_TIMEOUT_MS)
  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(row),
      signal: controller.signal,
      // Apps Script web apps answer on a redirect; follow it.
      redirect: 'follow',
    })
    if (!response.ok) {
      throw new Error(`Sheets webhook responded ${response.status}`)
    }
  } finally {
    clearTimeout(timer)
  }
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

  // --- Delivery step: append to the Google Sheet ---------------------------
  // The row the Apps Script writes. Field order here is the column order in the
  // sheet; keep them in sync with the header row the script creates.
  const row = {
    timestamp: new Date().toISOString(),
    guestName,
    attendance,
    guestCount,
    message: submission.message,
  }

  const webhookUrl = process.env.RSVP_SHEETS_WEBHOOK_URL

  if (!webhookUrl) {
    // Not yet configured: log and succeed, so the site is deployable before the
    // sheet is wired up. Set RSVP_SHEETS_WEBHOOK_URL in Vercel to switch to the
    // sheet without any code change.
    console.warn(
      '[rsvp] RSVP_SHEETS_WEBHOOK_URL is not set — logging the reply instead of ' +
        'writing to the sheet.',
      row,
    )
    return res.status(200).json({ ok: true })
  }

  try {
    await appendToSheet(webhookUrl, row)
  } catch (error) {
    // Keep the reply in the logs so it is not lost even though the append
    // failed, then return 502 so the client shows its retry path (8.9).
    console.error('[rsvp] failed to append to the Google Sheet', {
      message: error?.message,
      row,
    })
    return res.status(502).json({ error: 'Could not record the submission.' })
  }
  // ------------------------------------------------------------------------

  return res.status(200).json({ ok: true })
}
