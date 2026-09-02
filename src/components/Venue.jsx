// The Venue / "Getting There" section.
//
// Requirements: 10.2 (Venue is one of the Reveal-wrapped sections), 4.7 (final
// state under reduced motion — handled inside `Reveal`).
//
// WHAT CHANGED. This section used to repeat the ceremony and reception venue
// info and hold the two "View … Location" map links. The couple asked to move
// those map links up onto the Wedding_Details cards (next to each venue's own
// details) and to close this section with scripture instead of repeating the
// venue info. So the map links now live in `WeddingDetails`, and this section
// renders a Bible verse.
//
// The requirement-4.4/4.5/4.6 map links have NOT been dropped — they moved
// intact to `WeddingDetails`, keeping their fixed labels, per-venue accessible
// names, `target="_blank"`, and `rel="noopener noreferrer"`.
//
// The verse text is READ from Wedding_Config (14.6): `config.venue.verse` and
// `config.venue.verseReference` are never restated here, the same way OurStory
// reads its scripture. Colours come entirely from `@theme` tokens; no raw hex.
//
// The section keeps its `id="venue"` and its "Getting There" heading so the
// scroll body's section rhythm and anchors are unchanged.

import weddingConfig from '../config/weddingConfig.js'

import { Reveal } from './Reveal.jsx'

/**
 * The "Getting There" section, closing with a scripture verse.
 *
 * `Reveal` *is* the `<section id="venue">` (via `as="section"`), so the reveal
 * wraps the whole section rather than sitting in an extra nested box — the same
 * pattern OurStory and the detail cards use. The verse is rendered as a real
 * `<blockquote>` with a `<cite>` attribution beneath it, matching OurStory's
 * scripture layout.
 */
export function Venue() {
  const { venue } = weddingConfig

  return (
    <Reveal as="section" id="venue" className="mx-auto max-w-2xl text-center">
      <h2 className="font-display text-3xl text-sage md:text-4xl">Getting There</h2>

      <blockquote className="mt-8">
        <p className="text-xl italic leading-relaxed text-sage-deep md:text-2xl">
          &ldquo;{venue.verse}&rdquo;
        </p>
        <cite className="mt-6 block text-base not-italic tracking-wide text-sage md:text-lg">
          &mdash; {venue.verseReference}
        </cite>
      </blockquote>
    </Reveal>
  )
}

export default Venue
