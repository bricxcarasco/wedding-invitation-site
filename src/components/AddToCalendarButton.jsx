// The "Add to Calendar" control (requirements 9.1, 9.2, 9.5).
//
// A thin trigger over `src/lib/icalendar.js`: it builds the ceremony event and
// hands it to `downloadIcs`, which owns the entire `.ics` machinery — Blob
// creation, the object URL, the anchor click, and the deferred object-URL
// revocation (9.5). None of that lives here. This component's only job is to be
// a labelled, correctly sized control that fires that side effect on activation.
//
// `downloadIcs(event)` is called with ONE argument on purpose: the default
// filename (`bricx-and-mae-wedding.ics`, 9.2) lives in `icalendar.js`, so the
// string is not restated at this call site (14.6).
//
// Behaviour styling comes from the shared `.control` / `.tap-target` classes in
// `index.css`: the ≥44×44px hit area (11.4) and the hover/focus treatment
// (10.4) are defined there once and reused, so this file adds no motion of its
// own and cannot drift from the other controls. The label itself is set in the
// Parisienne display face (`font-display`) to match the other primary buttons.

import { buildCeremonyEvent, downloadIcs } from '../lib/icalendar.js'

/**
 * A calendar glyph: a page with a top binding and a marked date.
 *
 * Same convention as the site's other inline icons (AudioPlayer's NoteIcon,
 * the map-link icons in WeddingDetails): `viewBox="0 0 24 24"`, `fill="none"`,
 * `stroke="currentColor"` so it inherits the button's Cream text, rounded
 * caps/joins, `aria-hidden` (the label carries the name), and `h-5 w-5` so it
 * sits at the cap height of the `text-xl` label.
 */
function CalendarIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="block h-5 w-5 flex-none"
    >
      {/* page */}
      <rect x="3" y="5" width="18" height="16" rx="2" />
      {/* binding rings */}
      <path d="M8 3v4M16 3v4" />
      {/* header rule */}
      <path d="M3 10h18" />
      {/* marked date */}
      <path d="M12 14v3M10.5 15.5h3" />
    </svg>
  )
}

/**
 * A button that generates and downloads the ceremony as an `.ics` file.
 *
 * `type="button"` keeps it from submitting any form it may later be nested in.
 */
export function AddToCalendarButton() {
  function handleClick() {
    downloadIcs(buildCeremonyEvent())
  }

  return (
    <button
      type="button"
      className="control control-btn tap-target gap-2 rounded-full border border-sage bg-sage px-6 font-display text-xl text-cream"
      onClick={handleClick}
    >
      <CalendarIcon />
      Add to Calendar
    </button>
  )
}
