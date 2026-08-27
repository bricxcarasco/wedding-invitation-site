// The Main_Invitation shell: the scrollable body revealed once the
// Envelope_Gate opens.
//
// Requirements: 1.6, 10.3.
//
// `MainInvitation` is a composition wrapper, NOT a content section. It renders
// no wedding copy of its own and reads nothing from Wedding_Config. Its whole
// reason to exist is to own two cross-cutting concerns in one place instead of
// smearing them across `App` and `Hero`:
//
//   1. the post-reveal scroll reset (1.6), and
//   2. the post-reveal focus target.
//
// Everything else here is layout: the fixed decorative parallax layer (10.3),
// the `<main>` landmark, the section rhythm, and an ordered slot list that
// tasks 7.1–7.12 fill in.
//
// DEVIATION FROM THE DESIGN SKETCH (decided during spec review). The design's
// `MainInvitation` sketch held a `heroRef` and focused an element rendered by
// `Hero`. That would make this component's core behaviour untestable until
// `Hero` exists, and it would split ownership of the focus target across two
// files. Instead **`MainInvitation` owns the focus target itself**: it renders
// the wrapper carrying `tabIndex={-1}` and holds the ref to it, so the focus
// behaviour is complete and verifiable here. `Hero` (task 7.1) then *occupies*
// that wrapper as the first slot — the element and the ref stay owned by this
// file, and `Hero` supplies the `<h1>` and the rest of the content inside it.

import { useEffect, useRef } from 'react'

import { ParallaxLayer } from './ParallaxLayer.jsx'
import { HeroConfetti } from './HeroConfetti.jsx'
import { Hero } from './Hero.jsx'
import { Countdown } from './Countdown.jsx'
import { WeddingDetails } from './WeddingDetails.jsx'
import { OurStory } from './OurStory.jsx'
import { Gallery } from './Gallery.jsx'
import { Venue } from './Venue.jsx'
import { DressCode } from './DressCode.jsx'
import { Rsvp } from './Rsvp.jsx'
import { Footer } from './Footer.jsx'

/* --------------------------------------------------------------------------
   Section rhythm

   Expressed once, here, as child selectors on the `<main>` element rather than
   repeated in nine section components. Later tasks then only have to render a
   `<section>`; the vertical spacing and the banding follow automatically and
   cannot drift section to section.

   Banding alternates transparent / Cream-soft rather than Cream / Cream-soft.
   `body` already paints Cream, so an "odd" section needs no background of its
   own — and leaving it transparent is what lets the fixed ParallaxLayer show
   through (10.3). Painting every section opaque would satisfy the banding and
   silently hide the parallax effect behind it.

   Tokens only, no raw hex (14.6): `bg-cream-soft` resolves to the
   `--color-cream-soft` token declared in the `@theme` block of `index.css`.
   -------------------------------------------------------------------------- */
const SECTION_RHYTHM = [
  '[&>section]:px-6',
  '[&>section]:py-20',
  'md:[&>section]:px-8',
  'md:[&>section]:py-28',
  '[&>section:nth-of-type(even)]:bg-cream-soft',
].join(' ')

/**
 * The revealed invitation body.
 *
 * Mounted by `App` only while the gate phase is `'open'`, and never
 * constructed before that (1.4), so this component's mount effect *is* the
 * "opening animation completed" moment.
 *
 * NO SKIP LINK, deliberately. A skip link exists to let a keyboard user jump
 * over content repeated ahead of the main landmark — a masthead, a nav bar, a
 * breadcrumb trail. This site is a single continuous scroll with no navigation
 * of any kind, and `<main>` is the first thing in the tree, so a skip link
 * would have nothing to skip past. It would also be the only tab stop before
 * the content, which makes the tab order worse rather than better. The reveal
 * already places focus at the top of `<main>` (below), which is exactly where
 * a skip link would have sent the visitor anyway.
 */
export function MainInvitation() {
  // The post-reveal focus target. `Hero` renders into this element in 7.1; the
  // ref stays here.
  const focusRef = useRef(null)

  useEffect(() => {
    // 1.6 — put the visitor at the top of the Main_Invitation.
    //
    // `behavior: 'auto'` deliberately overrides the global
    // `html { scroll-behavior: smooth }` (10.1) for this one programmatic jump.
    // A smooth scroll to a document that mounted at offset zero is either a
    // no-op or, if the browser has restored a scroll position, a visible lurch
    // during the handoff from the envelope. Neither is what 1.6 asks for.
    //
    // Guarded on the method rather than assumed: `scrollTo` is missing or a
    // warning-only stub in some non-browser environments, and this effect must
    // still reach the focus call below when that happens.
    if (typeof window !== 'undefined' && typeof window.scrollTo === 'function') {
      window.scrollTo({ top: 0, behavior: 'auto' })
    }

    // Focus follows the reveal.
    //
    // This is not polish. The envelope `<button>` was the focused element, and
    // unmounting it drops focus to `document.body` — which strands a keyboard
    // user at an unannounced document start with no idea that anything
    // appeared, and gives a screen-reader user nothing to read. Moving focus
    // into the top of the revealed content is the announcement.
    //
    // `preventScroll: true` stops the focus call from scrolling the wrapper
    // into view and undoing the reset immediately above it.
    const node = focusRef.current
    if (node && typeof node.focus === 'function') {
      node.focus({ preventScroll: true })
    }
  }, [])

  return (
    <>
      {/* 10.3 — one fixed, `aria-hidden`, purely decorative parallax layer.
          Outside `<main>` because it carries no content: it must not appear in
          the main landmark's reading order. Neutralised under `reduce` by the
          global media block in index.css and by `useParallax` attaching no
          listener at all (10.6). */}
      <ParallaxLayer />

      {/* `relative z-10` keeps the whole content column above the fixed
          decorative layer regardless of the stacking context ParallaxLayer
          establishes for itself. */}
      <main className={`relative z-10 ${SECTION_RHYTHM}`}>
        {/* ==================================================================
            SLOT ORDER — scroll order is defined here and nowhere else.
            Tasks 7.1–7.12 each fill exactly one slot below, in place. Do not
            reorder, and do not append a section to the end of the list
            instead of using its slot.
            ================================================================== */}

        {/* ---- Slot 1 — Hero (task 7.1) --------------------------------------
            THIS ELEMENT IS THE FOCUS TARGET. `Hero` renders its content
            *inside* this `<section>` and must not replace it, move the `ref`,
            or drop `tabIndex={-1}`.

            `tabIndex={-1}` makes the wrapper programmatically focusable while
            keeping it out of the tab order — a Tab press from here goes to the
            first real control, not back through a landmark nobody asked to
            visit. */}
        <section
          id="hero"
          ref={focusRef}
          tabIndex={-1}
          className="relative overflow-hidden"
        >
          {/* Falling confetti behind the hero copy. First child so it paints
              underneath, clipped by this section's `overflow-hidden`, and held
              on a low z-index by `.hero-confetti`. `aria-hidden` decoration —
              it adds nothing to the reading order and intercepts no clicks. */}
          <HeroConfetti />

          {/* The hero content sits on `z-10` so it stays above the confetti
              regardless of the stacking context the confetti layer creates. */}
          <div className="relative z-10">
            <Hero />
          </div>
        </section>

        <Countdown />

        <WeddingDetails />

        <OurStory />

        <Gallery />

        <Venue />

        <DressCode />

        <Rsvp />
      </main>

      <Footer />

      {/* ---- Slot 9 — Footer (task 7.12) ------------------------------------
          Last in scroll order, but a sibling of `<main>` rather than a child.
          A `<footer>` only maps to the `contentinfo` landmark when it is scoped
          to the document; nested inside `<main>` it is announced as a plain
          section footer instead. Keeping it outside costs nothing visually and
          keeps the landmark correct. */}
    </>
  )
}

// Exported both ways on purpose. `App` (task 6.1) and the section tasks are
// written concurrently with this file, and a default/named mismatch would break
// the build for whichever one guessed differently. Both exports are the same
// component, so `react-refresh/only-export-components` is satisfied.
export default MainInvitation
