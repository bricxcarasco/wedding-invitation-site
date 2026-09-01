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
- **Git**: push to GitHub `origin/main` for this project when asked (user explicitly requested pushing to main here).

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
- **RSVP backend**: Netlify Forms has no Vercel equivalent, so RSVP is now a Vercel Serverless Function at `api/rsvp.js`. It accepts the same `application/x-www-form-urlencoded` body (`form-name`, `guestName`, `attendance`, `guestCount`, `message`), routes on `form-name === 'rsvp'`, re-validates server-side (name non-empty, attendance in {attending,not-attending}, guestCount integer 1-10), then LOGS the submission and returns `200`. There is a marked `--- Delivery step ---` block to add email/Sheet/DB delivery later; a throw there returns 502 so the client shows its retry path.
- **Client change**: `Rsvp.jsx` now `fetch('/api/rsvp', ...)` (was `fetch('/')`), form has `action="/api/rsvp"` and NO `data-netlify`. `encodeRsvpPayload` unchanged (body shape identical).
- **`index.html` stub**: kept, but repurposed. It's now the no-JS fallback (`<form name="rsvp" method="POST" action="/api/rsvp" hidden inert aria-hidden>`), NOT a Netlify detection stub. It still pins the canonical field-name set that a test enforces across form/encoder/endpoint.
- **Tests updated for the migration**: `src/tests/buildOutput.test.js` (asserts `method=POST` + `action=/api/rsvp` instead of `data-netlify`), `src/lib/rsvp.test.js` and `src/tests/rsvpForm.test.jsx` (selector `form[name="rsvp"][action="/api/rsvp"]`). All 324 tests pass on Node 24.
- **`netlify.toml` removed** (`git rm`).
- **IMPORTANT test gotcha**: `buildOutput.test.js` asserts the BUILT `dist/index.html` when it exists. After changing `index.html`, you MUST `npm run build` before `npm run test:run`, or the built-output check fails against a stale `dist/`. Sequence: edit → `npm run build` → `npm run test:run`.
- **Local RSVP testing**: `npm run preview` serves only static build, so `/api/rsvp` 404s there — submit hits the error path. Use `vercel dev` or a deploy preview to exercise the function.
