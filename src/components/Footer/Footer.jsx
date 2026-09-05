import Container from '../Container/Container.jsx'
import useRevealAnimation from '../../hooks/useRevealAnimation.js'
import NAV_LINKS from '../../data/navLinks.js'
import logo from '../../assets/sb-partners.png'
import styles from './Footer.module.scss'

function Footer() {
  const revealRef = useRevealAnimation()
  const year = new Date().getFullYear()

  return (
    <footer className={styles.footer}>
      <Container>
        <div className={styles.inner} ref={revealRef}>
          <img className={styles.logo} src={logo} alt="Starzbet Partners" data-reveal />

          <p className={styles.about} data-reveal>
            Starzbet Partners is the official affiliate program of Starzbet, helping partners turn
            their audience into steady, long-term revenue through competitive commissions and
            dedicated support.
          </p>

          <ul className={styles.links} data-reveal>
            {NAV_LINKS.map(({ label, href }) => (
              <li key={label}>
                <a href={href}>{label}</a>
              </li>
            ))}
          </ul>

          <div className={styles.bottom} data-reveal>
            <p className={styles.copyright}>
              © {year} Starzbet Partners.
            </p>
          </div>
        </div>
      </Container>
    </footer>
  )
}

export default Footer
