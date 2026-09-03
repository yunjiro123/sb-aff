import Container from '../Container/Container.jsx'
import useRevealAnimation from '../../hooks/useRevealAnimation.js'
import avatar1 from '../../assets/avatar-1.webp'
import avatar2 from '../../assets/avatar-2.webp'
import avatar3 from '../../assets/avatar-3.webp'
import purpleDress from '../../assets/contact-us.webp'
import sbCoin from '../../assets/sb-coin.webp'
import telegramIcon from '../../assets/telegram-icon.webp'
import emailIcon from '../../assets/email-icon.webp'
import styles from './Contact.module.scss'

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 5v14M5 12h14" />
    </svg>
  )
}

const AVATARS = [
  { id: 'a', image: avatar1 },
  { id: 'b', image: avatar2 },
  { id: 'c', image: avatar3 },
]

const CONTACT_CARDS = [
  { id: 'telegram', icon: telegramIcon, title: 'Telegram', value: 'Starzbetpartners' },
  { id: 'email', icon: emailIcon, title: 'Email', value: 'winwith@infernopartners.com' },
]

// Purely decorative — "profit" motif rising past the figure. Ids just
// drive nth-child styling (position/size/delay) in Contact.module.scss.
const COINS = ['a', 'b', 'c', 'd', 'e', 'f']

function Contact() {
  const revealRef = useRevealAnimation()

  return (
    <section className={styles.contact} id="contact">
      <Container>
        <div className={styles.row} ref={revealRef}>
          <div className={styles.visual} aria-hidden="true">
            <img className={styles.visualImage} src={purpleDress} alt="" />
            {COINS.map((id) => (
              <img key={id} className={styles.coin} src={sbCoin} alt="" />
            ))}
          </div>

          <div className={styles.content}>
            <div className={styles.avatars} data-reveal>
              {AVATARS.map(({ id, image }) => (
                <span key={id} className={styles.avatar}>
                  <img src={image} alt="" />
                </span>
              ))}
              <span className={styles.avatarPlus}>
                <PlusIcon />
              </span>
            </div>

            <h2 className={styles.heading} data-reveal>
              Start making profit with us right now.
            </h2>

            <p className={styles.copy} data-reveal>
              After you sign up, our manager will contact you to answer all your questions and
              help you get started!
            </p>

            <a className={styles.cta} href="#partner" data-reveal>
              Click To Become A STARZBET Partner
            </a>

            <div className={styles.contactBlock} data-reveal>
              <div className={styles.contactCards}>
                {CONTACT_CARDS.map(({ id, icon, title, value }) => (
                  <div key={id} className={styles.contactCard}>
                    <img className={styles.contactIcon} src={icon} alt="" />
                    <span className={styles.contactDivider} />
                    <div className={styles.contactText}>
                      <span className={styles.contactTitle}>{title}</span>
                      <span className={styles.contactValue}>{value}</span>
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

export default Contact
