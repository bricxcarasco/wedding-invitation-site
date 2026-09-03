// Asset guard. This is a filesystem test, not a DOM test: it asserts facts
// about what is committed under `src/assets/` rather than about anything React
// renders. Requirement 6.2 wants every placeholder in one dedicated folder, and
// requirement 12.2 caps each one at 300KB, and neither is observable from a
// rendered tree — so they are checked here, against the bytes on disk.
//
// No image library is used. `sharp` is a devDependency of
// `scripts/generate-placeholders.mjs` only; pulling a native module into the
// test suite would cost startup time and portability for nothing, because the
// WebP container is identifiable from its first twelve bytes.
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, extname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

// Resolved from this file, not from `process.cwd()`, which differs depending on
// where vitest was invoked from.
const HERE = dirname(fileURLToPath(import.meta.url))
const ASSETS_DIR = resolve(HERE, '..', 'assets')
const GALLERY_DIR = join(ASSETS_DIR, 'gallery')
const IMAGES_DIR = join(ASSETS_DIR, 'images')

// The one image that lives OUTSIDE the gallery folder: the hero section's
// full-bleed background photo. It is not a gallery placeholder — it is the
// page's backdrop — so it lives in its own `src/assets/images/` folder rather
// than polluting the gallery folder's exact-contents contract above.
const HERO_BACKGROUND = join(IMAGES_DIR, 'hero-bg.jpg')

// The dress-code palette image, rendered by the DressCode section in place of
// the old colour swatches. Like the hero background it is a page image, not a
// gallery placeholder, so it lives in `src/assets/images/` and is a sanctioned
// exception to the "images live in the gallery folder" rule below.
const DRESS_CODE_IMAGE = join(IMAGES_DIR, 'dress-codes.png')

// Requirement 12.2. Binary KB, the stricter of the two readings.
const MAX_IMAGE_BYTES = 300 * 1024

const CREDITS_FILE = 'CREDITS.md'

// The gallery images, in the order the gallery renders them. The first seven
// are requirement 6.1's enumerated subjects; `08-first-dance.webp` is an extra
// added so the grid tiles at an even count. The filenames are contractual: the
// README's replacement procedure is filename-for-filename, and
// `weddingConfig.js` imports each one by name.
const EXPECTED_IMAGES = [
  '01-rings.webp',
  '02-couple-portrait.webp',
  '03-ceremony.webp',
  '04-flowers.webp',
  '05-venue.webp',
  '06-outdoor-scenery.webp',
  '07-reception-details.webp',
  '08-first-dance.webp',
]

const EXPECTED_ENTRIES = [...EXPECTED_IMAGES, CREDITS_FILE].sort()

const IMAGE_EXTENSIONS = new Set([
  '.webp',
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.avif',
  '.svg',
])

function kb(bytes) {
  return `${(bytes / 1024).toFixed(1)}KB (${bytes} bytes)`
}

/** Every file under `dir`, recursively, as paths relative to `ASSETS_DIR`. */
function walk(dir) {
  const found = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) {
      found.push(...walk(full))
    } else {
      found.push(full)
    }
  }
  return found
}

const galleryEntries = readdirSync(GALLERY_DIR, { withFileTypes: true })
const galleryFiles = galleryEntries
  .filter((entry) => entry.isFile())
  .map((entry) => entry.name)
  .sort()

const galleryImages = galleryFiles.filter((name) => name !== CREDITS_FILE)

describe('gallery asset folder', () => {
  it('contains all eight expected placeholder filenames', () => {
    for (const name of EXPECTED_IMAGES) {
      expect(galleryFiles, `${name} is missing from src/assets/gallery/`).toContain(name)
    }
  })

  it('contains exactly the eight images and CREDITS.md, and nothing else', () => {
    // Requirement 6.2: one dedicated folder holding precisely the placeholders
    // and their provenance record. A stray export, an editor backup, or a
    // leftover PNG from a regeneration run all fail here.
    expect(galleryFiles).toEqual(EXPECTED_ENTRIES)

    const directories = galleryEntries
      .filter((entry) => !entry.isFile())
      .map((entry) => entry.name)
    expect(directories, 'src/assets/gallery/ should be flat').toEqual([])
  })

  it('records provenance in a non-empty CREDITS.md', () => {
    const creditsPath = join(GALLERY_DIR, CREDITS_FILE)
    const stats = statSync(creditsPath)

    expect(stats.isFile(), 'src/assets/gallery/CREDITS.md should be a file').toBe(true)
    expect(
      readFileSync(creditsPath, 'utf8').trim().length,
      'CREDITS.md is empty — the provenance record has to travel with the files',
    ).toBeGreaterThan(0)
  })

  it.each(galleryImages)('%s is a .webp of 300KB or less', (name) => {
    expect(extname(name), `${name} should carry the .webp extension`).toBe('.webp')

    const bytes = statSync(join(GALLERY_DIR, name)).size
    expect(bytes, `${name} is empty`).toBeGreaterThan(0)
    expect(
      bytes,
      `${name} is ${kb(bytes)}, over the ${kb(MAX_IMAGE_BYTES)} cap from requirement 12.2`,
    ).toBeLessThanOrEqual(MAX_IMAGE_BYTES)
  })

  it.each(galleryImages)('%s really is WebP by its magic bytes', (name) => {
    // A RIFF container: ASCII "RIFF" at offset 0, a little-endian payload
    // length, then the "WEBP" form type at offset 8. Checking this catches a
    // truncated or mis-encoded file that the extension check would wave through.
    const buffer = readFileSync(join(GALLERY_DIR, name))

    expect(
      buffer.length,
      `${name} is only ${kb(buffer.length)} — too short to hold a WebP header`,
    ).toBeGreaterThanOrEqual(12)

    const riff = buffer.subarray(0, 4).toString('latin1')
    const webp = buffer.subarray(8, 12).toString('latin1')

    expect(riff, `${name} does not begin with the RIFF marker (got "${riff}")`).toBe('RIFF')
    expect(webp, `${name} is a RIFF file but not WEBP (form type "${webp}")`).toBe('WEBP')
  })
})

describe('image placement under src/assets/', () => {
  it('keeps every image inside src/assets/gallery/, except the hero background', () => {
    // Requirement 6.2 again, from the other direction. The site ships one
    // self-hosted display webfont (Parisienne), but it lives in `public/fonts/`
    // (served verbatim), not under `src/assets/`, so this walk of `src/assets/`
    // still sees images only. Filtering to IMAGE extensions keeps it robust
    // regardless.
    //
    // The single sanctioned exception is the hero background photo in
    // `src/assets/images/` — the page backdrop, deliberately kept out of the
    // gallery folder. Any OTHER image outside the gallery folder is a stray.
    const strays = walk(ASSETS_DIR)
      .filter((file) => IMAGE_EXTENSIONS.has(extname(file).toLowerCase()))
      .filter((file) => dirname(file) !== GALLERY_DIR)
      .filter((file) => file !== HERO_BACKGROUND)
      .filter((file) => file !== DRESS_CODE_IMAGE)
      .map((file) => relative(ASSETS_DIR, file))

    expect(
      strays,
      `unexpected image files outside src/assets/gallery/: ${strays.join(', ')}`,
    ).toEqual([])
  })

  it('has the hero background photo at src/assets/images/hero-bg.jpg', () => {
    const stats = statSync(HERO_BACKGROUND)
    expect(stats.isFile(), 'src/assets/images/hero-bg.jpg should be a file').toBe(true)
    expect(stats.size, 'hero-bg.jpg is empty').toBeGreaterThan(0)
  })
})
