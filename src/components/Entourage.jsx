// The Entourage section: a shimmering "The Entourage" toggle button that
// smoothly reveals / collapses the full wedding entourage list.
//
// Placed between the Countdown (#countdown) and the Wedding_Details (#details)
// slots in MainInvitation, so the button sits above #details.
//
// Every name, role and group title is READ from `weddingConfig.entourage`
// (14.6) — this component restates no wedding value of its own. All colour and
// type come from Tailwind theme tokens (no raw hex), matching the rest of the
// site.
//
// Behaviour. The button is an accessible disclosure: `aria-expanded` tracks the
// open/closed state and `aria-controls` points at the panel it toggles. The
// panel reveals with a smooth, cinematic height-and-fade using the
// `grid-template-rows: 0fr → 1fr` technique (see `.entourage-panel` in
// index.css) — no JS height measuring, no layout thrash. Under reduced motion
// the global media block in index.css zeroes the transition, so the toggle
// becomes an instant show/hide while staying fully functional.
//
// The button's "shiny/glossy" sweep is a periodic light shimmer carried by a
// `::after` pseudo-element (`.entourage-toggle`, index.css); it animates only
// transform + opacity and is paused under reduced motion.

import { useId, useState } from 'react'

import weddingConfig from '../config/weddingConfig.js'

import { Reveal } from './Reveal.jsx'

/**
 * A labelled group heading used throughout the entourage. Small, letter-spaced
 * uppercase Sage — the same quiet label treatment the Countdown units use.
 */
function GroupTitle({ children }) {
  return (
    <h3 className="font-display text-2xl text-sage md:text-3xl">{children}</h3>
  )
}

/**
 * A two-column row: `left` and `right` sit side by side from `sm` up and stack
 * on the narrowest screens. Used for every "same row" pairing the couple asked
 * for (groom/bride parents, ninongs/ninangs, best man/maid of honor, etc.).
 */
function PairRow({ left, right }) {
  return (
    <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
      {left}
      {right}
    </div>
  )
}

/**
 * A single { role, name } line: the role as a small Sage label with the name
 * beneath it in the body ink. Centred to sit comfortably under a group title.
 */
function RoleName({ role, name }) {
  return (
    <p className="leading-snug">
      <span className="block text-xs uppercase tracking-[0.2em] text-sage">{role}</span>
      <span className="block text-lg text-sage-deep">{name}</span>
    </p>
  )
}

/**
 * A { role, name } block where the ROLE is itself a group heading (Best Man,
 * Maid of Honor, Ring Bearer, Coin Bearer). Renders the role as a `GroupTitle`
 * display-font header — matching the Ninongs/Groomsmen group headers — with the
 * name in the body ink beneath it, so these read as section headers rather than
 * the small caption `RoleName` uses for the parents' role lines.
 */
function RoleHeading({ role, name }) {
  return (
    <div className="text-center">
      <GroupTitle>{role}</GroupTitle>
      <p className="mt-4 text-lg text-sage-deep">{name}</p>
    </div>
  )
}

/**
 * A titled column of plain names (ninongs, groomsmen, secondary sponsors, …).
 * `ordered` renders a numbered list where the sequence matters (the sponsor and
 * wedding-party lists the couple numbered 1–10); otherwise a plain list.
 */
function NameColumn({ title, names, ordered = false }) {
  const ListTag = ordered ? 'ol' : 'ul'
  return (
    <div className="text-center">
      <GroupTitle>{title}</GroupTitle>
      <ListTag
        className={`mt-4 space-y-1 text-lg text-sage-deep ${ordered ? 'list-none' : 'list-none'}`}
      >
        {names.map((name, index) => (
          <li key={`${name}-${index}`}>{name}</li>
        ))}
      </ListTag>
    </div>
  )
}

/**
 * A titled group whose members are { role, name } rows (the parent groups).
 */
function RoleGroup({ title, members }) {
  return (
    <div className="text-center">
      <GroupTitle>{title}</GroupTitle>
      <div className="mt-4 space-y-3">
        {members.map((member) => (
          <RoleName key={member.role} role={member.role} name={member.name} />
        ))}
      </div>
    </div>
  )
}

/** A soft divider between the ordered entourage blocks. Decorative. */
function Divider() {
  return <span aria-hidden="true" className="mx-auto block h-px w-24 bg-sage-light/50" />
}

/**
 * Two interlocking wedding rings — the left-side entourage glyph. Same
 * inline-SVG convention as the site's other button icons (church / reception /
 * calendar): `viewBox="0 0 24 24"`, `fill="none"`, `stroke="currentColor"` so
 * it inherits the button's Cream text, rounded caps/joins, `aria-hidden`, and
 * sized to the label.
 */
function RingsIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="block h-6 w-6 flex-none"
    >
      {/* two overlapping bands */}
      <circle cx="9" cy="15" r="6" />
      <circle cx="15" cy="15" r="6" />
      {/* a little solitaire gem rising from the right band */}
      <path d="M15 6l-2 2.5 2 2.5 2-2.5z" />
      <path d="M13 8.5h4" />
    </svg>
  )
}

/**
 * A bridal bouquet — the right-side entourage glyph. A rounded cluster of
 * blooms over a tied, ribboned stem. Same convention as the icons above.
 */
function BouquetIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="block h-6 w-6 flex-none"
    >
      {/* three clustered blooms */}
      <circle cx="12" cy="5.5" r="2.3" />
      <circle cx="7.5" cy="8" r="2.3" />
      <circle cx="16.5" cy="8" r="2.3" />
      {/* stems gathering to a point */}
      <path d="M8.5 9.8 11 15M15.5 9.8 13 15M12 7.8V15" />
      {/* bound stem + ribbon */}
      <path d="M10.5 15h3l-.6 5h-1.8z" />
      <path d="M12 17.5c-1.8 1-3 .4-3.6 2M12 17.5c1.8 1 3 .4 3.6 2" />
    </svg>
  )
}

/**
 * The Entourage section.
 *
 * `Reveal` is the `<section id="entourage">`, matching the other content
 * sections. Inside, the shimmering toggle button controls a disclosure panel
 * that smoothly slides open and closed.
 */
export function Entourage() {
  const [open, setOpen] = useState(false)
  const panelId = useId()
  const { entourage } = weddingConfig

  return (
    <Reveal as="section" id="entourage" className="mx-auto max-w-4xl text-center">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls={panelId}
        className="entourage-toggle control tap-target mx-auto gap-3 rounded-full border border-sage bg-sage px-10 py-3 font-display text-2xl text-cream md:text-3xl"
      >
        <RingsIcon />
        <span>The Entourage</span>
        <BouquetIcon />
      </button>

      {/* The disclosure panel. The outer element owns the collapse transition
          (grid-rows 0fr↔1fr); the inner wrapper is the measured content and
          carries the overflow clip + fade so nothing peeks out mid-animation. */}
      <div
        id={panelId}
        className={`entourage-panel ${open ? 'entourage-panel--open' : ''}`}
        aria-hidden={!open}
      >
        <div className="entourage-panel__inner">
          <div className="mt-12 space-y-12">
            {/* 1. Parents — groom / bride side by side. */}
            <PairRow
              left={
                <RoleGroup
                  title={entourage.parents.groom.title}
                  members={entourage.parents.groom.members}
                />
              }
              right={
                <RoleGroup
                  title={entourage.parents.bride.title}
                  members={entourage.parents.bride.members}
                />
              }
            />

            <Divider />

            {/* 2. Principal Sponsors — ninongs / ninangs side by side. */}
            <div>
              <GroupTitle>{entourage.principalSponsors.title}</GroupTitle>
              <div className="mt-6">
                <PairRow
                  left={
                    <NameColumn
                      title={entourage.principalSponsors.ninongs.title}
                      names={entourage.principalSponsors.ninongs.names}
                      ordered
                    />
                  }
                  right={
                    <NameColumn
                      title={entourage.principalSponsors.ninangs.title}
                      names={entourage.principalSponsors.ninangs.names}
                      ordered
                    />
                  }
                />
              </div>
            </div>

            <Divider />

            {/* 3. Best Man & Maid of Honor — same row. */}
            <PairRow
              left={<RoleHeading {...entourage.honorAttendants.members[0]} />}
              right={<RoleHeading {...entourage.honorAttendants.members[1]} />}
            />

            <Divider />

            {/* 4. Groomsmen & Bridesmaids — same row. */}
            <PairRow
              left={
                <NameColumn
                  title={entourage.weddingParty.groomsmen.title}
                  names={entourage.weddingParty.groomsmen.names}
                  ordered
                />
              }
              right={
                <NameColumn
                  title={entourage.weddingParty.bridesmaids.title}
                  names={entourage.weddingParty.bridesmaids.names}
                  ordered
                />
              }
            />

            <Divider />

            {/* 5. Secondary Sponsors. */}
            <NameColumn
              title={entourage.secondarySponsors.title}
              names={entourage.secondarySponsors.names}
            />

            <Divider />

            {/* 6. Candle & Veil Sponsors — same row. */}
            <PairRow
              left={
                <NameColumn
                  title={entourage.candleVeilSponsors.candle.title}
                  names={entourage.candleVeilSponsors.candle.names}
                />
              }
              right={
                <NameColumn
                  title={entourage.candleVeilSponsors.veil.title}
                  names={entourage.candleVeilSponsors.veil.names}
                />
              }
            />

            <Divider />

            {/* 7. Cord Sponsors. */}
            <NameColumn
              title={entourage.cordSponsors.title}
              names={entourage.cordSponsors.names}
            />

            <Divider />

            {/* 8. Ring & Coin Bearers — same row. */}
            <PairRow
              left={<RoleHeading {...entourage.bearers.members[0]} />}
              right={<RoleHeading {...entourage.bearers.members[1]} />}
            />
          </div>
        </div>
      </div>
    </Reveal>
  )
}

export default Entourage
