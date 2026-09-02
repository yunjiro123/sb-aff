import { useEffect, useRef } from 'react'
import Container from '../Container/Container.jsx'
import useRevealAnimation from '../../hooks/useRevealAnimation.js'
import logo from '../../assets/sb-partners.png'
import gameVideo from '../../assets/game-video.mp4'
import sportsIcon from '../../assets/sports-icon.webp'
import casinoIcon from '../../assets/casino-icon.webp'
import liveIcon from '../../assets/live-icon.webp'
import styles from './Product.module.scss'

function ThemeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="4.6" />
      <path d="M12 2.6v2.4M12 19v2.4M4.6 12H2.2M21.8 12h-2.4M6 6l1.7 1.7M16.3 16.3 18 18M18 6l-1.7 1.7M7.7 16.3 6 18" />
    </svg>
  )
}

function MenuIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 6.5h16M4 12h16M4 17.5h16" />
    </svg>
  )
}

const BADGES = [
  {
    title: 'Sports Betting',
    copy: 'Wide range of sports, high odds, live coverage of popular events',
    icon: sportsIcon,
  },
  {
    title: 'Casino',
    copy: 'Licensed slots, crash games, poker and live dealers',
    icon: casinoIcon,
  },
  {
    title: 'Live Casino',
    copy: 'Real dealers, live tables and an immersive casino experience',
    icon: liveIcon,
  },
]

function Product() {
  const revealRef = useRevealAnimation()
  const videoRef = useRef(null)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    // Autoplaying video decode is a real ongoing cost even when it's
    // scrolled out of view — pause it there instead, same pattern as
    // Coins3D/Globe's render-loop gating.
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) video.play().catch(() => {})
        else video.pause()
      },
      { threshold: 0.01 },
    )
    observer.observe(video)

    return () => observer.disconnect()
  }, [])

  return (
    <section className={styles.product} id="product">
      <Container>
        <div className={styles.card}>
          <div className={styles.visual}>
            <div className={styles.laptop}>
              <div className={styles.screen}>
                <div className={styles.browserBar}>
                  <img className={styles.browserLogo} src={logo} alt="" />

                  <div className={styles.browserActions}>
                    <span className={`${styles.browserBtn} ${styles.browserLogin}`}>Login</span>
                    <span className={`${styles.browserBtn} ${styles.browserJoin}`}>Join Now</span>
                    <span className={styles.browserIcon}>
                      <ThemeIcon />
                    </span>
                    <span className={styles.browserIcon}>
                      <MenuIcon />
                    </span>
                  </div>
                </div>

                <video
                  ref={videoRef}
                  className={styles.screenVideo}
                  src={gameVideo}
                  loop
                  muted
                  playsInline
                />
              </div>

              <div className={styles.hinge} />
              <div className={styles.base} />
            </div>
          </div>

          <div className={styles.row}>
            <div className={styles.content} ref={revealRef}>
              <span className={styles.eyebrow} data-reveal>Product</span>

              <h2 className={styles.heading} data-reveal>
                Higher Conversions.
                <br />
                Higher Revenue.
              </h2>

              <p className={styles.copy} data-reveal>
                Players stay with us after their first deposit because they can always find
                something to enjoy among thousands of entertainment options.
              </p>

              <div className={styles.badgeRow}>
                {BADGES.map(({ title, copy, icon }) => (
                  <div key={title} className={styles.badge} data-reveal>
                    <img className={styles.badgeIcon} src={icon} alt="" />
                    <span className={styles.badgeDivider} />
                    <div className={styles.badgeBody}>
                      <span className={styles.badgeTitle}>{title}</span>
                      <p className={styles.badgeCopy}>{copy}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </Container>
    </section>
  )
}

export default Product
