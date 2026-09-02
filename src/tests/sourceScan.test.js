// Static source-code guards (requirements 13.4 and 14.6).
//
// This is a filesystem test, not a DOM test: it reads the source files on disk
// and asserts facts about their text. Two invariants that the requirements make
// structural rather than conventional are checked here, where they can catch a
// regression the moment it is committed.
//
//   13.4 — the site reads NO build-time or runtime environment variables. No
//          `process.env`, no `import.meta.env`, anywhere under `src/` or in the
//          root config files. The wedding values live in weddingConfig.js as
//          plain data; there is nothing to configure through the environment,
//          and a stray env read is the seam through which one would creep in.
//
//   14.6 — no COMPONENT restates a value that weddingConfig.js owns. The couple
//          names, the display date, the display time, the two venue names and
//          the four palette hexes exist in exactly one place. Components read
//          them from config; if one is pasted back into a component as a
//          literal the two copies can drift, so a literal hit in any
//          src/components/*.jsx is a violation.
//
// Paths are resolved from this file's own URL, not from process.cwd(), so the
// test behaves identically wherever vitest is invoked from.
import { readdirSync, readFileSync } from 'node:fs'
import { dirname, extname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

const HERE = dirname(fileURLToPath(import.meta.url))
const SRC_DIR = resolve(HERE, '..')
const PROJECT_ROOT = resolve(SRC_DIR, '..')
const COMPONENTS_DIR = join(SRC_DIR, 'components')

const ROOT_CONFIG_FILES = ['vite.config.js', 'eslint.config.js']

const SCRIPT_EXTENSIONS = new Set(['.js', '.jsx'])

// A file is a test file if its name carries a `.test.` segment. Test files are
// excluded from both scans: they are not shipped, and a test may legitimately
// mention a forbidden substring (e.g. a comment explaining why it does NOT use
// `process.env`) or assert on a config literal without owning it.
function isTestFile(path) {
  return /\.(test|property\.test)\.[jt]sx?$/.test(path) || /\.test\./.test(path)
}

/** Every file under `dir`, recursively, as absolute paths. */
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

function readText(path) {
  return readFileSync(path, 'utf8')
}

describe('no environment-variable access (requirement 13.4)', () => {
  // Root config files + every non-test script file under src/.
  const rootConfigPaths = ROOT_CONFIG_FILES.map((name) => join(PROJECT_ROOT, name))
  const srcScriptPaths = walk(SRC_DIR)
    .filter((path) => SCRIPT_EXTENSIONS.has(extname(path)))
    .filter((path) => !isTestFile(path))

  const filesToScan = [...rootConfigPaths, ...srcScriptPaths]

  const FORBIDDEN = ['process.env', 'import.meta.env']

  it.each(filesToScan)('%s reads no environment variables', (path) => {
    const source = readText(path)
    for (const token of FORBIDDEN) {
      expect(
        source.includes(token),
        `${relative(PROJECT_ROOT, path)} contains "${token}" — requirement 13.4 forbids env access`,
      ).toBe(false)
    }
  })
})

describe('components restate no config-owned literal (requirement 14.6)', () => {
  // Each entry: a human label, and the literal string that only weddingConfig.js
  // (and, for the hexes, index.css's @theme) is allowed to hold.
  //
  // The hexes are scanned as literal STRINGS. DressCode.jsx applies colour via
  // `style={{ backgroundColor: entry.hex }}` — a variable reference read from
  // config, not a "#rrggbb" literal — so scanning for the literal hex strings
  // is correct and does not false-positive on that legitimate usage.
  const FORBIDDEN_LITERALS = [
    ['couple display names', 'Bricx & Mae'],
    ['groom name', 'Bricx Carasco'],
    ['bride name', 'Giohannah Mae Manambit'],
    ['display date', 'February 13, 2027'],
    ['ceremony display time', '11:00 AM'],
    ['reception display time', '2:00 PM'],
    ['ceremony venue', 'Our Lady of Guadalupe Parish Church, Pagsanjan, Laguna'],
    ['reception venue', 'La Revelacion Farm Resort, Brgy. Calusiche, Pagsanjan, Laguna'],
    ['palette hex (Sage)', '#55705f'],
    ['palette hex (Light Sage)', '#a3b899'],
    ['palette hex (Cream)', '#ede0cd'],
    ['palette hex (Silver Gray)', '#c0c0c0'],
  ]

  const componentFiles = walk(COMPONENTS_DIR)
    .filter((path) => SCRIPT_EXTENSIONS.has(extname(path)))
    .filter((path) => !isTestFile(path))

  it('finds component source files to scan', () => {
    // A sanity guard: if the glob ever matched nothing the it.each below would
    // pass vacuously.
    expect(componentFiles.length).toBeGreaterThan(0)
  })

  it.each(componentFiles)('%s restates no config-owned value', (path) => {
    const source = readText(path)
    const rel = relative(PROJECT_ROOT, path)

    for (const [label, literal] of FORBIDDEN_LITERALS) {
      expect(
        source.includes(literal),
        `${rel} restates the ${label} ("${literal}") — 14.6 says it must be read from weddingConfig.js only`,
      ).toBe(false)
    }
  })
})
