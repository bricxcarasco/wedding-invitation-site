// The RSVP section: the live submission to the Vercel serverless endpoint, its
// validation, and its success and error states.
//
// Requirements: 8.1 (the four fields with their required flags), 8.2 (the form
// carries a hidden `form-name` matching the `name`), 8.4-8.6 (per-field
// validation messages that identify the field and withhold the submission),
// 8.7 (a URL-encoded POST to `/api/rsvp`), 8.8 (the success confirmation
// in place of the fields), 8.9 (the failure path — error message, entered
// values retained, submit still enabled), 8.10 (submit disabled while in
// flight), 10.2 (the section is Reveal-wrapped), 11.4 (>=44px touch targets).
//
// The validation rule set and the wire encoding are NOT restated here. They
// live in `src/lib/rsvp.js` as pure, total functions — `validateRsvp` returns a
// field-keyed errors map, `encodeRsvpPayload` builds the body, and
// `RSVP_FIELD_ORDER` / `ATTENDANCE_CHOICES` are the same lists validation reads
// — so this component only decides how those results are rendered and which
// control gets focus. Renaming a field here without renaming it there, or in
// the `index.html` stub, breaks form detection at deploy time; the field names
// below are chosen to match all three: the live form here, the `index.html`
// stub, and the `api/rsvp.js` endpoint.
//
// This component renders its OWN `<section id="rsvp">`. The orchestrator wires
// it into `MainInvitation`'s slot list afterward, so nothing here imports or
// touches `MainInvitation`.

import { useEffect, useRef, useState } from 'react'

import weddingConfig from '../config/weddingConfig.js'
import {
  ATTENDANCE_CHOICES,
  RSVP_FIELD_ORDER,
  encodeRsvpPayload,
  validateRsvp,
} from '../lib/rsvp.js'

import { Reveal } from './Reveal.jsx'

/**
 * The wire value each attendance choice submits, paired with the label a guest
 * reads. The values come from `ATTENDANCE_CHOICES` (the same list validation
 * accepts) so the radio group cannot offer a value validation would reject.
 * The labels are copy, not data, so they live here.
 */
const ATTENDANCE_LABELS = {
  attending: 'Joyfully accepts',
  'not-attending': 'Regretfully declines',
}

/** The empty starting values — every field controlled from the first render. */
const EMPTY_VALUES = {
  guestName: '',
  attendance: '', // no default selection, so "unset" (8.5) is a reachable state
  guestCount: '',
  message: '',
}

/**
 * The live RSVP form.
 *
 * `values` holds every field; `status` is the single state machine driving what
 * renders and what is disabled: `'idle' | 'submitting' | 'error' | 'success'`.
 * `errors` is the field-keyed map from the last failed validation, rendered
 * inline beside each control.
 *
 * The form carries `noValidate` so the browser's native constraint bubbles stay
 * out of the way and `validateRsvp` is the sole gate (the design's reasoning:
 * native bubbles are non-queryable, inconsistently styled, and vanish on blur).
 * The `required` / `min` / `max` attributes stay on the controls for semantics
 * and assistive-technology exposure.
 */
export function Rsvp() {
  const [values, setValues] = useState(EMPTY_VALUES)
  const [status, setStatus] = useState('idle')
  const [errors, setErrors] = useState({})

  // Refs to the controls, so a failed validation can move focus to the first
  // offending field, and a failed submission can move focus to the alert. One
  // ref per field rather than an object of refs: passing `refs.foo` to a `ref`
  // prop reads as a ref access during render to the lint rule, so each ref is
  // its own binding and is looked up through `fieldRefByName` only in an event
  // handler, never in the JSX.
  const guestNameRef = useRef(null)
  const attendanceRef = useRef(null)
  const guestCountRef = useRef(null)
  const alertRef = useRef(null)

  const fieldRefByName = {
    guestName: guestNameRef,
    attendance: attendanceRef,
    guestCount: guestCountRef,
  }

  const submitting = status === 'submitting'

  // 8.9 — when the submission fails, move focus to the alert so a keyboard user
  // is not left on a button whose click apparently did nothing. This is a
  // `focus()` call keyed on the error state, not a `setState` in an effect, so
  // it does not trip `react-hooks/set-state-in-effect`.
  useEffect(() => {
    if (status === 'error') alertRef.current?.focus()
  }, [status])

  function updateField(name, value) {
    setValues((prev) => ({ ...prev, [name]: value }))
  }

  async function handleSubmit(event) {
    event.preventDefault()

    // Guard the state machine: a submit only proceeds from a resting state.
    // While 'submitting' the control is disabled anyway; this is the belt to
    // that braces so a stray programmatic submit cannot double-fire.
    if (submitting) return

    const nextErrors = validateRsvp(values)
    if (Object.keys(nextErrors).length > 0) {
      // 8.4-8.6 — show the messages, focus the FIRST offending field in the
      // visual order (RSVP_FIELD_ORDER), send NO request, stay idle.
      setErrors(nextErrors)
      setStatus('idle')
      const firstBad = RSVP_FIELD_ORDER.find((field) => nextErrors[field])
      fieldRefByName[firstBad]?.current?.focus()
      return
    }

    setErrors({})
    setStatus('submitting')

    try {
      // 8.7 — POST a URL-encoded body whose `form-name` matches the registered
      // form to the RSVP endpoint. The endpoint is the Vercel serverless
      // function at `api/rsvp.js`, which routes on `form-name` and records the
      // reply. The body shape is unchanged from the previous Netlify Forms
      // contract, so `encodeRsvpPayload` did not need to change.
      const res = await fetch('/api/rsvp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: encodeRsvpPayload(values),
      })
      // 8.9 — `fetch` does NOT reject on a 4xx/5xx, so a non-2xx has to be
      // turned into a throw explicitly. This funnels an unregistered form name
      // or the free-tier submission cap into the same `catch` as an offline
      // rejection, so both are treated as failures.
      if (!res.ok) throw new Error(`RSVP submission failed with status ${res.status}`)
      setStatus('success')
    } catch {
      // 8.9 — `values` is left untouched (nothing here clears it), so every
      // field the guest typed is retained. `status` becomes 'error', which
      // re-enables submit (it is disabled only while 'submitting').
      setStatus('error')
    }
  }

  // 8.8 — on success the confirmation replaces the fields entirely. The section
  // and its Reveal wrapper stay, so the reveal-in and the layout do not jump.
  if (status === 'success') {
    return (
      <Reveal as="section" id="rsvp" className="mx-auto max-w-xl text-center">
        <h2 className="font-display text-3xl text-sage md:text-4xl">Thank You</h2>
        <p className="mt-6 text-lg leading-relaxed text-sage-deep md:text-xl">
          Your reply is in, and it means the world to us. We cannot wait to
          celebrate the day with you.
        </p>
      </Reveal>
    )
  }

  return (
    <Reveal as="section" id="rsvp" className="mx-auto max-w-xl">
      <h2 className="text-center font-display text-3xl text-sage md:text-4xl">RSVP</h2>
      <p className="mt-4 text-center text-sage-deep">
        Kindly reply below so we can save your place at the table.
      </p>

      <form
        noValidate
        name={weddingConfig.rsvp.formName}
        method="POST"
        action="/api/rsvp"
        aria-busy={submitting}
        onSubmit={handleSubmit}
        className="mt-8 flex flex-col gap-6 text-left"
      >
        {/* 8.2 — the hidden form-name whose value equals the `name` attribute
            and matches the stub in index.html. The endpoint routes on it. */}
        <input type="hidden" name="form-name" value={weddingConfig.rsvp.formName} />

        {/* guestName — required text (8.1) */}
        <div className="flex flex-col gap-2">
          <label htmlFor="rsvp-guestName" className="font-medium text-sage-deep">
            Your name
          </label>
          <input
            id="rsvp-guestName"
            ref={guestNameRef}
            type="text"
            name="guestName"
            required
            value={values.guestName}
            onChange={(event) => updateField('guestName', event.target.value)}
            aria-invalid={errors.guestName ? true : undefined}
            aria-describedby={errors.guestName ? 'guestName-error' : undefined}
            className="control tap-target rounded-lg border border-sage-light/60 bg-cream-soft px-4"
          />
          {errors.guestName ? (
            <p id="guestName-error" className="text-sm text-sage-deep">
              {errors.guestName}
            </p>
          ) : null}
        </div>

        {/* attendance — required radio group in a fieldset/legend, no default
            selection so "unset" (8.5) is reachable */}
        <fieldset
          className="flex flex-col gap-2"
          aria-invalid={errors.attendance ? true : undefined}
          aria-describedby={errors.attendance ? 'attendance-error' : undefined}
        >
          <legend className="font-medium text-sage-deep">Will you join us?</legend>
          <div className="mt-1 flex flex-col gap-2">
            {ATTENDANCE_CHOICES.map((choice, index) => (
              <label
                key={choice}
                className="flex w-full min-h-[44px] cursor-pointer items-center gap-3 py-2 text-left"
              >
                {/* Behaviour: still a radio group — shared name, single-select,
                    keyboard arrow nav, form semantics. `peer sr-only` keeps the
                    native control focusable and in the a11y tree (role=radio,
                    named by this label's text) while hiding it visually, so the
                    custom box below can render the checked/focus states via
                    `peer-checked:`/`peer-focus-visible:`. NOT display:none. */}
                <input
                  ref={
                    index === 0
                      ? (node) => {
                          attendanceRef.current = node
                        }
                      : undefined
                  }
                  type="radio"
                  name="attendance"
                  value={choice}
                  required
                  checked={values.attendance === choice}
                  onChange={(event) => updateField('attendance', event.target.value)}
                  className="peer sr-only"
                />
                {/* Checkbox-style indicator: a rounded square that fills sage
                    green with a cream check when its peer input is checked. */}
                <span className="flex h-6 w-6 flex-none items-center justify-center rounded-md border-2 border-sage-light bg-cream-soft transition-colors peer-checked:border-sage peer-checked:bg-sage peer-focus-visible:ring-2 peer-focus-visible:ring-sage peer-focus-visible:ring-offset-2 [&>svg]:opacity-0 peer-checked:[&>svg]:opacity-100">
                  <svg
                    className="h-4 w-4 text-cream transition-opacity"
                    viewBox="0 0 20 20"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M5 10.5l3.5 3.5L15 6" />
                  </svg>
                </span>
                <span className="text-sage-deep peer-checked:font-medium peer-checked:text-sage">
                  {ATTENDANCE_LABELS[choice]}
                </span>
              </label>
            ))}
          </div>
          {errors.attendance ? (
            <p id="attendance-error" className="text-sm text-sage-deep">
              {errors.attendance}
            </p>
          ) : null}
        </fieldset>

        {/* guestCount — required number 1-10 (8.1, 8.6). Required
            unconditionally; the helper copy is the mitigation for a declining
            guest, not a conditional. */}
        <div className="flex flex-col gap-2">
          <label htmlFor="rsvp-guestCount" className="font-medium text-sage-deep">
            How many in your party?
          </label>
          <span id="rsvp-guestCount-hint" className="text-sm text-sage-deep/80">
            Enter 1 if you are replying only for yourself.
          </span>
          <input
            id="rsvp-guestCount"
            ref={guestCountRef}
            type="number"
            name="guestCount"
            required
            min={weddingConfig.rsvp.minGuests}
            max={weddingConfig.rsvp.maxGuests}
            value={values.guestCount}
            onChange={(event) => updateField('guestCount', event.target.value)}
            aria-invalid={errors.guestCount ? true : undefined}
            aria-describedby={
              errors.guestCount ? 'rsvp-guestCount-hint guestCount-error' : 'rsvp-guestCount-hint'
            }
            className="control tap-target rounded-lg border border-sage-light/60 bg-cream-soft px-4"
          />
          {errors.guestCount ? (
            <p id="guestCount-error" className="text-sm text-sage-deep">
              {errors.guestCount}
            </p>
          ) : null}
        </div>

        {/* message — optional textarea (8.1) */}
        <div className="flex flex-col gap-2">
          <label htmlFor="rsvp-message" className="font-medium text-sage-deep">
            A note for us <span className="text-sage-deep/70">(optional)</span>
          </label>
          <textarea
            id="rsvp-message"
            name="message"
            rows={4}
            value={values.message}
            onChange={(event) => updateField('message', event.target.value)}
            className="control rounded-lg border border-sage-light/60 bg-cream-soft px-4 py-3"
          />
        </div>

        {/* 8.9 — the failure alert. `role="alert"` announces it without the
            guest hunting for it; focus is moved here in the effect below. */}
        {status === 'error' ? (
          <p ref={alertRef} role="alert" tabIndex={-1} className="text-sage-deep">
            Something went wrong sending your reply. Your details are still here —
            please try again.
          </p>
        ) : null}

        {/* 8.10 — disabled bound to `submitting` ALONE, so leaving 'submitting'
            in either direction (success or error) re-enables it. That is what
            keeps submit enabled in the error state (8.9). */}
        <button
          type="submit"
          disabled={submitting}
          className="control tap-target rounded-full bg-sage px-8 font-medium text-cream-soft transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? 'Sending…' : 'Send RSVP'}
        </button>
      </form>
    </Reveal>
  )
}

export default Rsvp
