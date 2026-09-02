// The Wedding_Details section: ceremony and reception cards, and the host for
// the Add to Calendar control.
//
// Requirements: 4.1 (ceremony card — label, time, venue), 4.2 (reception card —
// label, venue), 4.3 / 10.2 (each card wrapped in Scroll_Reveal), 4.7
// (final-state under reduced motion — handled inside `Reveal`), 9.1 (hosts the
// "Add to Calendar" control), 11.2 (single column on mobile, side-by-side wider).
//
// Every wedding value is READ from Wedding_Config (14.6): the labels, the times,
// and the venue names are never restated here. Both cards now show a time — the
// ceremony's from `schedule.displayTime`, the reception's from
// `reception.displayTime`. Only `schedule.displayTime` corresponds to the
// countdown/.ics instant; the reception time is display-only.
//
// The map buttons live HERE now, one per card: "View Ceremony Location" sits on
// the ceremony card and "View Reception Location" on the reception card
// (4.4–4.6), directly beneath the venue each one points at. The `Venue`
// section ("Getting There") no longer repeats the venue info — it closes with
// a scripture verse instead — so the links moved up to sit with their details.

import weddingConfig from '../config/weddingConfig.js'
import { AddToCalendarButton } from './AddToCalendarButton.jsx'
import { Reveal } from './Reveal.jsx'

/**
 * One detail card. Rendered as the `Reveal` element itself (`as="article"`) so
 * the scroll-reveal wraps the semantic card directly, with no extra layout box
 * between the grid and the article — see the `as` note in `Reveal.jsx`.
 *
 * `time` is optional: the reception passes none, so the card simply omits the
 * time line rather than rendering an empty one.
 *
 * The external map link (4.4–4.6) is rendered beneath the venue. Its visible
 * text stays the fixed label the requirement names ("View Ceremony Location" /
 * "View Reception Location"), while a visually hidden span extends the
 * accessible name with the venue and a new-tab note, so the two links are
 * distinguishable out of context. `target="_blank"` opens a new tab and
 * `rel="noopener noreferrer"` denies the opened tab a window.opener handle and
 * withholds the referrer (4.6).
 *
 * @param {object} props
 * @param {string} props.label    the card heading ("Ceremony" / "Reception")
 * @param {string} props.venue    the venue name
 * @param {string} props.mapLabel the fixed map-link label (4.4 / 4.5)
 * @param {string} props.mapsUrl  the Maps URL, from config
 * @param {string} [props.time]   the displayed time, ceremony only
 * @param {number} [props.delay]  stagger step forwarded to `Reveal`
 */
function DetailCard({ label, venue, mapLabel, mapsUrl, time, delay }) {
  return (
    <Reveal
      as="article"
      delay={delay}
      className="flex flex-col rounded-2xl border border-sage-light/50 bg-cream-soft p-8 shadow-sm"
    >
      <h3 className="font-display text-2xl text-sage">{label}</h3>
      {time ? <p className="mt-2 text-lg text-sage-deep">{time}</p> : null}
      <p className="mt-2 text-sage-deep">{venue}</p>
      <a
        href={mapsUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="control control-btn tap-target mt-6 self-start rounded-full border border-sage bg-sage px-6 font-display text-xl text-cream"
      >
        {mapLabel}
        <span className="visually-hidden">{`: ${venue} (opens in a new tab)`}</span>
      </a>
    </Reveal>
  )
}

/**
 * The ceremony and reception details, with the Add to Calendar control beneath.
 *
 * Renders its own `<section id="details">` (the orchestrator wires it into
 * `MainInvitation`'s slot afterward). The two cards sit in a grid that is a
 * single column at mobile widths and two columns from `sm` up (11.2).
 */
export function WeddingDetails() {
  const { ceremony, reception, schedule } = weddingConfig

  return (
    <section id="details">
      <div className="mx-auto max-w-4xl">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <DetailCard
            label={ceremony.label}
            time={schedule.displayTime}
            venue={ceremony.venueName}
            mapLabel="View Ceremony Location"
            mapsUrl={ceremony.mapsUrl}
            delay={1}
          />
          <DetailCard
            label={reception.label}
            time={reception.displayTime}
            venue={reception.venueName}
            mapLabel="View Reception Location"
            mapsUrl={reception.mapsUrl}
            delay={2}
          />
        </div>

        <div className="mt-10 flex justify-center">
          <AddToCalendarButton />
        </div>
      </div>
    </section>
  )
}

export default WeddingDetails
