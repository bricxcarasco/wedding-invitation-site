// The Footer: a quiet closing note under the invitation.
//
// Requirements: 14.6 (every wedding-specific value is read from Wedding_Config
// and never restated; palette comes from `@theme` tokens, no raw hex).
//
// The couple names and the wedding date are read from `config.couple.displayNames`
// and `config.schedule.displayDate` — they are not written out here. The only
// literal copy in this file is a section-label / sentiment line ("With love,"
// and the closing sentence), which is original text rather than a restatement of
// any config-owned value.
//
// Landmark note: this renders a real `<footer>` element. MainInvitation places
// it OUTSIDE `<main>`, so as a document-level sibling of `<main>` it maps to the
// contentinfo landmark. Keeping the element here (rather than a `<div>`) is what
// makes that landmark exist for assistive technology.
//
// Reduced motion is not handled here. `Reveal` mounts in its final position and
// opacity under `reduce`, and index.css neutralises the transition as a second
// layer, so wrapping the note in `Reveal` is the whole of the motion policy this
// section needs.

import weddingConfig from '../config/weddingConfig.js'

import { Reveal } from './Reveal.jsx'

/**
 * The closing note.
 *
 * `Reveal` *is* the `<footer>` (via `as="footer"`), so the gentle entrance rides
 * on the landmark element itself rather than an extra nested box — the same
 * pattern OurStory and the details cards use.
 *
 * Colours come entirely from `@theme` tokens (`text-sage`, `text-sage-deep`) —
 * no raw hex anywhere (14.6).
 */
export function Footer() {
  const { displayNames } = weddingConfig.couple
  const { displayDate } = weddingConfig.schedule

  return (
    <Reveal as="footer" className="mx-auto max-w-2xl py-16 text-center text-sage-deep">
      <p className="text-lg italic text-sage md:text-xl">
        We cannot wait to celebrate with you.
      </p>
      <p className="mt-6 font-display text-3xl text-sage-deep md:text-4xl">
        {displayNames}
      </p>
      <p className="mt-2 text-sm tracking-wide text-sage-deep/70">{displayDate}</p>
    </Reveal>
  )
}
