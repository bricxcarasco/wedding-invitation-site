// Wedding_Config — the single source of truth for every wedding-specific value.
//
// Requirement 14.6: this file is the ONLY place in the repository that holds any
// of the values requirement 14 enumerates. Components read from here; they never
// restate a couple name, a date, a time, a venue name, or a palette hex.
//
// Two sanctioned exceptions, both documented where they live:
//   - `src/index.css`'s `@theme` block carries the same four palette hexes as
//     *style* tokens, while this file carries them as *data* for the DressCode
//     swatches. Tailwind v4 cannot read a JS module at build time, so the pair
//     is unavoidable and deliberate.
//   - `scripts/generate-placeholders.mjs` carries a third, build-time-only copy
//     to paint the placeholder images. It never ships in the bundle.

import rings from '../assets/gallery/01-rings.webp'
import couplePortrait from '../assets/gallery/02-couple-portrait.webp'
import ceremonyPhoto from '../assets/gallery/03-ceremony.webp'
import flowers from '../assets/gallery/04-flowers.webp'
import venuePhoto from '../assets/gallery/05-venue.webp'
import scenery from '../assets/gallery/06-outdoor-scenery.webp'
import receptionDetails from '../assets/gallery/07-reception-details.webp'

/**
 * The Ceremony_Datetime as a fixed absolute instant, offset-anchored on purpose
 * (requirement 3.6, 3.3). `Date.parse` resolves the `+08:00` offset at parse
 * time, so every runtime derives the same epoch value regardless of host
 * timezone. Edit this one string to move the wedding.
 */
export const CEREMONY_DATETIME = '2027-02-13T14:00:00+08:00'

/** The Palette. Four entries, each a name and a #rrggbb value. (14.4, 7.2, 7.3) */
export const palette = [
  { name: 'Sage', hex: '#55705f' },
  { name: 'Light Sage', hex: '#a3b899' },
  { name: 'Cream', hex: '#ede0cd' },
  { name: 'Silver Gray', hex: '#c0c0c0' },
]

// Each venue name is written exactly once, as a constant, and then used twice:
// once as the displayed `venueName` and once as the input to the Maps URL below.
// Holding the string in one binding is what makes 14.6 structural rather than a
// convention someone has to remember.
const CEREMONY_VENUE = 'Our Lady of Guadalupe Parish Church, Pagsanjan, Laguna'
const RECEPTION_VENUE = 'La Revelacion Farm Resort, Brgy. Calusiche, Pagsanjan, Laguna'

/**
 * Builds a Google Maps URL from a venue name using Google's documented
 * universal cross-platform search form. This single form resolves correctly on
 * desktop, Android, and iOS, so there is no per-platform branching and no
 * user-agent sniffing anywhere in the site.
 *
 * Deriving the URL rather than pasting a pre-encoded literal is deliberate: the
 * link and the venue name are then incapable of drifting apart. Rename a venue
 * and its map link follows in the same edit. The config test asserts each
 * `mapsUrl` contains `encodeURIComponent(venueName)` for its own venue, and
 * with this construction that assertion holds by definition rather than by
 * someone having remembered to re-encode a string by hand.
 *
 * A `maps.app.goo.gl` short link is deliberately NOT used: those are minted
 * server-side by Google, cannot be constructed offline, and a guessed one 404s.
 *
 * The couple may later paste a precise Maps share link or a place-ID URL over
 * either `mapsUrl` value below — replace `mapsSearchUrl(...)` with the literal
 * string and nothing else in the repository needs to change.
 */
function mapsSearchUrl(venueName) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(venueName)}`
}

const weddingConfig = {
  // 14.1
  couple: {
    groomName: 'Bricx Carasco',
    brideName: 'Giohannah Mae Manambit',
    displayNames: 'Bricx & Mae',
    // Kept short on purpose: it sits on one line under "Bricx & Mae" at 320px.
    tagline: 'One promise, and every day after.',
  },

  // 14.2
  schedule: {
    ceremonyDatetime: CEREMONY_DATETIME,
    displayDate: 'February 13, 2027',
    displayTime: '2:00 PM',
  },

  // 14.3 — one venue name and one Google Maps URL per venue. See mapsSearchUrl
  // above for why the URLs are derived rather than pasted, and for how to swap
  // in a precise share link later.
  ceremony: {
    label: 'Ceremony',
    venueName: CEREMONY_VENUE,
    mapsUrl: mapsSearchUrl(CEREMONY_VENUE),
  },
  reception: {
    label: 'Reception',
    venueName: RECEPTION_VENUE,
    mapsUrl: mapsSearchUrl(RECEPTION_VENUE),
  },

  palette,

  /**
   * 5.1 — 135 words, within the 60-200 bound the config test enforces. Written
   * in the couple's collective first-person voice.
   *
   * It deliberately invents no biographical detail: how Bricx and Mae met, how
   * long they have been together, and who asked whom are all unknown here, and
   * a fabricated history would be worse than none. So the copy stays with the
   * shared present and the invitation itself — the choosing of the day, the
   * gathering of the people, what they are walking into. If the couple later
   * want their actual history in here, this is the one string to rewrite; keep
   * the word count between 60 and 200 or the config test will say so.
   */
  story:
    'We chose this day the way we hope to choose everything from here: together, ' +
    'and without hesitation. There is no part of it we want to keep to ourselves, ' +
    'so we found a church in Pagsanjan, an afternoon warm enough to linger in, ' +
    'and a stretch of green where the tables can stay set long past sunset. Then ' +
    'we wrote down the names of everyone who has carried us this far, and that ' +
    'list became this invitation. What waits for us is both ordinary and ' +
    'enormous: plain mornings, small decisions, a lifetime of them. We would ' +
    'rather step into all of it surrounded than step into it quietly. So come ' +
    'early, stay late, and let the evening run long. Whatever we are becoming, ' +
    'we would like you in the room for the beginning of it.',

  dressCode: {
    // 7.1 — semi-formal / garden-formal, phrased as an invitation rather than a
    // rule list. It points at the four swatches DressCode renders beside this
    // text (7.2, 7.3) and calls them a guide, not a uniform. The heat and the
    // grass are named because a 2 PM church ceremony followed by a farm-resort
    // reception in Pagsanjan genuinely calls for light fabrics and flat shoes,
    // and telling guests so is kinder than letting them find out on the day.
    guidance:
      'Semi-formal, garden-formal — dressed for an afternoon you will want ' +
      'photographs of. The four swatches beside this note are the palette we ' +
      'built the day around; take them as a guide rather than a uniform, and ' +
      'anything resting near sage, cream, or soft neutral will sit beautifully ' +
      'in every frame. Pagsanjan in February is warm and humid, so choose ' +
      'light, breathable fabrics over anything you would have to endure. The ' +
      'reception is on grass and the evening runs long, so bring shoes you can ' +
      'stand and dance in.',
  },

  // 14.5 — every entry pairs a bundled import with alternative text. width and
  // height carry the intrinsic dimensions of the files so Gallery can satisfy
  // 6.4 straight from config and reserve layout space before the bytes arrive.
  //
  // Every `alt` string below describes the *generated palette placeholder* that
  // currently occupies that filename — the composition in
  // `src/assets/gallery/CREDITS.md`'s "Depicts" column — and not a photograph
  // the couple has yet to take. That is what makes it honest alt text today.
  //
  // MUST BE REWRITTEN when a real photograph replaces a file. The swap is
  // filename-for-filename and needs no code change, so nothing else here moves;
  // this string is the one thing that silently goes wrong if it is forgotten.
  // Step 4 of the replacement procedure in CREDITS.md and the README says so.
  gallery: [
    {
      subject: 'rings',
      src: rings,
      alt: 'Concentric sage and cream rings, two of them drawn heavier than the rest, the inner band catching a soft sheen and set with two small pale stones.',
      width: 1200,
      height: 800,
    },
    {
      subject: 'couple-portrait',
      src: couplePortrait,
      alt: 'Two soft sage and cream ellipses overlapping as they lean into one another.',
      width: 1200,
      height: 800,
    },
    {
      subject: 'ceremony',
      src: ceremonyPhoto,
      alt: 'A ceremony arch traced in sage, with pale blossoms scattered along its curve and down both uprights.',
      width: 1200,
      height: 800,
    },
    {
      subject: 'flowers',
      src: flowers,
      alt: 'Three blooms drawn as radial petal forms in light sage and cream.',
      width: 1200,
      height: 800,
    },
    {
      subject: 'venue',
      src: venuePhoto,
      alt: 'A low sun resting on a wide horizon band, a pale colonnade standing along the skyline.',
      width: 1200,
      height: 800,
    },
    {
      subject: 'outdoor-scenery',
      src: scenery,
      alt: 'Four layered hills in deepening sage, receding into a pale cream sky.',
      width: 1200,
      height: 800,
    },
    {
      subject: 'reception-details',
      src: receptionDetails,
      alt: 'A table setting seen from above, its plates, glasses and places composed from circles in cream and silver gray.',
      width: 1200,
      height: 800,
    },
  ],

  // Consumed by lib/icalendar.js. There is deliberately NO `location` key here:
  // `buildCeremonyEvent()` reads `ceremony.venueName`, so the venue string
  // exists exactly once in the repository (14.6, 9.3).
  calendar: {
    summary: 'Wedding of Bricx & Mae',
    description: 'We would love to have you with us.',
    durationMinutes: 90,
  },

  rsvp: {
    formName: 'rsvp',
    minGuests: 1,
    maxGuests: 10,
  },
}

export default weddingConfig
