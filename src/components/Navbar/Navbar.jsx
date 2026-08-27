import Container from '../Container/Container.jsx'
import logo from '../../assets/sb-partners.png'
import styles from './Navbar.module.scss'

const navLinks = ['Features', 'Product', 'FAQ', 'About Us', 'Contacts']

function Navbar() {
  return (
    <nav className={styles.navbar}>
      <Container>
        <div className={styles.inner}>
          <img className={styles.logo} src={logo} alt="Starzbet Partners" />

          <ul className={styles.links}>
            {navLinks.map((link) => (
              <li key={link}>
                <a href={`#${link.toLowerCase().replace(/\s+/g, '-')}`}>{link}</a>
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
