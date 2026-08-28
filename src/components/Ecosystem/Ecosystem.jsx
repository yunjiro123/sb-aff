import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Container from '../Container/Container.jsx'
import styles from './Ecosystem.module.scss'

gsap.registerPlugin(ScrollTrigger)

function AppleIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor">
      <path d="M16.365 1.43c0 1.14-.428 2.055-1.284 2.828-.928.836-2.007 1.318-3.023 1.235-.13-1.1.407-2.24 1.245-2.998.86-.79 2.147-1.315 3.062-1.065zM19.99 17.19c-.415.96-.913 1.85-1.5 2.67-.79 1.114-1.727 2.415-2.99 2.428-1.14.013-1.464-.723-3.04-.716-1.577.008-1.937.73-3.09.716-1.28-.013-2.17-1.19-2.96-2.303-2.14-3.02-2.5-6.564-.98-8.94.996-1.564 2.663-2.55 4.394-2.577 1.19-.023 2.29.79 3.01.79.72 0 2.096-.976 3.53-.833.605.026 2.303.244 3.39 1.837-.087.055-2.026 1.19-2.003 3.542.022 2.812 2.502 3.75 2.53 3.762z" />
    </svg>
  )
}

function AndroidIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.523 15.34a1 1 0 1 1 0-2 1 1 0 0 1 0 2zm-11.046 0a1 1 0 1 1 0-2 1 1 0 0 1 0 2zm11.36-6.02.968-1.678a.4.4 0 1 0-.693-.4l-.982 1.702a7.16 7.16 0 0 0-6.26 0L9.888 7.242a.4.4 0 1 0-.693.4l.968 1.678A6.6 6.6 0 0 0 6.4 15h11.2a6.6 6.6 0 0 0-3.763-5.68zM4 16v5a1.5 1.5 0 0 0 3 0v-5H4zm13 5a1.5 1.5 0 0 0 3 0v-5h-3v5z" />
    </svg>
  )
}

const games = {
  title: 'Meet Starzbet Games — Our In-House GameDev Studio',
  copy: 'Exclusive titles built in-house, giving your traffic something no other operator can offer.',
}

const stats = {
  title: 'All Essential Statistics In Real Time',
  copy: 'Track clicks, signups and revenue live — no waiting on end-of-day reports.',
}

const ltv = {
  title: 'Truly High LTV',
  copy: 'Our own local call centers, VIP and support teams, welcome bonuses and loyalty programs.',
}

const apps = {
  title: 'iOS & Android Engaging Apps For The Best Traffic',
  copy: 'Native mobile apps proven to convert and retain players across the globe.',
}

const product = {
  title: 'Own Product',
  copy: 'A unique iGaming product with no market alternative, proven by millions of players around the globe.',
}

function Ecosystem() {
  const gridRef = useRef(null)

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const ctx = gsap.context(() => {
      // Each card pops into place as it crosses into view, alternating its
      // starting tilt direction (even index -3deg, odd index +3deg) so the
      // row doesn't read as a single uniform motion.
      Array.from(gridRef.current.children).forEach((card, index) => {
        gsap.fromTo(
          card,
          { opacity: 0, scale: 0.8, rotate: index % 2 === 0 ? -3 : 3 },
          {
            opacity: 1,
            scale: 1,
            rotate: 0,
            ease: 'none', // scrub tracks scroll position directly, so easing here would fight it
            scrollTrigger: {
              trigger: card,
              start: 'top 88%',
              end: 'top 55%',
              scrub: 0.6,
            },
          },
        )
      })
    }, gridRef)

    return () => ctx.revert()
  }, [])

  return (
    <section className={styles.ecosystem}>
      <Container>
        <h2 className={styles.heading}>
          Advanced Ecosystem For Profit
          <br />
          <span className={styles.accent}>Maximization</span>
        </h2>

        <div className={styles.grid} ref={gridRef}>
          <article className={styles.games}>
            <div className={styles.mediaPlaceholder} />
            <h3 className={styles.cardTitle}>{games.title}</h3>
            <p className={styles.cardCopy}>{games.copy}</p>
          </article>

          <article className={styles.stats}>
            <div className={styles.statsBody}>
              <h3 className={styles.cardTitle}>{stats.title}</h3>
              <p className={styles.cardCopy}>{stats.copy}</p>
            </div>
            <div className={styles.mediaPlaceholder} />
          </article>

          <article className={styles.ltv}>
            <div className={styles.mediaPlaceholder} />
            <h3 className={styles.cardTitle}>{ltv.title}</h3>
            <p className={styles.cardCopy}>{ltv.copy}</p>
          </article>

          <article className={styles.apps}>
            <div className={styles.appIcons}>
              <span className={styles.appIcon}>
                <AppleIcon />
              </span>
              <span className={styles.appIcon}>
                <AndroidIcon />
              </span>
            </div>
            <h3 className={styles.cardTitle}>{apps.title}</h3>
            <p className={styles.cardCopy}>{apps.copy}</p>
          </article>

          <article className={styles.product}>
            <div className={styles.productBody}>
              <h3 className={styles.cardTitle}>{product.title}</h3>
              <p className={styles.cardCopy}>{product.copy}</p>
            </div>
            <div className={styles.mediaPlaceholder} />
          </article>
        </div>
      </Container>
    </section>
  )
}

export default Ecosystem
