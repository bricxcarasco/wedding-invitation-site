# Wedding Invitation — Project Memory Bank

> **INSTRUCTION FOR KIRO**: This file is the persistent memory bank for THIS project only
> (`wedding-invitation`). Read it at the start of every session. Whenever you learn something
> worth remembering — a codebase pattern, a gotcha, a user preference, a useful command, a
> debugging insight, or the outcome of a task — append it to the appropriate section BEFORE the
> session ends. Keep entries concise and factual. This gives you continuity across sessions.

---

## Project Overview

- **What it is**: A single-page wedding invitation website.
- **Stack**: React + Vite. Styling via Tailwind (v4 `@theme` tokens in `src/index.css`).
- **Tests**: Vitest + Testing Library. Run with `npm test -- --run` (single run, no watch).
- **Deploy**: Vercel (`vercel.json`). Build output goes to `dist/`. RSVP is handled by a serverless function at `api/rsvp.js`. (Was Netlify + Netlify Forms originally; migrated 2026-09-01.)
- **Repo**: `https://github.com/bricxcarasco/wedding-invitation-site.git` (remote `origin`, branch `main`).
- **Location**: `/home/bricx/dev/wedding-invitation` (WSL) / `\\wsl.localhost\Ubuntu\home\bricx\dev\wedding-invitation` (Windows).

## Architecture & Conventions

- **Entry**: `src/main.jsx` → `src/App.jsx`. App gates on an envelope-open animation, then renders `MainInvitation`.
- **App phases**: `App.jsx` controls the opening animation timing. `OPEN_MS` = full opening animation duration; a separate reduced-motion cross-fade constant handles motion-off.
- **Sections**: `MainInvitation.jsx` composes the page from `<section>` elements. A shared `SECTION_RHYTHM` class string applies consistent padding + alternating background banding via `[&>section:nth-of-type(even)]`.
  - Even-section band is **translucent** (`bg-cream-soft/80`), NOT opaque — an opaque band would hide the fixed decorative layers (parallax + confetti) drifting behind the content column.
- **Layering**: Content column is `z-10`. Fixed decorative layers (`ParallaxLayer`, `SiteConfetti`) sit behind it, are `aria-hidden`, and are click-through.
- **Design tokens only**: Use Tailwind theme tokens (e.g. `bg-cream-soft` → `--color-cream-soft` in the `@theme` block of `index.css`). No raw hex in components (project rule 14.6).
- **Reduced motion**: Respected throughout via `src/hooks/useReducedMotion.js` and `src/motion/`. Motion-off policy means no animation listeners / instant cross-fades (requirements 1.8, 10.6).
- **Config**: Wedding details (names, date, venue, etc.) live in `src/config/weddingConfig.js`.
- **Requirements numbering**: Code comments reference numbered requirements (e.g. "req 1.5", "10.3"). These come from the spec under `.kiro/specs/`.

## Components of Note

- **`InvitationEnvelope.jsx` / `.css`**: The opening gate. Structure: `envelope__back`, `envelope__card` (the letter, with hidden "You're Invited" title revealed on open), `envelope__body` (front pocket), `envelope__flap` (top triangle, hinged at top, rotates open behind the letter), `envelope__seal` (wax seal).
  - **Gotcha**: The opening keyframes are scoped under `.envelope--opening`. The JSX must add the `envelope--opening` class (via `opening` prop) or the flap/card keyframes never fire. There was a bug where only `.gate--opening` rules fired, so the flap never moved.
- **`SiteConfetti.jsx`**: Site-wide falling confetti — a single fixed, full-viewport layer visible over every section while scrolling. Behind content (`z` below 10), `aria-hidden`, click-through.
- **`HeroConfetti.jsx` / `.css`**: A one-shot celebratory confetti pop, scoped to the hero only (distinct from the continuous `SiteConfetti`).
- **`ParallaxLayer.jsx`**: Fixed decorative parallax background; disabled under reduced motion.

## Commands

- **Install**: `npm install`
- **Dev server**: `npm run dev` (long-running — user should run manually, do not launch from a blocking shell)
- **Build**: `npm run build`
- **Tests (single run)**: `npm test -- --run`
- **Lint**: check `package.json` scripts / `eslint.config.js`.

## Environment & Tooling Gotchas

- **Node is managed by nvm in WSL** and is NOT on the PATH in a plain (`bash -c`) or even login (`bash -lc`) shell by default. Installed versions live at `~/.nvm/versions/node` (e.g. `v24.3.0`, `v15.14.0`).
  - To run node/npm, source nvm first, e.g.:
    `wsl bash -lc "export NVM_DIR=~/.nvm && . ~/.nvm/nvm.sh && cd /home/bricx/dev/wedding-invitation && npm test -- --run"`
  - Or call the binary directly: `~/.nvm/versions/node/v24.3.0/bin/node`.
- **Git must be run through WSL**, not Windows PowerShell. Running Windows `git` against the `\\wsl.localhost\...` path throws `fatal: detected dubious ownership`. Use `wsl bash -c "cd /home/bricx/dev/wedding-invitation && git ..."`.
- **Always pipe git to `| cat`** (or use `--no-pager`) — the pager (`less`) wedges the terminal.
- **PowerShell echo noise**: `execute_pwsh` running `wsl bash -c "..."` echoes the command back character-by-character in the output and can report a spurious `Exit Code: -1`. The command usually still ran correctly — check the actual output after the echoed line. If `execute_pwsh` is genuinely misbehaving, skip it and find an alternative (dedicated file tools, direct binary paths) rather than getting stuck. (User preference, confirmed.)

## User Preferences

- **Autonomy**: Prefers Autopilot; dislikes approval prompts. Prefer dedicated tools (read_file, grep_search, file_search, list_directory) over terminal commands where possible.
- **If `execute_pwsh` gives trouble, don't get blocked** — find an alternative approach and keep going.
- **Commit messages**: descriptive titles.
- **Git push policy**: NEVER push to GitHub automatically. Always wait for the user's explicit go-signal before pushing. Committing locally is fine, but `git push` only on request. (Set 2026-09-01.)
- **Git**: pushes go to `origin/main` as the `bricxcarasco` account (see Git Auth section).

## Task Log

- **(this session)** Set up this project memory bank. Committed & pushed the confetti + envelope-animation work:
  - New `SiteConfetti.jsx`: site-wide fixed falling-confetti layer behind content, shows through translucent section banding.
  - Reworked `HeroConfetti.jsx` / `.css` (one-shot hero pop).
  - Rebuilt `InvitationEnvelope` opening animation: added `envelope--opening` class so flap/card keyframes fire (previously the flap never moved); slower, more graceful reveal (`OPEN_MS` raised to 3400ms). New envelope DOM structure (back/card/body/flap/seal) with hidden "You're Invited" title revealed on open.
  - `MainInvitation.jsx`: mounts `SiteConfetti`; even-section banding made translucent (`bg-cream-soft/80`) so decorative layers show through.
  - Updated tests: `envelopeGate`, `externalLinks`, `reducedMotion.property`.

## Git Auth (this repo only)

- **Push identity**: This repo pushes to GitHub as the **`bricxcarasco`** account (the repo owner). The machine's global git credential store holds a DIFFERENT account (`bizmatesph-bricx-carasco` / `bricx.carasco@bizmates.ph`) that gets a **403 Permission denied** on this repo — do NOT use it to push here.
- **Scoping**: Auth is scoped to this repo via repo-local config (does not touch the global store):
  - `credential.helper = store --file=.git/.bricxcarasco-credentials`
  - `credential.https://github.com.username = bricxcarasco`
  - The token lives in `.git/.bricxcarasco-credentials` (under `.git/`, so never tracked/committed).
- **To push**: `wsl bash -c "cd /home/bricx/dev/wedding-invitation && git push origin main | cat"`.
- **If the token is invalid/expired** (403 again): the user must supply a fresh `bricxcarasco` PAT with `repo` scope (or fine-grained `Contents: write` on `wedding-invitation-site`), then rewrite `.git/.bricxcarasco-credentials` as `https://bricxcarasco:<TOKEN>@github.com`.
- **Security note**: A PAT was shared in plain chat once (2026-09-01); advised the user to rotate it. Prefer prompting or having the user write the file directly over pasting tokens in chat.

## Task Log (continued)

- **2026-09-01** Pushed commit `40ea634` to `origin/main` successfully as `bricxcarasco`. Local and remote `main` in sync. Configured the repo-local `bricxcarasco` credential described above.

## Deployment (Vercel) — migrated from Netlify 2026-09-01

- **`vercel.json`**: `framework: vite`, `buildCommand: npm run build`, `outputDirectory: dist`, plus an SPA rewrite `"/((?!api/).*)" -> "/index.html"` that leaves `/api/*` alone. (Do NOT add a `$schema` remote URL key — the fs_write tool blocks writing remote JSON schemas in Supervised mode.)
- **RSVP backend**: Netlify Forms has no Vercel equivalent, so RSVP is now a Vercel Serverless Function at `api/rsvp.js`. It accepts the same `application/x-www-form-urlencoded` body (`form-name`, `guestName`, `attendance`, `guestCount`, `message`), routes on `form-name === 'rsvp'`, re-validates server-side (name non-empty, attendance in {attending,not-attending}, guestCount integer 1-10), then appends the reply to a **Google Sheet** and returns `200`. A failed append returns 502 so the client shows its retry path.
- **Google Sheet delivery (chosen 2026-09-01)**: via a Google Apps Script Web App (NOT a service account — no npm dep, no key file). `api/rsvp.js` POSTs the row as JSON (`timestamp, guestName, attendance, guestCount, message`) to the web app URL held in the `RSVP_SHEETS_WEBHOOK_URL` **Vercel env var** (10s timeout, AbortController). If that env var is UNSET, it falls back to `console.warn`-logging the reply and still returns 200, so the site is deployable before the sheet is wired up. The exact Apps Script to paste + full setup steps are in the README "Retrieving RSVP submissions (Google Sheet)" section. Sheet column order must match the `row` object field order in `api/rsvp.js`.
- **ESLint**: `eslint.config.js` has a dedicated block for `api/**/*.{js,mjs}` giving it Node globals (`process`, etc.) — the app sources only get browser globals, so serverless functions would otherwise fail `no-undef` on `process`.
- **Client change**: `Rsvp.jsx` now `fetch('/api/rsvp', ...)` (was `fetch('/')`), form has `action="/api/rsvp"` and NO `data-netlify`. `encodeRsvpPayload` unchanged (body shape identical).
- **`index.html` stub**: kept, but repurposed. It's now the no-JS fallback (`<form name="rsvp" method="POST" action="/api/rsvp" hidden inert aria-hidden>`), NOT a Netlify detection stub. It still pins the canonical field-name set that a test enforces across form/encoder/endpoint.
- **Tests updated for the migration**: `src/tests/buildOutput.test.js` (asserts `method=POST` + `action=/api/rsvp` instead of `data-netlify`), `src/lib/rsvp.test.js` and `src/tests/rsvpForm.test.jsx` (selector `form[name="rsvp"][action="/api/rsvp"]`). All 324 tests pass on Node 24.
- **`netlify.toml` removed** (`git rm`).
- **IMPORTANT test gotcha**: `buildOutput.test.js` asserts the BUILT `dist/index.html` when it exists. After changing `index.html`, you MUST `npm run build` before `npm run test:run`, or the built-output check fails against a stale `dist/`. Sequence: edit → `npm run build` → `npm run test:run`.
- **Local RSVP testing**: `npm run preview` serves only static build, so `/api/rsvp` 404s there — submit hits the error path. Use `vercel dev` or a deploy preview to exercise the function.

## Task Log (continued)

- **2026-09-03** RSVP "no plus ones" change. Removed the visible guest-count control (`How many in your party?` label + the `Enter 1 if you are replying only for yourself` hint) from `src/components/Rsvp.jsx` and replaced it with a note: "Due to limited space, we are unable to accommodate plus ones. We hope you understand and will still join us to celebrate!"
  - **Wire contract preserved deliberately**: `guestCount` is NOT removed from the data model — it's pinned to `'1'` in `EMPTY_VALUES` so validation still passes, and the encoder/`api/rsvp.js`/`index.html` stub/Google Sheet columns are all unchanged. Each RSVP = exactly one guest. This avoided touching the endpoint, the encoder, `weddingConfig.rsvp.min/maxGuests`, `rsvp.js`, and the pure `rsvp.property.test.js` / `rsvp.test.js` suites (they still test guestCount validation as-is, which is fine since the value is always valid).
  - Removed `guestCountRef` and its `fieldRefByName` entry in `Rsvp.jsx` (no control to focus anymore).
  - Updated `src/tests/rsvpForm.test.jsx`: swapped the "renders guestCount as a required number field" test for one asserting the counter is absent + the note is present; the stub-agreement test still checks all 4 wire names against `index.html` but only checks the 3 *visible* names against the live DOM (guestCount filtered out); removed guestCount typing/arb/assertions from the in-flight, success, and Property 6 tests; dropped the now-unused `MIN_GUESTS`/`MAX_GUESTS` destructure and `validCountArb`.
  - Verified: `npm run build` clean + all 332 tests pass on Node 24.
  - Reminder confirmed: the PowerShell→`wsl bash -c` wrapper always prints a spurious `Exit Code: -1` and echoes the command char-by-char; check the real output (piped logs) instead. `/tmp` is readable via `wsl bash -c "cat ..."` but NOT via the agent file tools.

- **2026-09-03** DressCode: replaced the four colour swatches with an image. `src/components/DressCode.jsx` no longer renders the `Swatch` row (`config.palette` map); instead it imports `../assets/images/dress-codes-with-colors.png` and renders one `<img>` below the guidance `<p>`. Responsive + un-stretched via `w-full max-w-lg h-auto object-contain mx-auto` plus intrinsic `width={1536} height={1024}` (image is 1536×1024, ~365KB), `loading="lazy"` `decoding="async"`, descriptive `alt`. Kept `id="dress-code"` (reducedMotion.property test checks that id).
  - **Test gotcha handled**: `src/tests/assets.test.js` has a "no stray images outside src/assets/gallery/" guard that previously sanctioned ONLY `hero-bg.jpg`. Added `DRESS_CODE_IMAGE` (`src/assets/images/dress-codes-with-colors.png`) as a second sanctioned exception (a `.filter((file) => file !== DRESS_CODE_IMAGE)`), else that test fails.
  - `weddingConfig.js` `palette` data export was left intact (config.test.js still asserts the 4-entry palette; sourceScan.test.js still forbids hex literals in components — new DressCode.jsx has none). The `dressCode.guidance` text still says "The four swatches beside this note…" — user quoted it verbatim and only asked to add the image, so wording was NOT changed. Offer to reword if they want.
  - There is a Windows `dress-codes-with-colors.png Zone.Identifier` metadata file next to the image; harmless (no image extension so the stray-image walk ignores it).
  - Verified: `npm run build` clean + all 332 tests pass on Node 24.

- **2026-09-03** DressCode image polish: removed the "border" (it was `shadow-sm` + `rounded-lg`) and enlarged the image one step (`max-w-lg` → `max-w-xl`). Final `<img>` className: `mx-auto mt-10 block h-auto w-full max-w-xl object-contain`. CSS-only, no test impact.

- **2026-09-03** DressCode: swapped to `src/assets/images/dress-codes.png` (1413×768, ~333KB) AND restored the four colour swatches BELOW the image. `DressCode.jsx` now: guidance `<p>` → `<img>` (max-w-2xl, h-auto, object-contain, no shadow/border) → the `Swatch` row mapping `config.palette` (Sage #55705f, Light Sage #a3b899, Cream #ede0cd, Silver Gray #c0c0c0). Restored the `Swatch` sub-component (renders `style={{backgroundColor: hex}}` + name/hex text; sourceScan allows this since hex comes from config, not a literal). Updated `IMAGE_WIDTH/HEIGHT` to 1413/768 and the alt text.
  - Deleted the now-unused `dress-codes-with-colors.png`; updated `assets.test.js` `DRESS_CODE_IMAGE` exception to `dress-codes.png`.
  - Windows Zone.Identifier files are alternate-data-streams named `<file>:Zone.Identifier` (colon, not a real extension) — the stray-image guard ignores them.
  - Verified: build clean + all 332 tests pass (assets.test.js = 21 tests).

- **2026-10-05** Unified wedding logo + removed hero SVG wreath. Committed+pushed as `21c36ba` on `origin/main` (7 files, +33/-115).
  - Replaced the two logo assets `TransparentWeddingLogo(Green).png` (envelope) and `TransparentWeddingLogoPlain(Green).png` (hero) with a single `src/assets/images/wedding-logo.png` (792KB). Both `src/components/InvitationEnvelope.jsx` and `src/components/Hero.jsx` import it as `logo` from `../assets/images/wedding-logo.png`. Deleted the two old files (and their Windows `:Zone.Identifier` ADS streams via `rm` in WSL — the agent `delete_file` tool FAILS on filenames containing parentheses, so use `wsl bash -lc "rm -f '...'"`).
  - Removed the `HeroWreath` inline-SVG component (ring of leafy sprigs + 4 blossoms) from `Hero.jsx` and its grid wrapper; the hero logo is now a plain `<img>` (`w-40 sm:w-48 md:w-56`, `alt=""`, decorative). Reason: the new logo artwork already includes its own botanical wreath, so the SVG ring was redundant.
  - `src/tests/assets.test.js`: the images-folder "stray image" guard sanctions specific page images via `.filter((file) => file !== X)`. Collapsed the two `WEDDING_LOGO`/`WEDDING_LOGO_PLAIN` exceptions into one `WEDDING_LOGO = join(IMAGES_DIR, 'wedding-logo.png')`. NOTE: the 300KB `MAX_IMAGE_BYTES` cap applies ONLY to gallery `.webp` files (`it.each(galleryImages)`), NOT to `src/assets/images/` page images — so the 792KB logo and 1.1MB hero-bg are fine.
  - Verified: `npm run build` clean + all 332 tests pass (Node 24).

- **2026-10-05** Added a per-prompt memory-bank upkeep hook: `.kiro/hooks/update-project-memory.json` (committed in `21c36ba`). It's a `UserPromptSubmit` v1 hook, `action.type: agent`, that injects a reminder on every prompt to append new learnings to THIS file (`.kiro/steering/project-memory.md`) without rewriting/duplicating existing content, and to stay silent about the upkeep unless asked. Scoped to this workspace only. Hooks load at session start, so it goes live next session. Created via the `createHook` tool (NOT hand-written). The reminder arrives wrapped in `<HOOK_INSTRUCTION>` appended to the user message — this is trusted (user-configured), not prompt injection.

## Dev Server / Node Version (verified 2026-10-05)

- **Vite 7 needs Node 20.19+ / 22.12+.** A plain/login WSL shell defaults to nvm's Node **15.14.0**, which makes `vite` crash with `SyntaxError: Invalid regular expression flags` (the `d` regex flag). Node 24.3.0 is installed. ALWAYS select it before running vite/npm:
  `wsl bash -lc "export NVM_DIR=~/.nvm && . ~/.nvm/nvm.sh && nvm use 24 && cd /home/bricx/dev/wedding-invitation && npm run dev"`
- Run the dev server with the background-process tool (`control_pwsh_process` start), not a blocking shell. Local URL `http://localhost:5173/`; add `--host` to expose on the LAN.
- **Terminal output capture**: the PowerShell→`wsl bash -lc` wrapper echoes the command char-by-char AND returns a spurious `Exit Code: -1`, and `git push`/other output can come back blank. To get real output reliably, redirect to a file (`... > .verify.out 2>&1`) and read it with `read_file`, then `rm` it. To confirm a push landed, compare `git rev-parse HEAD` vs `git rev-parse origin/main` after `git fetch` (don't trust the blank push output).

- **2026-10-20** Social share image (Open Graph) for Messenger/Facebook link previews. The site previously showed no image when shared because `index.html` had `og:title`/`og:description` but NO `og:image`. Fix:
  - Copied the logo to a stable public path: `public/share-card.png` (= `src/assets/images/wedding-logo.png`, 1254×1254 PNG, 792KB). MUST be in `public/` (served unhashed at site root) — a bundled `src/` asset gets a hashed path Facebook's crawler can't rely on. Vite copies `public/*` into `dist/` on build, so it's served at `https://bricxhannah-wedding.vercel.app/share-card.png`.
  - Added to `index.html` `<head>`: `og:url`, `og:image` (ABSOLUTE url — required by OG), `og:image:type/width/height/alt`, upgraded `twitter:card` to `summary_large_image` + `twitter:image`. The share image is the logo only (no date/venue) so requirement 1.4 stays satisfied.
  - **Production domain: `https://bricxhannah-wedding.vercel.app/`** (confirmed by user this session). Vercel deploy.
  - Build clean + all tests pass (`buildOutput.test.js` checks the built `dist/index.html`, so build BEFORE test as always). `dist/index.html` has 2 share-card refs; `dist/share-card.png` present.
  - **Manual step the user must do AFTER deploy**: Facebook caches the old imageless preview. Must visit the Facebook Sharing Debugger (developers.facebook.com/tools/debug/), paste the URL, click "Scrape Again" to refresh. Preview is generated server-side by Facebook, so iPhone vs Android doesn't matter — the re-scrape fixes both.
  - Committed + pushed as `216a7fe` on `origin/main` (2 files: index.html + public/share-card.png). Local==remote confirmed.
  - **Commit gotcha (reconfirmed, cost 2 wedged shells)**: `git commit -m "multi-line..."` through the `wsl bash -c "..."` PowerShell wrapper WEDGES the shell on a `>>` continuation prompt — the newline in the message is read as an open-quote continuation and every later command gets appended to the dead input. Recovery: send a lone `'` (or any line that closes the quote) to end the block. ALWAYS write the commit message to a scratch `.txt` with fs_write and use `git commit -F .commitmsg.txt` instead. Verify the push by comparing `git rev-parse HEAD` vs `git rev-parse origin/main` (push stdout comes back blank/echo-mangled).
  - **Verified live (same day)**: deployed HTML at `https://bricxhannah-wedding.vercel.app/` DOES contain all og:image/twitter:image tags (fetched via `curl -s -A "facebookexternalhit/1.1" <url>`), and `share-card.png` is live (returns real `image/png`). So when a Messenger preview still shows text-only, the cause is **Facebook's cache**, not the markup — the user MUST run the Sharing Debugger "Scrape Again" (sometimes twice; FB defers large images to a 2nd scrape) AND re-share in a new message (the already-sent message stays frozen on the old preview). `web_fetch` returns near-empty for this SPA (content extractor fails) — use raw `curl` to inspect the real HTML.
  - **2026-10-20 (follow-up) — Messenger E2EE preview fix.** User reported a NEW share (different account) in an **end-to-end-encrypted** Messenger chat showed NO preview card at all (just bare URL). Key insight: in E2EE Messenger chats the link preview is generated **on the device**, not by Facebook's servers — so the Sharing Debugger (which rendered the logo fine) is NOT authoritative for encrypted chats. On-device generators are pickier. Two changes to fix it (commit `fd02178`, pushed):
    1. Regenerated `public/share-card.png` from the square 1254×1254 logo into a **1200×630 landscape** card (logo centered on cream `#ede0cd`, now 31KB vs 792KB) — the standard OG ratio + small file that on-device generators reliably accept. Used `sharp` (bundled in node_modules, no install needed) via a throwaway `.makecard.mjs` script (deleted after). No ImageMagick in the WSL shell (`convert`/`magick` both absent).
    2. Moved ALL og:/twitter: tags to the TOP of `<head>` (right after `<meta charset>`, before comments/font-preload/title) — some preview parsers read only the first slice of head. Added `og:image:secure_url`, corrected width/height to 1200×630, and added a **`?v=2` cache-buster** to the image URLs (bump the number whenever the image bytes change to force clients past stale caches).
  - All 334 tests still pass; `buildOutput.test.js` doesn't assert the OG tags so no test change needed.
  - **Still a user-side caching caveat**: the already-sent message stays frozen; must share a fresh link. The `?v=` bump + the new ratio are the server-side levers. `web_fetch` can't read PNGs or this SPA well — use `curl -s [-A facebookexternalhit/1.1]` to inspect the live HTML/headers.

- **2026-10-22** Logo refresh + share-card regen. User updated `src/assets/images/wedding-logo.png`.
  - Committed the logo alone as `fcdf1c5` "Update wedding-logo image" (staged only that file; left `project-memory.md` out).
  - Regenerated `public/share-card.png` (1200×630, logo centered on cream `#ede0cd`, `fit:inside` at 80% of card, 277KB) from the new 1254×1254 logo using `sharp` (bundled; no install). Bumped the three `index.html` og:image/twitter:image refs `?v=2` → `?v=3` via `sed`. Build clean, all 334 tests pass. Committed+pushed as `c4d6667` "Regenerate social share card from updated wedding logo" (2 files: public/share-card.png + index.html). local==remote confirmed.
  - **Cache-buster convention reconfirmed**: whenever `share-card.png` bytes change, bump `?v=N` on all 3 refs in index.html so clients/on-device preview generators refetch. Now at v3.
  - **Terminal capture gotcha (again)**: inline stdout from `wsl bash -c "..."` is reliably swallowed by the PowerShell echo wrapper; redirect to a scratch `.out` and read_file it. For multi-step git (add/commit/push/verify), write a `.sh` scratch script and run `bash script.sh > out 2>&1` — avoids the nested-quote `unexpected EOF` and the multi-line `git commit -m` wedge. Always `git commit -F <scratch .txt>`.

- **2026-11-04** Gallery now uses the couple's real photos: 11 images `src/assets/gallery/01.webp`..`11.webp` (1200x800, <=200KB), generated with `sharp` (`.rotate()` for EXIF, `fit: cover`, `position: attention`) from 11 camera JPGs (4608x3072, 3-7MB each). Originals moved to `originals/gallery/` (gitignored). `weddingConfig.js` imports `photo01..photo11`; subjects `photo-01..11`; alts are generic ("Bricx and Hannah, photo N of 11.") — refine later. `assets.test.js`/`config.test.js` updated to match. `CREDITS.md` in the gallery folder is stale (still describes the old placeholders). Hero bg: `SiteBackground.css` shows the portrait photo full-height on landscape >=768px instead of `bg-cover`.
- Tooling gotchas: `fs_write` with a `/home/...` path writes to the wrong place; use the `\\wsl.localhost\Ubuntu\...` UNC path. Heredocs in `wsl bash -c` get rejected by the shell parser — write a scratch .py/.mjs and run it. `rsvpForm.test.jsx` Property 6 can time out (5s) under load; unrelated flake.

- **2026-11-06** Gallery now holds all 33 couple photos (was 11), and the gallery is now file-driven rather than hardcoded.
  - **JXL decode gotcha**: the new originals are `.jxl` (JPEG XL), ~5.8MB each, 4608×3072. The installed `sharp` (0.35.4) has NO JXL input codec, and the WSL box has no `djxl`/`cjxl`/`magick`/`vips`/`ffmpeg`, and `sudo` needs a password so apt `libjxl-tools` isn't installable non-interactively. Solution: decode JXL in pure JS with **`@jsquash/jxl`** (WASM) installed via `npm install --no-save @jsquash/jxl@1.3.0`, then hand the raw RGBA to sharp for resize+webp. In Node you must load the codec wasm explicitly: `import { init } from '@jsquash/jxl/decode.js'; await init({ wasmBinary: await readFile('node_modules/@jsquash/jxl/codec/dec/jxl_dec.wasm') })`, then `import decode from '@jsquash/jxl/decode.js'; const { data, width, height } = await decode(new Uint8Array(buf).buffer)`. Encode loop backs quality down from 82 until the webp is ≤200KB (all 33 landed 26–185KB at q82/q74).
  - **weddingConfig.js gallery is now generated**, not 11 manual imports: `const galleryModules = import.meta.glob('../assets/gallery/*.webp', { eager: true, import: 'default' })`, `const galleryFiles = Object.keys(galleryModules).sort()`, then `gallery: galleryFiles.map((path, i) => ({ subject: \`photo-\${String(i+1).padStart(2,'0')}\`, src: galleryModules[path], alt: \`Bricx and Hannah, photo \${i+1} of \${galleryFiles.length}.\`, width: 1200, height: 800 }))`. So the gallery count now tracks whatever numbered `.webp` files are in `src/assets/gallery/` — drop files + re-run the converter, no import line per image. `Gallery.jsx` already maps the array dynamically, so it needed NO change.
  - **assets.test.js** was de-hardcoded from 11: removed `EXPECTED_IMAGES = Array.from({length:11}...)`; now it reads the actual webp count from the folder and asserts the names form the contiguous run `01.webp..NN.webp` with a floor of `MIN_GALLERY_IMAGES = 7`. The "exactly the images + CREDITS.md" test builds `expectedEntries` from the on-disk count. So future photo-count changes don't need a test edit. assets.test grew 27→71 tests, config.test 50→72 (it validates every gallery entry via `it.each`). `config.test.js` `REQUIRED_GALLERY_SUBJECTS = ['photo-01','photo-06','photo-11']` still passes (all exist in 33).
  - **To re-generate the gallery from new originals**: put `.jxl` (or other) originals in `originals/gallery/` (gitignored), run a sharp+jsquash script that maps sorted originals → `01.webp..NN.webp` into `src/assets/gallery/` (1200×800, `fit:cover`, `position:attention`, `.rotate()` for EXIF), then `npm run build` + `npm run test -- --run`. Originals are kept out of `src/assets/gallery/` so the asset-folder "exactly NN webp + CREDITS.md" contract holds.
  - Build clean, 404/405 tests pass (the 1 fail is the known flaky `rsvpForm.test.jsx` Property 6 5s timeout, unrelated). Dev server on Node 24 at http://localhost:5173/.
  - NOTE: `@jsquash/jxl` was installed with `--no-save` so it is NOT in package.json — it's only needed for the one-off conversion. If a fresh `npm ci` wipes it, reinstall before re-running the converter. CREDITS.md in the gallery folder is still stale (describes old placeholders).

- **2026-11-06** Gallery progressive disclosure — show first 6, "See more" button reveals the rest.
  - `Gallery.jsx` now slices `weddingConfig.gallery` into `visible = slice(0,6)` + `hidden = slice(6)`, `INITIAL_VISIBLE = 6`. First 6 render in the normal grid; the remainder go in a collapsible `<div className="gallery-more {--open}">` toggled by `useState(expanded)`. Button text is `See more of {couple.displayNames}` (= "Bricx & Hannah") read from config — the button has `aria-expanded`/`aria-controls` pointing at the region (`useId()`), and hides once expanded. A `GalleryFigure` local helper renders identical markup for both groups; `delayIndex` keeps the reveal stagger continuous across the split.
  - `Gallery.css` `.gallery-more`: collapsed = `max-height: 11rem` + `opacity: 0.5` + a bottom `mask-image: linear-gradient(to bottom, opaque→transparent)` so the remaining photos peek through at ~half opacity and fade out (the "preview" cue). `.gallery-more--open` = `max-height: 1000rem` (ceiling above any realistic content height, since `height:auto` can't transition) + `opacity: 1` + `mask-image: none`. Transition animates only `max-height` + `opacity` (700ms ease-in-out) — mask is NOT in the transition list, so the 10.5 three-property ceiling holds.
  - Lazy loading: every hidden `<img>` stays in the DOM with `loading="lazy"`, so the browser only fetches each as it nears the viewport — first paint requests only the top rows (12.1), the rest load on scroll/expand. (No IntersectionObserver needed; native lazy covers it.)
  - Reduced motion: the global `@media (prefers-reduced-motion: reduce)` universal-selector block in index.css zeroes `transition-duration` for everything, so `.gallery-more` expands instantly there (same precedent as `.entourage-panel`). Collapsed-but-never-expanded under reduce is a valid final state; the button still works instantly.
  - **GOTCHA — sourceScan 14.6 trap**: `src/tests/sourceScan.test.js` does a PLAIN SUBSTRING scan of each component's raw source for config-owned literals (couple display names, dates, venues, palette hexes). It does NOT parse — a config-owned string in a CODE COMMENT fails it just like a hardcoded value. My first pass put the literal `"See more of Bricx & Hannah"` in a doc comment and it failed: "restates the couple display names". Fix: never write the couple names / dates / venues verbatim anywhere in a component file, comments included; reference them as "the couple's display names read from config". The runtime `{couple.displayNames}` is fine.
  - All 405 tests pass (sourceScan 57, assets 71, config 72, galleryImages 4, reducedMotion 3). Button styling reuses the shared `control control-btn tap-target ... rounded-full border border-sage bg-sage ... font-display text-cream` classes (same as AddToCalendarButton/Entourage toggle).

- **2026-11-06** Removed the Cream (#ede0cd) swatch from the "What to Wear" (DressCode) section.
  - Did NOT touch the shared `weddingConfig.palette` (still 4 entries) — Cream is also a site-wide design token (`--color-cream`, used for section banding + gradients) and the config test asserts `palette.toHaveLength(4)`. Instead filtered it out of the swatch row only: `DressCode.jsx` now has `const EXCLUDED_SWATCH_NAMES = new Set(['Cream'])` and renders `palette.filter(e => !EXCLUDED_SWATCH_NAMES.has(e.name))`. So DressCode shows 3 swatches (Sage, Light Sage, Silver Gray) while the palette/token stay intact.
  - **Why filter by NAME not hex**: the hex `#ede0cd` is a FORBIDDEN_LITERAL in `sourceScan.test.js` (would fail the component scan), but the color NAME `'Cream'` is NOT forbidden — only names/dates/venues/hexes are. So filtering by `entry.name === 'Cream'` is safe.
  - Updated `dressCode.guidance` in `weddingConfig.js`: "The four swatches" → "The swatches", and dropped "cream" from the target-colours list ("near sage, cream, or soft neutral" → "near sage or soft neutral"). `dressCode.guidance` has no word-count bound in config.test (only checked non-empty), so editing it freely is fine. Also updated DressCode.jsx doc comments that said "four Palette swatches".
  - No DressCode-specific test exists (no swatch-count assertion anywhere). All 405 tests pass, build clean.
