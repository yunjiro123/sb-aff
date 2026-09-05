import Container from '../Container/Container.jsx'
import NAV_LINKS from '../../data/navLinks.js'
import logo from '../../assets/sb-partners.png'
import styles from './Navbar.module.scss'

function Navbar() {
  return (
    <nav className={styles.navbar}>
      <Container>
        <div className={styles.inner}>
          <img className={styles.logo} src={logo} alt="Starzbet Partners" />

          <ul className={styles.links}>
            {NAV_LINKS.map(({ label, href }) => (
              <li key={label}>
                <a href={href}>{label}</a>
              </li>
            ))}
          </ul>

          <div className={styles.actions}>
            <a className={`${styles.button} ${styles.login}`} href="#login">
              Login
            </a>
            <a className={`${styles.button} ${styles.signup}`} href="#signup">
              Sign Up
            </a>
          </div>
        </div>
      </Container>
    </nav>
  )
}

export default Navbar
