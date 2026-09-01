import Container from '../Container/Container.jsx'
import Globe from './Globe.jsx'
import avatar1 from '../../assets/avatar-1.webp'
import avatar2 from '../../assets/avatar-2.webp'
import avatar3 from '../../assets/avatar-3.webp'
import styles from './Geography.module.scss'

function AffiliatesIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="8" r="3.4" />
      <path d="M2.8 19.2a6.2 6.2 0 0 1 12.4 0" />
      <path d="M16.2 5.2a3.4 3.4 0 0 1 0 5.6M17.6 14.2a6.2 6.2 0 0 1 3.6 5" />
    </svg>
  )
}

function ArrowIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  )
}

const AVATARS = [
  { id: 'a', image: avatar1 },
  { id: 'b', image: avatar2 },
  { id: 'c', image: avatar3 },
]

function Geography() {
  return (
    <section className={styles.geography}>
      <Container>
        <div className={styles.card}>
          <div className={styles.visual}>
            <Globe />
          </div>

          <div className={styles.row}>
            <div className={styles.content}>
              <span className={styles.eyebrow}>Global Presence</span>

              <h2 className={styles.heading}>
                One platform.
                <br />
                Every corner of the world.
              </h2>

              <p className={styles.copy}>
                We operate on every continent with local payment systems and region-specific
                customization, so every player gets a fast, familiar experience — wherever they are.
              </p>

              <div className={styles.statRow}>
                <div className={styles.statBlock}>
                  <p className={styles.statNum}>
                    10K<span className={styles.statNumPlus}>+</span>
                  </p>
                  <span className={styles.statLabel}>Affiliates</span>
                </div>

                <span className={styles.statDivider} />

                <div className={styles.avatars}>
                  {AVATARS.map(({ id, image }, index) => (
                    <span
                      key={id}
                      // Last one carries the accent ring, so it needs to sit on top
                      // of the neighbour it overlaps rather than under it.
                      className={`${styles.avatar} ${index === AVATARS.length - 1 ? styles.avatarLead : ''}`}
                    >
                      <img src={image} alt="" />
                    </span>
                  ))}
                </div>
              </div>

              <div className={styles.divider} />

              <div className={styles.actions}>
                <div className={styles.actionsInfo}>
                  <span className={styles.actionsIcon}>
                    <AffiliatesIcon />
                  </span>
                  Join our growing network
                </div>

                <a className={styles.cta} href="#partner">
                  Become An Affiliate
                  <span className={styles.ctaArrow}>
                    <ArrowIcon />
                  </span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </Container>
    </section>
  )
}

export default Geography
