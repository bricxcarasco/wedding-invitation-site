# Bricx &amp; Mae — Wedding Invitation

A one-page wedding invitation website for **Bricx &amp; Mae**, celebrating their
wedding on **February 13, 2027** in Pagsanjan, Laguna. It opens with a tap-to-open
envelope, then reveals a hero, a live countdown, the ceremony and reception
details with an add-to-calendar button, the couple's story, a photo gallery,
venue map links, dress-code guidance, and an RSVP form. It is a fully static
site built with Vite + React 19 + Tailwind v4 and is designed to deploy on
**Netlify's free tier** — the RSVP form uses Netlify Forms, and nothing else
needs a server. The site ships complete: every image, link, and line of copy is
already in place, so it can go live as-is.

---

## Quick start

```bash
npm install     # install dependencies
npm run dev     # start the Vite dev server (hot reload)
npm run build   # produce the production build in dist/
npm run preview # serve the built dist/ locally to check the production output
```

**Node version.** This project was developed on Node 24. Vite 7 requires at
least **Node 20.19+ or 22.12+**, so use one of those or newer. Older Node
releases will fail to run the build.

---

## Netlify deployment

You only need a free Netlify account.

**Option A — connect the repository (recommended).**

1. Push this repository to GitHub, GitLab, or Bitbucket.
2. In the Netlify dashboard, choose **Add new site → Import an existing project**
   and pick the repository.
3. Netlify reads the settings from `netlify.toml`, so the build command and
   publish directory are filled in for you:
   - **Build command:** `npm run build`
   - **Publish directory:** `dist`
4. Deploy. Every push to the connected branch triggers a fresh build.

**Option B — drag and drop.**

1. Run `npm run build` locally.
2. Drag the generated `dist/` folder onto the Netlify **Sites** page.

Drag-and-drop skips the connected-repo build, but the RSVP form still works
because the form is already present in the built `dist/index.html` (see below).

### Retrieving RSVP submissions

Guest RSVPs land in the Netlify dashboard, not in your inbox by default:

**Netlify dashboard → your site → Forms → the `rsvp` form → its submissions.**

You can also set up email or Slack notifications from that Forms page if you
want a ping whenever someone replies.

### How Netlify detects the form (do not delete the stub)

Netlify Forms detection happens **at build time** by scanning the static
`index.html` for a form marked `data-netlify="true"`. That is why `index.html`
contains a hidden `rsvp` form stub with the field names (`guestName`,
`attendance`, `guestCount`, `message`). The live React form posts to the same
`rsvp` form name, but React renders on the client, so Netlify would never see it
without the static stub. **Leave the hidden form in `index.html` in place** — if
you remove it, Netlify stops recognising the form and submissions silently stop
being captured.

### Free tier form limit

Netlify's free tier allows **100 form submissions per month**. For a single
wedding this is normally plenty, but if you expect more replies than that, check
Netlify's current pricing for a higher tier.

---

## Personalisation points

The site is finished and deployable as-is. These are the things the couple is
most likely to want to change, and each one is a **single edit** in
`src/config/weddingConfig.js` or a filename-for-filename asset swap.

- **Real photographs.** Replace the seven generated gallery placeholders with
  real photos. See [The gallery replacement procedure](#the-gallery-replacement-procedure)
  below — no code change, just overwrite the files.
- **Precise map links.** The two Google Maps links (`ceremony.mapsUrl` and
  `reception.mapsUrl`) are currently derived from the venue names by a
  `mapsSearchUrl(...)` helper. To point at an exact pin, paste a Google Maps
  share link or place-ID URL as a literal string in place of the
  `mapsSearchUrl(...)` call. Nothing else needs to change.
- **Your own words.** Rewrite `story`, `couple.tagline`, and
  `dressCode.guidance` in your own voice. Keep `story` between 60 and 200 words
  or the config test will flag it.
- **Names, dates, venues, countdown.** The countdown target
  (`CEREMONY_DATETIME`) and every name, date, time, and venue live in that one
  config file. Edit `CEREMONY_DATETIME` to move the wedding; the countdown, the
  calendar event, and the displayed schedule all follow.
- **Optional display webfont.** The site ships no webfont on purpose (zero font
  bytes, no external request). If you want a custom display face, there is a
  note in `src/index.css` describing how to add one self-hosted `@font-face` and
  prepend it to the display stack.

---

## The placeholder generator

The gallery images are not stock photos — they are generated locally by
`scripts/generate-placeholders.mjs`. It produces **seven palette-only WebP
compositions** (1200 × 800), each evoking its subject with the four wedding
colours and a simple motif: concentric rings, two overlapping ellipses, a
ceremony arch, radial petals, a horizon band, layered hills, and a table
setting. They are **agent-generated with no third-party licence obligation** —
nothing is downloaded or hotlinked (details in `src/assets/gallery/CREDITS.md`).

Re-run the generator any time:

```bash
npm run placeholders   # runs node scripts/generate-placeholders.mjs
```

It overwrites all seven files in place, so editing the palette or the motifs in
the script and re-running is the intended way to restyle the placeholders.

---

## The gallery replacement procedure

Swapping in real photographs is **filename for filename** and needs no code
change:

1. Export each real photo to **WebP at 1200 × 800** (3:2).
2. Confirm the file is **≤300KB**.
3. Overwrite the file of the same name in `src/assets/gallery/`, keeping the
   `.webp` extension so the bundler's import still resolves.

One-line conversion with `cwebp`:

```bash
cwebp -q 80 -resize 1200 800 input.jpg -o src/assets/gallery/01-rings.webp
```

The seven filenames are: `01-rings.webp`, `02-couple-portrait.webp`,
`03-ceremony.webp`, `04-flowers.webp`, `05-venue.webp`,
`06-outdoor-scenery.webp`, `07-reception-details.webp`.

### Update the alt text

The seven `alt` strings in `src/config/weddingConfig.js` currently describe the
**generated placeholders** (e.g. "Concentric sage and cream rings…"). When real
photographs replace the files, rewrite each of those `alt` strings to describe
the actual photograph. This is easy to forget because the image swap needs no
code change — but leaving the old alt text in place makes the descriptions
inaccurate for screen-reader users.

---

## Manual verification checklist

These are the claims the automated tests can't reach. Run them against a
production preview (`npm run build` then `npm run preview`, or a Netlify deploy
preview).

- **Responsive width sweep** at **320 / 375 / 768 / 1024 / 1440 / 2560px**:
  - no horizontal overflow at any width;
  - single-column gallery and cards on mobile, multi-column from tablet up;
  - interactive targets are at least **44 × 44px**;
  - body text is at least **16px**.
- **Reduced-motion path.** Enable your OS "reduce motion" setting, reload, and
  confirm:
  - no envelope particles;
  - the envelope opens with a quick cross-fade, not a long animation;
  - no scroll-reveal motion;
  - no parallax;
  - no gallery hover zoom;
  - all content is present in its final state.
- **Gzipped bundle budget.** After `npm run build`, gzip the JS and CSS chunks
  in `dist/assets/` and confirm the total is **≤300KB gzipped**. It is roughly
  **76KB gzipped** currently, so there is generous headroom.
- **Network waterfall** on a production preview: the first load fetches only the
  envelope assets (HTML, CSS, JS) — no gallery images — and the gallery images
  load lazily as they approach the viewport.
- **Map links.** Both "View Ceremony Location" and "View Reception Location"
  open the correct venue in Google Maps in a new tab.
- **Countdown.** The countdown ticks every second while the page sits idle.
- **RSVP round-trip.** Submit a test RSVP and confirm it appears in the Netlify
  Forms dashboard.

---

## Project structure

```
wedding-invitation/
├─ index.html                     # entry HTML + the hidden Netlify form stub (keep it)
├─ netlify.toml                   # build command + publish dir for Netlify
├─ vite.config.js                 # Vite + React + Tailwind + Vitest config
├─ scripts/
│  └─ generate-placeholders.mjs   # generates the seven gallery WebPs
└─ src/
   ├─ config/
   │  └─ weddingConfig.js         # THE ONE FILE TO EDIT — names, dates, venues, copy, gallery
   ├─ components/                 # UI: envelope, hero, countdown, details, gallery, RSVP, etc.
   ├─ lib/                        # pure logic: countdown, icalendar, rsvp (fully unit + property tested)
   ├─ hooks/                      # useCountdown, useParallax, useScrollReveal, useReducedMotion
   ├─ motion/                     # reduced-motion source of truth + context
   ├─ assets/gallery/             # the seven WebP images + CREDITS.md
   ├─ index.css                   # Tailwind theme, palette tokens, motion + reduced-motion rules
   └─ tests/                      # component and cross-cutting tests
```

If you only touch one file, make it `src/config/weddingConfig.js`.

---

## Tech stack &amp; scripts

**Stack:** [Vite 7](https://vite.dev/) build tooling, [React 19](https://react.dev/),
[Tailwind CSS v4](https://tailwindcss.com/) (via `@tailwindcss/vite`), and
[Vitest](https://vitest.dev/) for tests. The only runtime dependencies are
`react` and `react-dom`; everything else is a dev dependency. No webfont ships.

**Scripts** (from `package.json`):

| Script | What it does |
|---|---|
| `npm run dev` | Start the Vite dev server with hot reload. |
| `npm run build` | Produce the production build in `dist/`. |
| `npm run preview` | Serve the built `dist/` locally to check the production output. |
| `npm run lint` | Run ESLint across the project. |
| `npm run test` | Run Vitest in watch mode. |
| `npm run test:run` | Run the full test suite once and exit (use this for CI / a one-off check). |
| `npm run placeholders` | Regenerate the seven gallery placeholder images. |
```