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

import photo01 from '../assets/gallery/01.webp'
import photo02 from '../assets/gallery/02.webp'
import photo03 from '../assets/gallery/03.webp'
import photo04 from '../assets/gallery/04.webp'
import photo05 from '../assets/gallery/05.webp'
import photo06 from '../assets/gallery/06.webp'
import photo07 from '../assets/gallery/07.webp'
import photo08 from '../assets/gallery/08.webp'
import photo09 from '../assets/gallery/09.webp'
import photo10 from '../assets/gallery/10.webp'
import photo11 from '../assets/gallery/11.webp'

/**
 * The Ceremony_Datetime as a fixed absolute instant, offset-anchored on purpose
 * (requirement 3.6, 3.3). `Date.parse` resolves the `+08:00` offset at parse
 * time, so every runtime derives the same epoch value regardless of host
 * timezone. Edit this one string to move the wedding.
 */
export const CEREMONY_DATETIME = '2027-02-06T14:00:00+08:00'

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
    displayNames: 'Bricx & Hannah',
    // Kept short on purpose: it sits on one line under "Bricx & Hannah" at 320px.
    tagline: 'One promise, and every day after.',
    // Wedding hashtags. `hashtag` shows in the hero (under the date); `hashtagAlt`
    // shows in the closing footer. Owned here so no component restates them (14.6).
    hashtag: '#itinadHANNAHsiBRICXparakayMAE',
    hashtagAlt: '#BRICXandHANNAHwillgetMAErried',
  },

  // 14.2
  schedule: {
    ceremonyDatetime: CEREMONY_DATETIME,
    displayDate: 'February 6, 2027',
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
    // The reception follows the ceremony later the same day. Held on the
    // reception group (not `schedule`, which anchors the ceremony instant the
    // countdown and the .ics file are built from) because it is a display-only
    // time for the reception card and drives no date arithmetic.
    displayTime: '4:00 PM',
  },

  palette,

  /**
   * 5.1 — the OurStory section copy. The couple chose to open with scripture
   * rather than a first-person narrative, so `story` now holds a Bible verse
   * and `storyReference` its attribution. OurStory renders the verse as a
   * centred quotation with the reference as a cite line beneath it.
   *
   * A verse is intentionally short — well under the long-form-prose bound the
   * original narrative sat in — so the config test's word floor was lowered to
   * match this shorter, quotation-style copy. To go back to a longer narrative,
   * rewrite `story`, clear `storyReference` (or set it to an empty string), and
   * the section renders the plain paragraph again with no cite line.
   */
  story:
    'For I know the plans I have for you, declares the Lord, plans to prosper ' +
    'you and not to harm you, plans to give you hope and a future.',
  storyReference: 'Jeremiah 29:11',

  /**
   * The Getting-There / Venue section copy. The couple chose to close that
   * section with scripture rather than repeat the ceremony and reception
   * details already shown in Wedding_Details. `Venue` renders `verse` as a
   * centred quotation with `verseReference` as a cite line beneath it — the
   * same blockquote pattern OurStory uses. The two map links themselves now
   * live on the Wedding_Details cards, next to their venue info.
   */
  venue: {
    verse:
      'Love is patient, love is kind. It does not envy, it does not boast, it ' +
      'is not proud. It does not dishonor others, it is not self-seeking, it ' +
      'is not easily angered, it keeps no record of wrongs. Love does not ' +
      'delight in evil but rejoices with the truth. It always protects, always ' +
      'trusts, always hopes, always perseveres.',
    verseReference: '1 Corinthians 13:4-7',
  },

  /**
   * The wedding entourage, in the exact ceremonial order the couple requested.
   * Held here (14.6) so the `Entourage` section never hard-codes a name — swap
   * a placeholder for a real name and nothing else in the repository changes.
   *
   * Shape mirrors how the section groups them on screen:
   *   - `parents`        → two side-by-side groups (groom / bride), each a list
   *                        of { role, name } rows.
   *   - `principalSponsors` → ninongs / ninangs, two columns of plain names.
   *   - `honorAttendants`   → best man / maid of honor, two { role, name } rows.
   *   - `weddingParty`      → groomsmen / bridesmaids, two columns of names.
   *   - `candleVeilSponsors`→ candle / veil, two side-by-side name lists.
   *   - `cordSponsors`      → one list of names.
   *   - `bearers`           → ring / coin, two { role, name } rows.
   *   - `flowerGirls`       → one list of names.
   *
   * Every value below is a placeholder in `[...]` form on purpose; replace the
   * bracketed text with the real names when they are confirmed.
   */
  entourage: {
    parents: {
      groom: {
        title: 'Parents of the Groom',
        members: [
          { role: 'Father of the Groom', name: 'Romulo Carasco' },
          { role: 'Mother of the Groom', name: 'Nora Carasco' },
        ],
      },
      bride: {
        title: 'Parents of the Bride',
        members: [
          { role: 'Father of the Bride', name: 'Bernie Manambit' },
          { role: 'Mother of the Bride', name: 'Delma Toque' },
        ],
      },
    },
    principalSponsors: {
      title: 'Principal Sponsors',
      ninongs: {
        title: 'Ninongs',
        names: [
          '[Ninong 1]',
          '[Ninong 2]',
          '[Ninong 3]',
          '[Ninong 4]',
          '[Ninong 5]',
          '[Ninong 6]',
          '[Ninong 7]',
          '[Ninong 8]',
          '[Ninong 9]',
          '[Ninong 10]',
        ],
      },
      ninangs: {
        title: 'Ninangs',
        names: [
          '[Ninang 1]',
          '[Ninang 2]',
          '[Ninang 3]',
          '[Ninang 4]',
          '[Ninang 5]',
          '[Ninang 6]',
          '[Ninang 7]',
          '[Ninang 8]',
          '[Ninang 9]',
          '[Ninang 10]',
        ],
      },
    },
    honorAttendants: {
      members: [
        { role: 'Best Man', name: 'Jirjecx Carasco' },
        { role: 'Maid of Honor', name: 'Jaycel Madellin Manambit' },
      ],
    },
    weddingParty: {
      groomsmen: {
        title: 'Groomsmen',
        names: [
          'Julius Ablis',
          'Joemarc Ablis',
          'Zenrick Babaan',
          'Fritz Bautista',
          'John Veyle Manalo',
          'Mark Nino Ignacio',
          'Naif Quismundo',
          'John Doe',
          'John Doe',
        ],
      },
      bridesmaids: {
        title: 'Bridesmaids',
        names: [
          'Katrina Jean Angeles',
          'Jeline Anne Cabrega',
          'Renalyn Cambel',
          'Jhannelle Carasco',
          'Sheena Carillo',
          'Jerry Mae Hular',
          'Rizzi Elan Ruiz',
          'Kathleen Joyce Salgado',
          'Ann Jeniel Yusores',
        ],
      },
    },
    candleVeilSponsors: {
      candle: {
        title: 'Candle Sponsors',
        names: ['[Candle Sponsor 1]', '[Candle Sponsor 2]'],
      },
      veil: {
        title: 'Veil Sponsors',
        names: ['[Veil Sponsor 1]', '[Veil Sponsor 2]'],
      },
    },
    cordSponsors: {
      title: 'Cord Sponsors',
      names: ['[Cord Sponsor 1]', '[Cord Sponsor 2]'],
    },
    bearers: {
      members: [
        { role: 'Ring Bearer', name: '[Ring Bearer Name]' },
        { role: 'Coin Bearer', name: '[Coin Bearer Name]' },
      ],
    },
    flowerGirls: {
      title: 'Flower Girls',
      names: ['[Flower Girl 1]', '[Flower Girl 2]'],
    },
  },

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
  // height carry the intrinsic dimensions of the files (1200x800 .webp exports
  // of the couple's photos; full-size originals live in originals/gallery/).
  // Refine each `alt` to describe its photo when convenient.
  gallery: [
    {
      subject: 'photo-01',
      src: photo01,
      alt: 'Bricx and Hannah, photo 1 of 11.',
      width: 1200,
      height: 800,
    },
    {
      subject: 'photo-02',
      src: photo02,
      alt: 'Bricx and Hannah, photo 2 of 11.',
      width: 1200,
      height: 800,
    },
    {
      subject: 'photo-03',
      src: photo03,
      alt: 'Bricx and Hannah, photo 3 of 11.',
      width: 1200,
      height: 800,
    },
    {
      subject: 'photo-04',
      src: photo04,
      alt: 'Bricx and Hannah, photo 4 of 11.',
      width: 1200,
      height: 800,
    },
    {
      subject: 'photo-05',
      src: photo05,
      alt: 'Bricx and Hannah, photo 5 of 11.',
      width: 1200,
      height: 800,
    },
    {
      subject: 'photo-06',
      src: photo06,
      alt: 'Bricx and Hannah, photo 6 of 11.',
      width: 1200,
      height: 800,
    },
    {
      subject: 'photo-07',
      src: photo07,
      alt: 'Bricx and Hannah, photo 7 of 11.',
      width: 1200,
      height: 800,
    },
    {
      subject: 'photo-08',
      src: photo08,
      alt: 'Bricx and Hannah, photo 8 of 11.',
      width: 1200,
      height: 800,
    },
    {
      subject: 'photo-09',
      src: photo09,
      alt: 'Bricx and Hannah, photo 9 of 11.',
      width: 1200,
      height: 800,
    },
    {
      subject: 'photo-10',
      src: photo10,
      alt: 'Bricx and Hannah, photo 10 of 11.',
      width: 1200,
      height: 800,
    },
    {
      subject: 'photo-11',
      src: photo11,
      alt: 'Bricx and Hannah, photo 11 of 11.',
      width: 1200,
      height: 800,
    },
  ],

  // Consumed by lib/icalendar.js. There is deliberately NO `location` key here:
  // `buildCeremonyEvent()` reads `ceremony.venueName`, so the venue string
  // exists exactly once in the repository (14.6, 9.3).
  calendar: {
    summary: 'Wedding of Bricx & Hannah',
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
