/**
 * generate-placeholders.mjs — the gallery placeholder generator
 * =============================================================================
 *
 * WHAT THIS IS
 * ------------
 * A one-command, offline generator for the eight WebP files the Gallery renders
 * from `src/assets/gallery/`. Each composition is authored here as an SVG string
 * and rasterised to WebP with `sharp`. Run it with:
 *
 *     npm run placeholders          # or: node scripts/generate-placeholders.mjs
 *
 * Output: exactly eight files, each 1200 x 800 (3:2), well under the 300KB
 * per-image cap of requirement 12.2:
 *
 *     01-rings.webp   02-couple-portrait.webp   03-ceremony.webp
 *     04-flowers.webp 05-venue.webp             06-outdoor-scenery.webp
 *     07-reception-details.webp                 08-first-dance.webp
 *
 * WHY GENERATED PLACEHOLDERS RATHER THAN STOCK PHOTOGRAPHY
 * --------------------------------------------------------
 * Three reasons, in order of weight.
 *
 * 1. Licence. Nothing is downloaded and nothing is hotlinked, so there is no
 *    third-party licence obligation to track, attribute, or re-check at deploy
 *    time. Requirement 13.5 is satisfied by construction rather than by a
 *    CREDITS table that has to stay true, and requirement 6.3 (serve from the
 *    build output, never an external host) follows for free.
 *
 * 2. Coherence. Stock wedding photography is somebody else's wedding, shot in
 *    somebody else's colours. It would fight the Sage / Light Sage / Cream /
 *    Silver palette the rest of the site is built from, and it would set an
 *    expectation the real photographs then have to match. A palette-only
 *    composition reads as an intentional design decision: the gallery looks
 *    finished and pretty before the real photographs land, and it never looks
 *    like a grey box, a broken image, or a loud "PLACEHOLDER" watermark.
 *
 * 3. Honesty about the swap. Every file is a deliberate stand-in at the exact
 *    filename, format, and dimensions a real photograph will use, so the
 *    replacement is filename-for-filename with no code change
 *    (see the README, and `src/assets/gallery/CREDITS.md`).
 *
 * RE-RUNNING IS THE INTENDED WORKFLOW
 * -----------------------------------
 * The script is idempotent: it overwrites all seven files in place every time,
 * and the same input always produces the same output. Edit `PALETTE` below to
 * retune the colours, or edit any single `compose*` function to redraw one
 * motif, then re-run. That is the supported way to change the placeholders —
 * they are not hand-tuned binaries that must be preserved.
 *
 * Note on the palette constants. `src/index.css` owns the palette as *style*
 * and `src/config/weddingConfig.js` owns it as *data*. This script cannot
 * import either (it runs in plain Node, outside Vite, and `weddingConfig.js`
 * imports the very files this script produces), so it restates the four hex
 * values below. That is a deliberate third copy confined to build-time tooling
 * and outside the shipped bundle. Keep it in sync by hand when the palette
 * moves; the whole point of re-running the script is that this is a one-line
 * edit followed by one command.
 *
 * Note on `sharp`. It is a devDependency, pinned exactly. It never enters the
 * production bundle, so it is outside the 300KB budget of requirement 12.3, and
 * it is Apache-2.0 licensed, which satisfies requirement 13.5.
 */

import { mkdir, readdir, stat, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------

/** Intrinsic size every gallery image ships at (6.4, and the width/height in Wedding_Config). */
const WIDTH = 1200;
const HEIGHT = 800;

/**
 * Supersample factor. librsvg antialiases well, but rendering at 2x and
 * downsampling with Lanczos gives visibly cleaner hairline strokes and gradient
 * banding for no extra shipped bytes.
 */
const SUPERSAMPLE = 2;

/** WebP encode settings. Flat palette gradients land in the tens of KB here. */
const WEBP = { quality: 82, effort: 6, smartSubsample: true };

/** Per-file byte ceiling from requirement 12.2. */
const MAX_BYTES = 300 * 1024;

/** The Palette. See the header note on why these four hex values are restated here. */
const PALETTE = {
  sage: '#55705f',
  sageLight: '#a3b899',
  cream: '#ede0cd',
  silver: '#c0c0c0',
};

const { sage: SAGE, sageLight: SAGE_LIGHT, cream: CREAM, silver: SILVER } = PALETTE;

/**
 * The display face, mirroring `--font-display` in src/index.css and ending in a
 * guaranteed generic. Whichever elegant serif the generating machine happens to
 * have is the one baked into the raster, so the committed files are consistent
 * even though the resolved face is host-dependent.
 */
const SERIF =
  "'Cormorant Garamond','EB Garamond',Didot,'Playfair Display',Georgia,'Times New Roman','DejaVu Serif',serif";

/** Drawing area inside the decorative frame, leaving the lower band for the label. */
const ART_BOTTOM = 612;

/**
 * The two landscape subjects (venue, outdoor scenery) are drawn inside a matted
 * plate rather than bleeding to the canvas edge. A horizon or a hill silhouette
 * has to stop somewhere, and stopping at the raw edge reads as a clipped
 * mistake; stopping at a hairline-bordered panel reads as a plate in a book.
 */
const PANEL = { x: 96, y: 100, w: 1008, h: 452 };
const PANEL_BOTTOM = PANEL.y + PANEL.h;

// -----------------------------------------------------------------------------
// Small SVG helpers
// -----------------------------------------------------------------------------

/** Trim float noise out of the emitted path data. */
const n = (value) => Number(value.toFixed(2));

const rad = (deg) => (deg * Math.PI) / 180;

/** Point on a circle, measured anticlockwise from the positive x axis. */
const polar = (cx, cy, r, deg) => ({
  x: n(cx + r * Math.cos(rad(deg))),
  y: n(cy - r * Math.sin(rad(deg))),
});

/**
 * A single-hue linear gradient. Both stops share one colour and differ only in
 * opacity, which avoids the muddy midpoints that RGBA interpolation between two
 * different semi-transparent hues produces.
 */
const wash = ({ id, color, from, to, x1 = 0, y1 = 0, x2 = 0, y2 = 1 }) => `
    <linearGradient id="${id}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}">
      <stop offset="0%" stop-color="${color}" stop-opacity="${from}" />
      <stop offset="100%" stop-color="${color}" stop-opacity="${to}" />
    </linearGradient>`;

/** A soft radial bloom of light, used to lift the centre of a composition. */
const glow = ({ id, color, from, to, cx = 0.5, cy = 0.5, r = 0.7, mid }) => `
    <radialGradient id="${id}" cx="${cx}" cy="${cy}" r="${r}">
      <stop offset="0%" stop-color="${color}" stop-opacity="${from}" />
      ${mid ? `<stop offset="${mid.at}" stop-color="${color}" stop-opacity="${mid.opacity}" />` : ''}
      <stop offset="100%" stop-color="${color}" stop-opacity="${to}" />
    </radialGradient>`;

/**
 * A smooth open curve through the given points, as quadratic segments hung off
 * the midpoints between consecutive points. Used for the hill crests.
 */
function smoothLine(points) {
  if (points.length < 3) {
    const [first, last] = [points[0], points[points.length - 1]];
    return `M ${n(first.x)} ${n(first.y)} L ${n(last.x)} ${n(last.y)}`;
  }
  let d = `M ${n(points[0].x)} ${n(points[0].y)}`;
  for (let i = 1; i < points.length - 1; i += 1) {
    const mx = (points[i].x + points[i + 1].x) / 2;
    const my = (points[i].y + points[i + 1].y) / 2;
    d += ` Q ${n(points[i].x)} ${n(points[i].y)} ${n(mx)} ${n(my)}`;
  }
  const prev = points[points.length - 2];
  const last = points[points.length - 1];
  return `${d} Q ${n(prev.x)} ${n(prev.y)} ${n(last.x)} ${n(last.y)}`;
}

/** Opaque Cream ground plus one or more wash / glow layers painted over it. */
const backdrop = (...fills) =>
  [`<rect width="${WIDTH}" height="${HEIGHT}" fill="${CREAM}" />`]
    .concat(fills.map((id) => `<rect width="${WIDTH}" height="${HEIGHT}" fill="url(#${id})" />`))
    .join('\n    ');

/** The clip region and hairline border for a matted landscape plate. */
const PANEL_CLIP = `
    <clipPath id="plate">
      <rect x="${PANEL.x}" y="${PANEL.y}" width="${PANEL.w}" height="${PANEL.h}" />
    </clipPath>`;

/** A gradient-filled rect covering exactly the plate, so gradient units span it. */
const panelFill = (id) =>
  `<rect x="${PANEL.x}" y="${PANEL.y}" width="${PANEL.w}" height="${PANEL.h}" fill="url(#${id})" />`;

const PANEL_BORDER = `<rect x="${PANEL.x}" y="${PANEL.y}" width="${PANEL.w}" height="${PANEL.h}"
          fill="none" stroke="${SAGE}" stroke-opacity="0.38" stroke-width="1" />`;

/**
 * The shared furniture every composition carries: a double hairline frame, a
 * small diamond ornament flanked by rules, the subject name in letter-spaced
 * display caps, and an edge vignette. This is what makes the set read as one
 * deliberate series rather than seven unrelated images.
 *
 * The label is centred with `text-anchor="middle"`; letter-spacing adds a
 * trailing gap after the final glyph, so x is nudged right by half a step to
 * keep the optical centre true.
 */
function furniture(label) {
  const LETTER_SPACING = 8.4;
  const cx = WIDTH / 2;
  const ornamentY = 650;
  return `
    <!-- frame -->
    <rect x="40" y="40" width="${WIDTH - 80}" height="${HEIGHT - 80}" fill="none"
          stroke="${SILVER}" stroke-opacity="0.55" stroke-width="1" />
    <rect x="52" y="52" width="${WIDTH - 104}" height="${HEIGHT - 104}" fill="none"
          stroke="${SAGE}" stroke-opacity="0.16" stroke-width="1" />

    <!-- ornament -->
    <g stroke="${SAGE}" stroke-opacity="0.5" stroke-width="1.2" fill="none">
      <rect x="${cx - 6}" y="${ornamentY - 6}" width="12" height="12"
            transform="rotate(45 ${cx} ${ornamentY})" />
      <line x1="${cx - 96}" y1="${ornamentY}" x2="${cx - 22}" y2="${ornamentY}" />
      <line x1="${cx + 22}" y1="${ornamentY}" x2="${cx + 96}" y2="${ornamentY}" />
    </g>

    <!-- subject name -->
    <text x="${cx + LETTER_SPACING / 2}" y="712" text-anchor="middle"
          font-family="${SERIF}" font-size="28" letter-spacing="${LETTER_SPACING}"
          fill="${SAGE}" fill-opacity="0.9">${label}</text>

    <!-- edge vignette, painted last so it sits over the artwork -->
    <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#vignette)" />`;
}

/** Wrap a composition's defs and body into a complete SVG document. */
const document_ = ({ defs, body, label }) => `<svg xmlns="http://www.w3.org/2000/svg"
     width="${WIDTH * SUPERSAMPLE}" height="${HEIGHT * SUPERSAMPLE}"
     viewBox="0 0 ${WIDTH} ${HEIGHT}">
  <defs>${defs}${glow({
    id: 'vignette',
    color: SAGE,
    cx: 0.5,
    cy: 0.44,
    r: 0.78,
    from: 0,
    mid: { at: '58%', opacity: 0 },
    to: 0.15,
  })}
  </defs>
  ${body}
  ${furniture(label)}
</svg>`;

// -----------------------------------------------------------------------------
// The eight compositions
// -----------------------------------------------------------------------------

/** 01 — concentric rings, with two emphasised bands reading as wedding bands. */
function composeRings() {
  const cx = WIDTH / 2;
  const cy = 336;

  const rings = [
    { r: 40, w: 1, c: SAGE, o: 0.3 },
    { r: 72, w: 1, c: SAGE, o: 0.24 },
    { r: 104, w: 7, c: SAGE, o: 0.85 },
    { r: 138, w: 1.4, c: SILVER, o: 0.75 },
    { r: 176, w: 3.5, c: SAGE_LIGHT, o: 0.95 },
    { r: 212, w: 1, c: SAGE, o: 0.28 },
    { r: 244, w: 1, c: SILVER, o: 0.5 },
    { r: 272, w: 1, c: SAGE, o: 0.14 },
  ]
    .map(
      ({ r, w, c, o }) =>
        `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${c}" ` +
        `stroke-opacity="${o}" stroke-width="${w}" />`,
    )
    .join('\n      ');

  // A short bright arc on the upper left of the inner band, the way light
  // catches the inside curve of a metal ring.
  const glintFrom = polar(cx, cy, 104, 205);
  const glintTo = polar(cx, cy, 104, 145);
  // Kept low-contrast on purpose: at full strength the Cream stroke reads as a
  // break in the band rather than as light on metal.
  const glint =
    `<path d="M ${glintFrom.x} ${glintFrom.y} A 104 104 0 0 1 ${glintTo.x} ${glintTo.y}" ` +
    `fill="none" stroke="${CREAM}" stroke-opacity="0.34" stroke-width="2.2" stroke-linecap="round" />`;

  // Two small stones seated on the outer band.
  const stones = [70, 110]
    .map((deg) => {
      const p = polar(cx, cy, 176, deg);
      return (
        `<circle cx="${p.x}" cy="${p.y}" r="6" fill="${CREAM}" ` +
        `stroke="${SAGE}" stroke-opacity="0.7" stroke-width="1.2" />`
      );
    })
    .join('\n      ');

  return document_({
    label: 'RINGS',
    defs:
      wash({ id: 'a', color: SAGE_LIGHT, from: 0.4, to: 0, x1: 0, y1: 0, x2: 1, y2: 1 }) +
      wash({ id: 'b', color: SILVER, from: 0.3, to: 0, x1: 1, y1: 0, x2: 0, y2: 1 }) +
      glow({ id: 'c', color: CREAM, cx: 0.5, cy: 0.42, r: 0.52, from: 0.9, to: 0 }),
    body: `${backdrop('a', 'b', 'c')}
    <g>
      ${rings}
      ${glint}
      ${stones}
    </g>`,
  });
}

/** 02 — two overlapping soft ellipses, leaning together. */
function composeCouplePortrait() {
  const cy = 336;
  const left = 512;
  const right = 688;

  // A halo that fades out, rather than a flat Cream blob with a visible edge.
  const halo = `<ellipse cx="${WIDTH / 2}" cy="352" rx="330" ry="258" fill="url(#halo)" />`;

  // Outlines a little wider than the fills, offset outward, so the pair reads as
  // two figures with breathing room rather than one blob.
  const outlines = [
    { cx: left - 12, tilt: -10 },
    { cx: right + 12, tilt: 10 },
  ]
    .map(
      ({ cx, tilt }) =>
        `<ellipse cx="${cx}" cy="${cy}" rx="150" ry="206" fill="none" stroke="${SILVER}" ` +
        `stroke-opacity="0.45" stroke-width="1.2" transform="rotate(${tilt} ${cx} ${cy})" />`,
    )
    .join('\n      ');

  // Off-centre focal points give each ellipse a lit upper edge and a deeper
  // lower one, so the pair reads as soft volumes rather than flat cutouts. The
  // fills stay semi-transparent so the overlap deepens on its own, without
  // needing a blend mode librsvg may or may not honour.
  const figures = [
    { cx: left, fill: 'figL', tilt: -10 },
    { cx: right, fill: 'figR', tilt: 10 },
  ]
    .map(
      ({ cx, fill, tilt }) =>
        `<ellipse cx="${cx}" cy="${cy}" rx="132" ry="186" fill="url(#${fill})" ` +
        `stroke="${CREAM}" stroke-opacity="0.45" stroke-width="1.5" ` +
        `transform="rotate(${tilt} ${cx} ${cy})" />`,
    )
    .join('\n      ');

  return document_({
    label: 'COUPLE PORTRAIT',
    defs:
      wash({ id: 'a', color: SAGE_LIGHT, from: 0.14, to: 0.42 }) +
      wash({ id: 'b', color: SILVER, from: 0.26, to: 0, x1: 0, y1: 0, x2: 1, y2: 0.4 }) +
      glow({ id: 'c', color: CREAM, cx: 0.5, cy: 0.4, r: 0.46, from: 0.75, to: 0 }) +
      glow({ id: 'halo', color: CREAM, cx: 0.5, cy: 0.5, r: 0.5, from: 0.72, to: 0 }) +
      glow({ id: 'figL', color: SAGE, cx: 0.46, cy: 0.28, r: 0.82, from: 0.26, to: 0.56 }) +
      glow({ id: 'figR', color: SAGE_LIGHT, cx: 0.54, cy: 0.28, r: 0.82, from: 0.4, to: 0.86 }),
    body: `${backdrop('a', 'b', 'c')}
    <g>
      ${halo}
      ${outlines}
      ${figures}
    </g>`,
  });
}

/** 03 — a ceremony arch, blossoms seated along its curve. */
function composeCeremony() {
  const cx = WIDTH / 2;
  const spring = 354; // where the arc meets the uprights
  const radius = 180;
  const leftX = cx - radius;
  const rightX = cx + radius;

  const outer =
    `M ${leftX} ${ART_BOTTOM} L ${leftX} ${spring} ` +
    `A ${radius} ${radius} 0 0 1 ${rightX} ${spring} L ${rightX} ${ART_BOTTOM}`;
  const inner =
    `M ${leftX + 40} ${ART_BOTTOM} L ${leftX + 40} ${spring} ` +
    `A ${radius - 40} ${radius - 40} 0 0 1 ${rightX - 40} ${spring} L ${rightX - 40} ${ART_BOTTOM}`;

  const blossoms = [162, 135, 108, 90, 72, 45, 18]
    .map((deg) => {
      const p = polar(cx, spring, radius, deg);
      const r = deg === 90 ? 9 : 7;
      return (
        `<circle cx="${p.x}" cy="${p.y}" r="${r}" fill="${CREAM}" fill-opacity="0.95" ` +
        `stroke="${SAGE}" stroke-opacity="0.55" stroke-width="1.2" />`
      );
    })
    .join('\n      ');

  // A few more down the uprights, thinning as they descend.
  const trailing = [
    [leftX, 412, 6],
    [leftX, 486, 5],
    [rightX, 412, 6],
    [rightX, 486, 5],
  ]
    .map(
      ([x, y, r]) =>
        `<circle cx="${x}" cy="${y}" r="${r}" fill="${CREAM}" fill-opacity="0.85" ` +
        `stroke="${SAGE_LIGHT}" stroke-opacity="0.8" stroke-width="1" />`,
    )
    .join('\n      ');

  return document_({
    label: 'CEREMONY',
    defs:
      wash({ id: 'a', color: SAGE_LIGHT, from: 0.1, to: 0.38 }) +
      wash({ id: 'b', color: SILVER, from: 0.24, to: 0, x1: 1, y1: 0, x2: 0, y2: 0.6 }) +
      glow({ id: 'c', color: CREAM, cx: 0.5, cy: 0.44, r: 0.5, from: 0.88, to: 0 }),
    body: `${backdrop('a', 'b', 'c')}
    <g>
      <path d="${outer} L ${leftX} ${ART_BOTTOM} Z" fill="${SAGE}" fill-opacity="0.1" />
      <line x1="296" y1="${ART_BOTTOM}" x2="904" y2="${ART_BOTTOM}"
            stroke="${SILVER}" stroke-opacity="0.75" stroke-width="1.5" />
      <path d="${inner}" fill="none" stroke="${SAGE_LIGHT}" stroke-opacity="0.9"
            stroke-width="3.5" stroke-linecap="round" />
      <path d="${outer}" fill="none" stroke="${SAGE}" stroke-opacity="0.9"
            stroke-width="11" stroke-linecap="round" />
      ${blossoms}
      ${trailing}
    </g>`,
  });
}

/** 04 — radial petal forms: one full bloom and two smaller ones. */
function composeFlowers() {
  /** One bloom: `count` ellipses rotated about a shared centre, plus a seed head. */
  const bloom = ({ cx, cy, count, rx, ry, fill, fillOpacity, stroke, strokeOpacity, seed }) => {
    const petals = Array.from({ length: count }, (_, i) => {
      const angle = n((360 / count) * i);
      return (
        `<ellipse cx="${cx}" cy="${cy - ry}" rx="${rx}" ry="${ry}" fill="${fill}" ` +
        `fill-opacity="${fillOpacity}" stroke="${stroke}" stroke-opacity="${strokeOpacity}" ` +
        `stroke-width="1" transform="rotate(${angle} ${cx} ${cy})" />`
      );
    }).join('\n      ');
    return `${petals}
      <circle cx="${cx}" cy="${cy}" r="${seed}" fill="${CREAM}" fill-opacity="0.96"
              stroke="${SAGE}" stroke-opacity="0.6" stroke-width="1.4" />
      <circle cx="${cx}" cy="${cy}" r="${n(seed * 0.45)}" fill="${SAGE}" fill-opacity="0.35" />`;
  };

  return document_({
    label: 'FLOWERS',
    defs:
      wash({ id: 'a', color: SAGE_LIGHT, from: 0.34, to: 0.06, x1: 0, y1: 0, x2: 0.6, y2: 1 }) +
      wash({ id: 'b', color: SILVER, from: 0, to: 0.28 }) +
      glow({ id: 'c', color: CREAM, cx: 0.5, cy: 0.4, r: 0.55, from: 0.9, to: 0 }),
    body: `${backdrop('a', 'b', 'c')}
    <g>
      ${bloom({
        cx: 368,
        cy: 448,
        count: 9,
        rx: 20,
        ry: 68,
        fill: SAGE,
        fillOpacity: 0.26,
        stroke: SAGE,
        strokeOpacity: 0.22,
        seed: 18,
      })}
      ${bloom({
        cx: 852,
        cy: 424,
        count: 8,
        rx: 22,
        ry: 74,
        fill: SILVER,
        fillOpacity: 0.42,
        stroke: SAGE,
        strokeOpacity: 0.24,
        seed: 20,
      })}
      ${bloom({
        cx: WIDTH / 2,
        cy: 318,
        count: 11,
        rx: 30,
        ry: 104,
        fill: SAGE_LIGHT,
        fillOpacity: 0.58,
        stroke: SAGE,
        strokeOpacity: 0.35,
        seed: 30,
      })}
    </g>`,
  });
}

/** 05 — a calm horizon band under a low sun, with a colonnade on the skyline. */
function composeVenue() {
  const cx = WIDTH / 2;
  const horizon = 380;
  const sunY = 214;

  // Shimmer: thin rules below the horizon, each shorter than the last, so the
  // band reads as still water catching the light.
  const shimmer = [
    [406, 40],
    [430, 120],
    [458, 210],
    [490, 300],
    [524, 372],
  ]
    .map(
      ([y, inset]) =>
        `<line x1="${PANEL.x + inset}" y1="${y}" x2="${PANEL.x + PANEL.w - inset}" y2="${y}" ` +
        `stroke="${SILVER}" stroke-opacity="0.4" stroke-width="1" />`,
    )
    .join('\n        ');

  // A four-column colonnade with a shallow gable: more legibly "a place you
  // hold a reception in" than a plain box silhouette, and still just lines.
  const gable = `M ${cx - 110} 336 L ${cx} 308 L ${cx + 110} 336`;
  const columns = [cx - 92, cx - 32, cx + 32, cx + 92]
    .map(
      (x) =>
        `<line x1="${x}" y1="344" x2="${x}" y2="${horizon}" stroke="${SAGE}" ` +
        `stroke-opacity="0.62" stroke-width="6" />`,
    )
    .join('\n        ');

  return document_({
    label: 'VENUE',
    defs:
      wash({ id: 'outer', color: SAGE_LIGHT, from: 0.16, to: 0.04 }) +
      wash({ id: 'sky', color: SAGE_LIGHT, from: 0.08, to: 0.38, x1: 0, y1: 0, x2: 0, y2: 0.62 }) +
      wash({ id: 'skyEdge', color: SILVER, from: 0.24, to: 0, x1: 0, y1: 0, x2: 1, y2: 0.35 }) +
      glow({ id: 'sun', color: CREAM, cx: 0.5, cy: 0.26, r: 0.46, from: 0.92, to: 0 }) +
      wash({ id: 'land', color: SAGE, from: 0.56, to: 0.2 }) +
      PANEL_CLIP,
    body: `${backdrop('outer')}
    <g clip-path="url(#plate)">
      ${panelFill('sky')}
      ${panelFill('skyEdge')}
      ${panelFill('sun')}

      <circle cx="${cx}" cy="${sunY}" r="86" fill="none" stroke="${SAGE}"
              stroke-opacity="0.16" stroke-width="1" />
      <circle cx="${cx}" cy="${sunY}" r="74" fill="none" stroke="${SILVER}"
              stroke-opacity="0.5" stroke-width="1.2" />
      <circle cx="${cx}" cy="${sunY}" r="64" fill="${CREAM}" fill-opacity="0.92" />

      <path d="${gable} Z" fill="${SAGE}" fill-opacity="0.3" />
      <path d="${gable}" fill="none" stroke="${SAGE}" stroke-opacity="0.75"
            stroke-width="2.5" stroke-linejoin="round" />
      <rect x="${cx - 110}" y="336" width="220" height="8" fill="${SAGE}" fill-opacity="0.55" />
      ${columns}

      <rect x="${PANEL.x}" y="${horizon}" width="${PANEL.w}" height="${PANEL_BOTTOM - horizon}"
            fill="url(#land)" />
      <line x1="${PANEL.x}" y1="${horizon}" x2="${PANEL.x + PANEL.w}" y2="${horizon}"
            stroke="${SAGE}" stroke-opacity="0.85" stroke-width="2" />
      <ellipse cx="${cx}" cy="406" rx="82" ry="11" fill="${CREAM}" fill-opacity="0.32" />
      ${shimmer}
    </g>
    ${PANEL_BORDER}`,
  });
}

/** 06 — four layered hills receding into a pale sky. */
function composeOutdoorScenery() {
  const layers = [
    { baseY: 318, amp: 30, waves: 1.6, phase: 0.4, fill: SILVER, opacity: 0.4, crest: 0.24 },
    { baseY: 370, amp: 40, waves: 2.2, phase: 2.1, fill: SAGE_LIGHT, opacity: 0.6, crest: 0.3 },
    { baseY: 424, amp: 34, waves: 1.3, phase: 4.0, fill: SAGE, opacity: 0.34, crest: 0.28 },
    { baseY: 474, amp: 24, waves: 2.7, phase: 1.2, fill: SAGE, opacity: 0.64, crest: 0 },
  ];

  // Sampled well past the plate on both sides so the smoothing never has to
  // invent a corner inside the visible area.
  const hills = layers
    .map(({ baseY, amp, waves, phase, fill, opacity, crest }) => {
      const points = [];
      for (let x = -60; x <= WIDTH + 60; x += 110) {
        points.push({ x, y: baseY - amp * Math.sin((x / WIDTH) * Math.PI * waves + phase) });
      }
      const crestPath = smoothLine(points);
      const filled = `${crestPath} L ${WIDTH + 60} ${PANEL_BOTTOM} L -60 ${PANEL_BOTTOM} Z`;
      const crestStroke = crest
        ? `\n        <path d="${crestPath}" fill="none" stroke="${SAGE}" ` +
          `stroke-opacity="${crest}" stroke-width="1.2" />`
        : '';
      return `<path d="${filled}" fill="${fill}" fill-opacity="${opacity}" />${crestStroke}`;
    })
    .join('\n        ');

  return document_({
    label: 'OUTDOOR SCENERY',
    defs:
      wash({ id: 'outer', color: SAGE_LIGHT, from: 0.14, to: 0.04 }) +
      wash({ id: 'sky', color: SAGE_LIGHT, from: 0.06, to: 0.32, x1: 0, y1: 0, x2: 0, y2: 0.58 }) +
      wash({ id: 'skyEdge', color: SILVER, from: 0.2, to: 0, x1: 0, y1: 0, x2: 1, y2: 0.35 }) +
      glow({ id: 'sun', color: CREAM, cx: 0.74, cy: 0.2, r: 0.46, from: 0.85, to: 0 }) +
      PANEL_CLIP,
    body: `${backdrop('outer')}
    <g clip-path="url(#plate)">
      ${panelFill('sky')}
      ${panelFill('skyEdge')}
      ${panelFill('sun')}

      <circle cx="872" cy="186" r="46" fill="${CREAM}" fill-opacity="0.85" />
      <circle cx="872" cy="186" r="56" fill="none" stroke="${SILVER}"
              stroke-opacity="0.42" stroke-width="1" />
      ${hills}
    </g>
    ${PANEL_BORDER}`,
  });
}

/** 07 — a place setting from above: plate, side plates, cutlery, a glass. */
function composeReceptionDetails() {
  const cx = WIDTH / 2;
  const cy = 352;

  const sidePlates = [250, 950]
    .map(
      (x) =>
        `<circle cx="${x}" cy="296" r="68" fill="${CREAM}" fill-opacity="0.55" ` +
        `stroke="${SILVER}" stroke-opacity="0.55" stroke-width="1.2" />`,
    )
    .join('\n      ');

  const tines = [364, 386, 408]
    .map(
      (x) =>
        `<line x1="${x}" y1="246" x2="${x}" y2="304" stroke="${SAGE}" stroke-opacity="0.8" ` +
        `stroke-width="3" stroke-linecap="round" />`,
    )
    .join('\n      ');

  return document_({
    label: 'RECEPTION DETAILS',
    defs:
      wash({ id: 'a', color: SAGE_LIGHT, from: 0.36, to: 0.1, x1: 0, y1: 0, x2: 0.8, y2: 1 }) +
      wash({ id: 'b', color: SILVER, from: 0, to: 0.3 }) +
      glow({ id: 'c', color: CREAM, cx: 0.5, cy: 0.44, r: 0.5, from: 0.9, to: 0 }),
    body: `${backdrop('a', 'b', 'c')}
    <g>
      ${sidePlates}

      <!-- glass -->
      <circle cx="${cx}" cy="138" r="38" fill="none" stroke="${SAGE}"
              stroke-opacity="0.7" stroke-width="2" />
      <circle cx="${cx}" cy="138" r="24" fill="none" stroke="${SILVER}"
              stroke-opacity="0.7" stroke-width="1" />

      <!-- fork -->
      ${tines}
      <line x1="386" y1="300" x2="386" y2="474" stroke="${SAGE}" stroke-opacity="0.8"
            stroke-width="4" stroke-linecap="round" />

      <!-- knife and spoon -->
      <line x1="812" y1="246" x2="812" y2="474" stroke="${SAGE}" stroke-opacity="0.8"
            stroke-width="5" stroke-linecap="round" />
      <circle cx="854" cy="268" r="19" fill="none" stroke="${SAGE}"
              stroke-opacity="0.8" stroke-width="3" />
      <line x1="854" y1="290" x2="854" y2="474" stroke="${SAGE}" stroke-opacity="0.8"
            stroke-width="4" stroke-linecap="round" />

      <!-- plate -->
      <circle cx="${cx}" cy="${cy}" r="168" fill="${CREAM}" fill-opacity="0.95"
              stroke="${SAGE}" stroke-opacity="0.9" stroke-width="3" />
      <circle cx="${cx}" cy="${cy}" r="146" fill="none" stroke="${SAGE_LIGHT}"
              stroke-opacity="0.95" stroke-width="1.5" />
      <circle cx="${cx}" cy="${cy}" r="104" fill="none" stroke="${SILVER}"
              stroke-opacity="0.8" stroke-width="1" />
      <circle cx="${cx}" cy="${cy}" r="58" fill="none" stroke="${SAGE}"
              stroke-opacity="0.35" stroke-width="1.2" />
    </g>`,
  });
}

/** 08 — a first dance: two leaning figures inside sweeping motion arcs. */
function composeFirstDance() {
  const cx = WIDTH / 2
  const cy = 360

  // Two sweeping arcs around the couple, reading as the turn of a dance. Drawn
  // as open circles clipped to nothing special — just concentric guide rings
  // offset from centre so they feel like motion rather than a target.
  const arcs = [
    { r: 232, o: 0.16, w: 1, c: SAGE },
    { r: 204, o: 0.34, w: 1.4, c: SILVER },
    { r: 172, o: 0.22, w: 1, c: SAGE },
  ]
    .map(
      ({ r, o, w, c }) =>
        `<ellipse cx="${cx}" cy="${cy}" rx="${r}" ry="${n(r * 0.82)}" fill="none" ` +
        `stroke="${c}" stroke-opacity="${o}" stroke-width="${w}" ` +
        `transform="rotate(-12 ${cx} ${cy})" />`,
    )
    .join('\n      ')

  // Two figures leaning into one another, mirrored, each a soft tapering body.
  const left = cx - 58
  const right = cx + 58
  const figures = [
    { fx: left, tilt: 14, fill: 'figA' },
    { fx: right, tilt: -14, fill: 'figB' },
  ]
    .map(
      ({ fx, tilt, fill }) =>
        `<ellipse cx="${fx}" cy="${cy}" rx="66" ry="150" fill="url(#${fill})" ` +
        `stroke="${CREAM}" stroke-opacity="0.4" stroke-width="1.4" ` +
        `transform="rotate(${tilt} ${fx} ${cy})" />` +
        `<circle cx="${fx}" cy="${cy - 150}" r="34" fill="url(#${fill})" ` +
        `stroke="${CREAM}" stroke-opacity="0.4" stroke-width="1.4" ` +
        `transform="rotate(${tilt} ${fx} ${cy})" />`,
    )
    .join('\n      ')

  // A scatter of glints around the pair, the sparkle of a lit dance floor.
  const glints = [
    [312, 210, 5],
    [904, 250, 6],
    [268, 470, 4],
    [940, 452, 5],
    [cx, 150, 6],
  ]
    .map(
      ([x, y, r]) =>
        `<circle cx="${x}" cy="${y}" r="${r}" fill="${CREAM}" fill-opacity="0.9" ` +
        `stroke="${SAGE_LIGHT}" stroke-opacity="0.8" stroke-width="1" />`,
    )
    .join('\n      ')

  return document_({
    label: 'FIRST DANCE',
    defs:
      wash({ id: 'a', color: SAGE_LIGHT, from: 0.36, to: 0.08, x1: 0, y1: 0, x2: 0.8, y2: 1 }) +
      wash({ id: 'b', color: SILVER, from: 0.28, to: 0, x1: 1, y1: 0, x2: 0, y2: 0.6 }) +
      glow({ id: 'c', color: CREAM, cx: 0.5, cy: 0.42, r: 0.52, from: 0.9, to: 0 }) +
      glow({ id: 'figA', color: SAGE, cx: 0.44, cy: 0.24, r: 0.9, from: 0.32, to: 0.62 }) +
      glow({ id: 'figB', color: SAGE_LIGHT, cx: 0.56, cy: 0.24, r: 0.9, from: 0.46, to: 0.9 }),
    body: `${backdrop('a', 'b', 'c')}
    <g>
      ${arcs}
      ${figures}
      ${glints}
    </g>`,
  })
}

/**
 * The eight subjects the gallery renders, in gallery order. Filenames carry the
 * order prefix so the folder sorts the way the grid reads. Seven cover
 * requirement 6.1's enumerated subjects; `08-first-dance` was added to keep the
 * grid an even count so it tiles cleanly at the two- and (mostly) three-column
 * breakpoints.
 */
const PLACEHOLDERS = [
  { file: '01-rings.webp', compose: composeRings },
  { file: '02-couple-portrait.webp', compose: composeCouplePortrait },
  { file: '03-ceremony.webp', compose: composeCeremony },
  { file: '04-flowers.webp', compose: composeFlowers },
  { file: '05-venue.webp', compose: composeVenue },
  { file: '06-outdoor-scenery.webp', compose: composeOutdoorScenery },
  { file: '07-reception-details.webp', compose: composeReceptionDetails },
  { file: '08-first-dance.webp', compose: composeFirstDance },
];

// -----------------------------------------------------------------------------
// Render
// -----------------------------------------------------------------------------

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = resolve(HERE, '..', 'src', 'assets', 'gallery');

const kb = (bytes) => `${(bytes / 1024).toFixed(1)}KB`;

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  let failed = false;

  for (const { file, compose } of PLACEHOLDERS) {
    const svg = compose();
    const target = join(OUT_DIR, file);

    // Rasterise the supersampled SVG, downsample to the shipped size, drop the
    // alpha channel against Cream, then encode. `sharp` reads the SVG's own
    // width/height, so the supersample factor is set in the document itself.
    const buffer = await sharp(Buffer.from(svg))
      .resize(WIDTH, HEIGHT, { kernel: 'lanczos3' })
      .flatten({ background: CREAM })
      .webp(WEBP)
      .toBuffer();

    await writeFile(target, buffer);

    // Verify what actually landed on disk rather than trusting the encode.
    const meta = await sharp(target).metadata();
    const { size } = await stat(target);
    const ok =
      meta.format === 'webp' && meta.width === WIDTH && meta.height === HEIGHT && size <= MAX_BYTES;
    if (!ok) failed = true;

    console.log(
      `${ok ? 'ok  ' : 'FAIL'} ${file.padEnd(26)} ${String(meta.width)}x${String(meta.height)} ` +
        `${meta.format} ${kb(size).padStart(8)} (cap ${kb(MAX_BYTES)})`,
    );
  }

  // The folder is meant to hold exactly the seven images and CREDITS.md (6.2).
  const allowed = new Set([...PLACEHOLDERS.map((p) => p.file), 'CREDITS.md']);
  const stray = (await readdir(OUT_DIR)).filter((entry) => !allowed.has(entry));
  if (stray.length > 0) {
    console.warn(`\nwarning: unexpected entries in ${OUT_DIR}: ${stray.join(', ')}`);
  }

  if (failed) {
    console.error('\nAt least one file failed the format, dimension, or size check.');
    process.exitCode = 1;
    return;
  }
  console.log(`\n${PLACEHOLDERS.length} placeholders written to ${OUT_DIR}`);
}

await main();
