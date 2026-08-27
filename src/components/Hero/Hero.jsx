import Container from '../Container/Container.jsx'
import Coins3D from './Coins3D.jsx'
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


function Hero() {
  return (
    <section className={styles.hero}>
      <Container>
        <div className={styles.row}>
          <div className={styles.content}>
            <h1 className={styles.headline}>
              Make profit with
              <br />
              <span className={styles.accent}>THE BEST</span> iGaming
              <br />
              Product
            </h1>

            <p className={styles.subhead}>
              Advanced platform. Top converting offers. Maximum revenue for our partners.
            </p>

            <div className={styles.ctaRow}>
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

            <div className={styles.contentDivider} />

            <div className={styles.statsGroup}>
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

            <Coins3D />

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
