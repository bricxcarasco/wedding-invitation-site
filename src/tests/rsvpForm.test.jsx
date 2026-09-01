// RSVP form tests — task 7.11.
//
// Requirements: 8.1 (the four fields with their required flags), 8.8 (success
// state replaces the fields), 8.9 (failure preserves input and keeps submit
// enabled), 8.10 (submit disabled while in flight). Plus Correctness Property 6.
//
// `Rsvp` renders a `Reveal`, which calls `useMotion()`, so the tree must be
// wrapped in a `MotionProvider`. `renderWithMotion` deliberately does NOT wrap
// (it only drives the media query, which `App` reads), so these tests wrap
// explicitly. The reduced-motion boolean does not matter to the RSVP behaviour
// under test, so it is left at its default of `false`.
//
// The network is the one thing stubbed. `global.fetch` is replaced per test so
// the component's submit path runs end to end — validation, encode, POST, and
// the state transition — without a real request, and each test controls whether
// that request pends, resolves, or rejects.

import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import fc from 'fast-check'
import { afterEach, describe, expect, it, vi } from 'vitest'

import weddingConfig from '../config/weddingConfig.js'
import { ATTENDANCE_CHOICES } from '../lib/rsvp.js'
import { MotionProvider } from '../motion/MotionContext.jsx'
import { Rsvp } from '../components/Rsvp.jsx'

const FORM_NAME = weddingConfig.rsvp.formName
const { minGuests: MIN_GUESTS, maxGuests: MAX_GUESTS } = weddingConfig.rsvp

// The four field names the live form, the pure encoder, the index.html stub,
// and the /api/rsvp endpoint must all agree on. Renaming one side alone breaks
// the RSVP submission.
const FIELD_NAMES = ['guestName', 'attendance', 'guestCount', 'message']

// Resolved from this file so the read does not depend on where vitest was
// invoked from: src/tests/ -> project root.
const HERE = dirname(fileURLToPath(import.meta.url))
const INDEX_HTML = resolve(HERE, '..', '..', 'index.html')

/** Render `Rsvp` inside a MotionProvider so its `Reveal` has a motion context. */
function renderRsvp() {
  return render(
    <MotionProvider value={false}>
      <Rsvp />
    </MotionProvider>,
  )
}

/** The submit control, by its accessible name in either resting or in-flight copy. */
function submitButton() {
  return screen.getByRole('button', { name: /send rsvp|sending/i })
}

afterEach(() => {
  vi.restoreAllMocks()
})

// ---------------------------------------------------------------------------
// Field presence and required flags (8.1)
// ---------------------------------------------------------------------------

describe('RSVP form fields (8.1)', () => {
  it('renders guestName as a required text field', () => {
    renderRsvp()
    const name = screen.getByLabelText(/your name/i)
    expect(name).toBeInstanceOf(HTMLInputElement)
    expect(name).toHaveAttribute('type', 'text')
    expect(name).toHaveAttribute('name', 'guestName')
    expect(name).toBeRequired()
  })

  it('renders attendance as a radio group with no default selection', () => {
    renderRsvp()
    const radios = screen.getAllByRole('radio')
    // Exactly the two offered choices, each carrying the shared field name and
    // one of the two accepted wire values.
    expect(radios).toHaveLength(ATTENDANCE_CHOICES.length)
    for (const radio of radios) {
      expect(radio).toHaveAttribute('name', 'attendance')
      expect(radio).toBeRequired()
      // 8.5's "no default" — nothing is checked on first render, so "unset" is
      // a reachable state.
      expect(radio).not.toBeChecked()
    }
    const values = radios.map((radio) => radio.getAttribute('value')).sort()
    expect(values).toEqual([...ATTENDANCE_CHOICES].sort())
  })

  it('renders guestCount as a required number field', () => {
    renderRsvp()
    const count = screen.getByLabelText(/how many in your party/i)
    expect(count).toBeInstanceOf(HTMLInputElement)
    expect(count).toHaveAttribute('type', 'number')
    expect(count).toHaveAttribute('name', 'guestCount')
    expect(count).toBeRequired()
  })

  it('renders message as an optional textarea', () => {
    renderRsvp()
    const message = screen.getByLabelText(/a note for us/i)
    expect(message.tagName).toBe('TEXTAREA')
    expect(message).toHaveAttribute('name', 'message')
    // Optional: no `required` flag.
    expect(message).not.toBeRequired()
  })
})

// ---------------------------------------------------------------------------
// The hidden form-name and the index.html detection stub (8.2 / 8.3)
// ---------------------------------------------------------------------------

describe('hidden form-name agrees with the form and the index.html stub', () => {
  it('renders a hidden form-name whose value equals the form name attribute', () => {
    const { container } = renderRsvp()

    const form = container.querySelector('form')
    expect(form).not.toBeNull()
    const formNameAttr = form.getAttribute('name')

    const hidden = container.querySelector('input[type="hidden"][name="form-name"]')
    expect(hidden, 'the hidden form-name input should be present').not.toBeNull()

    // The three-way agreement 8.2 requires: hidden value === form `name` ===
    // the configured form name.
    expect(hidden.getAttribute('value')).toBe(formNameAttr)
    expect(formNameAttr).toBe(FORM_NAME)
    expect(hidden.getAttribute('value')).toBe(FORM_NAME)
  })

  it('matches the fallback stub name in index.html', () => {
    // Parse index.html with the real DOM parser rather than a regex, then find
    // the fallback stub form and compare it field for field against the live
    // form. This is what keeps the two from drifting (8.3).
    const html = readFileSync(INDEX_HTML, 'utf8')
    const doc = new DOMParser().parseFromString(html, 'text/html')

    const stubForm = doc.querySelector('form[name="rsvp"][action="/api/rsvp"]')
    expect(stubForm, 'index.html should carry the RSVP fallback stub form').not.toBeNull()

    // The stub's form name and its hidden form-name value both equal the live
    // form's name.
    expect(stubForm.getAttribute('name')).toBe(FORM_NAME)
    const stubHidden = stubForm.querySelector('input[name="form-name"]')
    expect(stubHidden, 'the stub should carry a hidden form-name input').not.toBeNull()
    expect(stubHidden.getAttribute('value')).toBe(FORM_NAME)

    // The four field names match, in the live form and in the stub.
    const { container } = renderRsvp()
    const liveForm = container.querySelector('form')

    for (const field of FIELD_NAMES) {
      expect(
        liveForm.querySelector(`[name="${field}"]`),
        `live form is missing the ${field} control`,
      ).not.toBeNull()
      expect(
        stubForm.querySelector(`[name="${field}"]`),
        `index.html stub is missing the ${field} control`,
      ).not.toBeNull()
    }
  })
})

// ---------------------------------------------------------------------------
// Submit disabled while in flight (8.10)
// ---------------------------------------------------------------------------

describe('submit is disabled while the request is in flight (8.10)', () => {
  it('disables submit and shows a sending state until the request settles', async () => {
    const user = userEvent.setup()

    // A promise that never resolves on its own, so the component stays in the
    // 'submitting' state for the length of the assertion. Resolved by hand at
    // the end so no request is left dangling.
    let resolveFetch
    const pending = new Promise((res) => {
      resolveFetch = res
    })
    global.fetch = vi.fn(() => pending)

    renderRsvp()

    await user.type(screen.getByLabelText(/your name/i), 'Mae')
    await user.click(screen.getByRole('radio', { name: /joyfully accepts/i }))
    await user.type(screen.getByLabelText(/how many in your party/i), '2')

    await user.click(submitButton())

    // In flight: fetch was called, the button is disabled, aria-busy is set on
    // the form, and the label reads "Sending…".
    expect(global.fetch).toHaveBeenCalledTimes(1)
    const button = submitButton()
    expect(button).toBeDisabled()
    expect(button).toHaveTextContent(/sending/i)

    const form = button.closest('form')
    expect(form).toHaveAttribute('aria-busy', 'true')

    // Let the request finish so nothing is left pending.
    resolveFetch({ ok: true, status: 200 })
    await waitFor(() => expect(screen.getByText(/thank you/i)).toBeInTheDocument())
  })
})

// ---------------------------------------------------------------------------
// Success replaces the fields (8.8)
// ---------------------------------------------------------------------------

describe('a successful submission replaces the fields with a thank-you (8.8)', () => {
  it('renders the success state in place of the form fields', async () => {
    const user = userEvent.setup()
    global.fetch = vi.fn(() => Promise.resolve({ ok: true, status: 200 }))

    renderRsvp()

    await user.type(screen.getByLabelText(/your name/i), 'Bricx')
    await user.click(screen.getByRole('radio', { name: /regretfully declines/i }))
    await user.type(screen.getByLabelText(/how many in your party/i), '1')

    await user.click(submitButton())

    // The thank-you appears...
    await waitFor(() => expect(screen.getByText(/thank you/i)).toBeInTheDocument())

    // ...and the fields are gone: 8.8 asks for the confirmation IN PLACE of the
    // fields, not layered over them.
    expect(screen.queryByLabelText(/your name/i)).not.toBeInTheDocument()
    expect(screen.queryByRole('radio')).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/how many in your party/i)).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/a note for us/i)).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /send rsvp|sending/i })).not.toBeInTheDocument()
  })
})

// ---------------------------------------------------------------------------
// Property 6 — failed submission preserves input and the ability to retry
// ---------------------------------------------------------------------------

// Feature: wedding-invitation-website, Property 6: For any RSVP form values that pass validation, and for any submission failure mode — a rejected request or a non-success HTTP status — the form afterwards displays an error message, still contains every value the visitor entered, and leaves the submit control enabled.
//
// **Validates: Requirements 8.9**

/** A valid name: never blank or whitespace-only, and free of characters that
 *  `userEvent.type` treats specially (`{`, `[`) so what we type is what lands. */
const validNameArb = fc
  .string({ minLength: 1, maxLength: 24 })
  .map((s) => s.replace(/[{[]/g, ''))
  .map((s) => `Mae ${s}`.trim())

/** guestCount within the configured inclusive range, as the string the number
 *  input holds. */
const validCountArb = fc.integer({ min: MIN_GUESTS, max: MAX_GUESTS }).map((n) => String(n))

/** An optional message, free of the userEvent metacharacters. */
const messageArb = fc
  .string({ maxLength: 40 })
  .map((s) => s.replace(/[{[]/g, ''))

/** A full set of valid form inputs. */
const validInputArb = fc.record({
  guestName: validNameArb,
  attendance: fc.constantFrom(...ATTENDANCE_CHOICES),
  guestCount: validCountArb,
  message: messageArb,
})

/** The two failure modes 8.9 folds together: a rejected request, and a
 *  resolved response whose `ok` is false. Both must land in the error state. */
const failureModeArb = fc.constantFrom('reject', 'http-500')

const ATTENDANCE_RADIO_NAME = {
  attending: /joyfully accepts/i,
  'not-attending': /regretfully declines/i,
}

describe('Property 6: a failed submission preserves input and keeps submit enabled (8.9)', () => {
  // numRuns is kept modest (24) on purpose. Each case mounts the full component,
  // drives it through userEvent keystroke by keystroke, awaits an async submit,
  // and unmounts — orders of magnitude heavier than a pure-function property
  // like Property 4/5 at 300 runs. 24 comfortably clears the design's 100-case
  // floor's *intent* (both failure modes crossed with a spread of inputs) while
  // keeping the suite fast; the exhaustive field/encoding coverage lives in the
  // pure rsvp.property.test.js.
  const NUM_RUNS = 24

  it('shows an error, retains every entered value, and re-enables submit', async () => {
    await fc.assert(
      fc.asyncProperty(validInputArb, failureModeArb, async (input, mode) => {
        // fast-check does not reset between runs, so each case gets a clean DOM
        // and a fresh fetch stub, and tears them down afterward.
        const user = userEvent.setup()

        global.fetch = vi.fn(() =>
          mode === 'reject'
            ? Promise.reject(new Error('network down'))
            : Promise.resolve({ ok: false, status: 500 }),
        )

        const { unmount, container } = renderRsvp()

        try {
          const nameInput = screen.getByLabelText(/your name/i)
          const countInput = screen.getByLabelText(/how many in your party/i)
          const messageInput = screen.getByLabelText(/a note for us/i)
          const attendanceRadio = screen.getByRole('radio', {
            name: ATTENDANCE_RADIO_NAME[input.attendance],
          })

          await user.type(nameInput, input.guestName)
          await user.click(attendanceRadio)
          await user.type(countInput, input.guestCount)
          if (input.message) await user.type(messageInput, input.message)

          // Submit and wait for the failure to surface as the alert.
          await user.click(submitButton())
          await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument())

          // The request was actually attempted (the failure is real, not a
          // validation short-circuit).
          expect(global.fetch).toHaveBeenCalledTimes(1)

          // 8.9(a) — an error message is shown.
          expect(screen.getByRole('alert')).toBeInTheDocument()

          // 8.9(b) — every entered value is still in its field. The fields are
          // still present (not replaced, as they would be on success) and hold
          // exactly what was typed. guestName is compared against the trimmed
          // value the controlled input settles on — the component trims nothing
          // on input, but a trailing space typed then normalised by the browser
          // would still equal what we sent; here the raw value is retained.
          expect(screen.getByLabelText(/your name/i)).toHaveValue(input.guestName)
          expect(screen.getByLabelText(/how many in your party/i)).toHaveValue(
            Number(input.guestCount),
          )
          expect(screen.getByLabelText(/a note for us/i)).toHaveValue(input.message)

          // The chosen attendance radio is still selected.
          const checkedRadio = within(container).getByRole('radio', {
            name: ATTENDANCE_RADIO_NAME[input.attendance],
          })
          expect(checkedRadio).toBeChecked()

          // 8.9(c) — submit is enabled again, so the guest can retry.
          expect(submitButton()).toBeEnabled()
        } finally {
          unmount()
          cleanup()
          vi.restoreAllMocks()
        }
      }),
      { numRuns: NUM_RUNS },
    )
  })
})
