// The photo gallery: eight bundled placeholder images in a responsive grid.
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
// eight .webp files into the Vite build graph so they appear in the output.
//
// COORDINATION: this file renders its own `<section id="gallery">`. It does not
// touch MainInvitation.jsx; a sibling task wires it into the slot.

import weddingConfig from '../config/weddingConfig.js'
import { Reveal } from './Reveal.jsx'
import './Gallery.css'

/**
 * Number of stagger steps defined in index.css (`.reveal-delay-1`…`-6`). The
 * per-image delay cycles 1→6 across the grid so a row lights up in sequence
 * rather than all at once, and the cycle keeps every value inside the range
 * `Reveal` accepts even though there are eight images.
 */
const STAGGER_STEPS = 6

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
 * The gallery section.
 *
 * Grid columns: `grid-cols-1` at mobile (11.2), `sm:grid-cols-2` at tablet and
 * laptop, `xl:grid-cols-3` at desktop (11.3). Each image is wrapped in a
 * `Reveal` rendered as the `<figure>` grid item, so the reveal *is* the figure
 * rather than adding an extra box — the `.gallery-figure` class supplies the
 * 3:2 reserved box and the fallback surface.
 */
export function Gallery() {
  const { gallery } = weddingConfig

  return (
    <section id="gallery" aria-labelledby="gallery-heading">
      <div className="mx-auto max-w-5xl">
        <h2
          id="gallery-heading"
          className="font-display text-center text-4xl md:text-5xl text-sage-deep"
        >
          Moments
        </h2>

        <ul className="mt-10 grid list-none grid-cols-1 gap-4 p-0 sm:grid-cols-2 sm:gap-5 xl:grid-cols-3">
          {gallery.map((item, index) => (
            <Reveal
              as="li"
              key={item.src}
              delay={(index % STAGGER_STEPS) + 1}
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
          ))}
        </ul>
      </div>
    </section>
  )
}

export default Gallery
