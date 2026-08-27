# Gallery image credits

**There is no third-party licence obligation on any file in this folder.**

Every image here was generated locally by
[`scripts/generate-placeholders.mjs`](../../../scripts/generate-placeholders.mjs).
Nothing was downloaded, nothing is hotlinked, no stock library was used, and no
external image host is involved. Each file is a palette-only composition built
from the four wedding colours — Sage `#55705f`, Light Sage `#a3b899`,
Cream `#ede0cd`, Silver Gray `#c0c0c0` — authored as SVG in that script and
rasterised to WebP. They are committed to the repository and served from the
Vite build output.

Regenerate all seven at any time:

```bash
npm run placeholders          # node scripts/generate-placeholders.mjs
```

The script is idempotent and overwrites every file in place, so editing the
palette or a motif and re-running is the supported way to change these images.

## Files

| File | Depicts | Source | Licence / attribution |
|---|---|---|---|
| `01-rings.webp` | Concentric rings with two emphasised bands | Agent-generated palette placeholder — `scripts/generate-placeholders.mjs` | None required. No external source. |
| `02-couple-portrait.webp` | Two overlapping soft ellipses leaning together | Agent-generated palette placeholder — `scripts/generate-placeholders.mjs` | None required. No external source. |
| `03-ceremony.webp` | A ceremony arch with blossoms along its curve | Agent-generated palette placeholder — `scripts/generate-placeholders.mjs` | None required. No external source. |
| `04-flowers.webp` | Three radial petal forms | Agent-generated palette placeholder — `scripts/generate-placeholders.mjs` | None required. No external source. |
| `05-venue.webp` | A horizon band under a low sun, with a colonnade on the skyline | Agent-generated palette placeholder — `scripts/generate-placeholders.mjs` | None required. No external source. |
| `06-outdoor-scenery.webp` | Four layered hills receding into a pale sky | Agent-generated palette placeholder — `scripts/generate-placeholders.mjs` | None required. No external source. |
| `07-reception-details.webp` | A table setting seen from above, arranged from circles | Agent-generated palette placeholder — `scripts/generate-placeholders.mjs` | None required. No external source. |

All seven are WebP, 1200 × 800 (3:2), and well under the 300KB per-image cap.

## Replacing these with real photographs

This is the documented follow-up, not a precondition for shipping — the gallery
is coherent and finished as it stands. The swap is **filename for filename** and
needs no code change:

1. Export the photograph to WebP at 1200 × 800.
2. Confirm it is 300KB or less.
3. Overwrite the file of the same name in this folder, keeping the `.webp`
   extension so the bundler's import still resolves.
4. Rewrite that entry's `alt` text in `src/config/weddingConfig.js` — the
   current `alt` strings describe these generated placeholders, so they stop
   being accurate the moment a real photograph lands.
5. Replace this file's row for that image with the photographer credit and
   licence the photograph actually carries.

The README carries the same procedure alongside the one-line `cwebp`
invocation for the conversion.
