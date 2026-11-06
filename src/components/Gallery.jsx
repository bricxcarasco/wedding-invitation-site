// The photo gallery: a responsive grid of the couple's photos.
//
// Requirements: 6.1 (seven subjects), 6.3 (served from the build output, no
// external host), 6.4 (`loading="lazy"` plus explicit width/height), 6.5
// (Scroll_Reveal per image, staggered), 6.6 (hover scale — the `.gallery-img`
// class in index.css already defines the 1.04 transform), 6.8 (all motion
// suppressed under reduce, handled by Reveal + the index.css @media block),
// 10.2 (section is a revealing section), 11.2 / 11.3 (one column at mobile,
// two at tablet/laptop, three at desktop), 12.1 (lazy loading keeps images out
// of the initial request set).
//
// DATA FLOW (14.6): every image, its alt text, and its dimensions come from
// `weddingConfig.gallery`. This component restates none of them — it is the
// first module to import the config's gallery array, which is what pulls the
// .webp files into the Vite build graph so they appear in the output.
//
// PROGRESSIVE DISCLOSURE: the grid shows the first `INITIAL_VISIBLE` photos and
// tucks the rest behind a "See more" button (its label is built from the
// couple's display names read from config, never restated here). While collapsed,
// the hidden rows are clipped to a short peek and faded with a gradient mask so
// guests see there is more below; pressing the button grows the region's
// max-height and fades the remainder to full opacity in one smooth transition
// (see `.gallery-more` in index.css). The hidden <img>s stay in the DOM the
// whole time carrying `loading="lazy"`, so the browser only fetches each one as
// it nears the viewport — on first paint only the first rows are requested
// (12.1), and the rest load as the guest scrolls or expands. Under reduced
// motion the index.css @media block zeroes the transition, so the expand is
// instant while staying fully functional.

import { useId, useState } from 'react'

import weddingConfig from '../config/weddingConfig.js'
import { Reveal } from './Reveal.jsx'
import './Gallery.css'

/**
 * Number of stagger steps defined in index.css (`.reveal-delay-1`…`-6`). The
 * per-image delay cycles 1→6 across the grid so a row lights up in sequence
 * rather than all at once, and the cycle keeps every value inside the range
 * `Reveal` accepts.
 */
const STAGGER_STEPS = 6

/**
 * How many photos show before the "See more" button. Six fills two rows at the
 * tablet/laptop two-column layout and three rows of two at mobile, so the grid
 * always ends on a clean row before the disclosure.
 */
const INITIAL_VISIBLE = 6

/**
 * Hide a gallery image that failed to load so the figure's Palette gradient
 * shows through as an intentional placeholder (design's error-handling table).
 * The alt text stays on the element for assistive technology, and because the
 * figure already reserved its space via `aspect-ratio`, the layout does not
 * shift. Idempotent: re-adding the class is harmless.
 *
 * @param {import('react').SyntheticEvent<HTMLImageElement>} event
 */
function handleImageError(event) {
  event.currentTarget.classList.add('gallery-img--error')
}

/**
 * One gallery figure. Kept as a local helper so the visible grid and the
 * "more" region render identical markup. `delayIndex` drives the stagger so the
 * cycle stays continuous across both groups.
 */
function GalleryFigure({ item, delayIndex }) {
  return (
    <Reveal
      as="li"
      delay={(delayIndex % STAGGER_STEPS) + 1}
      className="gallery-figure"
    >
      <img
        src={item.src}
        alt={item.alt}
        width={1200}
        height={800}
        loading="lazy"
        decoding="async"
        className="gallery-img"
        onError={handleImageError}
      />
    </Reveal>
  )
}

/**
 * The gallery section.
 *
 * Grid columns: `grid-cols-1` at mobile (11.2), `sm:grid-cols-2` at tablet and
 * laptop, `xl:grid-cols-3` at desktop (11.3). Each image is wrapped in a
 * `Reveal` rendered as the `<figure>`/`<li>` grid item, so the reveal *is* the
 * figure rather than adding an extra box — the `.gallery-figure` class supplies
 * the 3:2 reserved box and the fallback surface.
 */
export function Gallery() {
  const { gallery, couple } = weddingConfig
  const [expanded, setExpanded] = useState(false)

  const moreId = useId()
  const visible = gallery.slice(0, INITIAL_VISIBLE)
  const hidden = gallery.slice(INITIAL_VISIBLE)
  const hasMore = hidden.length > 0

  const gridClasses =
    'grid list-none grid-cols-1 gap-4 p-0 sm:grid-cols-2 sm:gap-5 xl:grid-cols-3'

  return (
    <section id="gallery" aria-labelledby="gallery-heading">
      <div className="mx-auto max-w-5xl">
        <h2
          id="gallery-heading"
          className="font-display text-center text-4xl md:text-5xl text-sage-deep"
        >
          Moments
        </h2>

        <ul className={`mt-10 ${gridClasses}`}>
          {visible.map((item, index) => (
            <GalleryFigure key={item.src} item={item} delayIndex={index} />
          ))}
        </ul>

        {hasMore && (
          <>
            {/* The collapsible remainder. While collapsed it is clipped to a
                short peek and masked to a fade (see `.gallery-more`), so guests
                glimpse the extra photos at reduced opacity; expanding grows the
                max-height and clears the mask in one transition. */}
            <div
              id={moreId}
              className={`gallery-more ${expanded ? 'gallery-more--open' : ''}`}
              aria-hidden={!expanded}
            >
              <ul className={`mt-4 sm:mt-5 ${gridClasses}`}>
                {hidden.map((item, index) => (
                  <GalleryFigure
                    key={item.src}
                    item={item}
                    delayIndex={index + INITIAL_VISIBLE}
                  />
                ))}
              </ul>
            </div>

            {!expanded && (
              <div className="mt-8 flex justify-center">
                <button
                  type="button"
                  onClick={() => setExpanded(true)}
                  aria-expanded={expanded}
                  aria-controls={moreId}
                  className="control control-btn tap-target gap-2 rounded-full border border-sage bg-sage px-8 py-3 font-display text-xl text-cream md:text-2xl"
                >
                  See more of {couple.displayNames}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  )
}

export default Gallery
