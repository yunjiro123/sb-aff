import { useEffect, useRef, useState } from 'react'
import Container from '../Container/Container.jsx'
import NAV_LINKS from '../../data/navLinks.js'
import logo from '../../assets/sb-partners.png'
import styles from './Navbar.module.scss'

function Navbar() {
  const [open, setOpen] = useState(false)
  const [hidden, setHidden] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const lastScrollY = useRef(0)

  // Same body-scroll-lock pattern as Loader — otherwise the page behind the
  // open panel keeps scrolling underneath it.
  useEffect(() => {
    if (!open) return

    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = previous
    }
  }, [open])

  // Fixed to the viewport at all times (not just anchored over .hero) so it
  // can slide out on scroll-down and back in on scroll-up from anywhere on
  // the page. Never hides while the mobile panel is open — it's the only way
  // to close it.
  useEffect(() => {
    lastScrollY.current = window.scrollY

    let ticking = false

    const update = () => {
      const y = window.scrollY
      setScrolled(y > 40)

      if (open) {
        setHidden(false)
      } else {
        setHidden(y > lastScrollY.current && y > 80)
      }

      lastScrollY.current = y
      ticking = false
    }

    const onScroll = () => {
      if (ticking) return
      ticking = true
      window.requestAnimationFrame(update)
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [open])

  const close = () => setOpen(false)

  return (
    <>
      <nav className={styles.navbar} data-hidden={hidden} data-scrolled={scrolled}>
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

            <div className={styles.mobileBar}>
              <a className={`${styles.button} ${styles.login}`} href="#login">
                Login
              </a>

              <button
                type="button"
                className={styles.hamburger}
                aria-label={open ? 'Close menu' : 'Open menu'}
                aria-expanded={open}
                data-open={open}
                onClick={() => setOpen((prev) => !prev)}
              >
                <span />
                <span />
                <span />
              </button>
            </div>
          </div>
        </Container>
      </nav>

      <div className={styles.mobileMenu} data-open={open}>
        <ul className={styles.mobileLinks}>
          {NAV_LINKS.map(({ label, href }) => (
            <li key={label}>
              <a href={href} onClick={close}>{label}</a>
            </li>
          ))}
        </ul>

        <div className={styles.mobileActions}>
          <a className={`${styles.button} ${styles.login}`} href="#login" onClick={close}>
            Login
          </a>
          <a className={`${styles.button} ${styles.signup}`} href="#signup" onClick={close}>
            Sign Up
          </a>
        </div>
      </div>
    </>
  )
}

export default Navbar
