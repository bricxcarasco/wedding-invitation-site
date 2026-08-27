// The DressCode section: attire guidance plus the four Palette swatches.
//
// Requirements: 7.1 (attire guidance sourced from Wedding_Config), 7.2 (four
// swatches rendering the four Palette values), 7.3 (each colour's name and hex
// value as text adjacent to its swatch), 10.2 (DressCode is one of the
// Reveal-wrapped sections).
//
// Every value is READ from Wedding_Config (14.6): the guidance is
// `config.dressCode.guidance` and the swatches map `config.palette`.
//
// The one sanctioned hex usage in this file is `backgroundColor: entry.hex` on
// each swatch. That value originates in `config.palette` and flows straight
// through to `style` to paint the colour — it is not a restated literal, so it
// satisfies 14.6. There is no other raw hex here; the surrounding chrome uses
// `@theme` tokens. The hex is also printed as text beside the swatch (7.3),
// which is the config value shown, not a second copy.

import weddingConfig from '../config/weddingConfig.js'

import { Reveal } from './Reveal.jsx'

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
 * The dress code guidance and the four Palette swatches.
 *
 * `Reveal` *is* the `<section>` (via `as="section"`), matching the pattern the
 * other content sections use. The guidance reads as a short warm paragraph in a
 * centred column; the four swatches sit in a row that wraps to two-up on the
 * narrowest screens. "What to Wear" is a section label rather than wedding data,
 * so it is a literal here.
 */
export function DressCode() {
  const { dressCode, palette } = weddingConfig

  return (
    <Reveal as="section" id="dress-code" className="mx-auto max-w-2xl text-center">
      <h2 className="font-display text-3xl text-sage md:text-4xl">What to Wear</h2>
      <p className="mt-8 text-lg leading-relaxed text-sage-deep">{dressCode.guidance}</p>
      <div className="mt-10 flex flex-wrap items-start justify-center gap-8">
        {palette.map((entry) => (
          <Swatch key={entry.hex} name={entry.name} hex={entry.hex} />
        ))}
      </div>
    </Reveal>
  )
}

export default DressCode
