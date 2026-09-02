import Container from '../Container/Container.jsx'
import Coins3D from './Coins3D.jsx'
import useRevealAnimation from '../../hooks/useRevealAnimation.js'
import useIdleMount from '../../hooks/useIdleMount.js'
import heroWoman from '../../assets/hero-woman-purple.webp'
import styles from './Hero.module.scss'

function ArrowIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  )
}

const stats = [
  { value: '10M+', label: 'Users' },
  { value: '10K+', label: 'Affiliates' },
  { value: '$1M+', label: 'Daily Payouts' },
]


function Hero({ revealArmed = true }) {
  // Held until the site loader clears — see App.jsx.
  const revealRef = useRevealAnimation(revealArmed)
  // Hero is visible from the first frame, so this can't be gated by
  // viewport intersection like Globe/video — deferred by idle time instead,
  // so its GLTF loads + shader compiles don't fully overlap with the page's
  // own initial mount and the user's first scroll into EcosystemAlt.
  const showCoins = useIdleMount()

  return (
    <section className={styles.hero}>
      <Container>
        <div className={styles.row}>
          <div className={styles.content} ref={revealRef}>
            <h1 className={styles.headline} data-reveal>
              Make profit with
              <br />
              <span className={styles.accent}>THE BEST</span> iGaming
              <br />
              Product
            </h1>

            <p className={styles.subhead} data-reveal>
              Advanced platform. Top converting offers. Maximum revenue for our partners.
            </p>

            <div className={styles.ctaRow} data-reveal>
              <a className={styles.cta} href="#partner">
                Become An Affiliate
              </a>
              <a className={styles.learnMore} href="#learn">
                Learn More
                <span className={styles.arrow}>
                  <ArrowIcon />
                </span>
              </a>
            </div>

            <div className={styles.contentDivider} data-reveal />

            <div className={styles.statsGroup} data-reveal>
              {stats.map((stat) => (
                <div key={stat.label} className={styles.statItem}>
                  <span className={styles.statLabel}>{stat.label}</span>
                  <span className={styles.statValue}>{stat.value}</span>
                </div>
              ))}
            </div>
          </div>

          <div className={styles.visual}>
            <div className={styles.blob} />

            <div className={styles.decorTL1} />
            <div className={styles.decorTL2} />
            <div className={styles.decorBR1} />
            <div className={styles.decorBR2} />
            <div className={styles.decorBR3} />

            {showCoins && <Coins3D />}

            <div className={styles.imageOverhang}>
              <img className={styles.heroImg} src={heroWoman} alt="" />
            </div>
            <div className={styles.imageBody}>
              <img className={styles.heroImg} src={heroWoman} alt="" />
            </div>
          </div>
        </div>
      </Container>
    </section>
  )
}

export default Hero
