// The DressCode section: attire guidance, the dress-code image, and the four
// Palette swatches beneath it.
//
// Requirements: 7.1 (attire guidance sourced from Wedding_Config), 7.2 (four
// swatches rendering the four Palette values), 7.3 (each colour's name and hex
// value as text adjacent to its swatch), 10.2 (DressCode is one of the
// Reveal-wrapped sections).
//
// The guidance text and the palette both READ from Wedding_Config (14.6). The
// dress-code image (`dress-codes.png`) sits below the guidance, and the four
// colour swatches sit below the image.
//
// The one sanctioned hex usage in this file is `backgroundColor: entry.hex` on
// each swatch. That value originates in `config.palette` and flows straight
// through to `style` to paint the colour — it is not a restated literal, so it
// satisfies 14.6. The hex is also printed as text beside the swatch (7.3),
// which is the config value shown, not a second copy.

import weddingConfig from '../config/weddingConfig.js'

import dressCodeImage from '../assets/images/dress-codes.png'

import { Reveal } from './Reveal.jsx'

// The image's intrinsic pixel dimensions. Set on the <img> so the browser can
// reserve the correct box before the file loads (no layout shift), while the
// CSS below keeps it fluid and never upscales past its natural size.
const IMAGE_WIDTH = 1413
const IMAGE_HEIGHT = 768

/**
 * One palette swatch: the colour block, its name, and its hex value as text.
 *
 * The colour is applied through inline `style` because it is data, not a design
 * token known at authoring time — `config.palette` is the source of truth and a
 * different palette would repaint these blocks with no code change. Name and
 * hex render as adjacent text so colour is never the sole carrier of the
 * information (7.3, and the design's Accessibility note on swatches).
 *
 * The swatch itself is decorative (the colour is conveyed by the adjacent
 * text), so it carries `aria-hidden` to avoid an empty, unlabelled box in the
 * accessibility tree.
 *
 * @param {object} props
 * @param {string} props.name the colour name, from config
 * @param {string} props.hex  the colour hex value, from config
 */
function Swatch({ name, hex }) {
  return (
    <figure className="flex flex-col items-center">
      <span
        aria-hidden="true"
        className="block h-20 w-20 rounded-full border border-sage-light/60 shadow-sm"
        style={{ backgroundColor: hex }}
      />
      <figcaption className="mt-3 text-center">
        <span className="block text-sage-deep">{name}</span>
        <span className="block text-sm text-sage">{hex}</span>
      </figcaption>
    </figure>
  )
}

/**
 * The dress code guidance, the dress-code image, and the four Palette swatches.
 *
 * `Reveal` *is* the `<section>` (via `as="section"`), matching the pattern the
 * other content sections use. The guidance reads as a short warm paragraph in a
 * centred column; the image sits directly below it; the swatches sit below the
 * image, wrapping to two-up on the narrowest screens.
 *
 * The image is responsive and never stretched: `w-full` lets it fill the
 * column on narrow screens, `max-w-2xl` caps it on wide ones, `h-auto` keeps its
 * aspect ratio, and `object-contain` guarantees the pixels are letterboxed
 * rather than distorted even if the box ratio ever differs. `mx-auto` centres
 * it under the text. No shadow or border — the image carries its own frame.
 */
export function DressCode() {
  const { dressCode, palette } = weddingConfig

  return (
    <Reveal as="section" id="dress-code" className="mx-auto max-w-2xl text-center">
      <h2 className="font-display text-3xl text-sage md:text-4xl">What to Wear</h2>
      <p className="mt-8 text-lg leading-relaxed text-sage-deep">{dressCode.guidance}</p>
      <img
        src={dressCodeImage}
        width={IMAGE_WIDTH}
        height={IMAGE_HEIGHT}
        loading="lazy"
        decoding="async"
        alt="Dress code guide illustrating semi-formal, garden-formal attire in the wedding's colours."
        className="mx-auto mt-10 block h-auto w-full max-w-2xl object-contain"
      />
      <div className="mt-10 flex flex-wrap items-start justify-center gap-8">
        {palette.map((entry) => (
          <Swatch key={entry.hex} name={entry.name} hex={entry.hex} />
        ))}
      </div>
    </Reveal>
  )
}

export default DressCode
