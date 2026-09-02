import { useEffect, useState } from 'react'
import logo from '../../assets/sb-partners.png'
import heroWoman from '../../assets/hero-woman-purple.webp'
import styles from './Loader.module.scss'

// Deliberately only what the above-the-fold view needs. Everything below it
// — the 3.1MB product video, EcosystemAlt's cards, the globe's dot field,
// the coin models — keeps loading lazily behind this and after it, exactly
// as it does now. Gating on all of them would make the wait far worse than
// the jank it's meant to hide.
const ASSETS = [logo, heroWoman]

// On a warm cache the assets resolve in ~20ms, so in practice this constant
// alone decides how long the loader is seen. Set above one full sweep of the
// progress bar (1.25s in Loader.module.scss) — below that it clears before
// the bar has completed a single pass, which is what made it feel abrupt
// rather than deliberate.
const MIN_VISIBLE_MS = 1500
// Nothing here should be able to hang the page behind a curtain — if an
// asset or the font API never settles, clear anyway.
const MAX_WAIT_MS = 5000
// Must match $fade-duration in Loader.module.scss.
const FADE_MS = 450

function Loader({ onDone }) {
  const [leaving, setLeaving] = useState(false)
  const [gone, setGone] = useState(false)

  // Takes over from index.html's #boot, which covers the window before this
  // bundle has parsed and React can render anything. Run after paint (not
  // during render) so this overlay is definitely up before the other comes
  // down — they're styled identically, so the swap isn't visible.
  useEffect(() => {
    document.getElementById('boot')?.remove()
  }, [])

  // Scrolling behind the curtain would land the user mid-page when it lifts,
  // and any section they'd passed would fire its once-only reveal
  // immediately — appearing un-animated, or in Hero's case playing entirely
  // off screen and being missed.
  useEffect(() => {
    if (gone) return

    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = previous
    }
  }, [gone])

  useEffect(() => {
    const startedAt = performance.now()
    const timers = []
    let settled = false

    const finish = () => {
      if (settled) return
      settled = true

      const remaining = Math.max(0, MIN_VISIBLE_MS - (performance.now() - startedAt))
      timers.push(
        window.setTimeout(() => {
          setLeaving(true)
          // Handing off on a timer rather than transitionend: that event
          // doesn't fire if the transition is interrupted or skipped, which
          // would strand the page behind the overlay.
          timers.push(
            window.setTimeout(() => {
              setGone(true)
              onDone()
            }, FADE_MS),
          )
        }, remaining),
      )
    }

    // decode(), not just load: an image that has arrived but not been
    // decoded still costs that work on first paint, which is the thing
    // we're trying to keep off the frames right after the curtain lifts.
    const assets = ASSETS.map((src) => {
      const img = new Image()
      img.src = src
      return img.decode ? img.decode().catch(() => {}) : Promise.resolve()
    })

    // Webfonts swapping in late would reflow the hero text mid-reveal.
    const fonts = document.fonts ? document.fonts.ready.catch(() => {}) : Promise.resolve()

    Promise.all([...assets, fonts]).then(finish)
    timers.push(window.setTimeout(finish, MAX_WAIT_MS))

    return () => timers.forEach((id) => window.clearTimeout(id))
  }, [onDone])

  if (gone) return null

  // role="status" rather than aria-hidden: a loading state is precisely the
  // kind of thing that should be announced. The page behind is marked
  // aria-busy by App while this is up.
  return (
    <div className={`${styles.loader} ${leaving ? styles.leaving : ''}`} role="status" aria-live="polite">
      <img className={styles.logo} src={logo} alt="" />
      <span className={styles.progress} />
      <span className={styles.label}>Loading</span>
    </div>
  )
}

export default Loader
