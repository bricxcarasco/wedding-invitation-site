# Bricx &amp; Mae — Wedding Invitation

A one-page wedding invitation website for **Bricx &amp; Mae**, celebrating their
wedding on **February 13, 2027** in Pagsanjan, Laguna. It opens with a tap-to-open
envelope, then reveals a hero, a live countdown, the ceremony and reception
details with an add-to-calendar button, the couple's story, a photo gallery,
venue map links, dress-code guidance, and an RSVP form. It is built with
Vite + React 19 + Tailwind v4 and is designed to deploy on **Vercel's free
tier** — the static site plus one small serverless function that receives RSVP
submissions. The site ships complete: every image, link, and line of copy is
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

## Vercel deployment

You only need a free Vercel account.

**Connect the repository (recommended).**

1. Push this repository to GitHub, GitLab, or Bitbucket.
2. In the Vercel dashboard, choose **Add New… → Project** and import the
   repository.
3. Vercel reads `vercel.json`, so the framework preset (Vite), build command,
   and output directory are filled in for you:
   - **Framework preset:** Vite
   - **Build command:** `npm run build`
   - **Output directory:** `dist`
4. Deploy. Every push to the connected branch triggers a fresh build and a new
   preview URL; the production branch publishes to your production domain.

The `vercel.json` also adds an SPA rewrite so a deep link like `/#rsvp` (or any
client route) serves `index.html`, while requests under `/api/*` reach the
serverless function untouched.

> **Node version.** Vercel builds and runs the function on Node 20+ by default,
> which satisfies Vite 7. No extra configuration is needed.

### The RSVP endpoint

The RSVP form posts to a small Vercel Serverless Function at **`api/rsvp.js`**.
It accepts the `application/x-www-form-urlencoded` body the form sends
(`form-name`, `guestName`, `attendance`, `guestCount`, `message`), rejects any
body whose `form-name` is not `rsvp`, does a server-side sanity check, appends
the reply to a **Google Sheet**, and returns `200`. Vercel deploys anything
under `api/` as a function automatically — there is nothing extra to configure.

If a guest's JavaScript fails and the sheet append fails, the function returns a
non-2xx and the form shows its retry path, so a guest is never told "thank you"
for a reply that was lost.

### Retrieving RSVP submissions (Google Sheet)

RSVPs are appended as rows to a Google Sheet you own. The sheet is fronted by a
tiny **Google Apps Script Web App**; the function POSTs each reply to that web
app's URL, and the script writes the row. This needs no npm dependency and no
service-account key — just a URL kept in an environment variable.

**One-time setup:**

1. Create a Google Sheet (any Google account, free). Note it will hold the
   columns: `timestamp`, `guestName`, `attendance`, `guestCount`, `message`.
2. In the sheet, open **Extensions → Apps Script** and replace the contents of
   `Code.gs` with:

   ```javascript
   // Apps Script Web App backing the wedding RSVP sheet.
   // Appends one row per RSVP. Creates the header row on first write.
   function doPost(e) {
     var lock = LockService.getScriptLock()
     lock.waitLock(30000) // serialise concurrent writes so rows never interleave
     try {
       var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0]
       var data = JSON.parse(e.postData.contents)

       // Write a header row once, if the sheet is empty.
       if (sheet.getLastRow() === 0) {
         sheet.appendRow(['timestamp', 'guestName', 'attendance', 'guestCount', 'message'])
       }

       sheet.appendRow([
         data.timestamp || new Date().toISOString(),
         data.guestName || '',
         data.attendance || '',
         data.guestCount || '',
         data.message || '',
       ])

       return ContentService
         .createTextOutput(JSON.stringify({ ok: true }))
         .setMimeType(ContentService.MimeType.JSON)
     } catch (err) {
       return ContentService
         .createTextOutput(JSON.stringify({ ok: false, error: String(err) }))
         .setMimeType(ContentService.MimeType.JSON)
     } finally {
       lock.releaseLock()
     }
   }
   ```

3. Click **Deploy → New deployment → Web app**. Set **Execute as: Me** and
   **Who has access: Anyone**, then deploy and authorise it. (The endpoint only
   ever appends rows; it never reads or returns your data.)
4. Copy the **Web app URL** it gives you (it looks like
   `https://script.google.com/macros/s/……/exec`).
5. In Vercel, go to **Project → Settings → Environment Variables** and add:
   - **Name:** `RSVP_SHEETS_WEBHOOK_URL`
   - **Value:** the Web app URL from step 4
   Add it for the environments you deploy (Production, and Preview if you want
   previews to write too). Redeploy so the variable takes effect.

That's it. New RSVPs now land as rows in your sheet.

**Before you set the variable:** the function falls back to logging each reply
to the Vercel function logs (**Vercel dashboard → your project → the deployment
→ Logs**) and still returns `200`, so the site works end to end even before the
sheet is wired up. Once `RSVP_SHEETS_WEBHOOK_URL` is set, replies go to the
sheet instead — no code change needed.

**Changing the deployment (later):** each time you edit the Apps Script you must
**Deploy → Manage deployments → edit → deploy a new version** for the change to
take effect. A fresh "New deployment" gives a *new* URL, so update the Vercel
variable if you do that.

### Free tier notes

Vercel's Hobby (free) tier covers a single wedding invitation comfortably:
static hosting is free, and the serverless function's invocation allowance is
far more than a guest list will ever use. There is no per-month form-submission
cap like Netlify Forms imposed.

### No-JavaScript fallback

`index.html` still contains a hidden `rsvp` form stub that posts to `/api/rsvp`.
It is the fallback for a client whose JavaScript fails, and it pins the
canonical field-name set the live form, the encoder, and the endpoint all agree
on (a test enforces that agreement). **Leave the hidden form in `index.html` in
place** — removing it drops the fallback and the drift guard.

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
production preview (`npm run build` then `npm run preview`, or a Vercel deploy
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
- **RSVP round-trip.** Submit a test RSVP and confirm the success state appears,
  then check the reply in the Vercel dashboard (project → deployment → Logs), or
  wherever you wired the delivery step in `api/rsvp.js`.

  Note: `npm run preview` serves only the static build, so `/api/rsvp` is not
  available there and a submit will hit the error path. To exercise the function
  locally, use `vercel dev` (from the Vercel CLI), or test it on a deploy
  preview.

---

## Project structure

```
wedding-invitation/
├─ index.html                     # entry HTML + the hidden RSVP fallback stub (keep it)
├─ vercel.json                    # Vercel build config + SPA rewrite
├─ vite.config.js                 # Vite + React + Tailwind + Vitest config
├─ api/
│  └─ rsvp.js                     # Vercel serverless function — receives RSVP submissions
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