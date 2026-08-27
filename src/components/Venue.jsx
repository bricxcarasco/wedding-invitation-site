// The Venue section: two external map links, one per venue.
//
// Requirements: 4.4 ("View Ceremony Location" opening the ceremony Maps URL in a
// new tab), 4.5 ("View Reception Location" opening the reception Maps URL in a
// new tab), 4.6 (every external map link carries rel="noopener noreferrer"),
// 10.2 (Venue is one of the Reveal-wrapped sections), 11.4 (≥44×44px targets).
//
// Every value is READ from Wedding_Config (14.6): the two venue names and the
// two Maps URLs are never restated here. The URLs come from
// `config.ceremony.mapsUrl` / `config.reception.mapsUrl`, and the venue names
// from `config.ceremony.venueName` / `config.reception.venueName`.
//
// Accessibility (4.6, and the design's Accessibility section):
//   - target="_blank" opens a new tab; rel="noopener noreferrer" denies the
//     opened tab a window.opener handle and withholds the referrer.
//   - Each link's accessible name includes its venue name, so the two links are
//     distinguishable out of context (a screen-reader "list all links" view
//     shows two differently-named links rather than two "View … Location"s).
//   - A visually hidden "(opens in a new tab)" on each link announces the
//     target change without cluttering the visual layout.
//
// Colours come entirely from `@theme` tokens; there is no raw hex here.

import weddingConfig from '../config/weddingConfig.js'

import { Reveal } from './Reveal.jsx'

/**
 * One venue block: the venue name as visible text, plus a labelled external map
 * link beneath it.
 *
 * The visible link text stays the fixed label the requirement names ("View
 * Ceremony Location" / "View Reception Location"), while the accessible name is
 * extended with the venue name and the new-tab note through visually hidden
 * spans. So a sighted user reads the short label with the venue named above it,
 * and a screen-reader user hears "View Ceremony Location, Our Lady of Guadalupe
 * Parish Church…, (opens in a new tab), link" — enough to tell the two apart in
 * a links list.
 *
 * @param {object} props
 * @param {string} props.label     the fixed control label (4.4 / 4.5)
 * @param {string} props.venueName the venue name, from config
 * @param {string} props.mapsUrl   the Maps URL, from config
 * @param {number} [props.delay]   stagger step forwarded to Reveal
 */
function VenueBlock({ label, venueName, mapsUrl, delay }) {
  return (
    <Reveal
      as="article"
      delay={delay}
      className="rounded-2xl border border-sage-light/50 bg-cream-soft p-8 text-center shadow-sm"
    >
      <p className="text-lg text-sage-deep">{venueName}</p>
      <a
        href={mapsUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="control tap-target mt-6 rounded-full border border-sage bg-sage px-6 text-cream"
      >
        {label}
        <span className="visually-hidden">{`: ${venueName} (opens in a new tab)`}</span>
      </a>
    </Reveal>
  )
}

/**
 * The two venue map links.
 *
 * Renders its own `<section id="venue">` (the orchestrator wires it into
 * `MainInvitation`'s slot afterward). The two blocks sit in a grid that is a
 * single column at mobile widths and two columns from `sm` up.
 */
export function Venue() {
  const { ceremony, reception } = weddingConfig

  return (
    <section id="venue">
      <div className="mx-auto max-w-4xl text-center">
        <h2 className="font-display text-3xl text-sage md:text-4xl">Getting There</h2>
        <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2">
          <VenueBlock
            label="View Ceremony Location"
            venueName={ceremony.venueName}
            mapsUrl={ceremony.mapsUrl}
            delay={1}
          />
          <VenueBlock
            label="View Reception Location"
            venueName={reception.venueName}
            mapsUrl={reception.mapsUrl}
            delay={2}
          />
        </div>
      </div>
    </section>
  )
}

export default Venue
