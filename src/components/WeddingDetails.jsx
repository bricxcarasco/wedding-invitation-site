// The Wedding_Details section: ceremony and reception cards, and the host for
// the Add to Calendar control.
//
// Requirements: 4.1 (ceremony card — label, time, venue), 4.2 (reception card —
// label, venue, no time), 4.3 / 10.2 (each card wrapped in Scroll_Reveal), 4.7
// (final-state under reduced motion — handled inside `Reveal`), 9.1 (hosts the
// "Add to Calendar" control), 11.2 (single column on mobile, side-by-side wider).
//
// Every wedding value is READ from Wedding_Config (14.6): the labels, the time,
// and the venue names are never restated here. The reception has no time in
// config, so its card renders none — 4.2 asks for label + venue only.
//
// The map buttons are NOT here. "View Ceremony Location" / "View Reception
// Location" (4.4–4.6) belong to the `Venue` component, a separate section
// (task 7.8). This section shows the details and the calendar control only.

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
 * @param {object} props
 * @param {string} props.label   the card heading ("Ceremony" / "Reception")
 * @param {string} props.venue   the venue name
 * @param {string} [props.time]  the displayed time, ceremony only
 * @param {number} [props.delay] stagger step forwarded to `Reveal`
 */
function DetailCard({ label, venue, time, delay }) {
  return (
    <Reveal
      as="article"
      delay={delay}
      className="rounded-2xl border border-sage-light/50 bg-cream-soft p-8 shadow-sm"
    >
      <h3 className="font-display text-2xl text-sage">{label}</h3>
      {time ? <p className="mt-2 text-lg text-sage-deep">{time}</p> : null}
      <p className="mt-2 text-sage-deep">{venue}</p>
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
            delay={1}
          />
          <DetailCard label={reception.label} venue={reception.venueName} delay={2} />
        </div>

        <div className="mt-10 flex justify-center">
          <AddToCalendarButton />
        </div>
      </div>
    </section>
  )
}

export default WeddingDetails
