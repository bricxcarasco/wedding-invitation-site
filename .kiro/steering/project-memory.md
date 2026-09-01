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
- **Deploy**: Netlify (`netlify.toml`). Build output goes to `dist/`.
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
