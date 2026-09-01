// AudioPlayer — the background music and its mute/unmute control.
//
// Mounted once, high in `MainInvitation`, so it only exists AFTER the envelope
// has been opened. That timing matters: the guest reaches the main page by
// clicking the envelope, which is a genuine user gesture, so the browser's
// autoplay policy lets the (unmuted) track start playing immediately on mount.
// Default state is therefore PLAYING / unmuted, as requested.
//
// The control is a single fixed button pinned to the bottom-left of the
// viewport. Its icon reflects the current state:
//   * playing (unmuted) → a plain music-note icon
//   * muted (paused)    → a music-note icon with a slash through it
//
// Clicking toggles between the two. We drive this with pause()/play() rather
// than the `muted` attribute so the track does not silently advance while
// "muted" — pausing feels more like what a guest expects from a mute button on
// a looping ambience, and it also avoids a paused-but-unmuted edge case.
//
// Autoplay resilience: if the initial play() is ever rejected (e.g. the guest
// arrived via a restored tab rather than a fresh click), we arm a one-shot
// listener that starts playback on the next pointer/key interaction, and keep
// the icon in sync via the audio element's own `play`/`pause` events.

import { useEffect, useRef, useState } from 'react'

import musicSrc from '../assets/music/BricxenMaeMussic.mp3'

/**
 * Music-note glyph. When `muted` is true a slash is drawn across it so the icon
 * itself communicates the state (no colour-only signal). Decorative — the
 * accessible name lives on the button via `aria-label`.
 */
function NoteIcon({ muted }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="block h-5 w-5 sm:h-6 sm:w-6"
    >
      {/* stem + note heads */}
      <path d="M9 18V5l12-2v13" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="18" cy="16" r="3" />
      {/* slash shown only when muted */}
      {muted ? <line x1="3" y1="3" x2="21" y2="21" /> : null}
    </svg>
  )
}

/**
 * Background music + its bottom-left mute/unmute toggle.
 *
 * `playing` mirrors the audio element's real state. It is seeded to `true`
 * (unmuted default) and then corrected by the element's own `play`/`pause`
 * events, so the icon can never drift out of sync with what is actually
 * audible — including the autoplay-blocked case where the true initial state
 * turns out to be paused.
 */
export function AudioPlayer() {
  const audioRef = useRef(null)
  const [playing, setPlaying] = useState(true)

  // Attempt unmuted autoplay on mount, and keep `playing` bound to the
  // element's real state.
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const onPlay = () => setPlaying(true)
    const onPause = () => setPlaying(false)
    audio.addEventListener('play', onPlay)
    audio.addEventListener('pause', onPause)

    // Fallback for the rare case the browser rejects the initial unmuted
    // autoplay: start on the guest's next interaction, once.
    let armed = false
    const startOnGesture = () => {
      if (armed) return
      armed = true
      audio.play().catch(() => {})
    }

    const tryPlay = audio.play()
    if (tryPlay && typeof tryPlay.catch === 'function') {
      tryPlay.catch(() => {
        // Autoplay was blocked — wait for a gesture.
        window.addEventListener('pointerdown', startOnGesture, { once: true })
        window.addEventListener('keydown', startOnGesture, { once: true })
      })
    }

    return () => {
      audio.removeEventListener('play', onPlay)
      audio.removeEventListener('pause', onPause)
      window.removeEventListener('pointerdown', startOnGesture)
      window.removeEventListener('keydown', startOnGesture)
    }
  }, [])

  function toggle() {
    const audio = audioRef.current
    if (!audio) return
    if (audio.paused) {
      audio.play().catch(() => {})
    } else {
      audio.pause()
    }
  }

  // `muted` here means "silent from the guest's point of view" = paused.
  const muted = !playing

  return (
    <>
      {/* `loop` so the ambience runs continuously; `preload="auto"` so it is
          ready to play the moment the page reveals. Not rendered visually. */}
      <audio ref={audioRef} src={musicSrc} loop preload="auto" />

      {/* Floating control, pinned to the bottom-left of the VIEWPORT (`fixed`)
          so it stays put and visible no matter how far the guest scrolls.

          Responsive:
            * `left`/`bottom` are driven off `env(safe-area-inset-*)` (with a
              min gutter) so the button clears rounded corners / home-indicator
              areas on phones and never sits flush against the edge on desktop.
            * `p-2.5 sm:p-3` and the icon's own `w`/`h` step the whole target
              up slightly on larger screens while staying ≥44px everywhere
              (`.control` enforces the 44px floor).
          `z-20` keeps it above the `z-10` content column. */}
      <button
        type="button"
        onClick={toggle}
        style={{
          left: 'max(1rem, env(safe-area-inset-left))',
          bottom: 'max(1rem, env(safe-area-inset-bottom))',
        }}
        className="control fixed z-20 rounded-full bg-cream-soft/90 p-2.5 text-sage-deep shadow-md backdrop-blur-sm sm:p-3"
        aria-label={muted ? 'Unmute background music' : 'Mute background music'}
        aria-pressed={muted}
        title={muted ? 'Unmute background music' : 'Mute background music'}
      >
        <NoteIcon muted={muted} />
      </button>
    </>
  )
}

export default AudioPlayer
