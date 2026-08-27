// The OurStory section: the couple's own words, revealed as it scrolls in.
//
// Requirements: 5.1 (narrative sourced from Wedding_Config), 5.2 (Scroll_Reveal
// on the narrative when it first enters the viewport), 5.3 (final state under
// reduced motion), 10.2 (OurStory is one of the Reveal-wrapped sections).
//
// The narrative text is read from `config.story` and never restated here
// (14.6): weddingConfig.js is the single source of truth for the copy and its
// word count, so this file only decides how that string is laid out.
//
// The reduced-motion path is not handled here. `Reveal` already mounts in its
// final position and opacity under `reduce` (5.3, 10.6), and the CSS in
// index.css neutralises the transition as a second layer, so wrapping the prose
// in `Reveal` is the whole of the motion policy this section needs.

import weddingConfig from '../config/weddingConfig.js'

import { Reveal } from './Reveal.jsx'

/**
 * The couple's narrative message.
 *
 * `Reveal` *is* the `<section>` (via `as="section"`), so the reveal wraps the
 * whole section rather than sitting in an extra nested box — the same pattern
 * the details cards and gallery items use. The section carries `id="our-story"`
 * so the scroll body can anchor to it, and the reveal classes ride on the
 * section element itself.
 *
 * Layout: a centred reading column capped near 65ch so lines stay in the
 * comfortable measure for long-form prose, with generous leading from the body
 * `line-height` set in index.css. "Our Story" is a section label rather than
 * wedding data, so it is a literal here, set in the display font; the prose
 * below it uses the body font inherited from `body`.
 *
 * Colours come entirely from `@theme` tokens (`text-sage`, `text-sage-deep`) —
 * no raw hex anywhere (14.6).
 */
export function OurStory() {
  return (
    <Reveal as="section" id="our-story" className="mx-auto max-w-2xl text-center">
      <h2 className="font-display text-3xl text-sage md:text-4xl">Our Story</h2>
      <p className="mt-8 text-lg leading-relaxed text-sage-deep md:text-xl">
        {weddingConfig.story}
      </p>
    </Reveal>
  )
}
