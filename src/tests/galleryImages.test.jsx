// Gallery image attributes, exercised through the real <Gallery /> component.
//
// Requirements: 6.3 (served from the build output, never an external host),
// 6.4 (`loading="lazy"` plus explicit width/height so layout space is reserved),
// 6.5 (the alt text every image carries for the reveal + accessibility path).
//
// `Gallery` wraps each figure in `Reveal`, which calls `useMotion()`, so it must
// be mounted under a `MotionProvider` — `renderWithMotion` deliberately does not
// add one.
import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { Gallery } from '../components/Gallery.jsx'
import { MotionProvider } from '../motion/MotionContext.jsx'

function renderGallery() {
  return render(
    <MotionProvider value={false}>
      <Gallery />
    </MotionProvider>,
  )
}

describe('gallery image attributes (6.3, 6.4, 6.5)', () => {
  it('renders at least seven images (6.1 support for 6.x)', () => {
    const { container } = renderGallery()
    const images = container.querySelectorAll('img')
    expect(images.length).toBeGreaterThanOrEqual(7)
  })

  it('gives every image lazy loading and explicit 1200x800 dimensions (6.4)', () => {
    const { container } = renderGallery()
    const images = [...container.querySelectorAll('img')]

    for (const img of images) {
      expect(img).toHaveAttribute('loading', 'lazy')
      expect(img).toHaveAttribute('width', '1200')
      expect(img).toHaveAttribute('height', '800')
    }
  })

  it('gives every image non-empty alt text (6.5)', () => {
    const { container } = renderGallery()
    const images = [...container.querySelectorAll('img')]

    for (const img of images) {
      const alt = img.getAttribute('alt')
      expect(alt).not.toBeNull()
      expect(alt.trim().length).toBeGreaterThan(0)
    }
  })

  it('serves every image from the build, never an external URL (6.3)', () => {
    const { container } = renderGallery()
    const images = [...container.querySelectorAll('img')]

    for (const img of images) {
      const src = img.getAttribute('src') || ''
      expect(
        /^https?:\/\//i.test(src),
        `image src "${src}" must not be an absolute external URL`,
      ).toBe(false)
    }
  })
})
